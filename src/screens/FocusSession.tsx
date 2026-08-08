import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, Volume2, VolumeX } from "lucide-react";
import {
  CalmAlert,
  Card,
  GhostButton,
  PrimaryButton,
  SecondaryButton,
} from "../components/ui";
import { FOCUS_PRESETS, getCompletedSeconds, getCurrentFocusPhase } from "../constants/focusPresets";
import { isMusicOn, toggleMusic } from "../lib/focusMusic";
import { loadLastFocus, saveLastFocus } from "../lib/storage";
import { getTodayDateString } from "../lib/date";
import { parseIntention } from "../lib/implementationIntention";
import { unlockAudio } from "../lib/audio";
import { CircularProgress } from "../components/CircularProgress";
import { selectEnergyForDate } from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import type { FocusSession, FocusSessionPreset } from "../types/app";
import { useT, type MessageKey } from "../i18n";
import { FrictionWhy } from "../components/SeasonWidgets";

export function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minsStr = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const secsStr = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minsStr}:${secsStr}`;
}

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

function getSessionPhases(session: FocusSession) {
  return session.phases?.length
    ? session.phases
    : FOCUS_PRESETS[session.preset ?? session.timerMode ?? "deep_work"].buildPhases(session.durationMinutes);
}

function getPhasePosition(session: FocusSession, type = getCurrentFocusPhase(session).type) {
  const phases = getSessionPhases(session);
  const currentIndex = session.currentPhaseIndex ?? 0;
  const total = phases.filter((item) => item.type === type).length;
  const current = phases.slice(0, currentIndex + 1).filter((item) => item.type === type).length;
  return { current: Math.max(1, current), total: Math.max(1, total) };
}

function getPhaseRoundLabel(session: FocusSession, t: Translate) {
  const phase = getCurrentFocusPhase(session);
  const position = getPhasePosition(session, phase.type);
  return t("focus.phaseRound", {
    label: phase.type === "break" ? t("focus.break") : t("focus.focus"),
    current: position.current,
    total: position.total,
  });
}

function getRemainingFocusBlocks(session: FocusSession) {
  const phases = getSessionPhases(session);
  const currentIndex = session.currentPhaseIndex ?? 0;
  return phases.slice(currentIndex + 1).filter((item) => item.type === "focus").length;
}

function getSessionLeftLabel(session: FocusSession, t: Translate) {
  const preset = session.preset ?? session.timerMode ?? "deep_work";
  const remainingFocusBlocks = getRemainingFocusBlocks(session);
  if (preset === "custom") return t("focus.singleBlock");
  if (remainingFocusBlocks === 0) return t("focus.finalBlock");
  if (preset === "pomodoro") {
    return t("focus.cyclesLeft", { n: remainingFocusBlocks });
  }
  return t("focus.blocksLeft", { n: remainingFocusBlocks });
}

function getBreakGuidance(session: FocusSession, t: Translate): {
  title: string;
  description: string;
  activities: { label: string; emoji: string }[];
} {
  const phase = getCurrentFocusPhase(session);
  if (phase.plannedMinutes >= 10) {
    return {
      title: t("focus.break10Title"),
      description: t("focus.break10Desc"),
      activities: [
        { label: t("focus.break10Act1"), emoji: "✏️" },
        { label: t("focus.break10Act2"), emoji: "🚶" },
        { label: t("focus.break10Act3"), emoji: "🧘" },
        { label: t("focus.break10Act4"), emoji: "🥜" },
      ],
    };
  }
  return {
    title: t("focus.break5Title"),
    description: t("focus.break5Desc"),
    activities: [
      { label: t("focus.break5Act1"), emoji: "🤲" },
      { label: t("focus.break5Act2"), emoji: "👁️" },
      { label: t("focus.break5Act3"), emoji: "🌬️" },
      { label: t("focus.break5Act4"), emoji: "💧" },
    ],
  };
}

function getNextFocusLabel(session: FocusSession, t: Translate) {
  const phases = getSessionPhases(session);
  const currentIndex = session.currentPhaseIndex ?? 0;
  const nextFocusIndex = phases.findIndex((item, index) => index > currentIndex && item.type === "focus");
  if (nextFocusIndex === -1) return t("focus.nextComplete");
  const totalFocusBlocks = phases.filter((item) => item.type === "focus").length;
  const nextFocusPosition = phases.slice(0, nextFocusIndex + 1).filter((item) => item.type === "focus").length;
  return t("focus.nextFocus", { position: nextFocusPosition, total: totalFocusBlocks });
}

export function FocusSessionPanel({
  session,
  mainAction,
  compact = false,
  onOpenFocus
}: {
  session: FocusSession;
  mainAction?: string;
  compact?: boolean;
  onOpenFocus?: () => void;
}) {
  const store = useMonkStore();
  const t = useT();
  const [armedFor, setArmedFor] = useState<"end" | "reset" | null>(null);
  const [musicOn, setMusicOn] = useState(isMusicOn);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (armTimerRef.current) clearTimeout(armTimerRef.current);
    };
  }, []);

  function armAndCommit(action: "end" | "reset") {
    if (armedFor === action) {
      if (armTimerRef.current) clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
      setArmedFor(null);
      if (action === "end") store.abandonFocusSession(session.id);
      else store.resetFocusSession(session.id);
      return;
    }
    if (armTimerRef.current) clearTimeout(armTimerRef.current);
    setArmedFor(action);
    armTimerRef.current = setTimeout(() => {
      armTimerRef.current = null;
      setArmedFor(null);
    }, 3000);
  }

  const toggleMusicHandler = () => {
    unlockAudio();
    setMusicOn(toggleMusic().on);
  };

  const phase = getCurrentFocusPhase(session);
  const targetSeconds = Math.max(1, phase.plannedMinutes * 60);
  const elapsed = session.elapsedSeconds || 0;
  const remaining = Math.max(0, targetSeconds - elapsed);
  const phaseProgress = Math.min(100, (elapsed / targetSeconds) * 100);
  const completedSeconds = getCompletedSeconds(session);
  const plannedMinutes = session.plannedDurationMinutes ?? 0;
  const sessionProgress = plannedMinutes > 0 ? Math.min(100, (completedSeconds / (plannedMinutes * 60)) * 100) : 0;
  const modeLabel = t(`focus.preset.${session.preset ?? session.timerMode ?? "deep_work"}.short` as MessageKey);
  const blockLabel = getPhaseRoundLabel(session, t);
  const isBreak = phase.type === "break";
  const isPaused = session.status === "paused";
  const breakGuidance = getBreakGuidance(session, t);
  const intention = parseIntention(mainAction || "");
  const distractionMatch = /^distractions:(\d+)/.exec(session.note ?? "");
  const distractionCount = distractionMatch ? Number(distractionMatch[1]) : 0;
  const ringSize = compact ? 148 : 196;
  const ringColor = isBreak ? "var(--color-rest)" : isPaused ? "var(--color-warning)" : "var(--color-accent)";

  return (
    <Card
      important
      className={`relative text-center border-monk-border-strong ${compact ? "p-5" : "p-7"} ${
        isBreak ? "bg-monk-rest-soft/40" : "bg-monk-soft"
      } ${
        isPaused
          ? "opacity-95"
          : !isBreak
            ? "shadow-[0_0_40px_rgba(164,139,94,0.08)]"
            : ""
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="rounded-full border border-monk-border bg-monk-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-monk-muted">
          {modeLabel}
        </span>
        {isPaused ? (
          <span className="rounded-full border border-monk-warning/40 bg-monk-warning-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-monk-warning">
            {t("focus.paused")}
          </span>
        ) : isBreak ? (
          <span className="rounded-full border border-monk-rest/40 bg-monk-rest-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-monk-rest">
            {t("focus.break")}
          </span>
        ) : (
          <span className="rounded-full border border-monk-accent/30 bg-monk-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-monk-accent">
            {t("focus.focus")}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm font-semibold text-monk-text">{blockLabel}</p>

      <div className={`${compact ? "my-5" : "my-8"} flex items-center justify-center`}>
        <CircularProgress
          progress={phaseProgress}
          size={ringSize}
          strokeWidth={compact ? 7 : 8}
          color={ringColor}
          bgColor="var(--color-border)"
        >
          <p className={`${compact ? "text-3xl" : "text-[44px]"} font-mono font-bold leading-none tracking-tight tabular-nums text-monk-text`}>
            {formatTimer(remaining)}
          </p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-monk-muted">
            {isBreak ? t("focus.breakLeft") : t("focus.focusLeft")}
          </p>
        </CircularProgress>
      </div>

      {isBreak ? (
        <div className={`${compact ? "" : "mx-auto max-w-sm"} mb-5 text-left`}>
          <div className="rounded-2xl border border-monk-border bg-monk-bg p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-monk-rest">{breakGuidance.title}</p>
            <p className="mt-2 text-xs leading-5 text-monk-muted">{breakGuidance.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {breakGuidance.activities.map((activity) => (
                <span
                  key={activity.label}
                  className="flex items-center gap-1.5 rounded-full border border-monk-border bg-monk-soft px-3 py-1.5 text-xs text-monk-text"
                >
                  <span aria-hidden>{activity.emoji}</span>
                  {activity.label}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold text-monk-muted">{getNextFocusLabel(session, t)}</p>
          </div>
        </div>
      ) : (
        <div className={`${compact ? "" : "mx-auto max-w-sm"} mb-5 text-left`}>
          <div className="rounded-2xl border border-monk-border bg-monk-bg p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-monk-muted">{t("focus.thisBlock")}</p>
            {intention.when && intention.action ? (
              <div className="mt-1.5 space-y-1">
                <p className="text-xs text-monk-muted">{t("today.whenShown", { when: intention.when })}</p>
                <p className="text-sm font-semibold text-monk-text">{t("today.iWillShown", { action: intention.action })}</p>
              </div>
            ) : (
              <p className="mt-1.5 text-sm font-semibold text-monk-text">
                {mainAction || t("focus.stayOneTask")}
              </p>
            )}
            <p className="mt-3 text-xs text-monk-muted">
              {getSessionLeftLabel(session, t)} · {t("focus.distractionsNote")}
            </p>
          </div>
          {!isBreak ? (
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                className="rounded-full border border-monk-border bg-monk-bg px-3 py-1.5 text-xs font-semibold text-monk-muted transition hover:border-monk-accent hover:text-monk-accent active:scale-95"
                onClick={() => store.bumpFocusDistraction(session.id)}
              >
                {t("focus.distractionTap")}
                {distractionCount > 0 ? (
                  <span className="ml-1.5 text-monk-muted/80">· {t("focus.distractionsCount", { n: distractionCount })}</span>
                ) : null}
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-monk-muted">
          <span>{t("focus.session")}</span>
          <span className="tabular-nums">{Math.round(sessionProgress)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-monk-border">
          <div
            className="h-full rounded-full bg-monk-accent transition-all duration-500"
            style={{ width: `${sessionProgress}%` }}
          />
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        {session.status === "running" ? (
          <SecondaryButton onClick={() => store.pauseFocusSession(session.id)} className="flex-1 min-h-12">
            {t("focus.pause")}
          </SecondaryButton>
        ) : (
          <PrimaryButton onClick={() => store.resumeFocusSession(session.id)} className="flex-1 min-h-12">
            {t("focus.resume")}
          </PrimaryButton>
        )}
        <button
          type="button"
          aria-label={armedFor === "reset" ? t("focus.resetConfirmAria") : t("focus.resetAria")}
          className={`min-h-12 min-w-12 rounded-monk border px-3 text-xs font-semibold transition active:scale-95 ${
            armedFor === "reset"
              ? "border-monk-danger/40 bg-monk-danger-soft text-monk-danger"
              : "border-monk-border text-monk-muted hover:border-monk-accent hover:text-monk-accent"
          }`}
          onClick={() => armAndCommit("reset")}
        >
          {armedFor === "reset" ? t("focus.resetConfirm") : t("focus.reset")}
        </button>
        <button
          type="button"
          aria-label={armedFor === "end" ? t("focus.endConfirmAria") : t("focus.endAria")}
          className={`min-h-12 min-w-12 rounded-monk border px-3 text-xs font-semibold transition active:scale-95 ${
            armedFor === "end"
              ? "border-monk-danger bg-monk-danger text-monk-bg"
              : "border-monk-danger/40 text-monk-danger hover:border-monk-danger"
          }`}
          onClick={() => armAndCommit("end")}
        >
          {armedFor === "end" ? t("focus.endConfirm") : t("focus.end")}
        </button>
      </div>

      {compact ? (
        <button
          type="button"
          onClick={toggleMusicHandler}
          aria-label={musicOn ? t("focus.musicOff") : t("focus.musicOn")}
          className="mx-auto mt-4 flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-monk-border px-4 text-xs font-semibold text-monk-muted transition hover:border-monk-accent hover:text-monk-accent active:scale-95"
        >
          {musicOn ? <Volume2 size={15} strokeWidth={1.5} /> : <VolumeX size={15} strokeWidth={1.5} />}
          {musicOn ? t("focus.musicOff") : t("focus.musicOn")}
        </button>
      ) : null}

      {onOpenFocus ? (
        <button
          type="button"
          className="mx-auto mt-4 flex min-h-11 items-center justify-center gap-1 px-4 text-xs font-bold text-monk-muted transition hover:text-monk-accent"
          onClick={onOpenFocus}
        >
          {t("focus.fullMode")}
        </button>
      ) : null}
    </Card>
  );
}

export function FocusSessionSummary({
  session,
  mainAction,
  onCloseDay,
  onStartAnother
}: {
  session: FocusSession;
  mainAction?: string;
  onCloseDay: () => void;
  onStartAnother: () => void;
}) {
  const t = useT();
  const focusMinutes = session.focusDurationMinutes ?? 0;
  const blocks = session.completedFocusBlocks ?? 0;
  const distractionMatch = /^distractions:(\d+)/.exec(session.note ?? "");
  const distractions = distractionMatch ? Number(distractionMatch[1]) : 0;
  const intention = parseIntention(mainAction || "");

  return (
    <Card
      important
      className="relative border-monk-border-strong bg-monk-soft p-6 text-center shadow-[0_0_40px_rgba(164,139,94,0.08)]"
    >
      <p className="text-sm font-bold text-monk-text">{t("focus.summary.title")}</p>
      <p className="mt-1 text-xs text-monk-muted">{t("focus.summary.subtitle")}</p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-monk-border bg-monk-bg p-3">
          <p className="text-xl font-bold tabular-nums text-monk-text">{focusMinutes}m</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-monk-muted">
            {t("focus.summary.focus")}
          </p>
        </div>
        <div className="rounded-2xl border border-monk-border bg-monk-bg p-3">
          <p className="text-xl font-bold tabular-nums text-monk-text">{blocks}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-monk-muted">
            {t("focus.summary.blocks")}
          </p>
        </div>
        <div className="rounded-2xl border border-monk-border bg-monk-bg p-3">
          <p className="text-xl font-bold tabular-nums text-monk-text">{distractions}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-monk-muted">
            {t("focus.summary.distractions")}
          </p>
        </div>
      </div>

      {intention.when && intention.action ? (
        <div className="mt-4 space-y-0.5 rounded-2xl border border-monk-border bg-monk-bg p-3 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-monk-muted">{t("focus.todaysAction")}</p>
          <p className="text-xs text-monk-muted">{t("today.whenShown", { when: intention.when })}</p>
          <p className="text-sm font-semibold text-monk-text">{t("today.iWillShown", { action: intention.action })}</p>
        </div>
      ) : mainAction ? (
        <div className="mt-4 rounded-2xl border border-monk-border bg-monk-bg p-3 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-monk-muted">{t("focus.todaysAction")}</p>
          <p className="mt-1 text-sm font-semibold text-monk-text">{mainAction}</p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton onClick={onCloseDay}>{t("focus.closeDayCta")}</PrimaryButton>
        <GhostButton onClick={onStartAnother}>{t("focus.summary.startAnother")}</GhostButton>
      </div>
    </Card>
  );
}

export function FocusSessionStarter({ compact = false }: { compact?: boolean }) {
  const store = useMonkStore();
  const t = useT();
  const lowEnergy = selectEnergyForDate(store, getTodayDateString()) === "low";
  const [selectedPreset, setSelectedPreset] = useState<FocusSessionPreset>(() => {
    if (lowEnergy) return "custom";
    const last = loadLastFocus();
    return last?.preset ?? "deep_work";
  });
  const [customMinutes, setCustomMinutes] = useState(() => {
    if (lowEnergy) return 10;
    const last = loadLastFocus();
    return last?.customMinutes ?? 50;
  });
  const [showChecklist, setShowChecklist] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const selected = FOCUS_PRESETS[selectedPreset];
  const phases = selected.buildPhases(customMinutes);
  const totalMinutes = phases.reduce((sum, phase) => sum + phase.plannedMinutes, 0);
  const canStart = selectedPreset !== "custom" || customMinutes >= 5;
  const checklistItems = [
    t("focus.check.tabs"),
    t("focus.check.water"),
    t("focus.check.phone"),
    t("focus.check.desk"),
  ];
  const checklistDone = checked.size;

  function beginSession() {
    unlockAudio();
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    saveLastFocus(selectedPreset, customMinutes);
    store.startFocusSession(selectedPreset, customMinutes);
  }

  function toggleItem(item: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  return (
    <Card className="border-monk-border bg-monk-surface p-5">
      {showChecklist ? (
        <>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-monk-text">{t("focus.readyTitle")}</p>
              <p className="mt-1 text-xs text-monk-muted">{t("focus.readyDesc")}</p>
            </div>
            <span className="rounded-full bg-monk-soft px-2.5 py-1 text-[10px] font-bold tabular-nums text-monk-muted">
              {checklistDone}/{checklistItems.length}
            </span>
          </div>
          <FrictionWhy className="mb-4" />
          <div className="mb-5 flex flex-col gap-2">
            {checklistItems.map((item) => {
              const isChecked = checked.has(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleItem(item)}
                  className={`flex min-h-12 items-center gap-3 rounded-xl border p-3 text-left transition ${
                    isChecked
                      ? "border-monk-accent/40 bg-monk-accent-soft"
                      : "border-monk-border bg-monk-soft hover:border-monk-border-strong"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                      isChecked
                        ? "border-monk-accent bg-monk-accent text-monk-bg"
                        : "border-monk-border bg-monk-surface"
                    }`}
                  >
                    {isChecked ? <Check size={14} strokeWidth={2.5} /> : null}
                  </span>
                  <span className="text-sm text-monk-text">{item}</span>
                </button>
              );
            })}
          </div>
          <PrimaryButton className="min-h-12" onClick={beginSession}>
            {t("focus.beginWith", { label: t(`focus.preset.${selectedPreset}.short` as MessageKey) })}
          </PrimaryButton>
          <GhostButton className="mt-2 w-full min-h-11" onClick={() => setShowChecklist(false)}>
            {t("focus.back")}
          </GhostButton>
        </>
      ) : (
        <>
          <p className="text-sm font-bold text-monk-text">{compact ? t("focus.startBlock") : t("focus.chooseRhythm")}</p>
          <p className="mb-4 mt-1 text-xs text-monk-muted">{t("focus.oneBlock")}</p>
          {lowEnergy ? (
            <p className="mb-3 text-xs text-monk-muted">{t("focus.lowEnergyHint")}</p>
          ) : null}

          <div className="mb-4 grid grid-cols-3 gap-2">
            {(["deep_work", "pomodoro", "custom"] as FocusSessionPreset[]).map((preset) => {
              const active = selectedPreset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  className={`min-h-12 rounded-xl border px-2 text-xs font-semibold transition active:scale-[0.98] ${
                    active
                      ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                      : "border-monk-border bg-monk-soft text-monk-muted hover:border-monk-border-strong"
                  }`}
                  onClick={() => setSelectedPreset(preset)}
                >
                  {t(`focus.preset.${preset}.short` as MessageKey)}
                </button>
              );
            })}
          </div>

          {selectedPreset === "custom" ? (
            <div className="mb-4">
              <label className="text-xs font-bold uppercase tracking-wider text-monk-muted" htmlFor="custom-focus-minutes">
                {t("focus.minutes")}
              </label>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t("focus.decreaseMin")}
                  className="grid min-h-12 min-w-12 place-items-center rounded-xl border border-monk-border bg-monk-soft text-monk-muted"
                  onClick={() => setCustomMinutes((m) => Math.max(5, m - 5))}
                >
                  <Minus size={16} />
                </button>
                <input
                  id="custom-focus-minutes"
                  type="number"
                  min={5}
                  max={180}
                  value={customMinutes}
                  onChange={(event) => setCustomMinutes(Number(event.target.value))}
                  className="min-h-12 w-full rounded-xl border border-monk-border bg-monk-soft px-4 text-center text-sm font-semibold tabular-nums text-monk-text focus:border-monk-accent focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={t("focus.increaseMin")}
                  className="grid min-h-12 min-w-12 place-items-center rounded-xl border border-monk-border bg-monk-soft text-monk-muted"
                  onClick={() => setCustomMinutes((m) => Math.min(180, m + 5))}
                >
                  <Plus size={16} />
                </button>
              </div>
              <p className="mt-2 text-xs text-monk-muted">{t("focus.minRange")}</p>
            </div>
          ) : null}

          <div className="mb-4 rounded-2xl border border-monk-border bg-monk-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-monk-text">{t(`focus.preset.${selectedPreset}.title` as MessageKey)}</p>
                <p className="mt-1 text-xs leading-5 text-monk-muted">{t(`focus.preset.${selectedPreset}.summary` as MessageKey)}</p>
              </div>
              <span className="shrink-0 rounded-full bg-monk-bg px-2.5 py-1 text-[10px] font-bold tabular-nums text-monk-accent">
                {totalMinutes}m
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {phases.map((phase) => (
                <span
                  key={phase.label}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    phase.type === "focus"
                      ? "bg-monk-accent-soft text-monk-accent"
                      : "bg-monk-bg text-monk-muted"
                  }`}
                >
                  {phase.type === "focus" ? t("focus.phaseFocus") : t("focus.phaseBreak")} · {phase.plannedMinutes}m
                </span>
              ))}
            </div>
          </div>

          {!canStart ? <CalmAlert type="warning" title={t("focus.min5")} /> : null}
          <PrimaryButton className="min-h-12" disabled={!canStart} onClick={beginSession}>
            {t("focus.beginWith", { label: t(`focus.preset.${selectedPreset}.short` as MessageKey) })}
          </PrimaryButton>
          <GhostButton className="mt-2 w-full min-h-11" disabled={!canStart} onClick={() => setShowChecklist(true)}>
            {t("focus.prepareFirst")}
          </GhostButton>
        </>
      )}
    </Card>
  );
}
