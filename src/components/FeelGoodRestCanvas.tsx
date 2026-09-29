import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon,
  Check,
  ArrowRight,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  RotateCcw,
  ChevronRight,
  type LucideIcon
} from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT, useLanguage } from "../i18n";
import { hapticPress } from "../lib/haptics";
import { Card, PrimaryButton, GhostButton, useCalmToast } from "./ui";
import { getTodayDateString } from "../lib/date";
import { restIcon } from "../constants/restActivities";
import { REST_QUESTIONS } from "../constants/restQuestionnaire";
import {
  recommendRest,
  isQuestionnaireComplete,
  type RestAnswers
} from "../lib/restRecommend";
import type { EnergyLevel } from "../types/app";

interface FeelGoodRestCanvasProps {
  onOpenWeeklyReview: () => void;
  className?: string;
}

const ENERGY_ICONS: Record<EnergyLevel, LucideIcon> = {
  low: BatteryLow,
  medium: BatteryMedium,
  high: BatteryFull
};

export function FeelGoodRestCanvas({ onOpenWeeklyReview, className = "" }: FeelGoodRestCanvasProps) {
  const t = useT();
  const lang = useLanguage();
  const toast = useCalmToast();
  const store = useMonkStore();
  const today = getTodayDateString();

  const [answers, setAnswers] = useState<RestAnswers>({});
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const plan = store.dayPlans.find((p) => p.date === today);
    return plan?.mainAction?.startsWith("rest:") ? plan.mainAction.replace("rest:", "") : null;
  });

  const [customAction, setCustomAction] = useState("");
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  const todayPlan = store.dayPlans.find((p) => p.date === today);
  const currentEnergy = todayPlan?.energyLevel ?? store.energyLogs.find((e) => e.date === today)?.level;

  const complete = isQuestionnaireComplete(answers);
  const recommendations = useMemo(
    () => (complete ? recommendRest(answers) : []),
    [answers, complete]
  );

  const question = REST_QUESTIONS[step];

  const handleAnswer = (questionId: string, optionId: string) => {
    hapticPress("light");
    const next = { ...answers, [questionId]: optionId };
    setAnswers(next);
    if (step < REST_QUESTIONS.length - 1) {
      setStep(step + 1);
    } else if (isQuestionnaireComplete(next)) {
      setShowResults(true);
    }
  };

  const handleRetake = () => {
    hapticPress("light");
    setAnswers({});
    setStep(0);
    setShowResults(false);
  };

  const handleSelectActivity = (id: string, title: string) => {
    hapticPress("light");
    setSelectedId(id);
    store.createOrUpdateDayPlan(today, {
      dayType: "rest",
      mainAction: `rest:${id}`,
      highlight: title,
      status: "rest"
    });
    toast.show(t("toast.saved"));
  };

  const handleSaveCustom = () => {
    if (!customAction.trim()) return;
    hapticPress("light");
    setSelectedId("custom");
    store.createOrUpdateDayPlan(today, {
      dayType: "rest",
      mainAction: `rest:custom:${customAction.trim()}`,
      highlight: customAction.trim(),
      status: "rest"
    });
    setIsEditingCustom(false);
    toast.show(t("toast.saved"));
  };

  const handleSetEnergy = (lvl: EnergyLevel) => {
    hapticPress("medium");
    store.logEnergy(lvl);
    if (todayPlan) {
      store.createOrUpdateDayPlan(today, {
        dayType: "rest",
        energyLevel: lvl,
        status: "rest"
      });
    }
    toast.show(t("toast.saved"));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card className="relative overflow-hidden border-monk-rest/35 bg-gradient-to-b from-monk-rest-soft/50 via-monk-surface to-monk-surface p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-monk-rest/20 text-monk-rest shadow-inner">
            <Moon size={22} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="rounded-md border border-monk-rest/40 bg-monk-rest-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-monk-rest">
              {t("rest.badge")}
            </span>
            <h3 className="mt-1.5 text-base font-bold text-monk-text tracking-tight">
              {t("rest.title")}
            </h3>
            <p className="mt-1 text-xs text-monk-muted leading-relaxed">
              {t("rest.subtitle")}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-monk-border/40 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-monk-muted/90">
            {t("rest.energyLabel")}
          </span>
          <div className="flex items-center gap-1.5">
            {(["low", "medium", "high"] as EnergyLevel[]).map((lvl) => {
              const Icon = ENERGY_ICONS[lvl];
              const active = currentEnergy === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleSetEnergy(lvl)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                    active
                      ? "border-monk-accent bg-monk-accent/15 text-monk-text font-bold"
                      : "border-monk-border/60 bg-monk-soft/50 text-monk-muted hover:text-monk-text"
                  }`}
                >
                  <Icon size={13} strokeWidth={2} />
                  <span>{t(`rest.energy.${lvl}`)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Questionnaire */}
      {!showResults ? (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">
              {t("rest.questionOf", { current: step + 1, total: REST_QUESTIONS.length })}
            </p>
            <div className="flex items-center gap-1" aria-hidden="true">
              {REST_QUESTIONS.map((q, i) => (
                <span
                  key={q.id}
                  className={`h-1 w-4 rounded-full transition ${
                    i <= step ? "bg-monk-rest" : "bg-monk-border/60"
                  }`}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <p className="mt-3 text-sm font-semibold leading-snug text-monk-text">
                {question.prompt[lang]}
              </p>

              <div className="mt-3 space-y-2">
                {question.options.map((option) => {
                  const active = answers[question.id] === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleAnswer(question.id, option.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs transition active:scale-[0.99] ${
                        active
                          ? "border-monk-rest bg-monk-rest-soft/50 text-monk-text font-semibold"
                          : "border-monk-border/60 bg-monk-surface text-monk-muted hover:border-monk-rest/40 hover:text-monk-text"
                      }`}
                    >
                      <span className="min-w-0">{option.label[lang]}</span>
                      <ChevronRight size={14} className="shrink-0 opacity-50" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {step > 0 ? (
            <div className="mt-3 flex justify-start">
              <button
                type="button"
                onClick={() => {
                  hapticPress("light");
                  setStep(step - 1);
                }}
                className="text-[11px] font-medium text-monk-muted transition hover:text-monk-text"
              >
                {t("rest.previous")}
              </button>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* Recommendations */}
      {showResults ? (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-monk-text">{t("rest.resultsTitle")}</p>
              <p className="mt-0.5 text-[11px] text-monk-muted leading-relaxed">
                {t("rest.resultsBody")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetake}
              className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-monk-muted transition hover:text-monk-text"
            >
              <RotateCcw size={12} strokeWidth={2} />
              <span>{t("rest.retake")}</span>
            </button>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {recommendations.map((rec) => {
              const Icon = restIcon(rec.activity.icon);
              const active = selectedId === rec.activity.id;
              return (
                <div
                  key={rec.activity.id}
                  className={`rounded-2xl border p-3.5 transition ${
                    active
                      ? "border-monk-rest bg-monk-rest-soft/50 ring-1 ring-monk-rest"
                      : "border-monk-border/60 bg-monk-surface"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-monk-rest/15 text-monk-rest">
                      <Icon size={17} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-bold ${active ? "text-monk-rest" : "text-monk-text"}`}>
                          {rec.activity.title[lang]}
                        </p>
                        {rec.activity.durationMin ? (
                          <span className="shrink-0 font-mono text-[10px] text-monk-muted">
                            ~{rec.activity.durationMin}m
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] text-monk-muted leading-relaxed">
                        {rec.activity.description[lang]}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-monk-text-soft">
                        {rec.activity.rationale[lang]}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSelectActivity(rec.activity.id, rec.activity.title[lang])}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition active:scale-95 ${
                        active
                          ? "border border-monk-rest/50 bg-monk-surface text-monk-rest"
                          : "bg-monk-rest text-monk-bg hover:opacity-90"
                      }`}
                    >
                      {active ? <Check size={13} strokeWidth={2.5} /> : null}
                      <span>{active ? t("rest.selected") : t("rest.choose")}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom activity */}
          <div className="mt-3">
            {isEditingCustom ? (
              <div className="space-y-2.5 rounded-2xl border border-monk-rest/50 bg-monk-surface p-3.5">
                <p className="text-xs font-bold text-monk-text">{t("rest.customLabel")}</p>
                <input
                  type="text"
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  placeholder={t("rest.customPlaceholder")}
                  className="w-full rounded-xl border border-monk-border bg-monk-soft px-3 py-2 text-xs text-monk-text placeholder:text-monk-muted focus:border-monk-rest focus:outline-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <GhostButton className="text-xs py-1.5 px-3" onClick={() => setIsEditingCustom(false)}>
                    {t("rest.cancel")}
                  </GhostButton>
                  <PrimaryButton className="text-xs py-1.5 px-4 w-auto" onClick={handleSaveCustom}>
                    {t("rest.save")}
                  </PrimaryButton>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingCustom(true)}
                className="w-full py-2 text-center text-xs font-medium text-monk-muted transition hover:text-monk-rest"
              >
                {t("rest.customOpen")}
              </button>
            )}
          </div>
        </Card>
      ) : null}

      {/* Weekly review transition */}
      <Card className="flex flex-col items-center justify-between gap-3 border-monk-accent/30 bg-monk-accent-soft/20 p-4 sm:flex-row">
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-xs font-bold text-monk-text">{t("rest.reviewTitle")}</p>
          <p className="mt-0.5 text-[11px] text-monk-muted">{t("rest.reviewBody")}</p>
        </div>
        <PrimaryButton
          onClick={onOpenWeeklyReview}
          className="flex w-full shrink-0 items-center justify-center gap-1.5 px-4 py-2 text-xs sm:w-auto"
        >
          <span>{t("rest.reviewCta")}</span>
          <ArrowRight size={13} />
        </PrimaryButton>
      </Card>
    </div>
  );
}
