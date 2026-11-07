import { useState, useEffect, useRef, useMemo } from "react";
import { Clock, Calendar, Download, Edit3, Check, Zap, Coffee, BookOpen, Briefcase, User, List, BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT, useLanguage, type MessageKey } from "../i18n";
import { getTodayDateString, formatHumanDate, parseLocalDateKey, addDaysToDate } from "../lib/date";
import { hapticPress } from "../lib/haptics";
import { resolveActivityCategory } from "../lib/activityCategory";
import { CalendarExportModal } from "./CalendarExportModal";
import { ScheduleAdjustments } from "./ScheduleAdjustments";
import { GhostButton } from "./ui";
import type { IdealBlock, TimeBlock, TimeBlockCategory } from "../types/app";
import { clock, minutes } from "../lib/weeklyPlanning";

interface DayTimeBlockVisualizerProps {
  date?: string;
  onDateChange?: (date: string) => void;
  onOpenPlanning?: () => void;
  compact?: boolean;
}

const START_HOUR = 6;  // 06:00
const END_HOUR = 23;   // 23:00
const PIXELS_PER_HOUR = 64; // Height per hour in px
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;

const CATEGORY_STYLES: Record<
  TimeBlockCategory,
  {
    icon: typeof Zap;
    labelKey: MessageKey;
    border: string;
    borderL: string;
    bg: string;
    text: string;
    dot: string;
    chipBg: string;
  }
