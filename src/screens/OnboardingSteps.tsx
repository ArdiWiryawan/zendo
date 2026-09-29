import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Moon, Plus, Minus, FastForward, Calendar, Mountain, Sliders, ListTodo, ShieldCheck, BookOpen, Coffee } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { routes } from "../constants/routes";
import { habitOptions, defaultWeeklyTargets } from "../constants/defaultData";
import { getTodayDateString, addDaysToDate, formatHumanDate } from "../lib/date";
import { formatIntention, parseIntention } from "../lib/implementationIntention";
import { capacityCheck, planStrengthLabel, scorePlan } from "../lib/planScoring";
import {
  validateGoalBrainDump,
  validateHabitAudit,
  validateKeystoneActions,
  validateNarrowGoals,
  validateSeasonDuration,
  validateWeeklyAllocation,
} from "../lib/validation";
import { selectActiveGoals, selectCurrentWeeklyPlan } from "../store/selectors";
import {
  CalmAlert,
  Card,
  ChoiceCard,
  ChoiceChip,
  DurationCard,
  GhostButton,
  OnboardingShell,
  PrimaryButton,
  SeasonPreviewCard,
  SecondaryButton,
  TextInput,
  Textarea,
} from "../components/ui";
import type { CoachStepId } from "../lib/coach";
import type { Goal, SeasonDurationPreset } from "../types/app";

export function ScreenIntro({ title, subtitle }: { title: string; subtitle: string }) {
  const reduce = useReducedMotion();
  // motivated motion: gentle rise on step change signals "new step", matches Welcome cadence
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const }
        };
  return (
    <div className="mb-4 sm:mb-6 mt-1 sm:mt-2">
      <motion.h1
        id="step-heading"
        tabIndex={-1}
        className="text-xl sm:text-2xl font-semibold leading-tight tracking-tight outline-none focus:outline-none ring-0 focus:ring-0 border-none"
        {...rise(0)}
      >
        {title}
      </motion.h1>
      <motion.p className="mt-1.5 sm:mt-2 text-sm sm:text-[15px] leading-relaxed text-monk-muted" {...rise(0.06)}>
        {subtitle}
      </motion.p>
    </div>
  );
}

