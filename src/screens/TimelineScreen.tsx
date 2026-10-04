import { useMemo, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  FileText,
  Flag,
  Flame,
  Lightbulb,
  Moon,
  Target,
  Timer,
  Trash2,
  Trophy,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Plus,
  RotateCcw,
  Sparkles,
  ArrowRight,
  X
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Card,
  EmptyState,
  PageHeader,
  SectionHeader,
  SettingsLink
} from "../components/ui";
import { GoalBlueprintModal } from "../components/GoalBlueprintModal";
import { RetroLogModal } from "../components/RetroLogModal";
import { MorningPlanningModal } from "../components/MorningPlanningModal";
import { DayTimeBlockVisualizer } from "../components/DayTimeBlockVisualizer";
import { SeasonProgressCard, WhyCard } from "../components/SeasonWidgets";
import { ZendoProModal } from "../components/ZendoProModal";
import { FOCUS_PRESETS } from "../constants/focusPresets";
import {
  formatFocusSessionTimelineDescription,
  getFocusSessionPreset,
  normalizeFocusSessionRecord,
  resolveFocusSessionStatus,
} from "../constants/focusSessionStatus";
import { routes } from "../constants/routes";
import {
  addDaysToDate,
  datesInRange,
  formatHumanDate,
  getDaysPassed,
  getTodayDateString,
  getCurrentWeekNumber,
  getWeekStartDate,
  parseLocalDateKey,
} from "../lib/date";
import { differenceInCalendarDays, format } from "date-fns";
import {
  getDailyStatusForDate,
  isRetroEligible,
} from "../lib/dailyActivity";
import { selectSeasonRhythmAccounting } from "../lib/rhythmAccounting";
import { selectSeasonFocusSummary, selectTotalFocusSecondsForDate } from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import type { AppLanguage, TimelineEvent, TimelineEventType } from "../types/app";
import { getJournalAnswerItems } from "../i18n/prompts";
import { useT, useLanguage } from "../i18n";

type TimelineViewMode = "daily" | "weekly" | "monthly" | "season";

