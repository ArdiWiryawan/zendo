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
  XCircle,
  Plus
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Card,
  EmptyState,
  PageHeader,
  SectionHeader,
  SettingsLink,
  GhostButton,
  PrimaryButton,
  SecondaryButton
} from "../components/ui";
import { RetroLogModal } from "../components/RetroLogModal";
import { MorningPlanningModal } from "../components/MorningPlanningModal";
import { DayTimeBlockVisualizer } from "../components/DayTimeBlockVisualizer";
import { SeasonProgressCard, WhyCard } from "../components/SeasonWidgets";
import { ZendoProModal } from "../components/ZendoProModal";
import { DAILY_STATUS_LABELS } from "../constants/dailyActivityStatus";
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
  getDayNumber,
  getDaysPassed,
  getTodayDateString,
  getCurrentWeekNumber,
  getWeekStartDate,
  getWeekEndDate,
} from "../lib/date";
import {
  getCoreDailyStatusForDate,
  getDailyHelperForDate,
  getDailyStatusForDate,
  isRetroEligible,
} from "../lib/dailyActivity";
import { getFocusStreak } from "../lib/focusStreak";
import { selectTodayPlan, selectSeasonFocusSummary, selectTotalFocusSecondsForDate } from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import type { AppLanguage, TimelineEvent, TimelineEventType } from "../types/app";
import { getJournalAnswerItems } from "../i18n/prompts";
import { useT, useLanguage } from "../i18n";

type TimelineViewMode = "daily" | "weekly" | "monthly" | "season";

