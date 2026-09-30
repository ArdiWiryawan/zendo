import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Calendar,
  Plus,
  Trash2,
  Check,
  Zap,
  Coffee,
  BookOpen,
  Briefcase,
  User,
  Download,
  Tag,
  RotateCw
} from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT, useLanguage, type MessageKey } from "../i18n";
import { selectTodayPlan } from "../store/selectors";
import { getTodayDateString } from "../lib/date";
import { hapticPress } from "../lib/haptics";
import { playCompletionChime } from "../lib/audio";
import { downloadIcsFile } from "../lib/ical";
import { useCalmToast, PrimaryButton, SecondaryButton, useModalA11y } from "./ui";
import type { TimeBlock, TimeBlockCategory } from "../types/app";

interface MorningPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  date?: string;
  onCompleted?: () => void;
}

const AGENDA_MAX = 12;

const CATEGORY_CONFIG: Record<
  TimeBlockCategory,
  { labelKey: MessageKey; icon: typeof Zap; colorClass: string; bgClass: string; borderClass: string }
> = {
  deep_work: {
    labelKey: "planning.catDeep",
    icon: Zap,
    colorClass: "text-monk-cat-deep",
    bgClass: "bg-monk-cat-deep/10",
    borderClass: "border-monk-cat-deep/30"
  },
  learning: {
    labelKey: "planning.catLearning",
    icon: BookOpen,
    colorClass: "text-monk-cat-learning",
    bgClass: "bg-monk-cat-learning/10",
    borderClass: "border-monk-cat-learning/30"
  },
  shallow: {
    labelKey: "planning.catShallow",
    icon: Briefcase,
    colorClass: "text-monk-cat-shallow",
    bgClass: "bg-monk-cat-shallow/10",
    borderClass: "border-monk-cat-shallow/30"
  },
  rest: {
    labelKey: "planning.catRest",
    icon: Coffee,
    colorClass: "text-monk-cat-rest",
    bgClass: "bg-monk-cat-rest/10",
    borderClass: "border-monk-cat-rest/30"
  },
  personal: {
    labelKey: "planning.catPersonal",
    icon: User,
    colorClass: "text-monk-cat-personal",
    bgClass: "bg-monk-cat-personal/10",
    borderClass: "border-monk-cat-personal/30"
  }
};

const CATEGORIES: TimeBlockCategory[] = [
  "deep_work",
  "learning",
  "shallow",
  "rest",
  "personal"
];

/**
 * Helper to add minutes to "HH:mm"
 */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalM = (h || 0) * 60 + (m || 0) + minutes;
  const newH = Math.floor(totalM / 60) % 24;
  const newM = totalM % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

/**
 * Format minutes difference in hours
 */
function getDurationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
  return diffMinutes > 0 ? diffMinutes / 60 : 0;
}

/**
 * Format human duration (e.g. 1h 30m or 45m)
 */
function formatHumanDuration(startTime: string, endTime: string, isId = true): string {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMinutes <= 0) return "0m";
  const h = Math.floor(diffMinutes / 60);
  const m = diffMinutes % 60;
  if (h > 0 && m > 0) return isId ? `${h}j ${m}m` : `${h}h ${m}m`;
  if (h > 0) return isId ? `${h}j` : `${h}h`;
  return `${m}m`;
}