> = {
  deep_work: {
    icon: Zap,
    labelKey: "planning.catDeep",
    border: "border-monk-cat-deep/30",
    borderL: "border-l-monk-cat-deep/30",
    bg: "bg-monk-surface-raised",
    text: "text-monk-cat-deep",
    dot: "bg-monk-cat-deep",
    chipBg: "bg-monk-cat-deep/15 text-monk-cat-deep border-monk-cat-deep/30"
  },
  shallow: {
    icon: Briefcase,
    labelKey: "planning.catShallow",
    border: "border-monk-cat-shallow/30",
    borderL: "border-l-monk-cat-shallow/30",
    bg: "bg-monk-surface-raised",
    text: "text-monk-cat-shallow",
    dot: "bg-monk-cat-shallow",
    chipBg: "bg-monk-cat-shallow/15 text-monk-cat-shallow border-monk-cat-shallow/30"
  },
  learning: {
    icon: BookOpen,
    labelKey: "planning.catLearning",
    border: "border-monk-cat-learning/30",
    borderL: "border-l-monk-cat-learning/30",
    bg: "bg-monk-surface-raised",
    text: "text-monk-cat-learning",
    dot: "bg-monk-cat-learning",
    chipBg: "bg-monk-cat-learning/15 text-monk-cat-learning border-monk-cat-learning/30"
  },
  rest: {
    icon: Coffee,
    labelKey: "planning.catRest",
    border: "border-monk-cat-rest/30",
    borderL: "border-l-monk-cat-rest/30",
    bg: "bg-monk-surface-raised",
    text: "text-monk-cat-rest",
    dot: "bg-monk-cat-rest",
    chipBg: "bg-monk-cat-rest/15 text-monk-cat-rest border-monk-cat-rest/30"
  },
  personal: {
    icon: User,
    labelKey: "planning.catPersonal",
    border: "border-monk-cat-personal/30",
    borderL: "border-l-monk-cat-personal/30",
    bg: "bg-monk-surface-raised",
    text: "text-monk-cat-personal",
    dot: "bg-monk-cat-personal",
    chipBg: "bg-monk-cat-personal/15 text-monk-cat-personal border-monk-cat-personal/30"
  }
};

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function DayTimeBlockVisualizer({
  date,
  onDateChange,
  onOpenPlanning,
  compact = false
}: DayTimeBlockVisualizerProps) {
  const t = useT();
  const lang = useLanguage();
  const store = useMonkStore();
  const activeDate = date || getTodayDateString();
  const season = store.activeSeason;

  const [viewMode, setViewMode] = useState<"agenda" | "grid">("agenda");
  const [exportOpen, setExportOpen] = useState(false);
  const canvasScrollRef = useRef<HTMLDivElement>(null);

  const dayPlan = store.dayPlans.find(
    (d) => d.seasonId === season?.id && d.date === activeDate
  );
  const timeBlocks = useMemo(() => {
    return [...(dayPlan?.timeBlocks ?? [])].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
  }, [dayPlan?.timeBlocks]);
  const idealBlocks = useMemo(() => {
    if (activeDate < getTodayDateString()) return [];
    const weekday = parseLocalDateKey(activeDate).getDay();
    const actual = new Set(
      timeBlocks.map((block) => `${block.startTime}|${block.title.trim().toLocaleLowerCase()}`),
    );
    return (store.appSettings.idealWeek ?? [])
      .filter((block) => block.days.includes(weekday))
      .filter((block) => !actual.has(`${block.startTime}|${block.title.trim().toLocaleLowerCase()}`))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [activeDate, store.appSettings.idealWeek, timeBlocks]);

  // Live "Now" Line
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  const isToday = activeDate === getTodayDateString();

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      const d = new Date();
      setNowMinutes(d.getHours() * 60 + d.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, [isToday]);

  const nowOffsetTop = (nowMinutes - START_HOUR * 60) * PIXELS_PER_MINUTE;
  const isNowInSchedule =
    isToday &&
    nowMinutes >= START_HOUR * 60 &&
    nowMinutes <= END_HOUR * 60;

  // Auto-scroll in grid mode to earliest block or now
  useEffect(() => {
    if (viewMode !== "grid" || !canvasScrollRef.current) return;
    let targetM = nowMinutes;
    if (timeBlocks.length > 0) {
      const earliestM = Math.min(...timeBlocks.map((b) => parseTimeToMinutes(b.startTime)));
      targetM = isToday ? Math.min(nowMinutes, earliestM) : earliestM;
    }
    const targetTop = Math.max(0, (targetM - START_HOUR * 60) * PIXELS_PER_MINUTE - 48);
    canvasScrollRef.current.scrollTop = targetTop;
  }, [viewMode, timeBlocks, isToday, nowMinutes]);

  // Toggle completion of a time block
  const handleToggleBlock = (blockId: string) => {
    hapticPress("light");
    const updated = timeBlocks.map((b) =>
      b.id === blockId ? { ...b, completed: !b.completed } : b
    );
    store.saveDayTimeBlocks(activeDate, updated, dayPlan?.planningCompleted);
  };

  const addIdealBlock = (ideal: IdealBlock) => {
    const start = minutes(ideal.startTime);
    const end = start + ideal.duration;
    if (end > 24 * 60) return;
    const occurrenceKey = `${ideal.id}:${activeDate}`;
    const block: TimeBlock = {
      id: `ideal:${occurrenceKey}`,
      occurrenceKey,
      occurrenceGroup: `ideal:${ideal.id}`,
      title: ideal.title.trim(),
      startTime: ideal.startTime,
      endTime: clock(end),
      category: ideal.category,
      goalId: ideal.goalId,
      practiceId: ideal.practiceId,
    };
    store.saveDayTimeBlocks(
      activeDate,
      [...timeBlocks, block],
      dayPlan?.planningCompleted ?? false,
    );
  };

  const handleExportIcs = () => {
    hapticPress("medium");
    setExportOpen(true);
  };

  const hoursArray = Array.from(
    { length: END_HOUR - START_HOUR + 1 },
    (_, i) => START_HOUR + i
  );

  const formattedDateTitle = useMemo(() => {
    try {
      const d = new Date(activeDate);
      return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
        weekday: "short",
        day: "numeric",
        month: "short"
      });
    } catch {
      return activeDate;
    }
  }, [activeDate, lang]);

  const totalPlannedHours = useMemo(() => {
    const totalMinutes = timeBlocks.reduce((acc, b) => {
      const start = parseTimeToMinutes(b.startTime);
      const end = parseTimeToMinutes(b.endTime);
      return acc + Math.max(0, end - start);
    }, 0);
    return (totalMinutes / 60).toFixed(1);
  }, [timeBlocks]);

  return (
    <div className="rounded-2xl border border-monk-border/80 bg-monk-surface overflow-hidden shadow-xs">
      {/* Visualizer Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-monk-border/60 bg-monk-soft/30 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-monk-accent/15 border border-monk-accent/30 text-monk-accent shrink-0">
            <Clock size={15} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-monk-text tracking-wide uppercase truncate">
                {t("planning.timeBlocks")} · {formattedDateTitle}
              </h3>
            </div>
            <p className="text-[11px] text-monk-muted">
              {timeBlocks.length > 0
                ? t("timeline.daily.blocksPlanned", { n: timeBlocks.length })
                : idealBlocks.length > 0
                  ? cIdealWeek(lang, idealBlocks.length)
                  : t("timeline.daily.noBlocks")}
              {timeBlocks.length > 0 ? ` (${totalPlannedHours} ${lang === "id" ? "jam" : "h"})` : ""}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {timeBlocks.length > 0 ? (
            /* View Switcher: Agenda vs Visual Ruler */
            <div className="flex items-center rounded-lg border border-monk-border/80 bg-monk-surface p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("agenda")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                  viewMode === "agenda"
                    ? "bg-monk-soft text-monk-text shadow-2xs"
                    : "text-monk-muted hover:text-monk-text"
                }`}
                title={t("ui.viewAgenda")}
              >
                <List size={12} strokeWidth={2.2} />
                <span>{t("ui.viewAgendaLabel")}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                  viewMode === "grid"
                    ? "bg-monk-soft text-monk-text shadow-2xs"
                    : "text-monk-muted hover:text-monk-text"
                }`}
                title={t("ui.viewGrid")}
              >
                <BarChart2 size={12} strokeWidth={2.2} className="rotate-90" />
                <span>{t("ui.viewGridLabel")}</span>
              </button>
            </div>
          ) : null}

          {timeBlocks.length > 0 ? (
            <button
              type="button"
              onClick={handleExportIcs}
              /* min-h-6 keeps this toolbar button at the WCAG 2.2 24px floor,
                 matching the Agenda / Grid toggle beside it. */
              className="flex min-h-6 items-center gap-1 rounded-lg border border-monk-border bg-monk-surface px-2.5 py-1 text-[11px] font-semibold text-monk-muted hover:text-monk-text transition"
              title={t("planning.exportIcs")}
            >
              <Download size={12} />
              <span className="hidden sm:inline">.ICS</span>
            </button>
          ) : null}

          {onOpenPlanning ? (
            <button
              type="button"
              onClick={() => {
                hapticPress("light");
                onOpenPlanning();
              }}
              className="flex items-center gap-1 rounded-lg bg-monk-accent px-2.5 py-1 text-[11px] font-semibold text-monk-bg shadow-xs hover:bg-monk-accent/90 transition active:scale-95"
            >
              <Edit3 size={11} />
              <span>{timeBlocks.length > 0 ? t("timeline.daily.editPlanCta") : t("timeline.daily.planTodayCta")}</span>
            </button>
          ) : null}
        </div>
      </div>

      {onDateChange && season && (
        <div className="flex items-center justify-between gap-2 border-b border-monk-border/60 px-3 py-2 sm:px-4">
          <button
            type="button"
            disabled={activeDate <= season.startDate}
            aria-label={lang === "id" ? "Agenda hari sebelumnya" : "Previous day agenda"}
            onClick={() => { hapticPress("light"); onDateChange(addDaysToDate(activeDate, -1)); }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-monk-muted transition hover:bg-monk-soft hover:text-monk-text disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent"
          >
            <ChevronLeft size={16} />
            {lang === "id" ? "Sebelumnya" : "Previous"}
          </button>
          <button
            type="button"
            disabled={activeDate >= season.endDate}
            aria-label={lang === "id" ? "Agenda hari berikutnya" : "Next day agenda"}
            onClick={() => { hapticPress("light"); onDateChange(addDaysToDate(activeDate, 1)); }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-monk-muted transition hover:bg-monk-soft hover:text-monk-text disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent"
          >
            {lang === "id" ? "Berikutnya" : "Next"}
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Empty State */}
      <details className="mb-4 space-y-3 rounded-xl border border-monk-border p-3"><summary className="cursor-pointer py-2 text-sm font-medium">{lang === 'id' ? 'Sesuaikan jadwal · pratinjau dulu' : 'Adjust schedule · preview first'}</summary><ScheduleAdjustments date={activeDate} /></details>
      {timeBlocks.length === 0 && idealBlocks.length === 0 ? (
        <div className="p-8 text-center">
          <div className="grid h-12 w-12 mx-auto place-items-center rounded-2xl bg-monk-soft text-monk-muted border border-monk-border/60">
            <Calendar size={22} />
          </div>
          <p className="mt-3 text-xs text-monk-muted max-w-sm mx-auto leading-relaxed">
            {t("timeline.daily.emptyHint")}
          </p>
        </div>
      ) : timeBlocks.length > 0 && viewMode === "agenda" ? (
        /* Agenda List Mode: Clear, readable cards with no truncation */
        <div className="p-3 sm:p-4 space-y-2.5">
          {timeBlocks.map((block) => {
            const startM = parseTimeToMinutes(block.startTime);
            const endM = parseTimeToMinutes(block.endTime);
            const durationHours = ((endM - startM) / 60).toFixed(1);
            const style = CATEGORY_STYLES[resolveActivityCategory(block.category)];
            const Icon = style.icon;

            return (
              <div
                key={block.id}
                onClick={() => handleToggleBlock(block.id)}
                /* Flat row with a hairline border and one thin category marker on
                   the left edge. The block used to carry a full coloured border
                   on every side plus a 3px coloured edge plus a raised surface,
                   so a six-block day drew six coloured frames competing with the
                   times and titles inside them. The category colour is still
                   stated twice — marker and chip — but no longer shouts. */
                className={`relative cursor-pointer overflow-hidden rounded-lg border border-monk-border/70 bg-monk-surface p-3 pl-3.5 transition-colors hover:border-monk-accent/40 sm:p-3.5 sm:pl-4 ${
                  block.completed ? "opacity-55" : ""
                }`}
              >
                <span aria-hidden className={`absolute inset-y-0 left-0 w-0.5 ${style.dot}`} />
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Category pill & time badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${style.chipBg}`}>
                        <Icon size={11} strokeWidth={2.5} />
                        <span>{t(style.labelKey)}</span>
                      </span>

                      <span className="font-mono text-xs font-bold text-monk-accent">
                        {block.startTime} - {block.endTime}
                      </span>

                      <span className="text-[11px] text-monk-muted">
                        ({durationHours} jam)
                      </span>
                    </div>

                    {/* Block Title - Full text, no truncation */}
                    <p className={`text-xs sm:text-sm font-semibold text-monk-text leading-snug ${block.completed ? "line-through text-monk-muted" : ""}`}>
                      {block.title}
                    </p>
                  </div>

                  {/* Toggle completion button */}
                  <div className="shrink-0 pt-0.5">
                    <div
                      className={`grid h-6 w-6 place-items-center rounded-lg border transition ${
                        block.completed
                          ? "border-monk-success/30 bg-monk-success-soft text-monk-success shadow-xs"
                          : "border-monk-border-strong bg-monk-surface text-monk-muted hover:border-monk-accent"
                      }`}
                    >
                      {block.completed ? <Check size={14} strokeWidth={3} /> : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : timeBlocks.length > 0 ? (
        /* Hourly Ruler Mode with Sleek Zen Scrollbar and auto-scroll */
        <div
          ref={canvasScrollRef}
          className="relative overflow-y-auto px-2 sm:px-4 py-3 select-none"
          style={{ height: compact ? 340 : 420 }}
        >
          <div
            className="relative w-full"
            style={{ height: (END_HOUR - START_HOUR) * PIXELS_PER_HOUR + 30 }}
          >
            {/* Hour grid lines */}
            {hoursArray.map((hour) => {
              const top = (hour - START_HOUR) * PIXELS_PER_HOUR;
              const formattedHour = `${String(hour).padStart(2, "0")}:00`;

              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex items-center pointer-events-none"
                  style={{ top }}
                >
                  <span className="w-12 text-[11px] font-mono font-medium text-monk-text-soft tabular-nums">
                    {formattedHour}
                  </span>
                  <div className="flex-1 border-b border-monk-border/40" />
                </div>
              );
            })}

            {/* Time Block Rectangles */}
            <div className="absolute left-14 right-2 top-0 bottom-0 pointer-events-auto">
              {timeBlocks.map((block) => {
                const startM = parseTimeToMinutes(block.startTime);
                const endM = parseTimeToMinutes(block.endTime);
                const top = Math.max(0, (startM - START_HOUR * 60) * PIXELS_PER_MINUTE);
                const height = Math.max(28, (endM - startM) * PIXELS_PER_MINUTE - 2);

                const style = CATEGORY_STYLES[resolveActivityCategory(block.category)];

                return (
                  <div
                    key={block.id}
                    onClick={() => handleToggleBlock(block.id)}
                    style={{ top, height }}
                    className={`absolute left-0 right-0 rounded-xl border ${style.border} border-l-[3px] ${style.borderL} bg-monk-surface-raised px-3 py-1.5 transition-all shadow-xs cursor-pointer overflow-hidden flex flex-col justify-between group ${
                      block.completed ? "opacity-60 bg-monk-soft/70" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`inline-block h-2 w-2 rounded-full ${style.dot} shrink-0`} />
                        <p className={`text-xs font-bold truncate text-monk-text ${block.completed ? "line-through text-monk-muted" : ""}`}>
                          {block.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-[11px] font-bold text-monk-accent">
                          {block.startTime} - {block.endTime}
                        </span>
                        <div
                          className={`grid h-4 w-4 place-items-center rounded-md border ${
                            block.completed
                              ? "border-monk-success/30 bg-monk-success-soft text-monk-success"
                              : "border-monk-border-strong bg-monk-surface"
                          }`}
                        >
                          {block.completed ? <Check size={11} strokeWidth={3} /> : null}
                        </div>
                      </div>
                    </div>

                    {height > 44 ? (
                      <div className="flex items-center gap-2 text-[11px] text-monk-muted">
                        <span className={`font-semibold uppercase tracking-wider ${style.text}`}>
                          {t(style.labelKey)}
                        </span>
                        <span>·</span>
                        <span>{((endM - startM) / 60).toFixed(1)} jam</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Live "NOW" Line Marker */}
            {isNowInSchedule ? (
              <div
                className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                style={{ top: nowOffsetTop }}
              >
                <div className="flex items-center gap-1 px-1 bg-monk-danger-soft border border-monk-danger/30 rounded text-[10px] font-bold text-monk-danger uppercase tracking-wider font-mono shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-monk-danger animate-ping" />
                  <span>{t("timeline.daily.nowMarker")}</span>
                </div>
                <div className="flex-1 border-b-2 border-monk-danger/80 shadow-xs" />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {idealBlocks.length > 0 && (
        <section className="border-t border-dashed border-monk-border px-3 py-4 sm:px-4" aria-label={lang === "id" ? "Saran Ideal Week" : "Ideal Week suggestions"}>
          <div className="mb-3 flex items-center gap-2">
            <Calendar size={15} className="text-monk-accent" />
            <h4 className="text-sm font-semibold text-monk-text">{lang === "id" ? "Dari Ideal Week" : "From Ideal Week"}</h4>
            <span className="rounded-full border border-monk-border px-2 py-0.5 text-[11px] text-monk-muted">
              {lang === "id" ? "Saran" : "Suggestion"}
            </span>
          </div>
          <p className="mb-3 text-xs text-monk-muted">
            {lang === "id" ? "Muncul otomatis dari template. Tambahkan ke jadwal tanggal ini bila cocok." : "Shown automatically from your template. Add to this date’s schedule when it fits."}
          </p>
          <ul className="space-y-2">
            {idealBlocks.map((block) => {
              const start = parseTimeToMinutes(block.startTime);
              const end = start + block.duration;
              const conflict = timeBlocks.some((actual) =>
                parseTimeToMinutes(actual.startTime) < end &&
                parseTimeToMinutes(actual.endTime) > start,
              );
              const invalidEnd = end > 24 * 60;
              const style = CATEGORY_STYLES[resolveActivityCategory(block.category)];
              const Icon = style.icon;
              return (
                <li key={block.id} className="flex items-center justify-between gap-3 rounded-xl border border-monk-border/70 bg-monk-surface p-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Icon size={16} className={`${style.text} mt-0.5 shrink-0`} />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{block.title}</p>
                      <p className="text-xs text-monk-muted">{block.startTime}–{clock(Math.min(end, 24 * 60))} · {block.duration} {lang === "id" ? "menit" : "min"}</p>
                      {conflict && <p className="mt-1 text-xs text-monk-warning">{lang === "id" ? "Bentrok dengan jadwal aktual" : "Overlaps an actual block"}</p>}
                      {invalidEnd && <p className="mt-1 text-xs text-monk-muted">{lang === "id" ? "Blok melewati tengah malam" : "Block crosses midnight"}</p>}
                    </div>
                  </div>
                  <GhostButton
                    disabled={conflict || invalidEnd}
                    aria-label={`${lang === "id" ? "Tambahkan" : "Add"} ${block.title} ${lang === "id" ? "ke Agenda" : "to Agenda"}`}
                    title={conflict
                      ? (lang === "id" ? "Bentrok dengan jadwal aktual" : "Overlaps an actual block")
                      : invalidEnd
                        ? (lang === "id" ? "Blok melewati tengah malam" : "Block crosses midnight")
                        : undefined}
                    onClick={() => addIdealBlock(block)}
                    className="shrink-0"
                  >
                    {conflict || invalidEnd
                      ? (conflict ? (lang === "id" ? "Bentrok" : "Conflict") : (lang === "id" ? "Lewat tengah malam" : "Overnight"))
                      : (lang === "id" ? "Tambahkan" : "Add")}
                  </GhostButton>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <CalendarExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        date={activeDate}
        timeBlocks={timeBlocks}
        seasonTitle={season?.name || "Zendo"}
      />
    </div>
  );
}

function cIdealWeek(lang: string, count: number) {
  return lang === "id"
    ? `${count} saran Ideal Week`
    : `${count} Ideal Week ${count === 1 ? "suggestion" : "suggestions"}`;
}
