import { useState, useEffect } from "react";
import {
  Wind,
  CheckCircle2,
  X,
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
  Check
} from "lucide-react";
import { useT } from "../i18n";
import { PrimaryButton, GhostButton } from "./ui";
import { hapticPress } from "../lib/haptics";
import { playFocusChime, playZenBell, unlockAudio } from "../lib/audio";

interface FocusPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartFocus: () => void;
  taskTitle?: string;
}

export function FocusPrepModal({
  isOpen,
  onClose,
  onStartFocus,
  taskTitle
}: FocusPrepModalProps) {
  const t = useT();

  // 5-minute (300s) countdown timer
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [isRunning, setIsRunning] = useState(true);
  const [activeTab, setActiveTab] = useState<"env" | "breath" | "intent">("env");

  // Environment checklist state
  const [checkedEnv, setCheckedEnv] = useState<Record<string, boolean>>({
    desk: false,
    tabs: false,
    water: false,
    dnd: false,
  });

  // Breathing pacer cycle (4s inhale, 4s hold, 4s exhale, 4s hold = 16s total)
  const [breathPhase, setBreathPhase] = useState<"inhale" | "holdIn" | "exhale" | "holdOut">("inhale");
  const [breathCount, setBreathCount] = useState(4);

  // Focus intent text
  const [intent, setIntent] = useState(taskTitle || "");

  useEffect(() => {
    if (taskTitle) setIntent(taskTitle);
  }, [taskTitle]);

  // Reset timer state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(300);
      setIsRunning(true);
      setActiveTab("env");
      unlockAudio();
    }
  }, [isOpen]);

  // Independent 5:00 countdown timer
  useEffect(() => {
    if (!isOpen || !isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRunning(false);
          playFocusChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isRunning]);

  // Breathing pacer effect
  useEffect(() => {
    if (!isOpen || activeTab !== "breath") return;
    const cycle = setInterval(() => {
      setBreathCount((cnt) => {
        if (cnt <= 1) {
          setBreathPhase((phase) => {
            if (phase === "inhale") return "holdIn";
            if (phase === "holdIn") return "exhale";
            if (phase === "exhale") return "holdOut";
            return "inhale";
          });
          return 4;
        }
        return cnt - 1;
      });
    }, 1000);
    return () => clearInterval(cycle);
  }, [isOpen, activeTab]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const toggleEnv = (key: string) => {
    hapticPress("light");
    setCheckedEnv((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStart = () => {
    unlockAudio();
    playZenBell();
    hapticPress("medium");
    onClose();
    onStartFocus();
  };

  const envItems = [
    { key: "desk", label: t("focusPrep.envDesk") },
    { key: "tabs", label: t("focusPrep.envTabs") },
    { key: "water", label: t("focusPrep.envWater") },
    { key: "dnd", label: t("focusPrep.envDnd") },
  ];

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-monk-bg/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prep-dialog-title"
        className="relative z-10 flex max-h-[92dvh] sm:max-h-[88vh] w-full sm:max-w-[540px] flex-col rounded-t-monk-lg sm:rounded-monk-lg border border-monk-border bg-monk-surface shadow-2xl overflow-hidden"
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-monk-border-strong/70" />
        </div>

        {/* Top Header */}
        <div className="border-b border-monk-border/60 px-5 pt-3.5 pb-3 sm:px-6 sm:pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-monk-accent/15 text-monk-accent">
                <Wind size={18} />
              </div>
              <div>
                <h2 id="prep-dialog-title" className="text-base font-bold tracking-tight text-monk-text">
                  {t("focusPrep.modalTitle")}
                </h2>
                <p className="text-[11px] font-medium text-monk-muted">
                  {t("focusPrep.subtitle")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-7 w-7 place-items-center rounded-lg text-monk-muted hover:bg-monk-soft hover:text-monk-text transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Timer Control Bar */}
        <div className="flex items-center justify-between border-b border-monk-border/40 bg-monk-soft/40 px-5 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-2xl font-bold tracking-tight text-monk-text">
              {timeFormatted}
            </span>
            <span className="rounded-full bg-monk-accent/15 px-2 py-0.5 text-[10px] font-bold text-monk-accent">
              5:00 Ritual
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                hapticPress("light");
                setIsRunning((r) => !r);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 ${
                isRunning
                  ? "border-monk-accent bg-monk-accent text-white shadow-xs"
                  : "border-monk-border bg-monk-surface text-monk-text hover:border-monk-accent"
              }`}
            >
              {isRunning ? <Pause size={12} /> : <Play size={12} />}
              <span>{isRunning ? "Pause" : "Resume"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                hapticPress("light");
                setSecondsLeft(300);
                setIsRunning(false);
              }}
              title="Reset 5m"
              className="grid h-8 w-8 place-items-center rounded-xl border border-monk-border bg-monk-surface text-monk-muted hover:text-monk-text transition"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="grid grid-cols-3 border-b border-monk-border/40 bg-monk-surface text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("env")}
            className={`py-2.5 text-center transition border-b-2 ${
              activeTab === "env"
                ? "border-monk-accent text-monk-accent font-bold bg-monk-accent-soft/20"
                : "border-transparent text-monk-muted hover:text-monk-text"
            }`}
          >
            {t("focusPrep.tabEnv")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("breath")}
            className={`py-2.5 text-center transition border-b-2 ${
              activeTab === "breath"
                ? "border-monk-accent text-monk-accent font-bold bg-monk-accent-soft/20"
                : "border-transparent text-monk-muted hover:text-monk-text"
            }`}
          >
            {t("focusPrep.tabBreath")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("intent")}
            className={`py-2.5 text-center transition border-b-2 ${
              activeTab === "intent"
                ? "border-monk-accent text-monk-accent font-bold bg-monk-accent-soft/20"
                : "border-transparent text-monk-muted hover:text-monk-text"
            }`}
          >
            {t("focusPrep.tabIntent")}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-4">
          {activeTab === "env" && (
            <div className="space-y-2.5 animate-fade-in">
              <p className="text-xs font-medium text-monk-muted">
                Eliminate physical & digital clutter before diving in:
              </p>
              <div className="grid grid-cols-1 gap-2 pt-1">
                {envItems.map((item) => {
                  const isChecked = !!checkedEnv[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleEnv(item.key)}
                      className={`flex min-h-12 items-center gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.99] ${
                        isChecked
                          ? "border-monk-accent/50 bg-monk-accent-soft/30 shadow-xs"
                          : "border-monk-border bg-monk-soft/40 hover:border-monk-border-strong hover:bg-monk-soft"
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                          isChecked
                            ? "border-monk-accent bg-monk-accent text-white"
                            : "border-monk-border-strong bg-monk-surface"
                        }`}
                      >
                        {isChecked ? <Check size={14} strokeWidth={2.5} /> : null}
                      </span>
                      <span className={`text-sm font-medium ${isChecked ? "text-monk-text font-semibold line-through opacity-85" : "text-monk-text"}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "breath" && (
            <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center animate-fade-in">
              <p className="text-xs font-semibold text-monk-muted">
                {t("focusPrep.breathGuide")}
              </p>

              {/* Animated Breathing Orb */}
              <div className="relative flex items-center justify-center h-36 w-36 my-2">
                <div
                  className={`absolute rounded-full transition-all duration-1000 ${
                    breathPhase === "inhale"
                      ? "h-36 w-36 bg-monk-accent/25 ring-8 ring-monk-accent/15 scale-100"
                      : breathPhase === "holdIn"
                      ? "h-36 w-36 bg-monk-accent/35 ring-4 ring-monk-accent/30 scale-105"
                      : breathPhase === "exhale"
                      ? "h-20 w-20 bg-monk-accent/20 ring-2 ring-monk-accent/10 scale-90"
                      : "h-20 w-20 bg-monk-accent/10 scale-90"
                  }`}
                />
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <span className="font-mono text-3xl font-extrabold text-monk-text">
                    {breathCount}s
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-monk-accent mt-0.5">
                    {breathPhase === "inhale"
                      ? "Inhale"
                      : breathPhase === "holdIn"
                      ? "Hold"
                      : breathPhase === "exhale"
                      ? "Exhale"
                      : t("focusPrep.breathRest")}
                  </span>
                </div>
              </div>

              <p className="text-xs text-monk-muted max-w-xs leading-relaxed">
                {breathPhase === "inhale"
                  ? t("focusPrep.breathInhale")
                  : breathPhase === "holdIn"
                  ? t("focusPrep.breathHold")
                  : breathPhase === "exhale"
                  ? t("focusPrep.breathExhale")
                  : t("focusPrep.breathHold")}
              </p>
            </div>
          )}

          {activeTab === "intent" && (
            <div className="space-y-3 animate-fade-in">
              <div className="rounded-2xl border border-monk-accent/30 bg-monk-accent-soft/20 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-monk-accent">
                  {t("focusPrep.intentHeading")}
                </p>
                <input
                  type="text"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder="Define your single priority task..."
                  className="w-full rounded-xl border border-monk-border bg-monk-surface px-3.5 py-2.5 text-sm font-semibold text-monk-text focus:border-monk-accent focus:outline-none"
                />
                <p className="text-[11px] text-monk-muted">
                  Multi-tasking is an illusion. Commit 100% of your mental bandwidth to this single output.
                </p>
              </div>

              {secondsLeft === 0 && (
                <div className="rounded-xl border border-monk-success/30 bg-monk-success-soft p-3 text-xs text-monk-success font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>5-minute prep complete! Your mind is grounded. Let&apos;s begin.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-monk-border/60 bg-monk-surface px-5 py-3 sm:px-6 flex items-center justify-between gap-3">
          <GhostButton onClick={handleStart} className="min-h-11 px-3 text-xs text-monk-muted hover:text-monk-text">
            {t("focusPrep.skip")}
          </GhostButton>

          <PrimaryButton onClick={handleStart} className="min-h-11 px-5 flex items-center gap-2">
            <span>{t("focusPrep.readyBtn")}</span>
            <ArrowRight size={15} />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