export function HabitAudit({ onNext }: { onNext: () => void }) {
  const { onboarding, toggleHabit } = useMonkStore();
  const result = validateHabitAudit(onboarding.selectedHabits.length);
  const selectedCount = onboarding.selectedHabits.length;
  const otherHabit = onboarding.selectedHabits.find((item) => item.category === "other");
  const otherNeedsName = Boolean(otherHabit && !otherHabit.customName?.trim());
  const isEmpty = selectedCount === 0;
  const canContinue = isEmpty || (result.valid && !otherNeedsName);
  return (
    <>
      <ScreenIntro title="What usually pulls you away?" subtitle="Notice the patterns that make focus harder." />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Patterns</p>
        <span className="rounded-full bg-monk-soft px-2.5 py-1 text-xs font-bold text-monk-muted">
          {selectedCount === 0 ? "1+ required" : `${selectedCount} selected`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {habitOptions.map((habit) => (
          <ChoiceChip
            key={habit.category}
            label={habit.label}
            icon={habit.icon}
            selected={onboarding.selectedHabits.some((item) => item.category === habit.category)}
            onClick={() => toggleHabit(habit.category, habit.label)}
          />
        ))}
      </div>
      {otherHabit ? (
        <TextInput
          label="Name the pattern"
          className="mt-5"
          value={otherHabit.customName ?? ""}
          onChange={(event) => useMonkStore.getState().setCustomHabitName(event.target.value)}
        />
      ) : null}
      <div className="mt-auto shrink-0 space-y-3 pt-5 sm:pt-8 pb-1">
        {!canContinue ? (
          <CalmAlert
            type="warning"
            title={otherNeedsName ? "Name your custom pattern to continue." : result.message || "Select at least 1 habit"}
          />
        ) : null}
        <PrimaryButton disabled={!canContinue} onClick={onNext}>
          {isEmpty ? "Skip for now" : "Continue"}
        </PrimaryButton>
      </div>
    </>
  );
}

export function FrictionSetup({ onNext }: { onNext: () => void }) {
  const { onboarding, toggleFrictionAction } = useMonkStore();
  const t = useT();
  const selectedHabits = onboarding.selectedHabits;
  const frictionMap = onboarding.frictionActions;

  const allActions = selectedHabits.flatMap((habit) => frictionMap[habit.id] ?? []);
  const checkedCount = allActions.filter((a) => a.completed).length;

  if (selectedHabits.length === 0) {
    return (
      <>
        <ScreenIntro
          title="Make distractions harder to reach"
          subtitle="You didn't select specific habits, but designing your environment protects focus for every season."
        />
        <Card className="my-auto space-y-3 p-5">
          <div className="flex items-center gap-3 text-monk-accent">
            <ShieldCheck size={24} />
            <p className="font-semibold text-monk-text">General Focus Guardrails</p>
          </div>
          <p className="text-sm leading-relaxed text-monk-muted">
            • Keep your phone in another room during deep focus sessions.<br />
            • Put reading or workspace essentials within arm's reach.<br />
            • Turn off non-urgent app notifications before starting.
          </p>
        </Card>
        <div className="mt-auto shrink-0 space-y-3 pt-5 sm:pt-8 pb-1">
          <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenIntro
        title="Make distractions harder to reach"
        subtitle="You do not need willpower. Add friction to your environment so habits cannot start on autopilot."
      />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-monk-muted">{t("onboarding.friction.hint")}</p>
        <span className="rounded-full bg-monk-soft px-2.5 py-1 text-xs font-bold text-monk-muted">
          {checkedCount > 0 ? `${checkedCount} active` : "Recommended"}
        </span>
      </div>

      <div className="space-y-4">
        {selectedHabits.map((habit) => {
          const actions = frictionMap[habit.id] ?? [];
          return (
            <div key={habit.id} className="space-y-2 rounded-2xl border border-monk-border bg-monk-surface/60 p-3.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-monk-accent" />
                <p className="text-sm font-semibold text-monk-text">{habit.customName || habit.name}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => toggleFrictionAction(habit.id, action.id)}
                    className={`flex items-center gap-3 rounded-xl border p-2.5 text-left text-xs transition-all ${
                      action.completed
                        ? "border-monk-accent/40 bg-monk-accent/10 font-semibold text-monk-text shadow-sm"
                        : "border-monk-border/70 bg-monk-surface/90 text-monk-muted hover:border-monk-border hover:text-monk-text"
                    }`}
                  >
                    <div
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-white transition-colors ${
                        action.completed ? "border-monk-accent bg-monk-accent" : "border-monk-border bg-monk-soft"
                      }`}
                    >
                      {action.completed ? <Check size={12} strokeWidth={3} /> : null}
                    </div>
                    <span className="leading-snug">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-monk-text-soft">
        You do not need perfection. Just make the habit harder.
      </p>

      <div className="mt-auto shrink-0 space-y-3 pt-5 sm:pt-8 pb-1">
        <PrimaryButton onClick={onNext}>
          {checkedCount === 0 ? "Skip for now" : "Continue"}
        </PrimaryButton>
      </div>
    </>
  );
}

export function GoalBrainDump({ onNext }: { onNext: () => void }) {
  const t = useT();
  const { onboarding, addGoalDraft, removeGoalDraft, updateGoalDraft, toggleFocusGoal } = useMonkStore();
  const filledCount = onboarding.goalDrafts.filter((g) => g.title.trim()).length;
  const dumpResult = validateGoalBrainDump(onboarding.goalDrafts);
  const draftGoals = onboarding.goalDrafts.filter((goal) => goal.title.trim());
  const selectedCount = onboarding.selectedFocusGoalIds.length;
  const narrowResult = validateNarrowGoals(selectedCount);
  const showNarrow = dumpResult.valid && draftGoals.length > 0;
  // Continue requires ≥3 valid drafts and ≥1 selected goal
  const canContinue = dumpResult.valid && narrowResult.valid;
  return (
    <>
      <ScreenIntro title={t("onboarding.goals.dump.title")} subtitle={t("onboarding.goals.dump.subtitle")} />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-monk-muted">{t("onboarding.goals.hint")}</p>
        <span className="rounded-full bg-monk-soft px-2.5 py-1 text-xs font-bold text-monk-muted">
          {filledCount}/10 · min 3
        </span>
      </div>
      <div className="space-y-3">
        <AnimatePresence>
          {onboarding.goalDrafts.map((goal, index) => (
            <motion.div
              key={goal.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2"
            >
              <TextInput
                aria-label={`Goal ${index + 1}`}
                placeholder={t("onboarding.goals.placeholder")}
                value={goal.title}
                maxLength={100}
                onChange={(event) => updateGoalDraft(goal.id, event.target.value.slice(0, 100))}
              />
              {onboarding.goalDrafts.length > 5 ? (
                <button
                  type="button"
                  aria-label={`Remove goal${goal.title.trim() ? `: ${goal.title.trim()}` : ` ${index + 1}`}`}
                  onClick={() => removeGoalDraft(goal.id)}
                  className="grid min-h-12 min-w-12 shrink-0 place-items-center rounded-xl border border-monk-border bg-monk-surface text-monk-muted"
                >
                  <Minus size={18} strokeWidth={1.5} />
                </button>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {onboarding.goalDrafts.length < 10 ? (
        <GhostButton className="mt-4" onClick={addGoalDraft}>
          <span className="inline-flex items-center gap-2"><Plus size={16} /> {t("onboarding.goals.add")}</span>
        </GhostButton>
      ) : null}

      {showNarrow ? (
        <div className="mt-8">
          <ScreenIntro
            title={t("onboarding.goals.pick.title")}
            subtitle={t("onboarding.goals.pick.subtitle")}
          />
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-monk-muted">
            {t("onboarding.goals.keepLabel", { n: selectedCount })}
          </p>
          <div className="space-y-3">
            <AnimatePresence>
              {draftGoals.map((goal) => {
                const isSelected = onboarding.selectedFocusGoalIds.includes(goal.id);
                return (
                  <motion.div
                    key={goal.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChoiceCard
                      title={goal.title}
                      selected={isSelected}
                      onClick={() => toggleFocusGoal(goal.id)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      ) : null}
      <div className="mt-auto shrink-0 space-y-3 pt-5 sm:pt-8 pb-1">
        {dumpResult.valid && !narrowResult.valid ? <CalmAlert type="warning" title={t("onboarding.goals.needOne")} /> : null}
        {!dumpResult.valid ? (
          <CalmAlert
            type="warning"
            title={
              dumpResult.message?.includes("already exists")
                ? t("onboarding.goals.duplicate")
                : dumpResult.message?.includes("maximum")
                  ? t("onboarding.goals.max")
                  : t("onboarding.goals.needMin")
            }
          />
        ) : null}
        <PrimaryButton disabled={!canContinue} onClick={onNext}>{t("onboarding.continue")}</PrimaryButton>
      </div>
    </>
  );
}

export function SeasonSetup({ onNext }: { onNext: () => void }) {
  const t = useT();
  const { onboarding, setSeasonDuration, updateOnboarding } = useMonkStore();
  const [custom, setCustom] = useState(onboarding.customDurationDays?.toString() ?? "");
  const preset = onboarding.durationPreset;
  const result = validateSeasonDuration(onboarding.seasonDurationDays);
  const weeklyTargetSum = onboarding.weeklyAllocations.reduce((sum, a) => sum + a.targetCount, 0);
  const capacity = capacityCheck(onboarding.timeAudit.freeHoursPerDay, weeklyTargetSum);
  const capacityNote = capacity.message
    ? t(capacity.ok ? "onboarding.season.capacityTight" : "onboarding.season.capacityOver", {
        load: capacity.loadHours.toFixed(0),
        available: capacity.availableHours.toFixed(0)
      })
    : null;

  const selectPreset = (p: SeasonDurationPreset, days: number) => {
    updateOnboarding({ durationPreset: p });
    setSeasonDuration(days);
  };

  return (
    <>
      <ScreenIntro
        title={t("onboarding.season.title")}
        subtitle={t("onboarding.season.subtitle")}
      />
      <div className="space-y-3">
        <DurationCard
          title={t("onboarding.season.d7Title")}
          badge={t("onboarding.season.d7Badge")}
          description={t("onboarding.season.d7Body")}
          icon={FastForward}
          selected={preset === "7_days"}
          onClick={() => selectPreset("7_days", 7)}
        />
        <DurationCard
          title={t("onboarding.season.d30Title")}
          badge={t("onboarding.season.d30Badge")}
          description={t("onboarding.season.d30Body")}
          icon={Calendar}
          selected={preset === "30_days"}
          onClick={() => selectPreset("30_days", 30)}
        />
        <DurationCard
          title={t("onboarding.season.d90Title")}
          badge={t("onboarding.season.d90Badge")}
          description={t("onboarding.season.d90Body")}
          icon={Mountain}
          selected={preset === "90_days"}
          onClick={() => selectPreset("90_days", 90)}
        />
        <DurationCard
          title={t("onboarding.season.customTitle")}
          badge={t("onboarding.season.customBadge")}
          description={t("onboarding.season.customBody")}
          icon={Sliders}
          selected={preset === "custom"}
          onClick={() => {
            updateOnboarding({ durationPreset: "custom" });
            setSeasonDuration(Math.max(7, Number(custom) || 14));
          }}
        />
      </div>
      <div className={`mt-4 ${preset !== "custom" ? "opacity-50 pointer-events-none" : ""}`}>
        <label htmlFor="custom-season-days" className="mb-2 block text-xs font-bold uppercase tracking-wider text-monk-muted">
          {t("onboarding.season.customLabel")}
        </label>
        <TextInput
          id="custom-season-days"
          inputMode="numeric"
          placeholder={t("onboarding.season.customPlaceholder")}
          value={custom}
          disabled={preset !== "custom"}
          onChange={(event) => {
            setCustom(event.target.value);
            const value = Number(event.target.value);
            if (value >= 7) setSeasonDuration(value);
          }}
        />
      </div>
      <div className="mt-5">
        <SeasonPreviewCard
          startLabel={t("onboarding.season.startLabel", { date: formatHumanDate(onboarding.seasonStartDate) })}
          endLabel={formatHumanDate(onboarding.seasonEndDate)}
          durationLabel={t("onboarding.season.durationLabel", { n: onboarding.seasonDurationDays })}
        />
      </div>
      <div className="mt-auto shrink-0 space-y-3 pt-5 sm:pt-8 pb-1">
        {capacityNote ? <CalmAlert type="info" title={capacityNote} /> : null}
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        <PrimaryButton disabled={!result.valid} onClick={onNext}>{t("onboarding.continue")}</PrimaryButton>
      </div>
    </>
  );
}

export function KeystoneSetup({ onNext }: { onNext: () => void }) {
  const t = useT();
  const { onboarding, setKeystoneAction, updateOnboarding } = useMonkStore();
  const goals = onboarding.goalDrafts.filter((goal) => onboarding.selectedFocusGoalIds.includes(goal.id));
  const result = validateKeystoneActions(onboarding.selectedFocusGoalIds, onboarding.keystoneActions);

  const actionPlaceholders = [
    "Study for 25 minutes",
    "Write 300 words",
    "Record one practice video",
    "Walk for 20 minutes",
    "Read 10 pages",
    "Practice one lesson"
  ];
  const whenPlaceholders = [
    "after morning pages",
    "right after lunch",
    "before dinner",
    "first thing after coffee"
  ];
  const obstaclePlaceholders = [
    "I feel too tired after work",
    "I open my phone instead",
    "The task feels too big to start",
    "I skip when the day gets busy"
  ];

  const [drafts, setDrafts] = useState<Record<string, { time: string; when: string; action: string }>>(() => {
    const initial: Record<string, { time: string; when: string; action: string }> = {};
    goals.forEach((goal) => {
      const parsed = parseIntention(onboarding.keystoneActions[goal.id] ?? "");
      initial[goal.id] = { time: parsed.time || "", when: parsed.when || "", action: parsed.action || "" };
    });
    return initial;
  });

  // WOOP: obstacle + if-then plan B, stored as an intention so createSeason can parse it back.
  const [obstacleDrafts, setObstacleDrafts] = useState<Record<string, { whenDraft: string; actionDraft: string }>>(() => {
    const initial: Record<string, { whenDraft: string; actionDraft: string }> = {};
    goals.forEach((goal) => {
      const parsed = parseIntention(onboarding.obstacleMitigations[goal.id] ?? "");
      initial[goal.id] = { whenDraft: parsed.when || "", actionDraft: parsed.action || "" };
    });
    return initial;
  });

  useEffect(() => {
    goals.forEach((goal) => {
      setObstacleDrafts((prev) => {
        if (prev[goal.id] !== undefined) return prev;
        const parsed = parseIntention(onboarding.obstacleMitigations[goal.id] ?? "");
        return { ...prev, [goal.id]: { whenDraft: parsed.when || "", actionDraft: parsed.action || "" } };
      });
    });
  }, [goals, onboarding.obstacleMitigations]);

  const updateObstacle = (goalId: string, field: "whenDraft" | "actionDraft", value: string) => {
    setObstacleDrafts((prev) => {
      const next = { ...prev, [goalId]: { ...prev[goalId], [field]: value } };
      updateOnboarding({
        obstacleMitigations: {
          ...onboarding.obstacleMitigations,
          [goalId]: formatIntention(next[goalId].whenDraft, next[goalId].actionDraft)
        }
      });
      return next;
    });
  };

  useEffect(() => {
    goals.forEach((goal) => {
      const parsed = parseIntention(onboarding.keystoneActions[goal.id] ?? "");
      setDrafts((prev) => {
        if (prev[goal.id] !== undefined) return prev;
        return { ...prev, [goal.id]: { time: parsed.time || "", when: parsed.when || "", action: parsed.action || "" } };
      });
    });
  }, [goals, onboarding.keystoneActions]);

  const updateDraft = (goalId: string, field: "time" | "when" | "action", value: string) => {
    setDrafts((prev) => ({ ...prev, [goalId]: { ...prev[goalId], [field]: value } }));
    const d = { ...drafts[goalId], [field]: value };
    setKeystoneAction(goalId, formatIntention(d.when, d.action, d.time));
  };

  return (
    <>
      <ScreenIntro
        title={t("onboarding.keystone.title")}
        subtitle={t("onboarding.keystone.subtitle")}
      />
      <div className="space-y-4">
        {goals.map((goal, index) => {
          const d = drafts[goal.id] ?? { time: "", when: "", action: "" };
          const od = obstacleDrafts[goal.id] ?? { whenDraft: "", actionDraft: "" };
          const actionPh = actionPlaceholders[index % actionPlaceholders.length];
          const whenPh = whenPlaceholders[index % whenPlaceholders.length];
          const obstaclePh = obstaclePlaceholders[index % obstaclePlaceholders.length];
          const goalWhy = onboarding.goalWhys[goal.id] ?? "";
          const goalOutcome = onboarding.goalDesiredOutcomes?.[goal.id] ?? "";
          return (
            <Card key={goal.id}>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-monk-muted">
                Goal {index + 1}
              </p>
              <p className="mb-3 font-semibold text-monk-text">{goal.title}</p>
              <div className="mb-4">
                <label htmlFor={`keystone-time-${goal.id}`} className="mb-2 block text-sm font-medium text-monk-muted">
                  Time (optional)
                </label>
                <input
                  type="time"
                  id={`keystone-time-${goal.id}`}
                  value={d.time}
                  onChange={(event) => updateDraft(goal.id, "time", event.target.value)}
                  className="w-full rounded-xl border border-monk-border bg-monk-surface px-4 py-3 text-sm text-monk-text transition-colors focus:border-monk-accent focus:outline-none focus:ring-1 focus:ring-monk-accent/40"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextInput
                  label="When"
                  id={`keystone-when-${goal.id}`}
                  placeholder={whenPh}
                  value={d.when}
                  onChange={(event) => updateDraft(goal.id, "when", event.target.value)}
                />
                <TextInput
                  label="I will"
                  id={`keystone-action-${goal.id}`}
                  placeholder={actionPh}
                  value={d.action}
                  onChange={(event) => updateDraft(goal.id, "action", event.target.value)}
                />
              </div>
              <p className="mt-2 text-xs text-monk-muted">{t("onboarding.keystone.hint")}</p>
              <TextInput
                label={t("onboarding.keystone.why")}
                id={`goal-why-${goal.id}`}
                placeholder={t("onboarding.keystone.whyPlaceholder")}
                value={goalWhy}
                onChange={(event) =>
                  updateOnboarding({
                    goalWhys: { ...onboarding.goalWhys, [goal.id]: event.target.value }
                  })
                }
                className="mt-4"
              />
              <TextInput
                label={t("onboarding.keystone.outcome")}
                id={`goal-outcome-${goal.id}`}
                placeholder={t("onboarding.keystone.outcomePlaceholder")}
                value={goalOutcome}
                onChange={(event) =>
                  updateOnboarding({
                    goalDesiredOutcomes: { ...onboarding.goalDesiredOutcomes, [goal.id]: event.target.value }
                  })
                }
                className="mt-3"
              />
              <div className="mt-5 rounded-xl border border-monk-border/70 bg-monk-soft/40 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-monk-muted">
                  {t("onboarding.keystone.obstacleTitle")}
                </p>
                <p className="mt-1 text-xs leading-5 text-monk-muted/90">
                  {t("onboarding.keystone.obstacleBody")}
                </p>
                <TextInput
                  label={t("onboarding.keystone.obstacleLabel")}
                  id={`goal-obstacle-${goal.id}`}
                  placeholder={obstaclePh}
                  value={od.whenDraft}
                  onChange={(event) => updateObstacle(goal.id, "whenDraft", event.target.value)}
                  className="mt-3"
                />
                <TextInput
                  label={t("onboarding.keystone.mitigationLabel")}
                  id={`goal-mitigation-${goal.id}`}
                  placeholder={t("onboarding.keystone.mitigationPlaceholder")}
                  value={od.actionDraft}
                  onChange={(event) => updateObstacle(goal.id, "actionDraft", event.target.value)}
                  className="mt-3"
                />
              </div>
            </Card>
          );
        })}
      </div>
      <div className="mt-auto shrink-0 space-y-3 pt-5 sm:pt-8 pb-1">
        {!result.valid ? <CalmAlert type="warning" title={t("onboarding.keystone.needAction")} /> : null}
        <PrimaryButton disabled={!result.valid} onClick={onNext}>{t("onboarding.continue")}</PrimaryButton>
      </div>
    </>
  );
}

export function TodayPreviewStep() {
  const navigate = useNavigate();
  const t = useT();
  const { createSeasonFromOnboarding } = useMonkStore();
  const steps = [
    { label: t("onboarding.preview.step1"), icon: ListTodo },
    { label: t("onboarding.preview.step2"), icon: ShieldCheck },
    { label: t("onboarding.preview.step3"), icon: BookOpen },
    { label: t("onboarding.preview.step4"), icon: Coffee },
  ];

  return (
    <>
      <ScreenIntro title={t("onboarding.preview.title")} subtitle={t("onboarding.preview.body")} />
      <Card className="space-y-3 p-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-4">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-monk-accent-soft text-monk-accent">
              <step.icon size={16} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-monk-text">{step.label}</p>
            </div>
          </div>
        ))}
      </Card>
      <p className="mt-4 text-center text-xs leading-5 text-monk-muted">
        {t("onboarding.preview.highlight")}
      </p>
      <div className="mt-auto shrink-0 space-y-3 pt-5 sm:pt-8 pb-1">
        <PrimaryButton
          onClick={() => {
            createSeasonFromOnboarding();
            navigate(routes.today, { replace: true });
          }}
        >
          {t("onboarding.preview.cta")}
        </PrimaryButton>
      </div>
    </>
  );
}

export function CoachHint({
  step,
  onDismiss,
  onCta
}: {
  step: CoachStepId;
  onDismiss: () => void;
  onCta?: () => void;
}) {
  const t = useT();
  const copy = {
    pickTheme: {
      title: t("coach.pickTheme.title"),
      body: t("coach.pickTheme.body"),
      cta: t("coach.pickTheme.cta"),
      dismiss: t("coach.pickTheme.dismiss")
    },
    intention: {
      title: t("coach.intention.title"),
      body: t("coach.intention.body"),
      cta: t("coach.intention.cta"),
      dismiss: t("coach.intention.dismiss")
    },
    focus: {
      title: t("coach.focus.title"),
      body: t("coach.focus.body"),
      cta: t("coach.focus.cta"),
      dismiss: t("coach.focus.dismiss")
    },
    close: {
      title: t("coach.close.title"),
      body: t("coach.close.body"),
      cta: t("coach.close.cta"),
      dismiss: t("coach.close.dismiss")
    }
  }[step];

  return (
    <Card className="border-monk-accent/20 bg-monk-soft/60 p-4">
      <p className="text-sm font-semibold text-monk-text">{copy.title}</p>
      <p className="mt-1 text-sm leading-6 text-monk-muted">{copy.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {onCta ? <SecondaryButton onClick={onCta}>{copy.cta}</SecondaryButton> : null}
        <GhostButton onClick={onDismiss}>{copy.dismiss}</GhostButton>
      </div>
    </Card>
  );
}

export function PlanTomorrow({ goals }: { goals: ReturnType<typeof selectActiveGoals> }) {
  const t = useT();
  const store = useMonkStore();
  const season = store.activeSeason!;
  const tomorrowDate = addDaysToDate(getTodayDateString(), 1);
  const tomorrowPlan = store.dayPlans.find(
    (day) => day.seasonId === season.id && day.date === tomorrowDate
  );
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const [isEditing, setIsEditing] = useState(false);

  if (!weeklyPlan) return null;

  const handleSelect = (goalId?: string, dayType: "goal" | "rest" = "goal") => {
    store.createOrUpdateDayPlan(tomorrowDate, { dayType, goalId });
    setIsEditing(false);
  };

  const goal = tomorrowPlan?.goalId ? store.goals.find((item) => item.id === tomorrowPlan.goalId) : undefined;

  if (tomorrowPlan && !isEditing) {
    return (
      <Card className="bg-monk-surface border-monk-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-monk-text-soft uppercase tracking-wider font-semibold">Tomorrow's Focus</p>
            <p className="mt-1 font-semibold text-base">
              {tomorrowPlan.dayType === "rest" ? t("today.planTomorrow.quietRecovery") : goal?.title}
            </p>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-monk-accent hover:underline"
            onClick={() => setIsEditing(true)}
          >
            Change
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <p className="font-semibold text-sm">{t("today.planTomorrow.title")}</p>
      <p className="mt-1 text-xs text-monk-muted">{t("today.planTomorrow.subtitle")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {goals.map((item) => (
          <button
            key={item.id}
            type="button"
            className="min-h-9 rounded-xl border border-monk-border bg-monk-soft px-3 text-xs font-medium text-monk-muted hover:border-monk-accent hover:text-monk-accent"
            onClick={() => handleSelect(item.id, "goal")}
          >
            {item.title}
          </button>
        ))}
        <button
          type="button"
          className="min-h-9 rounded-xl border border-monk-border bg-monk-soft px-3 text-xs font-medium text-monk-muted hover:border-monk-accent hover:text-monk-accent"
          onClick={() => handleSelect(undefined, "rest")}
        >
          {t("today.planTomorrow.rest")}
        </button>
      </div>
    </Card>
  );
}

export function WeeklyStatusIndicators() {
  const t = useT();
  const store = useMonkStore();
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const goals = selectActiveGoals(store);
  if (!weeklyPlan) return null;

  const doneDays = weeklyPlan.goalAllocations.reduce((sum, a) => sum + a.completedCount, 0);
  const targetDays = weeklyPlan.goalAllocations.reduce((sum, a) => sum + a.targetCount, 0) || 6;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold text-sm">{t("today.planTomorrow.thisWeek")}</p>
        <span className="text-xs font-mono text-monk-muted tabular-nums">{doneDays}/{targetDays} focus</span>
      </div>
      <div className="space-y-3">
        {weeklyPlan.goalAllocations.map((allocation) => {
          const goal = goals.find((item) => item.id === allocation.goalId);
          const progress = allocation.targetCount > 0
            ? Math.min(100, Math.round((allocation.completedCount / allocation.targetCount) * 100))
            : 0;
          const complete = allocation.completedCount >= allocation.targetCount;
          const touched = allocation.completedCount >= 1;
          return (
            <div key={allocation.goalId} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-monk-text truncate">{goal?.title}</span>
                <span className={`shrink-0 font-semibold ${
                  complete ? "text-monk-success" : touched ? "text-monk-accent" : "text-monk-muted"
                }`}>
                  {allocation.completedCount}/{allocation.targetCount}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-monk-soft overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    complete ? "bg-monk-success" : touched ? "bg-monk-accent" : "bg-monk-border-strong"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