function TimelineStats() {
  const store = useMonkStore();
  const t = useT();
  const season = store.activeSeason!;

  const focusSummary = selectSeasonFocusSummary(store, season.id);
  const totalFocusMinutes = focusSummary.totalMinutes;
  const totalFocusSessions = focusSummary.count;

  const completedDaysCount = store.dayPlans.filter(
    (day) => day.seasonId === season.id && day.status === "completed"
  ).length;

  const totalPassedDays = Math.min(
    season.durationDays,
    getDaysPassed(season.startDate)
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
      <div className="rounded-xl border border-monk-accent/25 bg-gradient-to-br from-monk-surface to-monk-surface/60 p-5 relative overflow-hidden transition hover:border-monk-accent/40 monk-depth">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-monk-muted">{t("timeline.stats.focus")}</p>
            <p className="text-4xl font-bold mt-1 text-monk-accent tabular-nums leading-none">{totalFocusMinutes}<span className="text-base font-semibold text-monk-muted/50 ml-1">{t("timeline.stats.minutes")}</span></p>
            <p className="text-xs text-monk-muted mt-1">{t("timeline.stats.sessions", { n: totalFocusSessions })}</p>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-monk-accent/20 to-monk-accent/5 border border-monk-accent/10 shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]">
            <Timer size={16} strokeWidth={2} className="text-monk-accent" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-monk-border/50 pt-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-monk-muted">{t("timeline.stats.consistency")}</p>
            <p className="text-xl font-bold mt-0.5 text-monk-muted tabular-nums leading-none">{t("timeline.stats.days", { n: completedDaysCount, total: totalPassedDays })}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** Streak and Consistency Overview (completed vs bolong) */
function StreakConsistencyCard() {
  const store = useMonkStore();
  const t = useT();
  const season = store.activeSeason!;
  const today = getTodayDateString();
  const streak = getFocusStreak(store, today);

  const passedCount = Math.min(season.durationDays, getDaysPassed(season.startDate, today));
  const passedDates = datesInRange(season.startDate, passedCount);

  let completedCount = 0;
  let partialCount = 0;
  let restCount = 0;
  let missedCount = 0;

  passedDates.forEach((date) => {
    const status = getDailyStatusForDate(store, date);
    if (status === "completed") completedCount++;
    else if (status === "partial") partialCount++;
    else if (status === "rest") restCount++;
    else if (status === "missed" || status === "relapse") missedCount++;
  });

  return (
    <div className="rounded-2xl border border-monk-border/80 bg-monk-surface p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <span className="text-base sm:text-lg font-bold text-monk-text">
              {streak.count} {t("timeline.streak.days", { n: streak.count })} Streak
            </span>
            {streak.best > streak.count ? (
              <span className="text-xs text-monk-muted">
                (Terbaik: {streak.best} hari)
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-monk-muted">
            Konsistensi rantai fokus tanpa bolong
          </p>
        </div>

        {/* Counter chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 rounded-lg border border-monk-success/30 bg-monk-success-soft/40 px-2 py-1 text-monk-success">
            <Check size={12} strokeWidth={2.5} />
            <span>{completedCount} {t("timeline.streak.completed")}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-monk-rest/30 bg-monk-rest-soft/40 px-2 py-1 text-monk-rest">
            <Moon size={12} />
            <span>{restCount} {t("timeline.streak.rest")}</span>
          </span>
          {missedCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-rose-500 dark:text-rose-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>{missedCount} {t("timeline.streak.missed")}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border border-monk-border bg-monk-soft px-2 py-1 text-monk-muted">
              <span>0 Bolong 🛡️</span>
            </span>
          )}
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
    season_started: <Flag size={12} strokeWidth={1.5} className="text-monk-accent" />,
    season_completed: <Trophy size={12} strokeWidth={1.5} className="text-monk-success" />,
    goal_created: <Target size={12} strokeWidth={1.5} className="text-monk-accent" />,
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? <Flame size={12} strokeWidth={1.5} className="text-monk-warning" />
      : <Timer size={12} strokeWidth={1.5} className="text-monk-success" />,
    learning_session: <Lightbulb size={12} strokeWidth={1.5} className="text-monk-accent" />,
    journal_entry: <FileText size={12} strokeWidth={1.5} className="text-monk-muted" />
  };

  const bgClasses: Record<TimelineEventType, string> = {
    season_started: "bg-monk-accent/5 border-monk-accent/15",
    season_completed: "bg-monk-success/5 border-monk-success/15",
    goal_created: "bg-monk-accent/5 border-monk-accent/15",
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? "bg-monk-warning/5 border-monk-warning/15"
      : "bg-monk-success/5 border-monk-success/15",
    learning_session: "bg-monk-accent/5 border-monk-accent/15",
    journal_entry: "bg-monk-surface border-monk-border/20"
  };

  const typeColors: Record<TimelineEventType, string> = {
    season_started: "from-monk-accent to-transparent",
    season_completed: "from-monk-success to-transparent",
    goal_created: "from-monk-accent to-transparent",
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? "from-monk-warning to-transparent"
      : "from-monk-success to-transparent",
    learning_session: "from-monk-accent to-transparent",
    journal_entry: "from-monk-muted to-transparent"
  };

  const leftAccent: Record<TimelineEventType, string> = {
    season_started: "border-monk-accent",
    season_completed: "border-monk-success",
    goal_created: "border-monk-accent",
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? "border-monk-warning"
      : "border-monk-success",
    learning_session: "border-monk-accent",
    journal_entry: "border-monk-muted"
  };

  const timeLabel = new Date(event.occurredAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`grid h-9 w-9 place-items-center rounded-full border shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] ${bgClasses[event.type]}`}>
          {icons[event.type]}
        </div>
        <div className={`w-[2px] flex-1 bg-gradient-to-b ${typeColors[event.type]} opacity-60 rounded-b-full min-h-[20px]`} />
      </div>
      <div className="flex-1 pb-5">
        <p className="mb-1 font-mono text-[11px] text-monk-muted/80 tabular-nums">{timeLabel}</p>
        <Card className={`p-4 bg-monk-soft/80 hover:bg-monk-raised/60 shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-150 border-l-4 ${leftAccent[event.type]} border-t border-r border-b border-monk-border/20`}>
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-bold text-monk-text leading-tight tracking-wide">{displayTitle}</h4>
            {event.type === "focus_session" || event.type === "learning_session" ? (
              <button
                type="button"
                aria-label="Hapus aktivitas"
                title="Hapus dari timeline"
                className="text-monk-muted/40 hover:text-monk-danger hover:bg-monk-danger/10 p-1 rounded-md transition active:scale-90 shrink-0"
                onClick={() => {
                  if (window.confirm("Hapus sesi ini dari timeline dan riwayat?")) {
                    store.removeTimelineEvent(event.id);
                  }
                }}
              >
                <Trash2 size={13} />
              </button>
            ) : null}
          </div>
          {displayDescription && (
            <p className="mt-2 text-sm text-monk-muted leading-relaxed whitespace-pre-line">{displayDescription}</p>
          )}
          {journalItems.length > 0 ? (
            <div className="mt-3 space-y-3 border-t border-monk-border/20 pt-3">
              {journalItems.map((item) => (
                <div key={item.id}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-monk-text-soft">{item.question}</p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-monk-text border-l-2 border-monk-accent/30 pl-2">{item.answer}</p>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

export default function TimelineScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const season = store.activeSeason!;
  const today = getTodayDateString();

  const [viewMode, setViewMode] = useState<TimelineViewMode>("daily");
  const [retroDate, setRetroDate] = useState<string | null>(null);
  const [planningModalOpen, setPlanningModalOpen] = useState<boolean>(false);
  const [proModalOpen, setProModalOpen] = useState(false);

  // Week navigation state for Weekly View
  const currentWeekNum = useMemo(() => getCurrentWeekNumber(season.startDate, today), [season.startDate, today]);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeekNum);

  const dates = useMemo(() => {
    return datesInRange(season.startDate, season.durationDays);
  }, [season.id, season.startDate, season.durationDays]);

  const chunks = useMemo(() => {
    const result: string[][] = [];
    for (let i = 0; i < dates.length; i += 7) {
      result.push(dates.slice(i, i + 7));
    }
    return result;
  }, [dates]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    const seenEventSources = new Set<string>();

    store.timelineEvents
      .filter((event) => event.seasonId === season.id || !event.seasonId)
      .forEach((event) => {
        const date = event.occurredAt.slice(0, 10);
        if (!groups[date]) {
          groups[date] = [];
        }
        if (event.sourceId) seenEventSources.add(event.sourceId);
        groups[date].push(event);
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
            description: `${mins} min focus`,
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

  const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  function getStatusDotStyle(date: string) {
    const status = getDailyStatusForDate(store, date);
    const isDateToday = date === today;
    const todayPlan = selectTodayPlan(store);
    const isCompleted = status === "completed" || (isDateToday && todayPlan?.status === "completed");
    const isPartial = status === "partial";
    const isRelapse = status === "relapse";
    const isRest = status === "rest";
    const isMissed = status === "missed";

    if (isDateToday) {
      if (isCompleted) return "bg-monk-success ring-2 ring-monk-success/40 text-white";
      if (isPartial) return "bg-monk-accent/80 ring-2 ring-monk-accent/40 text-white";
      if (isRelapse) return "bg-monk-danger/80 ring-2 ring-monk-danger/40 text-white";
      if (isRest) return "bg-monk-rest/70 ring-2 ring-monk-rest/40 text-white";
      return "bg-monk-border-strong animate-pulse ring-2 ring-monk-accent/40 text-monk-text";
    }
    if (isCompleted) return "bg-monk-success/80 text-white";
    if (isPartial) return "bg-monk-accent/70 text-white";
    if (isRelapse) return "bg-monk-danger/60 text-white";
    if (isRest) return "bg-monk-rest/50 text-white";
    if (isMissed) return "bg-rose-500/20 border border-rose-500/40 text-rose-500";
    return "bg-monk-border/30 text-monk-muted";
  }

  // Selected week dates (7 days)
  const selectedWeekDates = useMemo(() => {
    const start = getWeekStartDate(season.startDate, selectedWeek);
    return datesInRange(start, 7);
  }, [season.startDate, selectedWeek]);

  return (
    <>
      <PageHeader
        title={t("timeline.title")}
        subtitle={t("timeline.subtitle")}
        rightSlot={<SettingsLink onOpenPro={() => setProModalOpen(true)} />}
      />

      <div className="space-y-5">
        {/* View Switcher Tabs: Daily | Weekly | Monthly | Season */}
        <div className="flex rounded-2xl border border-monk-border/80 bg-monk-soft/50 p-1 text-xs font-semibold shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("daily")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 transition active:scale-95 ${
              viewMode === "daily"
                ? "bg-monk-surface text-monk-text font-bold shadow-xs border border-monk-border/50"
                : "text-monk-muted hover:text-monk-text"
            }`}
          >
            <Clock size={13} />
            <span>{t("timeline.view.daily")}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("weekly")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 transition active:scale-95 ${
              viewMode === "weekly"
                ? "bg-monk-surface text-monk-text font-bold shadow-xs border border-monk-border/50"
                : "text-monk-muted hover:text-monk-text"
            }`}
          >
            <Calendar size={13} />
            <span>{t("timeline.view.weekly")}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("monthly")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 transition active:scale-95 ${
              viewMode === "monthly"
                ? "bg-monk-surface text-monk-text font-bold shadow-xs border border-monk-border/50"
                : "text-monk-muted hover:text-monk-text"
            }`}
          >
            <Target size={13} />
            <span>{t("timeline.view.monthly")}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("season")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 transition active:scale-95 ${
              viewMode === "season"
                ? "bg-monk-surface text-monk-text font-bold shadow-xs border border-monk-border/50"
                : "text-monk-muted hover:text-monk-text"
            }`}
          >
            <Trophy size={13} />
            <span>{t("timeline.view.season")}</span>
          </button>
        </div>

        {/* ── DAILY VIEW ── */}
        {viewMode === "daily" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Detailed time block visualizer with live NOW line */}
            <DayTimeBlockVisualizer
              date={today}
              onOpenPlanning={() => setPlanningModalOpen(true)}
            />

            {/* Today Activity Log */}
            <div className="space-y-3 pt-2">
              <SectionHeader
                title="Aktivitas Hari Ini"
                subtitle={`Log kegiatan tercatat untuk ${today}`}
              />
              {(() => {
                const todayEvents = groupedEvents.find((g) => g.date === today)?.events ?? [];
                if (todayEvents.length === 0) {
                  return (
                    <Card className="p-6 text-center text-xs text-monk-muted">
                      Belum ada sesi fokus atau jurnal tercatat hari ini.
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
            <StreakConsistencyCard />

            {/* Week navigation control */}
            <div className="flex items-center justify-between rounded-2xl border border-monk-border/80 bg-monk-surface px-4 py-2.5">
              <button
                type="button"
                disabled={selectedWeek <= 1}
                onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
                className="grid h-8 w-8 place-items-center rounded-lg text-monk-muted hover:bg-monk-soft disabled:opacity-30 transition"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="text-center">
                <p className="text-xs font-bold text-monk-text uppercase tracking-wider">
                  Minggu {selectedWeek}
                </p>
                <p className="text-[11px] text-monk-muted">
                  {selectedWeekDates[0]} s/d {selectedWeekDates[6]}
                </p>
              </div>

              <button
                type="button"
                disabled={selectedWeek >= Math.ceil(season.durationDays / 7)}
                onClick={() => setSelectedWeek((w) => w + 1)}
                className="grid h-8 w-8 place-items-center rounded-lg text-monk-muted hover:bg-monk-soft disabled:opacity-30 transition"
              >
                <ChevronRight size={16} />
              </button>
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
                    className={`p-3.5 sm:p-4 transition ${
                      isDateToday
                        ? "border-monk-accent/50 ring-1 ring-monk-accent/30 bg-monk-soft/30"
                        : "border-monk-border/70"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="text-center w-10">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-monk-muted">
                            {DOW[idx]}
                          </span>
                          <p className="text-xs font-mono font-bold text-monk-text">
                            {dateStr.slice(8)}
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            {isFuture ? (
                              <span className="rounded-md border border-monk-border bg-monk-surface px-2 py-0.5 text-[10px] font-bold text-monk-muted">
                                Mendatang
                              </span>
                            ) : isCompleted ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-monk-success/30 bg-monk-success-soft px-2 py-0.5 text-[10px] font-bold text-monk-success">
                                <Check size={11} strokeWidth={2.5} />
                                <span>Selesai</span>
                              </span>
                            ) : isRest ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-monk-rest/30 bg-monk-rest-soft px-2 py-0.5 text-[10px] font-bold text-monk-rest">
                                <Moon size={11} />
                                <span>Istirahat</span>
                              </span>
                            ) : isPartial ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-monk-accent/30 bg-monk-accent-soft px-2 py-0.5 text-[10px] font-bold text-monk-accent">
                                <Flame size={11} />
                                <span>Sebagian</span>
                              </span>
                            ) : isMissed ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                                <AlertTriangle size={11} />
                                <span>Bolong</span>
                              </span>
                            ) : (
                              <span className="rounded-md border border-monk-border bg-monk-surface px-2 py-0.5 text-[10px] font-bold text-monk-muted">
                                Belum ada plan
                              </span>
                            )}

                            {isDateToday ? (
                              <span className="rounded-full bg-monk-accent/15 px-2 py-0.2 text-[9px] font-bold text-monk-accent">
                                Hari Ini
                              </span>
                            ) : null}
                          </div>

                          <p className="text-xs font-semibold text-monk-text mt-1">
                            {dayPlan?.mainAction || goal?.keystoneAction || (isRest ? "Hari Istirahat Sadar" : "—")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {focusMins > 0 ? (
                          <span className="font-mono text-xs text-monk-muted bg-monk-soft px-2 py-0.5 rounded-lg">
                            {focusMins} mnt
                          </span>
                        ) : null}

                        {isEligible ? (
                          <button
                            type="button"
                            onClick={() => setRetroDate(dateStr)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-monk-accent hover:underline px-2 py-1 rounded-lg hover:bg-monk-accent/10 transition"
                          >
                            <Plus size={12} />
                            <span>Log Retro</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── MONTHLY VIEW ── */}
        {viewMode === "monthly" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <StreakConsistencyCard />

            <Card className="p-4 sm:p-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-monk-muted">
                  Kalender Bulan Season
                </h3>
                <p className="text-xs text-monk-muted mt-0.5">
                  Klik pada tanggal yang bolong untuk melihat atau mencatat log retroaktif.
                </p>
              </div>

              {/* Day-of-week header */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {DOW.map((d, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold uppercase tracking-wider text-monk-muted/60"
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Heatmap Grid */}
              <div className="space-y-1.5">
                {chunks.map((week, wi) => {
                  return (
                    <div key={wi} className="grid grid-cols-7 gap-1.5">
                      {week.map((dateStr) => {
                        const isFuture = dateStr > today;
                        const isDateToday = dateStr === today;
                        const status = getDailyStatusForDate(store, dateStr);
                        const isEligible = isRetroEligible(dateStr, status, today);
                        const dayNum = dateStr.slice(8);

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={!isEligible && isFuture}
                            onClick={isEligible ? () => setRetroDate(dateStr) : undefined}
                            className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                              isFuture
                                ? "bg-monk-border/10 text-monk-muted/40 cursor-default"
                                : getStatusDotStyle(dateStr)
                            } ${isDateToday ? "ring-2 ring-monk-accent font-bold scale-105" : ""} ${
                              isEligible ? "cursor-pointer hover:scale-105 hover:ring-2 hover:ring-monk-accent" : ""
                            }`}
                            title={`${dateStr} · Status: ${status}`}
                          >
                            <span className="text-[11px] font-mono leading-none">{dayNum}</span>
                            {!isFuture && status === "completed" ? (
                              <Check size={9} strokeWidth={3} className="mt-0.5" />
                            ) : !isFuture && status === "rest" ? (
                              <Moon size={9} className="mt-0.5" />
                            ) : !isFuture && (status === "missed" || status === "relapse") ? (
                              <span className="text-[8px] mt-0.5 font-bold">✕</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-monk-border/40 pt-3 text-[11px] text-monk-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-monk-success/80 flex items-center justify-center text-[8px] text-white">✓</span>
                  <span>Selesai</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-monk-rest/50 flex items-center justify-center text-[8px] text-white">🌙</span>
                  <span>Istirahat</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-monk-accent/70" />
                  <span>Sebagian</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-[8px] text-rose-500">✕</span>
                  <span>Bolong</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-monk-border/20" />
                  <span>Mendatang</span>
                </span>
              </div>
            </Card>
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
            <WhyCard />
            <SeasonProgressCard />
            <TimelineStats />

            {/* Timeline Activity Feed */}
            <div className="space-y-4 pt-2">
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
                        <div className="sticky top-0 z-10 bg-monk-bg/90 backdrop-blur pt-1.5 pb-1.5 -mx-1 px-1 flex items-center gap-2 border-b border-monk-border/30">
                          <p className="text-xs font-bold text-monk-accent uppercase tracking-wider">{groupTitle}</p>
                          <span className="text-[10px] font-bold text-monk-muted bg-monk-raised/60 border border-monk-border/30 px-1.5 py-0.5 rounded-full">
                            {group.events.length}
                          </span>
                        </div>
                        <div className="space-y-0">
                          {group.events.map((event, index) => (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
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
    </>
  );
}
