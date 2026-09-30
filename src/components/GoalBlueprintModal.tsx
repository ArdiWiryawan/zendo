import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  X,
  LayoutTemplate,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Check
} from "lucide-react";
import { useMonkStore, normalizeAvailability } from "../store/useMonkStore";
import { useT } from "../i18n";
import type { MessageKey } from "../i18n";
import type { GoalType, GoalWeekday } from "../types/app";
import { PrimaryButton, SecondaryButton, TextInput, Textarea, useCalmToast, useModalA11y } from "./ui";
import { hapticPress } from "../lib/haptics";
import { GOAL_TEMPLATES, GoalBlueprintTemplate } from "../constants/goalTemplates";

interface GoalBlueprintModalProps {
  goalId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Monday-first, matching GoalWeekday's index order.
const WEEKDAY_KEYS = [
  "blueprint.weekday.mon",
  "blueprint.weekday.tue",
  "blueprint.weekday.wed",
  "blueprint.weekday.thu",
  "blueprint.weekday.fri",
  "blueprint.weekday.sat",
  "blueprint.weekday.sun"
] as const;

export function GoalBlueprintModal({ goalId, isOpen, onClose }: GoalBlueprintModalProps) {
  const t = useT();
  const toast = useCalmToast();
  const store = useMonkStore();
  const goal = store.goals.find((g) => g.id === goalId);
  const lang = (store.appSettings.language ?? "id") === "en" ? "en" : "id";
  const templates = GOAL_TEMPLATES[lang];

  const [showTemplates, setShowTemplates] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 4 Essential Pillars
  const [title, setTitle] = useState("");
  const [keystoneAction, setKeystoneAction] = useState("");
  const [whenWhere, setWhenWhere] = useState("");
  const [definitionOfDone, setDefinitionOfDone] = useState("");

  // Additional settings
  const [track, setTrack] = useState("");
  const [why, setWhy] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [weeklyTargetCount, setWeeklyTargetCount] = useState(4);
  // §12-13: the goal's kind, and — only for `frequency` goals — the countable
  // outcome target, kept separate from the practice rhythm above.
  const [goalType, setGoalType] = useState<GoalType>("achievement");
  const [outcomeFrequency, setOutcomeFrequency] = useState(3);
  // §14 availability — preferred days + workable window.
  const [preferredDays, setPreferredDays] = useState<GoalWeekday[]>([]);
  const [availStart, setAvailStart] = useState("");
  const [availEnd, setAvailEnd] = useState("");
  const [obstacleMitigation, setObstacleMitigation] = useState("");
  const [error, setError] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (goal && isOpen) {
      setTitle(goal.title || "");
      setKeystoneAction(goal.keystoneAction || "");
      setWhenWhere(goal.whenWhere || "");
      setDefinitionOfDone(goal.definitionOfDone || "");
      setTrack(goal.track || "");
      setWhy(goal.why || "");
      setDesiredOutcome(goal.desiredOutcome || "");
      setWeeklyTargetCount(goal.weeklyTargetCount || 4);
      setGoalType(goal.type ?? "achievement");
      setOutcomeFrequency(goal.outcomeFrequencyPerWeek ?? 3);
      setPreferredDays(goal.availability?.preferredDays ?? []);
      setAvailStart(goal.availability?.preferredStartTime ?? "");
      setAvailEnd(goal.availability?.preferredEndTime ?? "");
      setObstacleMitigation(goal.obstacleMitigation || "");
      setShowTemplates(false);
      setShowAdvanced(false);
      setError("");
    }
  }, [goal, isOpen]);

  // Escape closes (backing out of the template picker first), Tab stays inside,
  // focus returns to the opener on unmount.
  useModalA11y({
    open: isOpen,
    ref: modalRef,
    onClose: () => {
      if (showTemplates) setShowTemplates(false);
      else onClose();
    }
  });

  if (!goal || !isOpen) return null;

  const handleApplyTemplate = (tpl: GoalBlueprintTemplate) => {
    hapticPress("medium");
    setTitle(tpl.title);
    setWhy(tpl.why);
    setKeystoneAction(tpl.keystoneAction);
    setWeeklyTargetCount(tpl.weeklyTargetCount);
    setObstacleMitigation(tpl.obstacleMitigation);
    setShowTemplates(false);
    setError("");
    toast.show(t("blueprint.templateApplied", { name: tpl.category }));
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError(t("blueprint.needTitle"));
      return;
    }
    if (!keystoneAction.trim()) {
      setError(t("blueprint.needKeystone"));
      return;
    }

    hapticPress("medium");
    store.updateGoalBlueprint(goal.id, {
      title: title.trim(),
      keystoneAction: keystoneAction.trim(),
      track: track.trim() || undefined,
      whenWhere: whenWhere.trim() || undefined,
      availability: normalizeAvailability({
        preferredDays,
        preferredStartTime: availStart,
        preferredEndTime: availEnd
      }),
      definitionOfDone: definitionOfDone.trim() || undefined,
      weeklyTargetCount,
      type: goalType,
      outcomeFrequencyPerWeek: goalType === "frequency" ? outcomeFrequency : undefined,
      why: why.trim() || undefined,
      desiredOutcome: desiredOutcome.trim() || undefined,
      obstacleMitigation: obstacleMitigation.trim() || undefined
    });

    toast.show(t("blueprint.saved"));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-monk-bg/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Modal / Bottom Sheet */}
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="blueprint-dialog-title"
        className="relative z-10 flex max-h-[92dvh] sm:max-h-[88vh] w-full sm:max-w-[560px] flex-col rounded-t-monk-lg sm:rounded-monk-lg border border-monk-border bg-monk-surface shadow-2xl overflow-hidden"
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
                <Sparkles size={18} />
              </div>
              <div>
                <h2 id="blueprint-dialog-title" className="text-base font-bold tracking-tight text-monk-text">
                  {t("blueprint.dialogTitle")}
                </h2>
                <p className="text-[11px] font-medium text-monk-muted">
                  {showTemplates ? t("blueprint.templatesTitle") : t("blueprint.pillarsSubtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  hapticPress("light");
                  setShowTemplates((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                  showTemplates
                    ? "bg-monk-accent text-monk-bg shadow-sm"
                    : "border border-monk-accent/40 bg-monk-accent/10 text-monk-accent hover:bg-monk-accent/20"
                }`}
              >
                <LayoutTemplate size={12} />
                <span>{showTemplates ? t("blueprint.backToCustom") : t("blueprint.useTemplate")}</span>
              </button>

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
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-4">
          {error ? (
            <div className="rounded-xl border border-monk-danger/30 bg-monk-danger/10 p-3 text-xs text-monk-danger font-medium flex items-center gap-2">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {showTemplates ? (
            <div className="space-y-2.5 animate-fade-in">
              <div className="rounded-xl border border-monk-border/60 bg-monk-soft/50 p-3 text-xs text-monk-muted">
                {t("blueprint.templatesDesc")}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="flex flex-col text-left p-3.5 rounded-xl border border-monk-border bg-monk-surface hover:border-monk-accent/60 hover:bg-monk-accent-soft/20 transition active:scale-[0.99] space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-monk-text">{tpl.title}</span>
                      <span className="rounded-full bg-monk-accent/15 px-2 py-0.5 text-[10px] font-bold text-monk-accent">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-monk-muted leading-relaxed">
                      ⚡ <span className="font-semibold text-monk-text-soft">{tpl.keystoneAction}</span>
                    </p>
                    <p className="text-[10px] text-monk-muted/80 line-clamp-1 italic">
                      &quot;{tpl.why}&quot;
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pillar 1: Goal */}
              <div className="rounded-2xl border border-monk-border bg-monk-soft/40 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-monk-text font-bold text-xs uppercase tracking-wider">
                  <div className="grid h-5 w-5 place-items-center rounded bg-monk-accent/20 text-monk-accent">
                    <Target size={12} />
                  </div>
                  <span>{t("blueprint.pillar1Title")}</span>
                </div>
                <TextInput
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder={t("blueprint.titlePlaceholder")}
                  className="bg-monk-surface text-sm font-semibold"
                />
                <p className="text-[11px] text-monk-muted">{t("blueprint.pillar1Desc")}</p>
                <label htmlFor="blueprint-outcome" className="text-xs font-bold uppercase tracking-wider text-monk-muted block">
                  {t("blueprint.outcomeLabel")}
                </label>
                <TextInput
                  id="blueprint-outcome"
                  value={desiredOutcome}
                  onChange={(e) => setDesiredOutcome(e.target.value)}
                  placeholder={t("blueprint.outcomePlaceholder")}
                  className="bg-monk-surface text-sm"
                  onBlur={(e) => setDesiredOutcome(e.target.value.trim())}
                />
              </div>

              {/* Goal Track / Focus Area */}
              <div className="rounded-2xl border border-monk-border bg-monk-soft/30 p-3.5 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-monk-muted block">
                  {t("blueprint.trackLabel")}
                </label>
                <TextInput
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                  placeholder={t("blueprint.trackPlaceholder")}
                  className="bg-monk-surface text-sm"
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {["🎓 Magang", "▶️ YouTube", "🚀 Bisnis", "🌿 Personal", "📚 Studi"].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setTrack(chip)}
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold transition active:scale-95 border ${
                        track === chip
                          ? "border-monk-accent bg-monk-accent/15 text-monk-accent font-bold"
                          : "border-monk-border/60 bg-monk-surface text-monk-muted hover:text-monk-text"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pillar 2: Next Keystone Action */}
              <div className="rounded-2xl border border-monk-accent/30 bg-monk-accent-soft/20 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-monk-accent font-bold text-xs uppercase tracking-wider">
                  <div className="grid h-5 w-5 place-items-center rounded bg-monk-accent text-monk-bg">
                    <Zap size={12} />
                  </div>
                  <span>{t("blueprint.pillar2Title")}</span>
                </div>
                <TextInput
                  value={keystoneAction}
                  onChange={(e) => {
                    setKeystoneAction(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder={t("blueprint.keystonePlaceholder")}
                  className="bg-monk-surface text-sm font-semibold"
                />
                <p className="text-[11px] text-monk-muted">{t("blueprint.pillar2Desc")}</p>
              </div>

              {/* Pillar 3: When & Where */}
              <div className="rounded-2xl border border-monk-border bg-monk-soft/40 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-monk-text font-bold text-xs uppercase tracking-wider">
                  <div className="grid h-5 w-5 place-items-center rounded bg-monk-cat-shallow/20 text-monk-cat-shallow">
                    <Clock size={12} />
                  </div>
                  <span>{t("blueprint.pillar3Title")}</span>
                </div>
                <TextInput
                  value={whenWhere}
                  onChange={(e) => setWhenWhere(e.target.value)}
                  placeholder={t("blueprint.pillar3Placeholder")}
                  className="bg-monk-surface text-sm"
                />
                <p className="text-[11px] text-monk-muted">{t("blueprint.pillar3Desc")}</p>
              </div>

              {/* Pillar 4: Definition of Done */}
              <div className="rounded-2xl border border-monk-border bg-monk-soft/40 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-monk-text font-bold text-xs uppercase tracking-wider">
                  <div className="grid h-5 w-5 place-items-center rounded bg-monk-success/20 text-monk-success">
                    <CheckCircle2 size={12} />
                  </div>
                  <span>{t("blueprint.pillar4Title")}</span>
                </div>
                <TextInput
                  value={definitionOfDone}
                  onChange={(e) => setDefinitionOfDone(e.target.value)}
                  placeholder={t("blueprint.pillar4Placeholder")}
                  className="bg-monk-surface text-sm"
                />
                <p className="text-[11px] text-monk-muted">{t("blueprint.pillar4Desc")}</p>
              </div>

              {/* Optional Advanced Settings Accordion */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-monk-border/60 bg-monk-soft/30 px-3.5 py-2.5 text-xs font-semibold text-monk-muted hover:text-monk-text transition"
                >
                  <span>{t("blueprint.advancedLabel")}</span>
                  {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showAdvanced ? (
                  <div className="mt-2 space-y-3 rounded-2xl border border-monk-border/60 bg-monk-soft/20 p-3.5 text-xs">
                    <div>
                      <label className="font-semibold text-monk-text block mb-1">
                        {t("blueprint.typeLabel")}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {(["achievement", "frequency", "maintenance"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setGoalType(type)}
                            aria-pressed={goalType === type}
                            className={`rounded-lg border px-2.5 py-1.5 transition ${
                              goalType === type
                                ? "border-monk-accent/50 bg-monk-accent/10 font-semibold text-monk-text"
                                : "border-monk-border/70 bg-monk-surface/60 text-monk-muted hover:text-monk-text"
                            }`}
                          >
                            {t(`blueprint.type.${type}` as MessageKey)}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[10px] leading-4 text-monk-muted">
                        {t(`blueprint.typeHint.${goalType}` as MessageKey)}
                      </p>
                    </div>
                    <div>
                      <label className="font-semibold text-monk-text block mb-1">
                        {t("blueprint.frequencyLabel")} ({weeklyTargetCount} {t("blueprint.daysPerWeek")})
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={7}
                        value={weeklyTargetCount}
                        onChange={(e) => setWeeklyTargetCount(Number(e.target.value))}
                        className="w-full accent-monk-accent cursor-pointer"
                      />
                    </div>
                    {goalType === "frequency" ? (
                      <div>
                        <label className="font-semibold text-monk-text block mb-1">
                          {t("blueprint.outcomeFrequencyLabel")} ({outcomeFrequency}{" "}
                          {t("blueprint.timesPerWeek")})
                        </label>
                        <input
                          type="range"
                          min={1}
                          max={7}
                          value={outcomeFrequency}
                          onChange={(e) => setOutcomeFrequency(Number(e.target.value))}
                          className="w-full accent-monk-accent cursor-pointer"
                        />
                        <p className="mt-1 text-[10px] leading-4 text-monk-muted">
                          {t("blueprint.outcomeFrequencyHint")}
                        </p>
                      </div>
                    ) : null}
                    {/* §14 Availability — when this is realistically workable. */}
                    <div>
                      <label className="font-semibold text-monk-text block mb-1">
                        {t("blueprint.availabilityLabel")}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAY_KEYS.map((key, index) => {
                          const on = preferredDays.includes(index as GoalWeekday);
                          return (
                            <button
                              key={key}
                              type="button"
                              aria-pressed={on}
                              onClick={() =>
                                setPreferredDays((prev) =>
                                  prev.includes(index as GoalWeekday)
                                    ? prev.filter((d) => d !== index)
                                    : [...prev, index as GoalWeekday].sort((a, b) => a - b)
                                )
                              }
                              className={`min-h-8 rounded-lg border px-2.5 text-[11px] font-semibold transition active:scale-95 ${
                                on
                                  ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                                  : "border-monk-border bg-monk-surface text-monk-muted hover:text-monk-text"
                              }`}
                            >
                              {t(key)}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="time"
                          aria-label={t("blueprint.availabilityStart")}
                          value={availStart}
                          onChange={(e) => setAvailStart(e.target.value)}
                          className="min-h-9 flex-1 rounded-lg border border-monk-border bg-monk-surface px-2 text-xs text-monk-text focus:border-monk-accent focus:outline-none"
                        />
                        <span className="text-xs text-monk-muted">–</span>
                        <input
                          type="time"
                          aria-label={t("blueprint.availabilityEnd")}
                          value={availEnd}
                          onChange={(e) => setAvailEnd(e.target.value)}
                          className="min-h-9 flex-1 rounded-lg border border-monk-border bg-monk-surface px-2 text-xs text-monk-text focus:border-monk-accent focus:outline-none"
                        />
                      </div>
                      <p className="mt-1 text-[10px] leading-4 text-monk-muted">
                        {t("blueprint.availabilityHint")}
                      </p>
                    </div>
                    <div>
                      <label className="font-semibold text-monk-text block mb-1">
                        {t("blueprint.planBLabel")}
                      </label>
                      <TextInput
                        value={obstacleMitigation}
                        onChange={(e) => setObstacleMitigation(e.target.value)}
                        placeholder={t("blueprint.planBPlaceholder")}
                        className="bg-monk-surface text-xs"
                      />
                      <p className="mt-1 text-[10px] text-monk-muted">{t("blueprint.planBHint")}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-monk-border/60 bg-monk-surface px-5 py-3 sm:px-6 flex items-center justify-end gap-2.5">
          <SecondaryButton onClick={onClose} className="min-h-11 px-4">
            {t("dialog.cancel")}
          </SecondaryButton>
          <PrimaryButton onClick={handleSave} className="min-h-11 px-5 flex items-center gap-1.5">
            <Check size={15} />
            <span>{t("blueprint.save")}</span>
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
