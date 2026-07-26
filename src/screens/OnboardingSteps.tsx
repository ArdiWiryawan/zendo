import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { useCalmToast } from "../components/ui";
import { routes } from "../constants/routes";
import { CORE_VALUES } from "../constants/whyValues";
import { habitOptions, defaultWeeklyTargets, frictionActionsForHabit, createDefaultOnboarding } from "../constants/defaultData";
import { onboardingOrder } from "../constants/routes";
import { getTodayDateString, addDaysToDate, getDayNumber, getSeasonProgress, getDaysLeft, getDaysPassed, getSeasonDayLabel, formatHumanDate } from "../lib/date";
import { createId } from "../lib/ids";
import { formatIntention } from "../lib/implementationIntention";
import { selectActiveGoals, selectCurrentWeeklyPlan, selectTodayPlan } from "../store/selectors";
import { FOCUS_PRESETS } from "../constants/focusPresets";
import {
  AppShell,
  CalmAlert,
  CalmDialog,
  Card,
  ChoiceCard,
  ChoiceChip,
  DurationCard,
  EmptyState,
  GhostButton,
  OnboardingShell,
  PageHeader,
  PrimaryButton,
  SeasonPreviewCard,
  SecondaryButton,
  SectionHeader,
  TextInput,
  Textarea,
} from "../components/ui";
import { SeasonProgressCard, WhyEditor, FrictionWhy } from "../components/SeasonWidgets";
import { DefenseChips } from "./TodayScreen";
import { FocusSessionStarter } from "./FocusSession";
import { CircularProgress } from "../components/CircularProgress";
import { dismissCoachStep, getCoachStep } from "../lib/coach";
import { isCloseDaySkipped, skipCloseDay, getDayPart } from "../lib/dailyActivity";
import { playZenBell } from "../lib/audio";
import type { EnergyLevel, BadHabitCategory, Goal, GoalAllocation, MonkMVPState, OnboardingState, SeasonDurationPreset, WeeklyMode } from "../types/app";

export function ScreenIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 mt-4">
      <h1 className="text-2xl font-semibold leading-9 tracking-tight">{title}</h1>
      <p className="mt-3 text-[15px] leading-6 text-monk-muted">{subtitle}</p>
    </div>
  );
}

