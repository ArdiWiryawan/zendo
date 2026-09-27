import { useState, useEffect, useRef } from "react";
import { Clock, Calendar, Download, Edit3, Check, Zap, Coffee, BookOpen, Briefcase, User } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { selectTodayPlan } from "../store/selectors";
import { getTodayDateString } from "../lib/date";
import { hapticPress } from "../lib/haptics";
import { downloadIcsFile } from "../lib/ical";
import { useCalmToast, GhostButton, SecondaryButton } from "./ui";
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
  { icon: typeof Zap; labelKey: string; border: string; bg: string; text: string; dot: string }
> = {
  deep_work: {
    icon: Zap,
    labelKey: "planning.catDeep",
    border: "border-monk-cat-deep/40",
    bg: "bg-monk-cat-deep/15 hover:bg-monk-cat-deep/20",
    text: "text-monk-cat-deep",
    dot: "bg-monk-cat-deep"
  },
  shallow: {
    icon: Briefcase,
    labelKey: "planning.catShallow",
    border: "border-monk-cat-shallow/40",
    bg: "bg-monk-cat-shallow/15 hover:bg-monk-cat-shallow/20",
    text: "text-monk-cat-shallow",
    dot: "bg-monk-cat-shallow"
  },
  learning: {
    icon: BookOpen,
    labelKey: "planning.catLearning",
    border: "border-monk-cat-learning/40",
    bg: "bg-monk-cat-learning/15 hover:bg-monk-cat-learning/20",
    text: "text-monk-cat-learning",
    dot: "bg-monk-cat-learning"
  },
  rest: {
    icon: Coffee,
    labelKey: "planning.catRest",
    border: "border-monk-cat-rest/40",
    bg: "bg-monk-cat-rest/15 hover:bg-monk-cat-rest/20",
    text: "text-monk-cat-rest",
    dot: "bg-monk-cat-rest"
  },
  personal: {
    icon: User,
    labelKey: "planning.catPersonal",
    border: "border-monk-cat-personal/40",
    bg: "bg-monk-cat-personal/15 hover:bg-monk-cat-personal/20",
    text: "text-monk-cat-personal",
    dot: "bg-monk-cat-personal"
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
  const toast = useCalmToast();
  const store = useMonkStore();
  const activeDate = date || getTodayDateString();
  const season = store.activeSeason;

  const dayPlan = store.dayPlans.find(
    (d) => d.seasonId === season?.id && d.date === activeDate
  );
  const timeBlocks = dayPlan?.timeBlocks ?? [];

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

  return (
    <div className="rounded-2xl border border-monk-border/80 bg-monk-surface overflow-hidden shadow-xs">
      {/* Visualizer Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-monk-border/60 bg-monk-soft/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-monk-accent/15 text-monk-accent">
            <Clock size={14} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-monk-text tracking-wide uppercase">
              {t("planning.timeBlocks")} · {activeDate}
            </h3>
            <p className="text-[11px] text-monk-muted">
              {timeBlocks.length > 0
                ? t("timeline.daily.blocksPlanned", { n: timeBlocks.length })
                : t("timeline.daily.noBlocks")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
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

      {/* Grid Timeline Canvas */}
      {timeBlocks.length === 0 ? (
        <div className="p-8 text-center">
          <div className="grid h-12 w-12 mx-auto place-items-center rounded-2xl bg-monk-soft text-monk-muted">
            <Calendar size={22} />
          </div>
          {/*
            No repeated title and no second CTA here: the header above already
            states that nothing is planned and carries the one action. This
            block only adds the guidance the header does not have.
          */}
          <p className="mt-3 text-xs text-monk-muted max-w-sm mx-auto">
            {t("timeline.daily.emptyHint")}
          </p>
        </div>
      ) : (
        <div
          className="relative overflow-y-auto px-2 sm:px-4 py-3 select-none"
          style={{ height: compact ? 340 : 480 }}
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
                  <span className="w-12 text-[10px] font-mono font-medium text-monk-muted/60 tabular-nums">
                    {formattedHour}
                  </span>
                  <div className="flex-1 border-b border-monk-border/30" />
                </div>
              );
            })}

            {/* Time Block Rectangles */}
            <div className="absolute left-14 right-2 top-0 bottom-0 pointer-events-auto">
              {timeBlocks.map((block) => {
                const startM = parseTimeToMinutes(block.startTime);
                const endM = parseTimeToMinutes(block.endTime);
                const top = Math.max(0, (startM - START_HOUR * 60) * PIXELS_PER_MINUTE);
                const height = Math.max(26, (endM - startM) * PIXELS_PER_MINUTE - 2);

                const style = CATEGORY_STYLES[block.category] || CATEGORY_STYLES.deep_work;
                const Icon = style.icon;

                return (
                  <div
                    key={block.id}
                    onClick={() => handleToggleBlock(block.id)}
                    style={{ top, height }}
                    className={`absolute left-0 right-0 rounded-xl border ${style.border} ${style.bg} px-3 py-1.5 transition-all shadow-xs cursor-pointer overflow-hidden flex flex-col justify-between group ${
                      block.completed ? "opacity-60 grayscale-[30%]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`inline-block h-2 w-2 rounded-full ${style.dot} shrink-0`} />
                        <p className={`text-xs font-bold truncate ${block.completed ? "line-through text-monk-muted" : "text-monk-text"}`}>
                          {block.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-[10px] font-bold text-monk-muted/80">
                          {block.startTime} – {block.endTime}
                        </span>
                        <div
                          className={`grid h-4 w-4 place-items-center rounded-md border ${
                            block.completed
                              ? "border-monk-success bg-monk-success text-white"
                              : "border-monk-border bg-monk-surface"
                          }`}
                        >
                          {block.completed ? <Check size={11} strokeWidth={3} /> : null}
                        </div>
                      </div>
                    </div>

                    {height > 44 ? (
                      <div className="flex items-center gap-2 text-[10px] text-monk-muted">
                        <span className={`font-semibold uppercase tracking-wider ${style.text}`}>
                          {t(style.labelKey as any)}
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
