import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
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
  Download
} from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { selectTodayPlan } from "../store/selectors";
import { getTodayDateString } from "../lib/date";
import { hapticPress } from "../lib/haptics";
import { playCompletionChime } from "../lib/audio";
import { downloadIcsFile } from "../lib/ical";
import { useCalmToast, PrimaryButton, GhostButton, SecondaryButton } from "./ui";
import type { TimeBlock, TimeBlockCategory } from "../types/app";

interface MorningPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  date?: string;
  onCompleted?: () => void;
}

const CATEGORY_CONFIG: Record<
  TimeBlockCategory,
  { labelKey: string; icon: typeof Zap; colorClass: string; bgClass: string; borderClass: string }
> = {
  deep_work: {
    labelKey: "planning.catDeep",
    icon: Zap,
    colorClass: "text-amber-500 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30"
  },
  shallow: {
    labelKey: "planning.catShallow",
    icon: Briefcase,
    colorClass: "text-blue-500 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30"
  },
  learning: {
    labelKey: "planning.catLearning",
    icon: BookOpen,
    colorClass: "text-purple-500 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/30"
  },
  rest: {
    labelKey: "planning.catRest",
    icon: Coffee,
    colorClass: "text-emerald-500 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30"
  },
  personal: {
    labelKey: "planning.catPersonal",
    icon: User,
    colorClass: "text-rose-500 dark:text-rose-400",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/30"
  }
};

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
 * Format minutes difference
 */
function getDurationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
  return diffMinutes > 0 ? diffMinutes / 60 : 0;
}