export function ValuesStep({ onNext }: { onNext: () => void }) {
  const { onboarding, updateOnboarding } = useMonkStore();
  const [protect, setProtect] = useState<string[]>(onboarding.valueTradeoffs.protect);
  const [sacrifice, setSacrifice] = useState<string[]>(onboarding.valueTradeoffs.sacrifice);
  const [tradeoff, setTradeoff] = useState(onboarding.valueTradeoffs.tradeoffExplanation);

  const canContinue = protect.length === 3 && sacrifice.length === 3 && tradeoff.length >= 20;

  const handleNext = () => {
    updateOnboarding({
      valueTradeoffs: { protect, sacrifice, tradeoffExplanation: tradeoff }
    });
    onNext();
  };

  return (
    <>
      <ScreenIntro title="Values" subtitle="What matters most right now?" />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Protect (pick 3):</p>
        <span className="rounded-full bg-monk-soft px-2.5 py-1 text-xs font-bold text-monk-muted">
          {protect.length}/3
        </span>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-2">
        {CORE_VALUES.map(v => (
          <ChoiceCard
            key={v.id}
            title={v.label}
            selected={protect.includes(v.id)}
            onClick={() => {
              if (protect.includes(v.id)) {
                setProtect(protect.filter(x => x !== v.id));
              } else if (protect.length < 3) {
                setProtect([...protect, v.id]);
              }
            }}
          />
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Defer for now (pick 3):</p>
        <span className="rounded-full bg-monk-soft px-2.5 py-1 text-xs font-bold text-monk-muted">
          {sacrifice.length}/3
        </span>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-2">
        {CORE_VALUES.filter(v => !protect.includes(v.id)).map(v => (
          <ChoiceCard
            key={v.id}
            title={v.label}
            selected={sacrifice.includes(v.id)}
            onClick={() => {
              if (sacrifice.includes(v.id)) {
                setSacrifice(sacrifice.filter(x => x !== v.id));
              } else if (sacrifice.length < 3) {
                setSacrifice([...sacrifice, v.id]);
              }
            }}
          />
        ))}
      </div>

      <div className="mb-6">
        <Textarea
          label="Why this tradeoff?"
          value={tradeoff}
          onChange={e => setTradeoff(e.target.value)}
          rows={2}
          showCharCount
          minLength={20}
        />
      </div>

      <div className="mt-auto space-y-3 pt-8">
        {!canContinue ? (
          <CalmAlert
            type="warning"
            title="Pick 3 to protect, 3 to sacrifice, and write why (20+ chars)."
          />
        ) : null}
        <PrimaryButton disabled={!canContinue} onClick={handleNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

export function VisionStep({ onNext }: { onNext: () => void }) {
  const { onboarding, updateOnboarding } = useMonkStore();
  const [vision, setVision] = useState(onboarding.legacyVision.proudChange);
  const [consequence, setConsequence] = useState(onboarding.legacyVision.consequenceOfInaction);
  const days = onboarding.seasonDurationDays;

  const canContinue = vision.length >= 20 && consequence.length >= 10;

  const handleNext = () => {
    updateOnboarding({
      legacyVision: { proudChange: vision, consequenceOfInaction: consequence },
      whyDiscovery: { selectedValues: onboarding.valueTradeoffs.protect, identityStatement: vision }
    });
    onNext();
  };

  return (
    <>
      <ScreenIntro title="Vision" subtitle="Picture the end of this season" />
      <div className="mb-6">
        <Textarea
          label={`${days} days from now, what change are you proud of?`}
          value={vision}
          onChange={e => setVision(e.target.value)}
          rows={3}
          showCharCount
          minLength={20}
        />
      </div>
      <div className="mb-6">
        <Textarea
          label="If you stay the same, what do you lose?"
          value={consequence}
          onChange={e => setConsequence(e.target.value)}
          rows={3}
          showCharCount
          minLength={10}
        />
      </div>
      <div className="mt-auto space-y-3 pt-8">
        {!canContinue ? <CalmAlert type="warning" title="Complete both reflections to continue." /> : null}
        <PrimaryButton disabled={!canContinue} onClick={handleNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

export function RealityCheck({ onNext }: { onNext: () => void }) {
  const { onboarding, updateOnboarding } = useMonkStore();
  const [hours, setHours] = useState(onboarding.timeAudit.freeHoursPerDay || 2);
  const [blocks, setBlocks] = useState<string[]>(onboarding.timeAudit.peakEnergyBlocks);
  const [crash, setCrash] = useState(onboarding.energyMap);

  const timeBlocks = [
    { id: "Morning (6-9)", label: "Morning · 6–9" },
    { id: "Midday (9-12)", label: "Midday · 9–12" },
    { id: "Afternoon (12-17)", label: "Afternoon · 12–5" },
    { id: "Evening (17-21)", label: "Evening · 5–9" },
    { id: "Night (21-24)", label: "Night · 9–12" }
  ];
  const canContinue = hours > 0 && hours <= 24 && blocks.length > 0 && crash.length >= 20;

  const handleNext = () => {
    updateOnboarding({
      timeAudit: { freeHoursPerDay: Math.min(24, Math.max(1, hours || 1)), peakEnergyBlocks: blocks },
      energyMap: crash
    });
    onNext();
  };

  return (
    <>
      <ScreenIntro title="Reality Check" subtitle="Ground your plan in real capacity, not ideal days." />

      <Card>
        <TextInput
          label="Free hours per day"
          type="number"
          min={1}
          max={24}
          inputMode="numeric"
          value={String(hours)}
          onChange={e => setHours(Math.min(24, Math.max(0, Number(e.target.value) || 0)))}
        />
        <p className="mt-2 text-xs leading-5 text-monk-muted">After work and obligations. Honest estimate.</p>
      </Card>

      <Card className="mt-6">
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Peak energy blocks</p>
          <span className="rounded-full bg-monk-soft px-2.5 py-1 text-xs font-bold text-monk-muted">
            {blocks.length} selected
          </span>
        </div>
        <p className="mb-3 text-xs text-monk-muted">When focus usually feels easiest.</p>
        <div className="flex flex-wrap gap-2">
          {timeBlocks.map(tb => (
            <ChoiceChip
              key={tb.id}
              label={tb.label}
              selected={blocks.includes(tb.id)}
              onClick={() => {
                if (blocks.includes(tb.id)) {
                  setBlocks(blocks.filter(x => x !== tb.id));
                } else {
                  setBlocks([...blocks, tb.id]);
                }
              }}
            />
          ))}
        </div>
      </Card>

      <Textarea
        label="When do you usually crash?"
        value={crash}
        onChange={e => setCrash(e.target.value)}
        rows={3}
        placeholder="e.g. After lunch, late night scrolling, Sunday evenings..."
        className="mt-6"
        showCharCount
        minLength={20}
      />
      <p className="mt-2 text-xs text-monk-muted">Helps plan around low-energy periods.</p>

      <div className="mt-auto space-y-3 pt-8">
        {!canContinue ? <CalmAlert type="warning" title="Add free hours, peak energy, and crash pattern." /> : null}
        <PrimaryButton disabled={!canContinue} onClick={handleNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

export function PastObstacles({ onNext }: { onNext: () => void }) {
  const { onboarding, updateOnboarding } = useMonkStore();
  const [obstacles, setObstacles] = useState<string[]>(onboarding.pastObstacles);
  const [current, setCurrent] = useState('');

  const handleAdd = () => {
    const next = current.trim().slice(0, 100);
    if (next && obstacles.length < 5 && !obstacles.includes(next)) {
      setObstacles([...obstacles, next]);
      setCurrent('');
    }
  };

  const handleNext = () => {
    updateOnboarding({ pastObstacles: obstacles });
    onNext();
  };

  return (
    <>
      <ScreenIntro title="Past Obstacles" subtitle="What usually kills momentum? Optional." />
      <p className="mb-4 text-sm leading-6 text-monk-muted">Add up to 5. Skip if nothing comes to mind.</p>

      <div className="flex gap-2">
        <TextInput
          value={current}
          onChange={e => setCurrent(e.target.value.slice(0, 100))}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="e.g. No accountability, too ambitious, burnout..."
          aria-label="Obstacle"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!current.trim() || obstacles.length >= 5}
          className="grid min-h-12 min-w-12 shrink-0 place-items-center rounded-xl border border-monk-border bg-monk-surface text-monk-muted disabled:opacity-40"
          aria-label="Add obstacle"
        >
          <Plus size={18} strokeWidth={1.5} />
        </button>
      </div>
      <p className="mt-2 text-xs text-monk-muted">Press Enter or tap + to add · {obstacles.length}/5</p>

      <div className="mt-6 space-y-2">
        {obstacles.map((obs, i) => (
          <div key={`${obs}-${i}`} className="flex items-center justify-between rounded-lg border border-monk-border bg-monk-surface p-3 transition-colors hover:border-monk-border-strong hover:bg-monk-soft">
            <span className="pr-3 text-sm">{obs}</span>
            <button
              type="button"
              onClick={() => setObstacles(obstacles.filter((_, idx) => idx !== i))}
              className="grid min-h-12 min-w-12 shrink-0 place-items-center rounded-full text-monk-muted hover:bg-monk-soft"
              aria-label={`Remove ${obs}`}
            >
              <Minus size={16} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-3 pt-8">
        <PrimaryButton onClick={handleNext}>{obstacles.length === 0 ? "Skip for now" : "Continue"}</PrimaryButton>
      </div>
    </>
  );
}

export function HabitAudit({ onNext }: { onNext: () => void }) {
  const { onboarding, toggleHabit } = useMonkStore();
  const result = validateHabitAudit(onboarding.selectedHabits.length);
  const selectedCount = onboarding.selectedHabits.length;
  const otherHabit = onboarding.selectedHabits.find((item) => item.category === "other");
  const otherNeedsName = Boolean(otherHabit && !otherHabit.customName?.trim());
  const canContinue = result.valid && !otherNeedsName;
  return (
    <>
      <ScreenIntro title="What usually pulls you away?" subtitle="Notice the patterns that make focus harder." />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Patterns</p>
        <span className="rounded-full bg-monk-soft px-2.5 py-1 text-xs font-bold text-monk-muted">
          {selectedCount === 0 ? "1+ required" : `${selectedCount} selected`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {habitOptions.map((habit) => (
          <ChoiceChip
            key={habit.category}
            label={habit.label}
            selected={onboarding.selectedHabits.some((item) => item.category === habit.category)}
            onClick={() => toggleHabit(habit.category, habit.label)}
          />
        ))}
      </div>
      {otherHabit ? (
        <TextInput
          className="mt-5"
          placeholder="Name the pattern"
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
        <PrimaryButton disabled={!canContinue} onClick={onNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

export function RemoveDistractions({ onNext }: { onNext: () => void }) {
  const { onboarding, toggleFrictionAction } = useMonkStore();
  const allActions = Object.values(onboarding.frictionActions).flat();
  const selectedCount = allActions.filter((action) => action.completed).length;
  const totalCount = allActions.length;
  const completed = selectedCount > 0;
  return (
    <>
      <ScreenIntro title="Make distractions harder to reach." subtitle="Pick actions you'll take. Friction beats willpower." />
      {totalCount === 0 ? (
        <Card className="mb-4">
          <p className="text-sm text-monk-muted">No habits selected yet. You can continue and set friction later.</p>
        </Card>
      ) : (
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-monk-muted">
          {selectedCount}/{totalCount} actions chosen
        </p>
      )}
      <div className="space-y-4">
        {onboarding.selectedHabits.map((habit) => (
          <Card key={habit.id}>
            <p className="font-semibold">{habit.customName || habit.name}</p>
            <div className="mt-4 space-y-2">
              {(onboarding.frictionActions[habit.id] ?? []).map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => toggleFrictionAction(habit.id, action.id)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl text-left text-sm"
                >
                  <span className={`grid h-6 w-6 place-items-center rounded-full border ${
                    action.completed ? "border-monk-success bg-monk-success-soft" : "border-monk-border"
                  }`}>
                    {action.completed ? <Check size={14} strokeWidth={1.5} /> : null}
                  </span>
                  {action.label}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-auto space-y-3 pt-8">
        {!completed && totalCount > 0 ? <CalmAlert type="warning" title="Choose at least 1 action you'll take." /> : null}
        <PrimaryButton disabled={!completed && totalCount > 0} onClick={onNext}>
          {totalCount === 0 ? "Continue" : "I'll make it harder"}
        </PrimaryButton>
      </div>
    </>
  );
}

export function GreyMode({ onNext }: { onNext: () => void }) {
  const { onboarding, updateOnboarding } = useMonkStore();
  const [platform, setPlatform] = useState<"ios" | "android" | "mac" | "windows" | "other">("other");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) setPlatform("ios");
    else if (/Android/.test(ua)) setPlatform("android");
    else if (/Mac/.test(ua)) setPlatform("mac");
    else if (/Win/.test(ua)) setPlatform("windows");
    else setPlatform("other");
  }, []);

  const platformInstructions: Record<string, { steps: string[]; hint?: string }> = {
    ios: {
      steps: [
        "Settings → Accessibility → Display & Text Size",
        "Tap Color Filters",
        "Toggle Color Filters ON, select Grayscale"
      ],
      hint: "You can add a shortcut: Accessibility → Accessibility Shortcut → Color Filters"
    },
    android: {
      steps: [
        "Settings → Accessibility → Color and motion",
        "Tap Color correction",
        "Toggle ON, select Grayscale"
      ],
      hint: "Some Samsung devices: Settings → Accessibility → Visibility enhancements → Color adjustment"
    },
    mac: {
      steps: [
        "System Settings → Accessibility → Display",
        "Click Color Filters",
        "Toggle Color Filters ON, select Grayscale"
      ],
      hint: "Or use keyboard shortcut: Ctrl + Cmd + Option + 5 (if configured)"
    },
    windows: {
      steps: [
        "Settings → Accessibility → Color filters",
        "Toggle Color filters ON",
        "Select Grayscale"
      ],
      hint: "Shortcut: Win + Ctrl + C to toggle quickly"
    },
    other: {
      steps: [
        "Open Accessibility settings",
        "Find Color filters / Grayscale",
        "Turn it on"
      ]
    }
  };

  const currentInstructions = platformInstructions[platform];

  return (
    <>
      <ScreenIntro title="Grey mode" subtitle="Make distracting apps less magnetic." />
      <Card important>
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-monk-soft">
          <EyeOff size={22} strokeWidth={1.5} />
        </div>
        <p className="font-semibold">{platform === "ios" ? "iOS" : platform === "android" ? "Android" : platform === "mac" ? "macOS" : platform === "windows" ? "Windows" : "Manual guide"}</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-monk-muted">
          {currentInstructions.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        {currentInstructions.hint && (
          <p className="mt-3 text-xs text-monk-muted italic">{currentInstructions.hint}</p>
        )}
      </Card>
      <div className="mt-auto space-y-3 pt-8">
        <PrimaryButton
          onClick={() => {
            updateOnboarding({ greyModeConfirmed: true });
            onNext();
          }}
        >
          I've turned it on
        </PrimaryButton>
        <SecondaryButton
          onClick={() => {
            updateOnboarding({ greyModeConfirmed: onboarding.greyModeConfirmed });
            onNext();
          }}
        >
          I'll do this later
        </SecondaryButton>
      </div>
    </>
  );
}

export function GoalBrainDump({ onNext }: { onNext: () => void }) {
  const { onboarding, addGoalDraft, removeGoalDraft, updateGoalDraft } = useMonkStore();
  const filledCount = onboarding.goalDrafts.filter((g) => g.title.trim()).length;
  const result = validateGoalBrainDump(onboarding.goalDrafts);
  return (
    <>
      <ScreenIntro title="What feels important in this season?" subtitle="Write 5–10 possible goals first. Don't filter yet — we'll narrow them next." />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-monk-muted">Brain dump first. Selection comes later.</p>
        <span className="rounded-full bg-monk-soft px-2.5 py-1 text-xs font-bold text-monk-muted">
          {filledCount}/10 · min 5
        </span>
      </div>
      <div className="space-y-3">
        {onboarding.goalDrafts.map((goal, index) => (
          <div key={goal.id} className="flex gap-2">
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
                aria-label="Remove goal"
                onClick={() => removeGoalDraft(goal.id)}
                className="grid min-h-12 min-w-12 shrink-0 place-items-center rounded-xl border border-monk-border bg-monk-surface text-monk-muted"
              >
                <Minus size={18} strokeWidth={1.5} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {onboarding.goalDrafts.length < 10 ? (
        <GhostButton className="mt-4" onClick={addGoalDraft}>
          <span className="inline-flex items-center gap-2"><Plus size={16} /> Add goal</span>
        </GhostButton>
      ) : null}
      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        <PrimaryButton disabled={!result.valid} onClick={onNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

export function GoalElimination({ onNext }: { onNext: () => void }) {
  const { onboarding, toggleReleasedGoal } = useMonkStore();
  const goals = onboarding.goalDrafts.filter((goal) => goal.title.trim());
  const result = validateGoalElimination(onboarding.releasedGoalIds.length);
  return (
    <>
      <ScreenIntro title="What can you release for now?" subtitle="Not everything needs your energy this season." />
      <div className="space-y-3">
        {goals.map((goal) => {
          const released = onboarding.releasedGoalIds.includes(goal.id);
          return (
            <button
              type="button"
              key={goal.id}
              onClick={() => toggleReleasedGoal(goal.id)}
              className={`flex min-h-[64px] w-full items-center justify-between rounded-monk border p-4 text-left transition ${
                released ? "border-monk-danger bg-monk-danger-soft text-monk-muted line-through" : "border-monk-border bg-monk-surface"
              }`}
            >
              <span>{goal.title}</span>
              <span className="text-sm text-monk-muted">{released ? "Released" : "Release"}</span>
            </button>
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

export function FocusGoals({ onNext }: { onNext: () => void }) {
  const store = useMonkStore();
  const { onboarding } = store;
  const nonEmptyGoals = onboarding.goalDrafts.filter((goal) => goal.title.trim());
  const result = validateFocusGoalSelection(nonEmptyGoals.length);

  return (
    <>
      <ScreenIntro title="What feels important in this season?" subtitle="Write one to three focus goals. Fewer is stronger." />
      <div className="space-y-3">
        {onboarding.goalDrafts.map((goal, index) => (
          <div key={goal.id} className="flex gap-2">
            <TextInput
              aria-label={`Goal ${index + 1}`}
              placeholder="Write a goal"
              value={goal.title}
              onChange={(event) => store.updateGoalDraft(goal.id, event.target.value)}
            />
            {onboarding.goalDrafts.length > 1 ? (
              <button
                type="button"
                aria-label="Remove goal"
                onClick={() => store.removeGoalDraft(goal.id)}
                className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted"
              >
                <Minus size={18} strokeWidth={1.5} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {onboarding.goalDrafts.length < 3 ? (
        <GhostButton className="mt-4" onClick={store.addGoalDraft}>
          <span className="inline-flex items-center gap-2"><Plus size={16} /> Add goal</span>
        </GhostButton>
      ) : null}
      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        <PrimaryButton
          disabled={!result.valid}
          onClick={() => {
            const validGoals = onboarding.goalDrafts.filter((g) => g.title.trim());
            const goalIds = validGoals.map((g) => g.id);
            const currentAllocations = onboarding.weeklyAllocations;
            const isMatch = currentAllocations.length === goalIds.length &&
              currentAllocations.every((alloc) => goalIds.includes(alloc.goalId));
            store.updateOnboarding({
              selectedFocusGoalIds: goalIds,
              weeklyAllocations: isMatch ? currentAllocations : defaultWeeklyTargets(goalIds)
            });
            onNext();
          }}
        >
          Choose Season
        </PrimaryButton>
      </div>
    </>
  );}

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
          selected={preset === "7_days"}
          onClick={() => selectPreset("7_days", 7)}
        />
        <DurationCard
          title="30 Days"
          badge="Recommended"
          description="Best for building consistency and daily momentum."
          selected={preset === "30_days"}
          onClick={() => selectPreset("30_days", 30)}
        />
        <DurationCard
          title="90 Days"
          badge="Deep season"
          description="Best for meaningful progress on bigger life goals."
          selected={preset === "90_days"}
          onClick={() => selectPreset("90_days", 90)}
        />
        <DurationCard
          title="Custom"
          badge="Set your own length"
          description="Choose the number of days that fits your season."
          selected={preset === "custom"}
          onClick={() => {
            updateOnboarding({ durationPreset: "custom" });
            setSeasonDuration(Math.max(7, Number(custom) || 14));
          }}
        />
      </div>
      <div className={`mt-4 ${preset !== "custom" ? "opacity-50 pointer-events-none" : ""}`}>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-monk-muted">
          Custom days (min 7)
        </label>
        <TextInput
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

export function NarrowGoals({ onNext }: { onNext: () => void }) {
  const { onboarding, toggleFocusGoal } = useMonkStore();
  const goals = onboarding.goalDrafts.filter((goal) => goal.title.trim());
  const selectedCount = onboarding.selectedFocusGoalIds.length;
  const result = validateNarrowGoals(selectedCount);

  return (
    <>
      <ScreenIntro
        title="What deserves your energy this season?"
        subtitle="Pick 1–3 goals to keep. Unselected goals stay saved for later seasons."
      />
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-monk-muted">
        Keep this season · {selectedCount}/3 selected
      </p>
      <div className="space-y-3">
        {goals.map((goal) => {
          const isSelected = onboarding.selectedFocusGoalIds.includes(goal.id);
          return (
            <button
              type="button"
              key={goal.id}
              onClick={() => toggleFocusGoal(goal.id)}
              className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-monk border px-4 py-3 text-left transition-colors duration-150 ${
                isSelected
                  ? "border-monk-accent bg-monk-accent-soft text-monk-text"
                  : "border-monk-border bg-monk-surface text-monk-text hover:border-monk-border-strong"
              }`}
            >
              <span className={isSelected ? "font-semibold" : ""}>{goal.title}</span>
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                  isSelected
                    ? "border-monk-accent bg-monk-accent text-white"
                    : "border-transparent bg-transparent text-transparent"
                }`}
              >
                {isSelected ? <Check size={14} strokeWidth={2.5} /> : null}
              </span>
            </button>
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

export function KeystoneSetup({ onNext }: { onNext: () => void }) {
  const { onboarding, setKeystoneAction, updateOnboarding } = useMonkStore();
  const goals = onboarding.goalDrafts.filter((goal) => onboarding.selectedFocusGoalIds.includes(goal.id));
  const result = validateKeystoneActions(onboarding.selectedFocusGoalIds, onboarding.keystoneActions);
  const whenHints = onboarding.timeAudit.peakEnergyBlocks;

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

  return (
    <>
      <ScreenIntro
        title="What action moves each goal forward?"
        subtitle="Pair each action with a time or cue. Add why it matters — optional, powerful."
      />
      <div className="space-y-4">
        {goals.map((goal, index) => {
          const parsed = parseIntention(onboarding.keystoneActions[goal.id] ?? "");
          const actionPh = actionPlaceholders[index % actionPlaceholders.length];
          const whenPh = whenHints[index] || whenPlaceholders[index % whenPlaceholders.length];
          const goalWhy = onboarding.goalWhys[goal.id] ?? "";
          const commit = (when: string, action: string) => {
            setKeystoneAction(goal.id, formatIntention(when, action));
          };
          return (
            <Card key={goal.id}>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-monk-muted">
                Goal {index + 1}
              </p>
              <p className="mb-3 font-semibold text-monk-text">{goal.title}</p>
              <div className="space-y-3">
                <div>
                  <TextInput
                    label="When"
                    id={`keystone-when-${goal.id}`}
                    placeholder={whenPh}
                    value={parsed.when}
                    onChange={(event) => commit(event.target.value, parsed.action)}
                  />
                  <p className="mt-1 text-xs text-monk-muted">e.g., "after breakfast", "at 9pm", "before checking email"</p>
                </div>
                <div>
                  <TextInput
                    label="I will"
                    id={`keystone-action-${goal.id}`}
                    placeholder={actionPh}
                    value={parsed.action}
                    onChange={(event) => commit(parsed.when, event.target.value)}
                  />
                  <p className="mt-1 text-xs text-monk-muted">One specific, repeatable action</p>
                </div>
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
                />
                <p className="text-xs text-monk-text-soft">
                  Smallest repeatable proof this goal is moving.
                </p>
              </div>
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

export function WeekSetup({ onNext }: { onNext: () => void }) {
  const { onboarding, setWeeklyAllocation, updateOnboarding } = useMonkStore();
  const goals = onboarding.goalDrafts.filter((goal) => onboarding.selectedFocusGoalIds.includes(goal.id));
  const goalIdsJson = JSON.stringify(goals.map((g) => g.id));

  useEffect(() => {
    const goalIds = goals.map((g) => g.id);
    const currentAllocations = onboarding.weeklyAllocations;
    const isMatch = currentAllocations.length === goalIds.length &&
      currentAllocations.every((alloc) => goalIds.includes(alloc.goalId));
    if (!isMatch) {
      updateOnboarding({
        weeklyAllocations: defaultWeeklyTargets(goalIds)
      });
    }
  }, [goalIdsJson, onboarding.weeklyAllocations, updateOnboarding]);

  const result = validateWeeklyAllocation(onboarding.weeklyAllocations, 1);
  const allocatedDays = onboarding.weeklyAllocations.reduce((sum, item) => sum + item.targetCount, 0);
  const freeHours = onboarding.timeAudit.freeHoursPerDay;
  const cap = capacityCheck(freeHours, allocatedDays);
  const remaining = Math.max(0, 6 - allocatedDays);

  const previewGoals = goals.map((draft, index) => ({
    id: draft.id,
    seasonId: "preview",
    title: draft.title.trim(),
    keystoneAction: onboarding.keystoneActions[draft.id]?.trim() || "",
    priority: (index + 1) as 1 | 2 | 3,
    weeklyTargetCount:
      onboarding.weeklyAllocations.find((a) => a.goalId === draft.id)?.targetCount ?? 1,
    status: "active" as const,
    createdAt: "",
    updatedAt: ""
  }));
  const previewSeason = {
    id: "preview",
    name: "Preview",
    startDate: onboarding.seasonStartDate,
    endDate: onboarding.seasonEndDate,
    durationDays: onboarding.seasonDurationDays,
    status: "active" as const,
    mode: onboarding.weeklyMode,
    goalIds: goals.map((g) => g.id),
    badHabitIds: [],
    antiGoals: onboarding.antiGoals.filter((ag) => ag.trim()),
    obstacles: onboarding.obstacles.filter((ob) => ob.trim()),
    createdAt: "",
    updatedAt: ""
  };
  const planScore = scorePlan(previewSeason, previewGoals);
  const strength = planStrengthLabel(planScore.total);
  const strengthColor =
    planScore.total >= 80 ? "text-monk-success" :
    planScore.total >= 55 ? "text-monk-accent" :
    "text-monk-warning";

  return (
    <>
      <ScreenIntro
        title="Shape your quiet week."
        subtitle="Place 6 focus days across goals. One rest day stays open."
      />

      <Card className="mb-5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-monk-muted">Focus days</p>
            <p className="mt-1 text-sm text-monk-text">
              {allocatedDays === 6
                ? "Full week planned"
                : remaining > 0
                ? `${remaining} day${remaining === 1 ? "" : "s"} left to place`
                : `${allocatedDays - 6} over target`}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
            allocatedDays === 6
              ? "bg-monk-success-soft text-monk-success"
              : allocatedDays > 6
              ? "bg-monk-warning-soft text-monk-warning"
              : "bg-monk-soft text-monk-muted"
          }`}>
            {allocatedDays}/6
          </span>
        </div>
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < Math.min(allocatedDays, 6) ? "bg-monk-accent" : "bg-monk-soft"
              }`}
            />
          ))}
          <span className="h-2 w-6 rounded-full bg-monk-rest/40" title="Rest day" />
        </div>
        <p className="mt-2 text-xs text-monk-muted">Every goal needs at least one day.</p>
      </Card>

      <div className="space-y-3">
        {goals.map((goal) => {
          const allocation = onboarding.weeklyAllocations.find((item) => item.goalId === goal.id);
          const count = allocation?.targetCount ?? 1;
          return (
            <Card key={goal.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{goal.title}</p>
                  <p className="mt-1 text-xs text-monk-muted">Focus days this week</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-label={`Decrease ${goal.title}`}
                    disabled={count <= 1}
                    className="grid min-h-11 min-w-11 place-items-center rounded-full border border-monk-border bg-monk-bg text-monk-text transition active:scale-95 disabled:opacity-30"
                    onClick={() => setWeeklyAllocation(goal.id, count - 1)}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center text-lg font-bold tabular-nums">{count}</span>
                  <button
                    type="button"
                    aria-label={`Increase ${goal.title}`}
                    disabled={allocatedDays >= 6}
                    className="grid min-h-11 min-w-11 place-items-center rounded-full border border-monk-border bg-monk-bg text-monk-text transition active:scale-95 disabled:opacity-30"
                    onClick={() => setWeeklyAllocation(goal.id, count + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
        <Card className="bg-monk-soft p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-monk-surface text-monk-muted">
              <Moon size={18} strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold">Rest</p>
              <p className="mt-1 text-sm text-monk-muted">1 day reserved. Rest is part of the path.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-5 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-monk-muted">Plan strength</p>
          <span className={`text-sm font-bold ${strengthColor}`}>{strength} · {planScore.total}</span>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-monk-soft overflow-hidden">
          <div
            className="h-full rounded-full bg-monk-accent transition-all"
            style={{ width: `${Math.min(100, planScore.total)}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-monk-muted">
          <span>Keystones {planScore.breakdown.keystoneActions}/30</span>
          <span>Weekly load {planScore.breakdown.weeklyTargets}/30</span>
          <span>Anti-goals {planScore.breakdown.antiGoals}/20</span>
          <span>Duration {planScore.breakdown.duration}/20</span>
        </div>
      </Card>

      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        {cap.message ? (
          <CalmAlert type={cap.ok ? "info" : "warning"} title={cap.message} />
        ) : freeHours > 0 ? (
          <p className="text-center text-xs text-monk-muted">
            ~{cap.loadHours.toFixed(0)}h focus planned · ~{cap.availableHours.toFixed(0)}h free capacity
          </p>
        ) : null}
        <PrimaryButton
          disabled={!result.valid}
          onClick={onNext}
        >
          Continue
        </PrimaryButton>
      </div>
    </>
  );
}

export function TodayPreviewStep() {
  const navigate = useNavigate();
  const t = useT();
  const { createSeasonFromOnboarding } = useMonkStore();
  const steps = [
    t("onboarding.preview.step1"),
    t("onboarding.preview.step2"),
    t("onboarding.preview.step3"),
    t("onboarding.preview.step4")
  ] as const;

  return (
    <>
      <ScreenIntro title={t("onboarding.preview.title")} subtitle={t("onboarding.preview.body")} />
      <Card className="space-y-3 p-4">
        <ol className="space-y-3">
          {steps.map((label, index) => (
            <li key={label} className="flex gap-3 text-sm leading-6 text-monk-text">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-monk-accent-soft text-xs font-bold text-monk-accent">
                {index + 1}
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
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