export function MorningPlanningModal({
  isOpen,
  onClose,
  date,
  onCompleted
}: MorningPlanningModalProps) {
  const t = useT();
  const lang = useLanguage();
  const isId = lang === "id";
  const toast = useCalmToast();
  const store = useMonkStore();
  const activeDate = date || getTodayDateString();
  const todayPlan = selectTodayPlan(store);
  const activeSeason = store.activeSeason;
  const goal = todayPlan?.goalId
    ? store.goals.find((g) => g.id === todayPlan.goalId)
    : undefined;

  // Ritual Timer State (15 min = 900s, 10 min = 600s)
  const [targetDuration, setTargetDuration] = useState<number>(15 * 60);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Escape closes, Tab stays inside, focus returns to the opener on unmount.
  const sheetRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open: isOpen, ref: sheetRef, onClose });

  // Daily Highlight state (Make Time framework)
  const [dailyHighlight, setDailyHighlight] = useState<string>("");

  // Agenda (unscheduled intents)
  const [agenda, setAgenda] = useState<string[]>([]);
  const [newAgendaItem, setNewAgendaItem] = useState("");

  // Time blocks local draft
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:30");
  const [newCategory, setNewCategory] = useState<TimeBlockCategory>("deep_work");
  const [newCustomTag, setNewCustomTag] = useState("");

  // Load existing blocks & highlight on open
  useEffect(() => {
    if (isOpen) {
      // D11: this field is the DAY's highlight, a different question from the
      // Main Action ("what is my next controllable action?"). It used to seed
      // from mainAction and — if left untouched — commit back over the main
      // action on save, silently rewriting it. Only the highlight's own prior
      // value is inherited now; a goal's keystone action is offered as a
      // placeholder instead of being copied in as data.
      const initialHighlight = todayPlan?.highlight || "";
      setDailyHighlight(initialHighlight);
      setAgenda(todayPlan?.agenda ?? []);
      setNewAgendaItem("");

      if (todayPlan?.timeBlocks && todayPlan.timeBlocks.length > 0) {
        setTimeBlocks(todayPlan.timeBlocks);
        const lastBlock = todayPlan.timeBlocks[todayPlan.timeBlocks.length - 1];
        setNewStartTime(lastBlock.endTime);
        setNewEndTime(addMinutesToTime(lastBlock.endTime, 60));
      } else {
        setTimeBlocks([]);
        setNewStartTime("09:00");
        setNewEndTime("10:30");
      }
      setSecondsRemaining(targetDuration);
      setTimerRunning(true);
    }
  }, [
    isOpen,
    todayPlan?.timeBlocks,
    todayPlan?.highlight,
    todayPlan?.agenda,
    targetDuration
  ]);

  // Timer interval
  useEffect(() => {
    if (!isOpen || !timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          playCompletionChime();
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, timerRunning]);

  if (!isOpen) return null;

  const timerMinutes = Math.floor(secondsRemaining / 60);
  const timerSeconds = secondsRemaining % 60;
  const formattedTimer = `${String(timerMinutes).padStart(2, "0")}:${String(timerSeconds).padStart(2, "0")}`;

  // Calculate totals
  const totalHours = timeBlocks.reduce(
    (sum, b) => sum + getDurationHours(b.startTime, b.endTime),
    0
  );
  const deepWorkHours = timeBlocks
    .filter((b) => b.category === "deep_work")
    .reduce((sum, b) => sum + getDurationHours(b.startTime, b.endTime), 0);

  // Quick 1-click: add daily highlight directly as a Deep Work time block
  const handleAddHighlightAsBlock = () => {
    if (!dailyHighlight.trim()) return;
    hapticPress("light");
    const start = timeBlocks.length > 0 ? timeBlocks[timeBlocks.length - 1].endTime : "09:00";
    const end = addMinutesToTime(start, 90);

    const block: TimeBlock = {
      id: `tb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: dailyHighlight.trim(),
      startTime: start,
      endTime: end,
      category: "deep_work"
    };

    const updated = [...timeBlocks, block].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    setTimeBlocks(updated);
    setNewStartTime(end);
    setNewEndTime(addMinutesToTime(end, 60));
    toast.show(t("planning.highlightAddToBlocks"));
  };

  // Add custom time block
  const handleAddCustomBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    hapticPress("light");
    const block: TimeBlock = {
      id: `tb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newTitle.trim(),
      startTime: newStartTime,
      endTime: newEndTime,
      category: newCategory,
      customCategory: newCustomTag.trim() || undefined
    };

    const updated = [...timeBlocks, block].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    setTimeBlocks(updated);
    setNewTitle("");
    setNewCustomTag("");
    setNewStartTime(newEndTime);
    setNewEndTime(addMinutesToTime(newEndTime, 60));
  };

  const handleDeleteBlock = (id: string) => {
    hapticPress("light");
    setTimeBlocks(timeBlocks.filter((b) => b.id !== id));
  };

  const handleClearAllBlocks = () => {
    hapticPress("medium");
    setTimeBlocks([]);
    setNewStartTime("09:00");
    setNewEndTime("10:30");
  };

  const handleAddAgendaItem = () => {
    const value = newAgendaItem.trim();
    if (!value || agenda.length >= AGENDA_MAX) return;
    hapticPress("light");
    setAgenda((prev) => (prev.length >= AGENDA_MAX ? prev : [...prev, value]));
    setNewAgendaItem("");
  };

  const handleRemoveAgendaItem = (index: number) => {
    hapticPress("light");
    setAgenda((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExportIcs = () => {
    hapticPress("medium");
    downloadIcsFile(activeDate, timeBlocks, activeSeason?.name || "Zendo");
    toast.show(t("planning.downloadedIcs"));
  };

  const handleCommitPlan = () => {
    hapticPress("heavy");
    playCompletionChime();
    const finalHighlight = dailyHighlight.trim();
    store.saveDayTimeBlocks(activeDate, timeBlocks, true, finalHighlight);
    if (agenda.length > 0) {
      store.setDayAgenda(activeDate, agenda);
    }
    if (finalHighlight) {
      store.setTodayHighlight(finalHighlight);
    }
    toast.show(t("planning.commitButton"));
    onCompleted?.();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          ref={sheetRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-monk-lg border border-monk-border/80 bg-monk-surface shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-monk-border/50 px-5 py-3.5 bg-monk-soft/30">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-monk-warning/15 text-monk-warning">
                <Clock size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-base font-bold text-monk-text tracking-tight">
                  {t("planning.modalTitle")}
                </h2>
                <p className="text-xs text-monk-muted">
                  {t("planning.modalSubtitle")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-xl text-monk-muted hover:bg-monk-soft hover:text-monk-text transition"
              aria-label={t("planning.modalClose")}
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Ritual Timer — available without competing with today's intention */}
            <details className="rounded-2xl border border-monk-border/70 bg-monk-soft/30">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-monk-muted marker:content-none [&::-webkit-details-marker]:hidden hover:text-monk-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent">
                <span className="flex items-center gap-2">
                  <Clock size={15} />
                  {t("planning.timerLabel")}
                </span>
                <span className="font-mono text-xs text-monk-text-soft">{formattedTimer}</span>
              </summary>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-monk-border/50 p-3">
                {/* Single calm state dot — no duplicate timer readout (it is already in the summary) */}
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 shrink-0 rounded-full transition ${
                      timerRunning ? "bg-monk-warning" : "bg-monk-border"
                    }`}
                  />
                  <span className="text-xs text-monk-muted">
                    {timerRunning ? t("planning.timerRunning") : t("planning.timerReady")}
                  </span>
                </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="flex items-center gap-1.5 rounded-xl border border-monk-border bg-monk-surface px-2.5 py-1 text-xs font-semibold text-monk-text hover:border-monk-accent hover:text-monk-accent transition"
                >
                  {timerRunning ? <Pause size={12} /> : <Play size={12} />}
                  <span>{timerRunning ? t("focus.pause") : t("planning.timerStart")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSecondsRemaining(targetDuration);
                    setTimerRunning(false);
                  }}
                  className="grid h-7 w-7 place-items-center rounded-xl border border-monk-border bg-monk-surface text-monk-muted hover:text-monk-text transition"
                  title={t("planning.resetTimer")}
                >
                  <RotateCcw size={12} />
                </button>
                <div className="ml-1 flex rounded-xl border border-monk-border bg-monk-surface p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetDuration(10 * 60);
                      setSecondsRemaining(10 * 60);
                    }}
                    className={`rounded-lg px-2 py-0.5 transition ${
                      targetDuration === 600
                        ? "bg-monk-accent text-monk-bg"
                        : "text-monk-muted hover:text-monk-text"
                    }`}
                  >
                    10m
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetDuration(15 * 60);
                      setSecondsRemaining(15 * 60);
                    }}
                    className={`rounded-lg px-2 py-0.5 transition ${
                      targetDuration === 900
                        ? "bg-monk-accent text-monk-bg"
                        : "text-monk-muted hover:text-monk-text"
                    }`}
                  >
                    15m
                  </button>
                </div>
              </div>
            </div>
            </details>

            {/* Daily Highlight (Make Time Framework) */}
            <div className="rounded-monk border border-monk-accent/35 bg-monk-accent/[0.07] p-5 space-y-3.5 shadow-soft">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-monk-accent/80">
                    {t("planning.todayFocus")}
                  </span>
                </div>
                {dailyHighlight.trim() && (
                  <button
                    type="button"
                    onClick={handleAddHighlightAsBlock}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-monk-accent/30 bg-monk-accent/10 px-3 py-2 text-xs font-semibold text-monk-accent hover:bg-monk-accent/15 transition active:scale-95"
                    title={t("planning.highlightAddToBlocks")}
                  >
                    <Plus size={11} />
                    <span>{t("planning.highlightAddToBlocks")}</span>
                  </button>
                )}
              </div>

              <p className="text-xs text-monk-muted/90 leading-relaxed">
                {t("planning.todayFocusPrompt")}
              </p>

              <div className="relative">
                <textarea
                  rows={2}
                  value={dailyHighlight}
                  onChange={(e) => setDailyHighlight(e.target.value)}
                  placeholder={goal?.keystoneAction || t("planning.dailyHighlightPlaceholder")}
                  className="w-full resize-y rounded-xl border border-monk-accent/25 bg-monk-surface/80 px-4 py-3.5 font-serif text-lg leading-relaxed text-monk-text placeholder:text-monk-muted/50 placeholder:italic focus:border-monk-accent focus:ring-1 focus:ring-monk-accent/30 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Agenda (unscheduled intents) */}
            <details className="rounded-2xl border border-monk-border/70 bg-monk-soft/30">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-monk-muted marker:content-none [&::-webkit-details-marker]:hidden hover:text-monk-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent">
                <span className="flex items-center gap-2">
                  <Tag size={15} />
                  {t("planning.agendaTitle")}
                </span>
                <span className="font-mono text-xs text-monk-text-soft">
                  {agenda.length}/{AGENDA_MAX}
                </span>
              </summary>
              <div className="border-t border-monk-border/50 p-3 space-y-2">
                {agenda.length === 0 ? (
                  <p className="text-xs text-monk-muted">{t("planning.agendaEmpty")}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {agenda.map((item, index) => (
                      <li
                        key={`${item}-${index}`}
                        className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-monk-border bg-monk-surface px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-xs text-monk-text">
                          {item}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAgendaItem(index)}
                          aria-label={`${t("planning.agendaRemove")} ${item}`}
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-monk-muted hover:bg-monk-surface hover:text-monk-accent transition"
                        >
                          <X size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddAgendaItem();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newAgendaItem}
                    onChange={(e) => setNewAgendaItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAgendaItem();
                      }
                    }}
                    placeholder={t("planning.agendaPlaceholder")}
                    className="min-h-11 w-full rounded-xl border border-monk-border bg-monk-surface px-3.5 text-xs text-monk-text focus:border-monk-accent focus:outline-none shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={!newAgendaItem.trim() || agenda.length >= AGENDA_MAX}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-monk-accent/30 bg-monk-accent/10 px-3 py-2 text-xs font-semibold text-monk-accent hover:bg-monk-accent/15 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={12} />
                    <span>{t("planning.agendaAdd")}</span>
                  </button>
                </form>
              </div>
            </details>

            {/* Custom Block Input Form (Direct & Fully Customizable) */}
            <details className="rounded-2xl border border-monk-border/70 bg-monk-soft/30">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-monk-muted marker:content-none [&::-webkit-details-marker]:hidden hover:text-monk-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent">
                <span className="flex items-center gap-2">
                  <Plus size={15} />
                  {t("planning.addBlock")}
                </span>
                <span className="text-[11px] font-normal text-monk-muted">{t("planning.customUnlimited")}</span>
              </summary>
              <form
                onSubmit={handleAddCustomBlock}
                className="space-y-3.5 border-t border-monk-border/50 p-4"
              >
                {/* Activity Title Input */}
              <div>
                <input
                  type="text"
                  placeholder={t("planning.blockTitle")}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-monk-border bg-monk-surface px-3.5 py-2.5 text-xs text-monk-text focus:border-monk-accent focus:outline-none shadow-2xs"
                />
              </div>

              {/* Time Range & Quick Duration Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-monk-muted">
                    {t("planning.startTime")}:
                  </span>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="rounded-xl border border-monk-border bg-monk-surface px-2.5 py-1.5 text-xs font-mono text-monk-text focus:border-monk-accent focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-monk-muted">
                    {t("planning.endTime")}:
                  </span>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="rounded-xl border border-monk-border bg-monk-surface px-2.5 py-1.5 text-xs font-mono text-monk-text focus:border-monk-accent focus:outline-none"
                  />
                </div>

                {/* Quick Duration Pills */}
                <div className="flex items-center gap-1 ml-auto flex-wrap">
                  {[30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        hapticPress("light");
                        setNewEndTime(addMinutesToTime(newStartTime, mins));
                      }}
                      className="rounded-lg border border-monk-border bg-monk-surface px-2 py-1 text-[11px] font-mono font-medium text-monk-muted hover:border-monk-accent hover:text-monk-accent transition active:scale-95"
                      title={`Set durasi ${mins} menit`}
                    >
                      +{mins >= 60 ? `${mins / 60}j` : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Pills & Optional Custom Tag */}
              <div className="space-y-2 pt-1 border-t border-monk-border/40">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CATEGORIES.map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat];
                    const Icon = cfg.icon;
                    const isSelected = newCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          hapticPress("light");
                          setNewCategory(cat);
                        }}
                        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition ${
                          isSelected
                            ? `${cfg.borderClass} ${cfg.bgClass} ${cfg.colorClass} shadow-2xs ring-1 ring-monk-accent/20`
                            : "border-monk-border bg-monk-surface text-monk-muted hover:text-monk-text"
                        }`}
                      >
                        <Icon size={12} />
                        <span>{t(cfg.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newCustomTag}
                      onChange={(e) => setNewCustomTag(e.target.value)}
                      placeholder={t("planning.customTagPlaceholder")}
                      className="w-full rounded-xl border border-monk-border bg-monk-surface px-3 py-1.5 text-xs text-monk-text placeholder:text-monk-muted/50 focus:border-monk-accent focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newTitle.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-monk-accent px-4 py-2 text-xs font-bold text-monk-bg shadow-xs hover:bg-monk-accent-hover transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>{t("planning.addBlock")}</span>
                  </button>
                </div>
              </div>
              </form>
            </details>

            {/* List of Scheduled Time Blocks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-monk-muted">
                    {t("planning.timeBlocks")} ({timeBlocks.length})
                  </span>
                  {timeBlocks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllBlocks}
                      className="text-[10px] text-monk-muted hover:text-monk-danger transition underline"
                    >
                      {t("planning.clearBlocks")}
                    </button>
                  )}
                </div>
                <span className="text-xs font-semibold text-monk-accent">
                  {t("planning.totalHours", { hours: totalHours.toFixed(1) })}
                  {deepWorkHours > 0 && (
                    <span className="text-monk-muted font-normal">
                      {" · "}
                      {t("planning.deepWorkHours", { hours: deepWorkHours.toFixed(1) })}
                    </span>
                  )}
                </span>
              </div>

              {timeBlocks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-monk-border p-6 text-center text-xs text-monk-muted">
                  {t("planning.noBlocksYet")}
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {timeBlocks.map((block) => {
                    const cfg = CATEGORY_CONFIG[block.category] || CATEGORY_CONFIG.deep_work;
                    const Icon = cfg.icon;
                    const durationText = formatHumanDuration(block.startTime, block.endTime, isId);

                    return (
                      <div
                        key={block.id}
                        className={`flex items-center justify-between gap-3 rounded-2xl border ${cfg.borderClass} ${cfg.bgClass} p-3 transition shadow-2xs`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-monk-surface ${cfg.colorClass} shadow-2xs`}>
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-monk-text">
                                {block.startTime} – {block.endTime}
                              </span>
                              <span className="text-[10px] font-mono text-monk-muted">
                                ({durationText})
                              </span>
                              <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cfg.bgClass} ${cfg.colorClass}`}>
                                {block.customCategory || t(cfg.labelKey)}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-monk-text truncate mt-0.5">
                              {block.title}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteBlock(block.id)}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-monk-muted hover:text-monk-danger hover:bg-monk-surface/80 transition"
                          title={t("planning.deleteBlock")}
                          aria-label={t("planning.deleteBlock")}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 z-10 flex shrink-0 flex-col gap-2 border-t border-monk-border/60 bg-monk-surface/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:flex-row-reverse sm:items-center sm:justify-between sm:px-5">
            <PrimaryButton
              onClick={handleCommitPlan}
              className="min-h-11 w-full text-sm sm:w-auto py-2.5 px-5 inline-flex items-center justify-center gap-1.5 font-bold shadow-md"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>{t("planning.commitButton")}</span>
            </PrimaryButton>
            <SecondaryButton
              onClick={handleExportIcs}
              className="min-h-11 w-full text-xs sm:w-auto py-2 px-3 inline-flex items-center justify-center gap-1.5"
            >
              <Download size={14} />
              <span>{t("planning.exportIcs")}</span>
            </SecondaryButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