export function MorningPlanningModal({
  isOpen,
  onClose,
  date,
  onCompleted
}: MorningPlanningModalProps) {
  const t = useT();
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

  // Time blocks local draft
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newStartTime, setNewStartTime] = useState("08:00");
  const [newEndTime, setNewEndTime] = useState("09:30");
  const [newCategory, setNewCategory] = useState<TimeBlockCategory>("deep_work");

  // Load existing blocks on open
  useEffect(() => {
    if (isOpen) {
      if (todayPlan?.timeBlocks && todayPlan.timeBlocks.length > 0) {
        setTimeBlocks(todayPlan.timeBlocks);
      } else {
        // Suggest initial block anchored to keystone action
        const defaultTitle = todayPlan?.mainAction || goal?.keystoneAction || "Deep Work Sprint";
        setTimeBlocks([
          {
            id: `tb-${Date.now()}-1`,
            title: defaultTitle,
            startTime: "09:00",
            endTime: "10:30",
            category: "deep_work"
          }
        ]);
        setNewStartTime("10:45");
        setNewEndTime("11:45");
      }
      setSecondsRemaining(targetDuration);
      setTimerRunning(true);
    }
  }, [isOpen, todayPlan?.timeBlocks, targetDuration]);

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

  // Quick preset adder
  const handleAddPreset = (
    title: string,
    durationMinutes: number,
    category: TimeBlockCategory
  ) => {
    hapticPress("light");
    let start = "09:00";
    if (timeBlocks.length > 0) {
      const lastBlock = timeBlocks[timeBlocks.length - 1];
      start = lastBlock.endTime;
    }
    const end = addMinutesToTime(start, durationMinutes);

    const newBlock: TimeBlock = {
      id: `tb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      startTime: start,
      endTime: end,
      category
    };

    const updated = [...timeBlocks, newBlock].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    setTimeBlocks(updated);

    // Update form next defaults
    setNewStartTime(end);
    setNewEndTime(addMinutesToTime(end, 60));
  };

  const handleAddCustomBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    hapticPress("light");
    const block: TimeBlock = {
      id: `tb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newTitle.trim(),
      startTime: newStartTime,
      endTime: newEndTime,
      category: newCategory
    };

    const updated = [...timeBlocks, block].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    setTimeBlocks(updated);
    setNewTitle("");
    setNewStartTime(newEndTime);
    setNewEndTime(addMinutesToTime(newEndTime, 60));
  };

  const handleDeleteBlock = (id: string) => {
    hapticPress("light");
    setTimeBlocks(timeBlocks.filter((b) => b.id !== id));
  };

  const handleExportIcs = () => {
    hapticPress("medium");
    downloadIcsFile(activeDate, timeBlocks, activeSeason?.name || "Zendo");
    toast.show(t("planning.downloadedIcs"));
  };

  const handleCommitPlan = () => {
    hapticPress("heavy");
    playCompletionChime();
    store.saveDayTimeBlocks(activeDate, timeBlocks, true);
    toast.show(t("planning.commitButton"));
    onCompleted?.();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-monk-border/80 bg-monk-surface shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-monk-border/50 px-5 py-4 bg-monk-soft/30">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-500/15 text-amber-500 dark:text-amber-400">
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
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Ritual Timer Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-monk-border/70 bg-monk-soft/40 p-3.5">
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-xl font-mono text-xs font-bold transition ${
                    timerRunning
                      ? "border border-amber-500/40 bg-amber-500/15 text-amber-500 animate-pulse"
                      : "border border-monk-border bg-monk-surface text-monk-muted"
                  }`}
                >
                  <Clock size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-monk-muted">
                    {t("planning.timerLabel")}
                  </span>
                  <p className="text-lg font-bold font-mono text-monk-text leading-tight">
                    {formattedTimer}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="flex items-center gap-1.5 rounded-xl border border-monk-border bg-monk-surface px-3 py-1.5 text-xs font-semibold text-monk-text hover:border-monk-accent hover:text-monk-accent transition"
                >
                  {timerRunning ? <Pause size={13} /> : <Play size={13} />}
                  <span>{timerRunning ? "Pause" : "Start"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSecondsRemaining(targetDuration);
                    setTimerRunning(false);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-xl border border-monk-border bg-monk-surface text-monk-muted hover:text-monk-text transition"
                  title="Reset timer"
                >
                  <RotateCcw size={13} />
                </button>
                <div className="ml-1 flex rounded-xl border border-monk-border bg-monk-surface p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetDuration(10 * 60);
                      setSecondsRemaining(10 * 60);
                    }}
                    className={`rounded-lg px-2 py-1 transition ${
                      targetDuration === 600
                        ? "bg-monk-accent text-white"
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
                    className={`rounded-lg px-2 py-1 transition ${
                      targetDuration === 900
                        ? "bg-monk-accent text-white"
                        : "text-monk-muted hover:text-monk-text"
                    }`}
                  >
                    15m
                  </button>
                </div>
              </div>
            </div>

            {/* Today's Keystone Anchor */}
            {goal ? (
              <div className="rounded-2xl border border-monk-border/80 bg-monk-surface p-4 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-monk-muted">
                    <Sparkles size={13} className="text-monk-accent" />
                    <span>{t("planning.todayAnchor")}</span>
                  </div>
                  <span className="rounded-full border border-monk-accent/30 bg-monk-accent/10 px-2 py-0.5 text-[10px] font-bold text-monk-accent">
                    {goal.title}
                  </span>
                </div>
                <p className="text-sm font-bold text-monk-text leading-snug">
                  {todayPlan?.mainAction || goal.keystoneAction}
                </p>
              </div>
            ) : null}

            {/* Quick Presets */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-monk-muted">
                  {t("planning.quickPresets")}
                </span>
                <span className="text-[11px] text-monk-muted">
                  Klik untuk menambahkan ke urutan
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleAddPreset(goal?.keystoneAction || "Deep Work Sprint", 90, "deep_work")}
                  className="flex flex-col items-start gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-left transition hover:bg-amber-500/20 active:scale-95"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    <Zap size={12} />
                    <span>Deep Work</span>
                  </div>
                  <span className="text-xs font-semibold text-monk-text">+90 Menit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddPreset("Admin / Balas Chat & Email", 30, "shallow")}
                  className="flex flex-col items-start gap-1 rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5 text-left transition hover:bg-blue-500/20 active:scale-95"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    <Briefcase size={12} />
                    <span>Admin</span>
                  </div>
                  <span className="text-xs font-semibold text-monk-text">+30 Menit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddPreset("Istirahat & Makan Siang Tenang", 60, "rest")}
                  className="flex flex-col items-start gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-left transition hover:bg-emerald-500/20 active:scale-95"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Coffee size={12} />
                    <span>Istirahat</span>
                  </div>
                  <span className="text-xs font-semibold text-monk-text">+60 Menit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddPreset("Belajar / Baca Buku", 45, "learning")}
                  className="flex flex-col items-start gap-1 rounded-xl border border-purple-500/30 bg-purple-500/10 p-2.5 text-left transition hover:bg-purple-500/20 active:scale-95"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400">
                    <BookOpen size={12} />
                    <span>Belajar</span>
                  </div>
                  <span className="text-xs font-semibold text-monk-text">+45 Menit</span>
                </button>
              </div>
            </div>

            {/* List of Time Blocks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-monk-muted">
                  {t("planning.timeBlocks")} ({timeBlocks.length})
                </span>
                <span className="text-xs font-semibold text-monk-accent">
                  {totalHours.toFixed(1)} jam terencana ({deepWorkHours.toFixed(1)}j Deep Work)
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
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-monk-text">
                                {block.startTime} – {block.endTime}
                              </span>
                              <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cfg.bgClass} ${cfg.colorClass}`}>
                                {t(cfg.labelKey as any)}
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
                          title="Hapus blok"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom Block Input Form */}
            <form onSubmit={handleAddCustomBlock} className="rounded-2xl border border-monk-border/70 bg-monk-soft/30 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-monk-muted">
                  + {t("planning.addBlock")} Kustom
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder={t("planning.blockTitle")}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full rounded-xl border border-monk-border bg-monk-surface px-3 py-2 text-xs text-monk-text focus:border-monk-accent focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full rounded-xl border border-monk-border bg-monk-surface px-2 py-2 text-xs font-mono text-monk-text focus:border-monk-accent focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full rounded-xl border border-monk-border bg-monk-surface px-2 py-2 text-xs font-mono text-monk-text focus:border-monk-accent focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3 flex gap-2">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as TimeBlockCategory)}
                    className="flex-1 rounded-xl border border-monk-border bg-monk-surface px-2 py-2 text-xs text-monk-text focus:border-monk-accent focus:outline-none"
                  >
                    <option value="deep_work">Deep Work</option>
                    <option value="shallow">Admin / Ringan</option>
                    <option value="learning">Belajar</option>
                    <option value="rest">Istirahat</option>
                    <option value="personal">Pribadi</option>
                  </select>
                  <button
                    type="submit"
                    disabled={!newTitle.trim()}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-monk-accent text-white font-bold disabled:opacity-40 transition hover:bg-monk-accent-hover self-center"
                    title="Tambah"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-monk-border/50 bg-monk-soft/40 px-5 py-4">
            <SecondaryButton
              onClick={handleExportIcs}
              className="text-xs py-2 px-3 inline-flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>{t("planning.exportIcs")}</span>
            </SecondaryButton>

            <PrimaryButton
              onClick={handleCommitPlan}
              className="text-xs py-2.5 px-5 inline-flex items-center gap-1.5 font-bold shadow-md"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>{t("planning.commitButton")}</span>
            </PrimaryButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
