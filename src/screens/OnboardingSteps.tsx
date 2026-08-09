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
    <div className="mb-6 mt-4">
      <motion.h1 id="step-heading" tabIndex={-1} className="text-2xl font-semibold leading-9 tracking-tight" {...rise(0)}>
        {title}
      </motion.h1>
      <motion.p className="mt-2.5 text-[15px] leading-6 text-monk-muted" {...rise(0.06)}>
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
      <div className="mt-auto space-y-3 pt-8">
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

export function GoalBrainDump({ onNext }: { onNext: () => void }) {
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
      <ScreenIntro title="What feels important in this season?" subtitle="Write 3–10 possible goals first, then keep the 1–3 that deserve this season's energy." />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-monk-muted">Brain dump first. Selection comes next.</p>
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
                placeholder="Example: Build a study routine, finish a course…"
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
          <span className="inline-flex items-center gap-2"><Plus size={16} /> Add goal</span>
        </GhostButton>
      ) : null}

      {showNarrow ? (
        <div className="mt-8">
          <ScreenIntro
            title="What deserves your energy this season?"
            subtitle="Pick 1–3 goals to keep. Unselected goals stay saved for later seasons."
          />
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-monk-muted">
            Keep this season · {selectedCount}/3 selected
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
      <div className="mt-auto space-y-3 pt-8">
        {dumpResult.valid && !narrowResult.valid ? <CalmAlert type="warning" title={narrowResult.message!} /> : null}
        {!dumpResult.valid ? <CalmAlert type="warning" title={dumpResult.message!} /> : null}
        <PrimaryButton disabled={!canContinue} onClick={onNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

export function SeasonSetup({ onNext }: { onNext: () => void }) {
  const { onboarding, setSeasonDuration, updateOnboarding } = useMonkStore();
  const [custom, setCustom] = useState(onboarding.customDurationDays?.toString() ?? "");
  const preset = onboarding.durationPreset;
  const result = validateSeasonDuration(onboarding.seasonDurationDays);

  const selectPreset = (p: SeasonDurationPreset, days: number) => {
    updateOnboarding({ durationPreset: p });
    setSeasonDuration(days);
  };

  return (
    <>
      <ScreenIntro
        title="Choose your season length"
        subtitle="Your focus goals stay fixed until this season ends. Pick a time container that feels realistic."
      />
      <div className="space-y-3">
        <DurationCard
          title="7 Days"
          badge="Quick reset"
          description="Best for restarting, testing a routine, or getting back on track."
          icon={FastForward}
          selected={preset === "7_days"}
          onClick={() => selectPreset("7_days", 7)}
        />
        <DurationCard
          title="30 Days"
          badge="Recommended"
          description="Best for building consistency and daily momentum."
          icon={Calendar}
          selected={preset === "30_days"}
          onClick={() => selectPreset("30_days", 30)}
        />
        <DurationCard
          title="90 Days"
          badge="Deep season"
          description="Best for meaningful progress on bigger life goals."
          icon={Mountain}
          selected={preset === "90_days"}
          onClick={() => selectPreset("90_days", 90)}
        />
        <DurationCard
          title="Custom"
          badge="Set your own length"
          description="Choose the number of days that fits your season."
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
          Custom days (min 7)
        </label>
        <TextInput
          id="custom-season-days"
          inputMode="numeric"
          placeholder="Custom days"
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
          startLabel={`Today · ${formatHumanDate(onboarding.seasonStartDate)}`}
          endLabel={formatHumanDate(onboarding.seasonEndDate)}
          durationLabel={`${onboarding.seasonDurationDays} days of focused progress`}
        />
      </div>
      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        <PrimaryButton disabled={!result.valid} onClick={onNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

export function KeystoneSetup({ onNext }: { onNext: () => void }) {
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

  const [drafts, setDrafts] = useState<Record<string, { time: string; when: string; action: string }>>(() => {
    const initial: Record<string, { time: string; when: string; action: string }> = {};
    goals.forEach((goal) => {
      const parsed = parseIntention(onboarding.keystoneActions[goal.id] ?? "");
      initial[goal.id] = { time: parsed.time || "", when: parsed.when || "", action: parsed.action || "" };
    });
    return initial;
  });

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
        title="What action moves each goal forward?"
        subtitle="Set a time and cue for each action. Time for scheduling, cue for triggering."
      />
      <div className="space-y-4">
        {goals.map((goal, index) => {
          const d = drafts[goal.id] ?? { time: "", when: "", action: "" };
          const actionPh = actionPlaceholders[index % actionPlaceholders.length];
          const whenPh = whenPlaceholders[index % whenPlaceholders.length];
          const goalWhy = onboarding.goalWhys[goal.id] ?? "";
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
              <p className="mt-2 text-xs text-monk-muted">One specific, repeatable action.</p>
              <TextInput
                label="Why this goal (optional)"
                id={`goal-why-${goal.id}`}
                placeholder="Because…"
                value={goalWhy}
                onChange={(event) =>
                  updateOnboarding({
                    goalWhys: { ...onboarding.goalWhys, [goal.id]: event.target.value }
                  })
                }
                className="mt-4"
              />
            </Card>
          );
        })}
      </div>
      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        <PrimaryButton disabled={!result.valid} onClick={onNext}>Continue</PrimaryButton>
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
      <div className="mt-auto space-y-3 pt-8">
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
              {tomorrowPlan.dayType === "rest" ? "Quiet recovery (Rest)" : goal?.title}
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
      <p className="font-semibold text-sm">Plan Tomorrow</p>
      <p className="mt-1 text-xs text-monk-muted">Decide your focus theme one day before.</p>
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
          Rest
        </button>
      </div>
    </Card>
  );
}

export function WeeklyStatusIndicators() {
  const store = useMonkStore();
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const goals = selectActiveGoals(store);
  if (!weeklyPlan) return null;

  const doneDays = weeklyPlan.goalAllocations.reduce((sum, a) => sum + a.completedCount, 0);
  const targetDays = weeklyPlan.goalAllocations.reduce((sum, a) => sum + a.targetCount, 0) || 6;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold text-sm">This week</p>
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
