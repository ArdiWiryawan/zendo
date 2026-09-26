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
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { PrimaryButton, SecondaryButton, TextInput, Textarea, useCalmToast } from "./ui";
import { hapticPress } from "../lib/haptics";
import { GOAL_TEMPLATES, GoalBlueprintTemplate } from "../constants/goalTemplates";

interface GoalBlueprintModalProps {
  goalId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

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
  const [why, setWhy] = useState("");
  const [weeklyTargetCount, setWeeklyTargetCount] = useState(4);
  const [obstacleMitigation, setObstacleMitigation] = useState("");
  const [error, setError] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (goal && isOpen) {
      setTitle(goal.title || "");
      setKeystoneAction(goal.keystoneAction || "");
      setWhenWhere(goal.whenWhere || "");
      setDefinitionOfDone(goal.definitionOfDone || "");
      setWhy(goal.why || "");
      setWeeklyTargetCount(goal.weeklyTargetCount || 4);
      setObstacleMitigation(goal.obstacleMitigation || "");
      setShowTemplates(false);
      setShowAdvanced(false);
      setError("");
    }
  }, [goal, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showTemplates) {
          setShowTemplates(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, showTemplates]);

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
      whenWhere: whenWhere.trim() || undefined,
      definitionOfDone: definitionOfDone.trim() || undefined,
      weeklyTargetCount,
      why: why.trim() || undefined,
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="blueprint-dialog-title"
        className="relative z-10 flex max-h-[92dvh] sm:max-h-[88vh] w-full sm:max-w-[560px] flex-col rounded-t-[28px] sm:rounded-[28px] border border-monk-border bg-monk-surface shadow-2xl overflow-hidden"
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
                  {showTemplates ? t("blueprint.templatesTitle") : "4 Essential Pillars for Flawless Execution"}
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
                    ? "bg-monk-accent text-white shadow-sm"
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
              </div>

              {/* Pillar 2: Next Keystone Action */}
              <div className="rounded-2xl border border-monk-accent/30 bg-monk-accent-soft/20 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-monk-accent font-bold text-xs uppercase tracking-wider">
                  <div className="grid h-5 w-5 place-items-center rounded bg-monk-accent text-white">
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
                  <div className="grid h-5 w-5 place-items-center rounded bg-blue-500/20 text-blue-500">
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
                  <span>Target Days & 2-Minute Plan B</span>
                  {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showAdvanced ? (
                  <div className="mt-2 space-y-3 rounded-2xl border border-monk-border/60 bg-monk-soft/20 p-3.5 text-xs">
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
            Cancel
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
