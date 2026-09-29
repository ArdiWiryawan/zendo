import { useState, useEffect, useRef, useMemo } from "react";
import { Clock, Calendar, Download, Edit3, Check, Zap, Coffee, BookOpen, Briefcase, User, List, BarChart2 } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT, useLanguage, type MessageKey } from "../i18n";
import { getTodayDateString, formatHumanDate } from "../lib/date";
import { hapticPress } from "../lib/haptics";
import { downloadIcsFile } from "../lib/ical";
import { useCalmToast } from "./ui";
import type { TimeBlock, TimeBlockCategory } from "../types/app";

interface DayTimeBlockVisualizerProps {
  date?: string;
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
    border: "border-red-900/40",
    borderL: "border-l-red-500",
    bg: "bg-monk-surface-raised",
    text: "text-red-400",
    dot: "bg-red-400",
    chipBg: "bg-red-950/60 text-red-300 border-red-800/50"
  },
  shallow: {
    icon: Briefcase,
    labelKey: "planning.catShallow",
    border: "border-sky-900/40",
    borderL: "border-l-sky-500",
    bg: "bg-monk-surface-raised",
    text: "text-sky-400",
    dot: "bg-sky-400",
    chipBg: "bg-sky-950/60 text-sky-300 border-sky-800/50"
  },
  learning: {
    icon: BookOpen,
    labelKey: "planning.catLearning",
    border: "border-purple-900/40",
    borderL: "border-l-purple-500",
    bg: "bg-monk-surface-raised",
    text: "text-purple-400",
    dot: "bg-purple-400",
    chipBg: "bg-purple-950/60 text-purple-300 border-purple-800/50"
  },
  rest: {
    icon: Coffee,
    labelKey: "planning.catRest",
    border: "border-emerald-900/40",
    borderL: "border-l-emerald-500",
    bg: "bg-monk-surface-raised",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    chipBg: "bg-emerald-950/60 text-emerald-300 border-emerald-800/50"
  },
  personal: {
    icon: User,
    labelKey: "planning.catPersonal",
    border: "border-pink-900/40",
    borderL: "border-l-pink-500",
    bg: "bg-monk-surface-raised",
    text: "text-pink-400",
    dot: "bg-pink-400",
    chipBg: "bg-pink-950/60 text-pink-300 border-pink-800/50"
  }
};

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function DayTimeBlockVisualizer({
  date,
  onOpenPlanning,
  compact = false
}: DayTimeBlockVisualizerProps) {
  const t = useT();
  const lang = useLanguage();
  const toast = useCalmToast();
  const store = useMonkStore();
  const activeDate = date || getTodayDateString();
  const season = store.activeSeason;

  const [viewMode, setViewMode] = useState<"agenda" | "grid">("agenda");
  const canvasScrollRef = useRef<HTMLDivElement>(null);

  const dayPlan = store.dayPlans.find(
    (d) => d.seasonId === season?.id && d.date === activeDate
  );
  const timeBlocks = useMemo(() => {
    return [...(dayPlan?.timeBlocks ?? [])].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
  }, [dayPlan?.timeBlocks]);

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

  const handleExportIcs = () => {
    hapticPress("medium");
    downloadIcsFile(activeDate, timeBlocks, season?.name || "Zendo");
    toast.show(t("planning.downloadedIcs"));
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
                title="Tampilan Agenda"
              >
                <List size={12} strokeWidth={2.2} />
                <span>Agenda</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                  viewMode === "grid"
                    ? "bg-monk-soft text-monk-text shadow-2xs"
                    : "text-monk-muted hover:text-monk-text"
                }`}
                title="Tampilan Grid Jam"
              >
                <BarChart2 size={12} strokeWidth={2.2} className="rotate-90" />
                <span>Ruler</span>
              </button>
            </div>
          ) : null}

          {timeBlocks.length > 0 ? (
            <button
              type="button"
              onClick={handleExportIcs}
              className="flex items-center gap-1 rounded-lg border border-monk-border bg-monk-surface px-2.5 py-1 text-[11px] font-semibold text-monk-muted hover:text-monk-text transition"
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
              className="flex items-center gap-1 rounded-lg bg-monk-accent px-2.5 py-1 text-[11px] font-semibold text-monk-bg shadow-xs hover:bg-monk-accent-hover transition active:scale-95"
            >
              <Edit3 size={11} />
              <span>{timeBlocks.length > 0 ? t("timeline.daily.editPlanCta") : t("timeline.daily.planTodayCta")}</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Empty State */}
      {timeBlocks.length === 0 ? (
        <div className="p-8 text-center">
          <div className="grid h-12 w-12 mx-auto place-items-center rounded-2xl bg-monk-soft text-monk-muted border border-monk-border/60">
            <Calendar size={22} />
          </div>
          <p className="mt-3 text-xs text-monk-muted max-w-sm mx-auto leading-relaxed">
            {t("timeline.daily.emptyHint")}
          </p>
        </div>
      ) : viewMode === "agenda" ? (
        /* Agenda List Mode: Clear, readable cards with no truncation */
        <div className="p-3 sm:p-4 space-y-2.5">
          {timeBlocks.map((block) => {
            const startM = parseTimeToMinutes(block.startTime);
            const endM = parseTimeToMinutes(block.endTime);
            const durationHours = ((endM - startM) / 60).toFixed(1);
            const style = CATEGORY_STYLES[block.category] || CATEGORY_STYLES.deep_work;
            const Icon = style.icon;

            return (
              <div
                key={block.id}
                onClick={() => handleToggleBlock(block.id)}
                className={`rounded-xl border ${style.border} border-l-[3px] ${style.borderL} bg-monk-surface-raised p-3 sm:p-3.5 transition-all shadow-xs cursor-pointer hover:border-monk-accent/40 ${
                  block.completed ? "opacity-60 bg-monk-soft/50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Category pill & time badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.chipBg}`}>
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
                    <p className={`text-xs sm:text-sm font-semibold text-white leading-snug ${block.completed ? "line-through text-monk-muted" : ""}`}>
                      {block.title}
                    </p>
                  </div>

                  {/* Toggle completion button */}
                  <div className="shrink-0 pt-0.5">
                    <div
                      className={`grid h-6 w-6 place-items-center rounded-lg border transition ${
                        block.completed
                          ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
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
      ) : (
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
                  <span className="w-12 text-[10px] font-mono font-medium text-monk-muted/70 tabular-nums">
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

                const style = CATEGORY_STYLES[block.category] || CATEGORY_STYLES.deep_work;

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
                        <p className={`text-xs font-bold truncate text-white ${block.completed ? "line-through text-monk-muted" : ""}`}>
                          {block.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-[10px] font-bold text-monk-accent">
                          {block.startTime} - {block.endTime}
                        </span>
                        <div
                          className={`grid h-4 w-4 place-items-center rounded-md border ${
                            block.completed
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-monk-border-strong bg-monk-surface"
                          }`}
                        >
                          {block.completed ? <Check size={11} strokeWidth={3} /> : null}
                        </div>
                      </div>
                    </div>

                    {height > 44 ? (
                      <div className="flex items-center gap-2 text-[10px] text-monk-muted">
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
                <div className="flex items-center gap-1 px-1 bg-monk-danger rounded text-[9px] font-bold text-white uppercase tracking-wider font-mono shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                  <span>{t("timeline.daily.nowMarker")}</span>
                </div>
                <div className="flex-1 border-b-2 border-monk-danger/80 shadow-xs" />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