function TimelineStats() {
  const store = useMonkStore();
  const t = useT();
  const season = store.activeSeason!;
  const today = getTodayDateString();

  const focusSummary = selectSeasonFocusSummary(store, season.id);
  const totalFocusMinutes = focusSummary.totalMinutes;
  const totalFocusSessions = focusSummary.count;

  const totalPassedDays = Math.min(
    season.durationDays,
    getDaysPassed(season.startDate, today)
  );
  const passedDates = datesInRange(season.startDate, totalPassedDays);
  // Rest days are planned, so they count on both sides: a day of rest leaves the
  // rate untouched, while a day genuinely missed only adds to the denominator.
  const rhythm = selectSeasonRhythmAccounting(store, passedDates);
  const consistencyRate = rhythm.consistencyRate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="rounded-2xl border border-monk-accent/30 bg-gradient-to-br from-monk-surface via-monk-surface to-monk-soft/50 p-4 sm:p-5 relative overflow-hidden transition-all duration-200 hover:border-monk-accent/50 shadow-sm monk-depth">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-monk-muted">
                {t("timeline.stats.focus")}
              </p>
              <span className="text-[9px] font-mono font-medium text-monk-accent/80 bg-monk-accent/10 px-1.5 py-0.2 rounded border border-monk-accent/20">
                Deep Work
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-mono font-bold text-monk-accent tabular-nums leading-none">
                {totalFocusMinutes}
              </span>
              <span className="text-xs font-semibold text-monk-muted">
                {t("timeline.stats.minutes")}
              </span>
            </div>
            <p className="text-xs text-monk-muted mt-1.5 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-monk-accent/70" />
              <span>{t("timeline.stats.sessions", { n: totalFocusSessions })}</span>
            </p>
          </div>

          <div className="grid h-10 w-10 place-items-center rounded-xl bg-monk-accent/15 border border-monk-accent/30 text-monk-accent shrink-0 shadow-inner">
            <Timer size={18} strokeWidth={2} />
          </div>
        </div>

        <div className="mt-4 border-t border-monk-border/60 pt-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-monk-muted">
              {t("timeline.stats.consistency")}
            </p>
            <p className="text-sm font-semibold text-monk-text mt-0.5 tabular-nums">
              {t("timeline.stats.days", { n: rhythm.accountedDays, total: totalPassedDays })}
            </p>
            {rhythm.focusDays > 0 || rhythm.restDays > 0 ? (
              <p className="mt-0.5 text-[10px] text-monk-muted tabular-nums">
                {t("timeline.stats.daysBreakdown", { focus: rhythm.focusDays, rest: rhythm.restDays })}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <span className="font-mono text-xs font-bold text-monk-accent bg-monk-accent/10 px-2 py-0.5 rounded-md border border-monk-accent/20">
              {consistencyRate}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Day Counts — how the season's days actually went, stated as fact.
 *
 * Deliberately not a streak board (evidence §24, §27): no run counter, no
 * milestone, no target. It reports what happened and never grades it, so a gap
 * reads as information rather than a broken chain.
 */
function DayCountsCard() {
  const store = useMonkStore();
  const t = useT();
  const season = store.activeSeason!;
  const today = getTodayDateString();

  const passedCount = Math.min(season.durationDays, getDaysPassed(season.startDate, today));
  const passedDates = datesInRange(season.startDate, passedCount);

  const rhythm = selectSeasonRhythmAccounting(store, passedDates);
  const completedCount = rhythm.focusDays;
  const restCount = rhythm.restDays;
  const missedCount = rhythm.missedDays;
  const partialCount = passedDates.length - completedCount - restCount - missedCount;

  return (
    <div className="rounded-2xl border border-monk-border/80 bg-monk-surface/90 p-4 sm:p-5 shadow-xs transition-all duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-monk-muted">
            {t("timeline.stats.consistency")}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-monk-text tabular-nums">
            {t("timeline.stats.days", { n: rhythm.accountedDays, total: passedCount })}
          </p>
          {completedCount > 0 || restCount > 0 ? (
            <p className="mt-0.5 text-[10px] text-monk-muted tabular-nums">
              {t("timeline.stats.daysBreakdown", { focus: completedCount, rest: restCount })}
            </p>
          ) : null}
          <p className="mt-0.5 text-[10px] text-monk-muted">
            {t("timeline.legend.scopeSeason")}
          </p>
        </div>

        {/* Day chips — descriptive counts, no judgment */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 rounded-lg border border-monk-success/30 bg-monk-success-soft px-2 py-1 text-monk-success">
            <Check size={12} strokeWidth={2.5} />
            <span>{completedCount} {t("timeline.legend.done")}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-monk-rest/30 bg-monk-rest-soft px-2 py-1 text-monk-rest">
            <Moon size={12} strokeWidth={2} />
            <span>{restCount} {t("timeline.legend.rest")}</span>
          </span>
          {partialCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-monk-border bg-monk-soft px-2 py-1 text-monk-muted">
              <Timer size={12} strokeWidth={2} />
              <span>{partialCount} {t("timeline.legend.partial")}</span>
            </span>
          ) : null}
          {missedCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-monk-border bg-monk-soft px-2 py-1 text-monk-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-monk-muted" />
              <span>{missedCount} {t("timeline.legend.missed")}</span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const store = useMonkStore();
  const t = useT();
  const lang = useLanguage();
  const locale = lang === "id" ? "id-ID" : "en-US";
  const focusRecord = event.type === "focus_session"
    ? event.focusSession ?? store.focusSessions.find((session) => session.id === event.sourceId)
    : undefined;
  const normalizedFocusRecord = focusRecord ? normalizeFocusSessionRecord(focusRecord) : undefined;
  const focusCompleted = normalizedFocusRecord ? resolveFocusSessionStatus(normalizedFocusRecord) === "completed" : false;
  const focusPreset = normalizedFocusRecord ? getFocusSessionPreset(normalizedFocusRecord) : undefined;
  const focusTitle = focusPreset
    ? `${FOCUS_PRESETS[focusPreset].shortLabel} ${focusCompleted ? t("timeline.focusCompleted") : t("timeline.focusEndedEarly")}`
    : event.title;
  const displayTitle = event.type === "focus_session" && normalizedFocusRecord ? focusTitle : event.title;
  const journalRecord = event.type === "journal_entry"
    ? store.journalEntries.find((entry) => entry.id === event.sourceId)
    : undefined;
  const journalLang = (store.appSettings.language ?? "id") as AppLanguage;
  const journalItems = journalRecord ? getJournalAnswerItems(journalLang, journalRecord.answers, journalRecord.date) : [];
  const displayDescription = event.type === "focus_session" && normalizedFocusRecord
    ? formatFocusSessionTimelineDescription(normalizedFocusRecord, focusCompleted ? undefined : "saved")
    : event.type === "journal_entry" && journalItems.length > 0
      ? undefined
    : event.description;

  const icons: Record<TimelineEventType, JSX.Element> = {
    season_started: <Flag size={13} strokeWidth={2} className="text-monk-accent" />,
    season_completed: <Trophy size={13} strokeWidth={2} className="text-monk-success" />,
    goal_created: <Target size={13} strokeWidth={2} className="text-monk-accent" />,
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? <Flame size={13} strokeWidth={2} className="text-monk-warning" />
      : <Timer size={13} strokeWidth={2} className="text-monk-success" />,
    learning_session: <Lightbulb size={13} strokeWidth={2} className="text-monk-accent" />,
    journal_entry: <FileText size={13} strokeWidth={2} className="text-monk-muted" />
  };

  const bgClasses: Record<TimelineEventType, string> = {
    season_started: "bg-monk-accent/15 border-monk-accent/40",
    season_completed: "bg-monk-success-soft border-monk-success/30",
    goal_created: "bg-monk-accent/15 border-monk-accent/40",
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? "bg-monk-warning-soft border-monk-warning/30"
      : "bg-monk-success-soft border-monk-success/30",
    learning_session: "bg-monk-accent/15 border-monk-accent/40",
    journal_entry: "bg-monk-soft border-monk-border/70"
  };

  const accentBorder: Record<TimelineEventType, string> = {
    season_started: "border-l-monk-accent",
    season_completed: "border-l-monk-success/30",
    goal_created: "border-l-monk-accent",
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? "border-l-monk-warning/30"
      : "border-l-monk-success/30",
    learning_session: "border-l-monk-accent",
    journal_entry: "border-l-monk-border-strong"
  };

  const timeLabel = new Date(event.occurredAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex gap-3">
      {/* Visual Spine */}
      <div className="flex flex-col items-center">
        <div className={`grid h-8 w-8 place-items-center rounded-xl border shadow-inner ${bgClasses[event.type]}`}>
          {icons[event.type]}
        </div>
        <div className="w-[1.5px] flex-1 bg-gradient-to-b from-monk-border-strong to-transparent min-h-[22px] my-1 opacity-70" />
      </div>

      {/* Content Card */}
      <div className="flex-1 pb-4 min-w-0">
        <p className="mb-1 font-mono text-[10px] text-monk-muted tabular-nums">
          {timeLabel}
        </p>

        <div className={`rounded-xl border border-monk-border/70 border-l-[3px] ${accentBorder[event.type]} bg-monk-surface/90 p-3.5 shadow-xs transition-all duration-200 hover:border-monk-accent/30`}>
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs font-bold text-monk-text leading-tight tracking-wide">
              {displayTitle}
            </h4>

            {event.type === "focus_session" || event.type === "learning_session" ? (
              <button
                type="button"
                aria-label={t("timeline.deleteAria")}
                title={t("timeline.deleteTitle")}
                className="text-monk-muted/50 hover:text-monk-danger hover:bg-monk-danger/10 p-1 rounded-md transition active:scale-90 shrink-0"
                onClick={() => {
                  if (window.confirm(t("timeline.deleteConfirm"))) {
                    store.removeTimelineEvent(event.id);
                  }
                }}
              >
                <Trash2 size={12} />
              </button>
            ) : null}
          </div>

          {displayDescription ? (
            <p className="mt-1.5 text-xs text-monk-muted leading-relaxed whitespace-pre-line">
              {displayDescription}
            </p>
          ) : null}

          {journalItems.length > 0 ? (
            <div className="mt-2.5 space-y-2 border-t border-monk-border/40 pt-2.5">
              {journalItems.map((item) => (
                <div key={item.id} className="rounded-lg bg-monk-soft/50 border border-monk-border/40 p-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-monk-text-soft">
                    {item.question}
                  </p>
                  <p className="mt-0.5 text-xs font-medium leading-relaxed text-monk-text">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function TimelineScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const lang = useLanguage();
  const season = store.activeSeason!;
  const today = getTodayDateString();
  const reduceMotion = useReducedMotion();

  const [viewMode, setViewMode] = useState<TimelineViewMode>("daily");
  const [retroDate, setRetroDate] = useState<string | null>(null);
  const [planningModalOpen, setPlanningModalOpen] = useState<boolean>(false);
  const [proModalOpen, setProModalOpen] = useState(false);
  // D7: lets the Season view open a goal's blueprint — the goal entity was
  // otherwise unreachable from the screen that displays goal tracks.
  const [blueprintGoalId, setBlueprintGoalId] = useState<string | null>(null);

  // Week navigation state for Weekly View
  const currentWeekNum = useMemo(() => getCurrentWeekNumber(season.startDate, today), [season.startDate, today]);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeekNum);

  // Month navigation and calendar grid state for Monthly View
  const [viewYearMonth, setViewYearMonth] = useState<{ year: number; month: number }>(() => {
    const d = parseLocalDateKey(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Selected date inspector state for Monthly View
  const [selectedMonthDate, setSelectedMonthDate] = useState<string>(today);

  // Generate complete rectangular Monday-aligned calendar month grid
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(viewYearMonth.year, viewYearMonth.month, 1);
    const daysInMonth = new Date(viewYearMonth.year, viewYearMonth.month + 1, 0).getDate();
    // Monday = 0, Sunday = 6
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;
    const seasonEndDate = addDaysToDate(season.startDate, season.durationDays - 1);

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isWithinSeason: boolean;
    }> = [];

    // Trailing days of previous month
    if (startDayOfWeek > 0) {
      const prevMonthLastDay = new Date(viewYearMonth.year, viewYearMonth.month, 0).getDate();
      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const d = new Date(viewYearMonth.year, viewYearMonth.month - 1, day);
        const dateStr = format(d, "yyyy-MM-dd");
        cells.push({
          dateStr,
          dayNum: day,
          isCurrentMonth: false,
          isWithinSeason: dateStr >= season.startDate && dateStr <= seasonEndDate
        });
      }
    }

    // Days in current month (guaranteed 1 to daysInMonth)
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYearMonth.year, viewYearMonth.month, day);
      const dateStr = format(d, "yyyy-MM-dd");
      cells.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        isWithinSeason: dateStr >= season.startDate && dateStr <= seasonEndDate
      });
    }

    // Leading days of next month to complete 7-day row
    const remainder = cells.length % 7;
    const trailingCount = remainder === 0 ? 0 : 7 - remainder;
    for (let day = 1; day <= trailingCount; day++) {
      const d = new Date(viewYearMonth.year, viewYearMonth.month + 1, day);
      const dateStr = format(d, "yyyy-MM-dd");
      cells.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: false,
        isWithinSeason: dateStr >= season.startDate && dateStr <= seasonEndDate
      });
    }

    // Group into rows of 7
    const rows: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [viewYearMonth.year, viewYearMonth.month, season.startDate, season.durationDays]);

  const isViewingTodayMonth = useMemo(() => {
    const d = parseLocalDateKey(today);
    return d.getFullYear() === viewYearMonth.year && d.getMonth() === viewYearMonth.month;
  }, [today, viewYearMonth]);

  const handlePrevMonth = () => {
    setViewYearMonth((curr) =>
      curr.month === 0 ? { year: curr.year - 1, month: 11 } : { year: curr.year, month: curr.month - 1 }
    );
  };

  const handleNextMonth = () => {
    setViewYearMonth((curr) =>
      curr.month === 11 ? { year: curr.year + 1, month: 0 } : { year: curr.year, month: curr.month + 1 }
    );
  };

  const handleTodayMonth = () => {
    const d = parseLocalDateKey(today);
    setViewYearMonth({ year: d.getFullYear(), month: d.getMonth() });
    setSelectedMonthDate(today);
  };

  const monthSeasonStats = useMemo(() => {
    let totalInMonth = 0;
    let seasonDaysInMonth = 0;
    let completedInMonth = 0;

    calendarGrid.forEach((week) => {
      week.forEach((cell) => {
        if (cell.isCurrentMonth) {
          totalInMonth++;
          if (cell.isWithinSeason) {
            seasonDaysInMonth++;
            const status = getDailyStatusForDate(store, cell.dateStr);
            if (status === "completed") completedInMonth++;
          }
        }
      });
    });

    return { totalInMonth, seasonDaysInMonth, completedInMonth };
  }, [calendarGrid, store]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    const seenEventSources = new Set<string>();

    store.timelineEvents
      .filter((event) => event.seasonId === season.id || !event.seasonId)
      .forEach((event) => {
        const raw = event.occurredAt || event.createdAt || event.focusSession?.startedAt;
        if (!raw) return;
        const date = raw.slice(0, 10);
        if (!date) return;
        if (!groups[date]) {
          groups[date] = [];
        }
        if (event.sourceId) seenEventSources.add(event.sourceId);
        groups[date].push(event.occurredAt ? event : { ...event, occurredAt: raw });
      });

    // Fallback: If any focus session in store.focusSessions has no timeline event, include it
    store.focusSessions
      .filter((s) => (s.seasonId === season.id || !s.seasonId) && !seenEventSources.has(s.id))
      .forEach((s) => {
        const raw = s.startedAt || s.createdAt || s.startTime || s.endedAt || s.completedAt;
        if (!raw) return;
        const date = raw.slice(0, 10);
        if (!groups[date]) groups[date] = [];
        const preset = s.preset ?? s.timerMode ?? "deep_work";
        const mins = s.focusDurationMinutes ?? s.completedDurationMinutes ?? s.durationMinutes ?? 0;
        if (mins > 0 || s.status === "completed" || s.status === "ended_early") {
          groups[date].push({
            id: `synth_${s.id}`,
            type: "focus_session",
            seasonId: season.id,
            relatedGoalId: s.goalId || null,
            sourceId: s.id,
            title: `${FOCUS_PRESETS[preset]?.shortLabel ?? "Focus"} ${s.status === "completed" ? t("timeline.focusCompleted") : ""}`,
            description: t("timeline.month.focusLogged", { n: mins }),
            occurredAt: raw,
            createdAt: raw,
            focusSession: s as unknown as any
          });
        }
      });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        events: groups[date].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      }));
  }, [store.timelineEvents, store.focusSessions, season.id, t]);

  const DOW =
    lang === "id"
      ? ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // High-contrast, tactile calendar tile styles
  function getStatusTileStyle(cell: {
    dateStr: string;
    isCurrentMonth: boolean;
    isWithinSeason: boolean;
  }) {
    const { dateStr, isCurrentMonth, isWithinSeason } = cell;
    const status = getDailyStatusForDate(store, dateStr);
    const isDateToday = dateStr === today;
    const isFuture = dateStr > today;

    // 1. Outside current month (adjacent month padding)
    if (!isCurrentMonth) {
      return {
        tileClass: "bg-monk-soft/20 border-monk-border/30 text-monk-muted/50 hover:border-monk-border/60 hover:text-monk-muted transition",
        numClass: "text-monk-muted/60 font-medium",
        iconElement: null
      };
    }

    // 2. Current month, but outside active season range
    if (!isWithinSeason) {
      if (status === "completed") {
        return {
          tileClass: "bg-monk-success-soft border-monk-success/30 text-monk-text",
          numClass: "text-monk-success font-bold",
          iconElement: <Check size={11} strokeWidth={2.5} className="text-monk-success" />
        };
      }
      if (status === "rest") {
        return {
          tileClass: "bg-monk-rest-soft border-monk-rest/30 text-monk-text",
          numClass: "text-monk-rest font-bold",
          iconElement: <Moon size={11} strokeWidth={2} className="text-monk-rest" />
        };
      }
      if (status === "partial") {
        return {
          tileClass: "bg-monk-warning-soft border-monk-warning/30 text-monk-text",
          numClass: "text-monk-warning font-bold",
          iconElement: <Flame size={11} strokeWidth={2} className="text-monk-warning" />
        };
      }
      return {
        tileClass: "bg-monk-surface/40 border-monk-border/40 text-monk-muted/70 hover:border-monk-border-strong",
        numClass: "text-monk-muted/80 font-medium",
        iconElement: null
      };
    }

    // 3. Current month, within season, FUTURE day
    if (isFuture) {
      return {
        tileClass: "bg-monk-surface/40 border-monk-border/50 text-monk-muted hover:border-monk-border-strong",
        numClass: "text-monk-muted/80 font-medium",
        iconElement: null
      };
    }

    // 4. Current month, within season, TODAY
    if (isDateToday) {
      if (status === "completed") {
        return {
          tileClass: "bg-monk-success-soft border-monk-success/30 ring-2 ring-monk-accent text-monk-text shadow-sm",
          numClass: "text-monk-text font-black",
          iconElement: <Check size={11} strokeWidth={3} className="text-monk-success" />
        };
      }
      if (status === "rest") {
        return {
          tileClass: "bg-monk-rest-soft border-monk-rest/30 ring-2 ring-monk-accent text-monk-text shadow-sm",
          numClass: "text-monk-text font-black",
          iconElement: <Moon size={11} strokeWidth={2.5} className="text-monk-rest" />
        };
      }
      if (status === "partial") {
        return {
          tileClass: "bg-monk-warning-soft border-monk-warning/30 ring-2 ring-monk-accent text-monk-text shadow-sm",
          numClass: "text-monk-warning font-black",
          iconElement: <Flame size={11} strokeWidth={2.5} className="text-monk-warning" />
        };
      }
      if (status === "relapse" || status === "missed") {
        return {
          tileClass: "bg-monk-danger-soft border-monk-danger/30 ring-2 ring-monk-accent text-monk-text shadow-sm",
          numClass: "text-monk-danger font-black",
          iconElement: <X size={10} strokeWidth={3} className="text-monk-danger" aria-hidden="true" />
        };
      }
      return {
        tileClass: "bg-monk-surface-raised border-monk-accent ring-2 ring-monk-accent text-monk-text shadow-sm",
        numClass: "text-monk-accent font-black",
        iconElement: <span className="h-1.5 w-1.5 rounded-full bg-monk-accent animate-pulse" />
      };
    }

    // 5. Current month, within season, PAST days
    if (status === "completed") {
      return {
        tileClass: "bg-monk-success-soft border-monk-success/30 hover:border-monk-success/30 text-monk-text",
        numClass: "text-monk-text font-bold",
        iconElement: <Check size={11} strokeWidth={3} className="text-monk-success" />
      };
    }
    if (status === "rest") {
      return {
        tileClass: "bg-monk-rest-soft border-monk-rest/30 hover:border-monk-rest/30 text-monk-text",
        numClass: "text-monk-text font-bold",
        iconElement: <Moon size={11} strokeWidth={2.2} className="text-monk-rest" />
      };
    }
    if (status === "partial") {
      return {
        tileClass: "bg-monk-warning-soft border-monk-warning/30 hover:border-monk-warning/30 text-monk-text",
        numClass: "text-monk-warning font-bold",
        iconElement: <Flame size={11} strokeWidth={2.5} className="text-monk-warning" />
      };
    }
    if (status === "missed" || status === "relapse") {
      return {
        tileClass: "bg-monk-danger-soft border-monk-danger/30 hover:border-monk-danger/30 text-monk-danger",
        numClass: "text-monk-danger font-bold",
        iconElement: <X size={10} strokeWidth={3} className="text-monk-danger" aria-hidden="true" />
      };
    }

    return {
      tileClass: "bg-monk-soft border-monk-border/70 hover:border-monk-border-strong text-monk-text",
      numClass: "text-monk-text font-bold",
      iconElement: null
    };
  }

  // Selected week dates (7 days)
  const selectedWeekDates = useMemo(() => {
    const start = getWeekStartDate(season.startDate, selectedWeek);
    return datesInRange(start, 7);
  }, [season.startDate, selectedWeek]);

  // Tab items config
  const tabItems: Array<{ key: TimelineViewMode; label: string; icon: typeof Clock }> = [
    { key: "daily", label: t("timeline.view.daily"), icon: Clock },
    { key: "weekly", label: t("timeline.view.weekly"), icon: Calendar },
    { key: "monthly", label: t("timeline.view.monthly"), icon: Target },
    { key: "season", label: t("timeline.view.season"), icon: Trophy }
  ];

  const seasonMonthLabel = useMemo(() => {
    try {
      const d = new Date(viewYearMonth.year, viewYearMonth.month, 1);
      const locale = lang === "id" ? "id-ID" : "en-US";
      return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
    } catch {
      return t("timeline.month.title");
    }
  }, [viewYearMonth, lang, t]);

  const daysPassedCount = Math.min(season.durationDays, getDaysPassed(season.startDate, today));

  return (
    <>
      <PageHeader
        title={t("timeline.title")}
        subtitle={t("timeline.subtitle")}
        rightSlot={<SettingsLink onOpenPro={() => setProModalOpen(true)} />}
      />

      <div className="space-y-5">
        {/* View Switcher Tabs: Daily | Weekly | Monthly | Season with animated pill */}
        <div className="relative flex rounded-2xl border border-monk-border/80 bg-monk-soft/50 p-1 text-xs font-semibold shadow-2xs">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setViewMode(tab.key)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 z-10 transition-colors active:scale-95 ${
                  isActive ? "text-monk-text font-bold" : "text-monk-muted hover:text-monk-text"
                }`}
              >
                {isActive && !reduceMotion ? (
                  <motion.div
                    layoutId="active-view-tab"
                    className="absolute inset-0 rounded-xl bg-monk-surface border border-monk-border/80 shadow-xs"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                ) : isActive ? (
                  <div className="absolute inset-0 rounded-xl bg-monk-surface border border-monk-border/80 shadow-xs" />
                ) : null}

                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon size={13} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* ── DAILY VIEW ── */}
        {viewMode === "daily" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Detailed time block visualizer with live NOW line & agenda mode */}
            <DayTimeBlockVisualizer
              date={today}
              onOpenPlanning={() => setPlanningModalOpen(true)}
            />

            {/* Today Activity Log */}
            <div className="min-w-0 space-y-3 pt-2">
              <SectionHeader
                title={t("timeline.todayLogTitle")}
                subtitle={t("timeline.todayLogSubtitle", { date: today })}
              />

              {(() => {
                const todayEvents = groupedEvents.find((g) => g.date === today)?.events ?? [];
                if (todayEvents.length === 0) {
                  return (
                    <Card className="p-6 text-center text-xs text-monk-muted border border-monk-border/70">
                      <div className="grid h-10 w-10 mx-auto place-items-center rounded-xl bg-monk-soft/80 text-monk-muted border border-monk-border/40">
                        <Sparkles size={16} />
                      </div>
                      <p className="mt-3 font-medium text-monk-text">
                        {t("timeline.todayLogEmpty")}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate(routes.today)}
                        className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-monk-accent px-3 py-1.5 text-xs font-bold text-monk-bg transition-all hover:bg-monk-accent/90 active:scale-95 shadow-xs"
                      >
                        <span>{t("timeline.emptyAction")}</span>
                        <ArrowRight size={12} />
                      </button>
                    </Card>
                  );
                }

                return (
                  <div className="space-y-0">
                    {todayEvents.map((event) => (
                      <TimelineEventRow key={event.id} event={event} />
                    ))}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}

        {/* ── WEEKLY VIEW ── */}
        {viewMode === "weekly" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Week navigation control */}
            <div className="rounded-2xl border border-monk-border/80 bg-monk-surface p-3 sm:p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={selectedWeek <= 1}
                  onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
                  className="grid h-8 w-8 place-items-center rounded-lg text-monk-muted hover:text-monk-text hover:bg-monk-soft disabled:opacity-30 transition active:scale-95 border border-monk-border/60"
                  aria-label={t("timeline.month.prevWeek")}
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="text-center min-w-0">
                  <div className="flex items-center justify-center gap-1.5">
                    <p className="text-xs font-bold text-monk-text uppercase tracking-wider">
                      {t("timeline.weekLabel", { n: selectedWeek })}
                    </p>
                    {selectedWeek === currentWeekNum ? (
                      <span className="rounded-full bg-monk-accent/15 px-2 py-0.2 text-[9px] font-bold text-monk-accent border border-monk-accent/30">
                        {t("timeline.todayBadge")}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] font-mono text-monk-muted mt-0.5">
                    {t("timeline.weekRange", { start: selectedWeekDates[0], end: selectedWeekDates[6] })}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={selectedWeek >= Math.ceil(season.durationDays / 7)}
                  onClick={() => setSelectedWeek((w) => w + 1)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-monk-muted hover:text-monk-text hover:bg-monk-soft disabled:opacity-30 transition active:scale-95 border border-monk-border/60"
                  aria-label={t("timeline.month.nextWeek")}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {selectedWeek !== currentWeekNum ? (
                <div className="text-center pt-1 border-t border-monk-border/50">
                  <button
                    type="button"
                    onClick={() => setSelectedWeek(currentWeekNum)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-monk-accent hover:underline transition"
                  >
                    <RotateCcw size={11} />
                    <span>Kembali ke minggu ini</span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* 7 Days of the Week list */}
            <div className="space-y-2.5">
              {selectedWeekDates.map((dateStr, idx) => {
                const status = getDailyStatusForDate(store, dateStr);
                const isDateToday = dateStr === today;
                const isFuture = dateStr > today;
                const dayPlan = store.dayPlans.find((d) => d.seasonId === season.id && d.date === dateStr);
                const goal = dayPlan?.goalId ? store.goals.find((g) => g.id === dayPlan.goalId) : undefined;
                const focusSecs = selectTotalFocusSecondsForDate(store, dateStr);
                const focusMins = Math.round(focusSecs / 60);
                const isEligible = isRetroEligible(dateStr, status, today);

                const isCompleted = status === "completed" || (isDateToday && dayPlan?.status === "completed");
                const isRest = status === "rest" || dayPlan?.dayType === "rest";
                const isPartial = status === "partial";
                const isMissed = (status === "missed" || status === "relapse" || (!isFuture && !dayPlan && !isDateToday));

                return (
                  <Card
                    key={dateStr}
                    className={`p-3.5 sm:p-4 transition-all duration-150 ${
                      isDateToday
                        ? "border-monk-accent/60 ring-1 ring-monk-accent/40 bg-monk-soft/40"
                        : "border-monk-border/70 hover:border-monk-border-strong"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Day pill */}
                        <div className={`text-center w-10 shrink-0 py-1 rounded-xl border ${
                          isDateToday
                            ? "bg-monk-accent/20 border-monk-accent/50 text-monk-accent"
                            : "bg-monk-soft border-monk-border/70 text-monk-muted"
                        }`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider block leading-none">
                            {DOW[idx]}
                          </span>
                          <p className="text-xs font-mono font-bold text-monk-text mt-0.5 leading-none">
                            {dateStr.slice(8)}
                          </p>
                        </div>

                        {/* Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isFuture ? (
                              <span className="rounded-md border border-monk-border bg-monk-surface px-1.5 py-0.5 text-[10px] font-semibold text-monk-muted">
                                {t("week.upcoming")}
                              </span>
                            ) : isCompleted ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-monk-success/30 bg-monk-success-soft px-1.5 py-0.5 text-[10px] font-bold text-monk-success">
                                <Check size={11} strokeWidth={2.5} />
                                <span>{t("timeline.streak.completed")}</span>
                              </span>
                            ) : isRest ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-monk-rest/30 bg-monk-rest-soft px-1.5 py-0.5 text-[10px] font-bold text-monk-rest">
                                <Moon size={11} />
                                <span>{t("timeline.streak.rest")}</span>
                              </span>
                            ) : isPartial ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-monk-warning/30 bg-monk-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-monk-warning">
                                <Flame size={11} />
                                <span>{t("timeline.streak.partial")}</span>
                              </span>
                            ) : isMissed ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-monk-danger/30 bg-monk-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-monk-danger">
                                <AlertTriangle size={11} />
                                <span>{t("timeline.streak.missed")}</span>
                              </span>
                            ) : (
                              <span className="rounded-md border border-monk-border bg-monk-surface px-1.5 py-0.5 text-[10px] font-semibold text-monk-muted">
                                {t("timeline.noAction")}
                              </span>
                            )}

                            {isDateToday ? (
                              <span className="rounded-full bg-monk-accent/15 px-2 py-0.2 text-[9px] font-bold text-monk-accent border border-monk-accent/30">
                                {t("timeline.todayBadge")}
                              </span>
                            ) : null}
                          </div>

                          <p className="text-xs font-semibold text-monk-text mt-1 truncate max-w-xs">
                            {dayPlan?.mainAction || goal?.keystoneAction || (isRest ? t("timeline.restDay") : t("timeline.noAction"))}
                          </p>
                        </div>
                      </div>

                      {/* Right action / stats */}
                      <div className="flex items-center gap-2 shrink-0">
                        {focusMins > 0 ? (
                          <span className="font-mono text-xs font-bold text-monk-accent bg-monk-accent/10 px-2 py-0.5 rounded-lg border border-monk-accent/30">
                            {focusMins} mnt
                          </span>
                        ) : null}

                        {isEligible ? (
                          <button
                            type="button"
                            onClick={() => setRetroDate(dateStr)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-monk-accent hover:underline px-2.5 py-1 rounded-lg bg-monk-accent/10 border border-monk-accent/30 transition active:scale-95"
                          >
                            <Plus size={12} />
                            <span>{t("timeline.retroLog")}</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <DayCountsCard />
          </motion.div>
        )}

        {/* ── MONTHLY VIEW (CALENDAR) ── */}
        {viewMode === "monthly" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <Card className="p-4 sm:p-5 space-y-4 border border-monk-border/80 bg-monk-surface/90">
              {/* Calendar Header with Month/Year Navigation & Season Progress */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-monk-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="grid h-8 w-8 place-items-center rounded-lg text-monk-muted hover:text-monk-text hover:bg-monk-soft border border-monk-border/60 transition active:scale-95"
                    aria-label={t("timeline.month.prev")}
                    title={t("timeline.month.prev")}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-monk-text tracking-wide capitalize leading-none">
                      {seasonMonthLabel}
                    </h3>
                    <p className="text-[11px] text-monk-muted mt-1 leading-none">
                      {monthSeasonStats.seasonDaysInMonth > 0
                        ? t("timeline.month.seasonProgressMonth", {
                            completed: monthSeasonStats.completedInMonth,
                            total: monthSeasonStats.seasonDaysInMonth,
                          })
                        : t("timeline.month.outOfSeason")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isViewingTodayMonth ? (
                    <button
                      type="button"
                      onClick={handleTodayMonth}
                      className="inline-flex items-center gap-1 rounded-lg border border-monk-accent/30 bg-monk-accent/10 px-2 py-1 text-[11px] font-bold text-monk-accent hover:bg-monk-accent/20 transition active:scale-95"
                    >
                      <RotateCcw size={11} />
                      <span>{t("timeline.month.currentMonth")}</span>
                    </button>
                  ) : (
                    <span className="font-mono text-xs font-bold text-monk-accent bg-monk-accent/15 border border-monk-accent/30 px-2.5 py-1 rounded-lg">
                      {t("timeline.month.dayCounter", { day: daysPassedCount, total: season.durationDays })}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="grid h-8 w-8 place-items-center rounded-lg text-monk-muted hover:text-monk-text hover:bg-monk-soft border border-monk-border/60 transition active:scale-95"
                    aria-label={t("timeline.month.next")}
                    title={t("timeline.month.next")}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Day-of-week header row */}
              <div className="grid grid-cols-7 gap-1.5 text-center bg-monk-soft/50 py-1.5 px-1 rounded-xl border border-monk-border/40">
                {DOW.map((d, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold uppercase tracking-wider text-monk-text-soft"
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Heatmap Grid with High-Contrast Stone Tiles */}
              <div className="space-y-1.5">
                {calendarGrid.map((week, wi) => {
                  return (
                    <div key={wi} className="grid grid-cols-7 gap-1.5 sm:gap-2">
                      {week.map((cell) => {
                        const isDateToday = cell.dateStr === today;
                        const isSelected = cell.dateStr === selectedMonthDate;
                        const tile = getStatusTileStyle(cell);
                        const cellStatus = getDailyStatusForDate(store, cell.dateStr);
                        const statusLabel = !cell.isCurrentMonth
                          ? t("timeline.month.outOfSeason")
                          : cellStatus === "completed"
                            ? t("timeline.legend.done")
                            : cellStatus === "rest"
                              ? t("timeline.legend.rest")
                              : cellStatus === "partial"
                                ? t("timeline.legend.partial")
                                : cellStatus === "relapse"
                                  ? t("timeline.legend.relapse")
                                  : cellStatus === "not_started"
                                    ? t("timeline.legend.notStarted")
                                    : t("timeline.legend.missed");
                        const cellLabel = t("timeline.month.cellAria", {
                          date: formatHumanDate(cell.dateStr),
                          status: statusLabel,
                        });

                        return (
                          <button
                            key={cell.dateStr}
                            type="button"
                            onClick={() => {
                              setSelectedMonthDate(cell.dateStr);
                              if (!cell.isCurrentMonth) {
                                const d = parseLocalDateKey(cell.dateStr);
                                setViewYearMonth({ year: d.getFullYear(), month: d.getMonth() });
                              }
                            }}
                            className={`w-full aspect-square rounded-xl border p-1 sm:p-1.5 flex flex-col items-center justify-between transition-all duration-150 relative ${tile.tileClass} ${
                              isDateToday ? "ring-2 ring-monk-accent scale-[1.02] z-10" : ""
                            } ${isSelected && !isDateToday ? "ring-2 ring-white/80 scale-[1.02] z-10" : ""}`}
                            aria-label={cellLabel}
                            title={cellLabel}
                          >
                            <span className={`text-xs font-mono tabular-nums leading-none ${tile.numClass}`}>
                              {cell.dayNum}
                            </span>
                            <div className="h-3 flex items-center justify-center">
                              {tile.iconElement}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Inspected Date Detail Drawer */}
              {selectedMonthDate ? (() => {
                const inspectedStatus = getDailyStatusForDate(store, selectedMonthDate);
                const inspectedPlan = store.dayPlans.find((d) => d.seasonId === season.id && d.date === selectedMonthDate);
                const goal = inspectedPlan?.goalId ? store.goals.find((g) => g.id === inspectedPlan.goalId) : undefined;
                const inspectedFocusSecs = selectTotalFocusSecondsForDate(store, selectedMonthDate);
                const inspectedFocusMins = Math.round(inspectedFocusSecs / 60);
                const inspectedEligible = isRetroEligible(selectedMonthDate, inspectedStatus, today);
                const isDateToday = selectedMonthDate === today;
                const isFuture = selectedMonthDate > today;

                const seasonEndDate = addDaysToDate(season.startDate, season.durationDays - 1);
                const isInspectedInSeason = selectedMonthDate >= season.startDate && selectedMonthDate <= seasonEndDate;
                const dayNumber = isInspectedInSeason
                  ? differenceInCalendarDays(parseLocalDateKey(selectedMonthDate), parseLocalDateKey(season.startDate)) + 1
                  : null;

                let formattedDate = selectedMonthDate;
                try {
                  const d = parseLocalDateKey(selectedMonthDate);
                  formattedDate = d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  });
                } catch {
                  /* fallback */
                }

                return (
                  <div className="rounded-xl border border-monk-border-strong bg-monk-surface-raised/90 p-3.5 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar size={14} className="text-monk-accent shrink-0" />
                        <span className="text-xs font-bold text-monk-text capitalize truncate">
                          {formattedDate}
                        </span>
                        {isDateToday ? (
                          <span className="rounded-full bg-monk-accent/20 px-2 py-0.5 text-[9px] font-bold text-monk-accent border border-monk-accent/40 shrink-0">
                            {t("timeline.todayBadge")}
                          </span>
                        ) : isInspectedInSeason && dayNumber ? (
                          <span className="rounded-full bg-monk-soft px-2 py-0.5 text-[9px] font-mono font-semibold text-monk-muted border border-monk-border/60 shrink-0">
                            {t("timeline.month.seasonDayBadge", { day: dayNumber })}
                          </span>
                        ) : (
                          <span className="rounded-full bg-monk-soft/50 px-2 py-0.5 text-[9px] font-semibold text-monk-muted/70 border border-monk-border/40 shrink-0">
                            {t("timeline.month.outOfSeason")}
                          </span>
                        )}
                      </div>

                      {/* Status chip */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!isInspectedInSeason ? (
                          <span className="rounded-md border border-monk-border/60 bg-monk-surface px-2 py-0.5 text-[10px] font-semibold text-monk-muted">
                            {t("timeline.month.outOfSeason")}
                          </span>
                        ) : isFuture ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-monk-border bg-monk-surface px-2 py-0.5 text-[10px] font-semibold text-monk-muted">
                            <Clock size={11} />
                            <span>{t("week.upcoming")}</span>
                          </span>
                        ) : inspectedStatus === "completed" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-monk-success-soft border border-monk-success/30 px-2 py-0.5 text-[10px] font-bold text-monk-success">
                            <Check size={11} strokeWidth={2.5} />
                            <span>{t("timeline.streak.completed")}</span>
                          </span>
                        ) : inspectedStatus === "rest" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-monk-rest-soft border border-monk-rest/30 px-2 py-0.5 text-[10px] font-bold text-monk-rest">
                            <Moon size={11} />
                            <span>{t("timeline.streak.rest")}</span>
                          </span>
                        ) : inspectedStatus === "partial" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-monk-warning-soft border border-monk-warning/30 px-2 py-0.5 text-[10px] font-bold text-monk-warning">
                            <Flame size={11} />
                            <span>{t("timeline.streak.partial")}</span>
                          </span>
                        ) : inspectedStatus === "missed" || inspectedStatus === "relapse" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-monk-danger-soft border border-monk-danger/30 px-2 py-0.5 text-[10px] font-bold text-monk-danger">
                            <X size={11} strokeWidth={3} aria-hidden="true" />
                            <span>{t("timeline.streak.missed")}</span>
                          </span>
                        ) : (
                          <span className="rounded-md border border-monk-border bg-monk-surface px-2 py-0.5 text-[10px] font-semibold text-monk-muted">
                            {t("timeline.noAction")}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isInspectedInSeason ? (
                      <div className="flex items-center justify-between gap-2 border-t border-monk-border/50 pt-2 text-xs">
                        <p className="text-monk-muted">
                          {t("timeline.month.outsideDesc", { duration: season.durationDays })}
                        </p>
                        <button
                          type="button"
                          onClick={handleTodayMonth}
                          className="shrink-0 text-xs font-bold text-monk-accent hover:underline"
                        >
                          {t("timeline.month.openTodayAction")}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-monk-border/50 pt-2 text-xs">
                          <p className="text-monk-muted font-medium truncate max-w-xs">
                            {inspectedPlan?.mainAction || goal?.keystoneAction || (inspectedStatus === "rest" ? t("timeline.restDay") : t("timeline.noAction"))}
                          </p>
                          {inspectedFocusMins > 0 ? (
                            <span className="font-mono text-xs font-bold text-monk-accent bg-monk-accent/15 px-2 py-0.5 rounded-md border border-monk-accent/30">
                              {t("timeline.month.focusLogged", { n: inspectedFocusMins })}
                            </span>
                          ) : null}
                        </div>

                        {/* Productivity Framework Insight */}
                        {inspectedStatus === "completed" ? (
                          <div className="rounded-lg bg-monk-success-soft border border-monk-success/30 px-2.5 py-1.5 text-[11px] text-monk-success leading-relaxed">
                            <span className="font-semibold text-monk-success">{t("timeline.insight.deepWorkTitle")}</span> {t("timeline.insight.deepWorkBody")}
                          </div>
                        ) : inspectedStatus === "rest" ? (
                          <div className="rounded-lg bg-monk-rest-soft border border-monk-rest/30 px-2.5 py-1.5 text-[11px] text-monk-rest leading-relaxed">
                            <span className="font-semibold text-monk-rest">{t("timeline.insight.restTitle")}</span> {t("timeline.insight.restBody")}
                          </div>
                        ) : inspectedStatus === "partial" ? (
                          <div className="rounded-lg bg-monk-warning-soft border border-monk-warning/30 px-2.5 py-1.5 text-[11px] text-monk-warning leading-relaxed">
                            <span className="font-semibold text-monk-warning">{t("timeline.insight.partialTitle")}</span> {t("timeline.insight.partialBody")}
                          </div>
                        ) : inspectedStatus === "missed" && !isFuture && !isDateToday ? (
                          <div className="rounded-lg bg-monk-danger-soft border border-monk-danger/30 px-2.5 py-1.5 text-[11px] text-monk-danger leading-relaxed">
                            <span className="font-semibold text-monk-danger">{t("timeline.insight.missedTitle")}</span> {t("timeline.insight.missedBody")}
                          </div>
                        ) : null}

                        {isDateToday ? (
                          <button
                            type="button"
                            onClick={() => navigate(routes.today)}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-monk-accent py-2 text-xs font-bold text-monk-bg shadow-sm active:scale-98 transition hover:bg-monk-accent/90"
                          >
                            <span>{t("timeline.month.openTodayAction")}</span>
                            <ArrowRight size={13} />
                          </button>
                        ) : inspectedEligible ? (
                          <button
                            type="button"
                            onClick={() => setRetroDate(selectedMonthDate)}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-monk-accent py-2 text-xs font-bold text-monk-bg shadow-sm active:scale-98 transition hover:bg-monk-accent/90"
                          >
                            <Plus size={14} />
                            <span>{t("timeline.retroLog")} - Catat Sesi Terlewat</span>
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })() : null}

              {/* Legend with matching tactile chips */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-monk-border/50 pt-3 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-md bg-monk-success-soft border border-monk-success/30 px-2 py-0.5 font-semibold text-monk-success">
                  <Check size={10} strokeWidth={3} />
                  <span>{t("timeline.streak.completed")}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-monk-rest-soft border border-monk-rest/30 px-2 py-0.5 font-semibold text-monk-rest">
                  <Moon size={10} strokeWidth={2} />
                  <span>{t("timeline.streak.rest")}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-monk-warning-soft border border-monk-warning/30 px-2 py-0.5 font-semibold text-monk-warning">
                  <Flame size={10} strokeWidth={2} />
                  <span>{t("timeline.streak.partial")}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-monk-danger-soft border border-monk-danger/30 px-2 py-0.5 font-semibold text-monk-danger">
                  <X size={10} strokeWidth={2.5} aria-hidden="true" />
                  <span>{t("timeline.streak.missed")}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-monk-surface/40 border border-monk-border/50 px-2 py-0.5 font-semibold text-monk-muted">
                  <span>{t("week.upcoming")}</span>
                </span>
              </div>
            </Card>

            <DayCountsCard />
          </motion.div>
        )}

        {/* ── SEASON VIEW ── */}
        {viewMode === "season" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* High-level Focus Time and Returns Consistency at top */}
            <TimelineStats />
            <DayCountsCard />
            <SeasonProgressCard onOpenGoal={setBlueprintGoalId} />
            <WhyCard />

            {/* Timeline Activity Feed */}
            <div className="space-y-4 pt-2 min-w-0">
              <SectionHeader title={t("timeline.activity")} subtitle={t("timeline.activitySubtitle")} />
              {groupedEvents.length === 0 ? (
                <EmptyState
                  title={t("timeline.emptyTitle")}
                  description={t("timeline.emptyDesc")}
                  actionLabel={t("timeline.emptyAction")}
                  onAction={() => navigate(routes.today)}
                />
              ) : (
                <div className="space-y-5">
                  {groupedEvents.map((group) => {
                    const isDateToday = group.date === today;
                    const isYesterday = group.date === addDaysToDate(today, -1);
                    const groupTitle = isDateToday ? t("timeline.today") : (isYesterday ? t("timeline.yesterday") : formatHumanDate(group.date));

                    return (
                      <div key={group.date} className="space-y-3">
                        <div className="sticky top-0 z-10 bg-monk-bg/90 backdrop-blur-md pt-1.5 pb-1.5 -mx-1 px-1 flex items-center gap-2 border-b border-monk-border/40">
                          <p className="text-xs font-bold text-monk-accent uppercase tracking-wider">{groupTitle}</p>
                          <span className="text-[10px] font-bold text-monk-muted bg-monk-surface border border-monk-border/50 px-1.5 py-0.5 rounded-full">
                            {group.events.length}
                          </span>
                        </div>
                        <div className="space-y-0">
                          {group.events.map((event, index) => (
                            <motion.div
                              key={event.id}
                              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, delay: index * 0.04 }}
                            >
                              <TimelineEventRow event={event} />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <RetroLogModal open={!!retroDate} date={retroDate} onClose={() => setRetroDate(null)} />
      <MorningPlanningModal isOpen={planningModalOpen} onClose={() => setPlanningModalOpen(false)} date={today} />
      <ZendoProModal isOpen={proModalOpen} onClose={() => setProModalOpen(false)} />
      <GoalBlueprintModal
        goalId={blueprintGoalId}
        isOpen={!!blueprintGoalId}
        onClose={() => setBlueprintGoalId(null)}
      />
    </>
  );
}
