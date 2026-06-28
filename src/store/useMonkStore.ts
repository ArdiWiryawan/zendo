import { create } from "zustand";
import {
  createDefaultOnboarding,
  createInitialState,
  defaultWeeklyTargets,
  frictionActionsForHabit
} from "../constants/defaultData";
import {
  FOCUS_PRESETS,
  createFocusPhases,
  getCurrentFocusPhase,
  getTotalPlannedMinutes,
  summarizeFocusSession
} from "../constants/focusPresets";
import { resolveDailyActivityStatus } from "../constants/dailyActivityStatus";
import {
  formatFocusSessionTimelineDescription,
  normalizeFocusSessionRecord,
  normalizeFocusTimelineEvents,
  resolveFocusSessionStatus
} from "../constants/focusSessionStatus";
import {
  addDaysToDate,
  datesInRange,
  getCurrentWeekNumber,
  getTodayDateString,
  getWeekEndDate,
  getWeekStartDate,
  isSeasonEnded,
  nowIso
} from "../lib/date";
import { createId } from "../lib/ids";
import { loadState, saveState } from "../lib/storage";
import type {
  AppSettings,
  BadHabit,
  BadHabitCategory,
  BadHabitDraft,
  DayPlan,
  EnergyLevel,
  FocusSession,
  Goal,
  GoalAllocation,
  JournalAnswers,
  LearningEntry,
  LearningType,
  LearningSession,
  LearningSourceType,
  TimelineEvent,
  TimelineEventType,
  FocusSessionPreset,
  MonkMVPState,
  OnboardingState,
  RelapseLog,
  TimelineDay,
  TimelineStatus,
  WeeklyMode,
  WeeklyPlan
} from "../types/app";

type StoreSnapshot = MonkMVPState;

type PickTodayInput = {
  goalId?: string;
  dayType: "goal" | "rest";
  energyLevel?: EnergyLevel;
  mainAction?: string;
  status?: "active" | "completed" | "planned" | "missed";
};

type LearningInput = {
  type: LearningType;
  title: string;
  durationMinutes?: number;
  keyInsight?: string;
  actionTakeaway?: string;
  goalId?: string;
};

type RelapseInput = {
  trigger: RelapseLog["trigger"];
  note?: string;
  recoveryAction?: string;
};

type MonkActions = {
  hydrate: () => void;
  persist: () => void;
  recordOpen: () => void;
  resetApp: () => void;
  ensureSeasonFresh: () => void;
  updateOnboarding: (patch: Partial<OnboardingState>) => void;
  setOnboardingStep: (step: string) => void;
  toggleHabit: (category: BadHabitCategory, label: string) => void;
  setCustomHabitName: (name: string) => void;
  toggleFrictionAction: (habitId: string, actionId: string) => void;
  updateGoalDraft: (id: string, title: string) => void;
  addGoalDraft: () => void;
  removeGoalDraft: (id: string) => void;
  toggleReleasedGoal: (id: string) => void;
  toggleFocusGoal: (id: string) => void;
  setSeasonDuration: (days: number) => void;
  setKeystoneAction: (goalId: string, action: string) => void;
  setWeeklyMode: (mode: WeeklyMode) => void;
  setWeeklyAllocation: (goalId: string, targetCount: number) => void;
  createSeasonFromOnboarding: () => void;
  getOrCreateCurrentWeeklyPlan: () => WeeklyPlan | undefined;
  createOrUpdateDayPlan: (dateString: string, input: PickTodayInput) => void;
  clearDayPlan: (dateString: string) => void;
  toggleTodayCompletion: () => void;
  updateTodayEnergy: (energyLevel: EnergyLevel) => void;
  completeTodayMainAction: () => void;
  startFocusSession: (preset?: FocusSessionPreset, customMinutes?: number) => FocusSession | undefined;
  tickFocusSession: (sessionId: string, elapsedSeconds: number) => void;
  advanceFocusPhase: (sessionId: string) => void;
  resetFocusSession: (sessionId: string) => void;
  pauseFocusSession: (sessionId: string) => void;
  resumeFocusSession: (sessionId: string) => void;
  completeFocusSession: (sessionId: string, completeMainAction?: boolean) => void;
  abandonFocusSession: (sessionId: string) => void;
  saveLearningEntry: (input: LearningInput) => void;
  saveLearningSession: (session: LearningSession) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  saveJournalEntry: (answers: JournalAnswers) => void;
  saveRelapseLog: (input: RelapseInput) => void;
  archiveSeason: () => void;
  startNewSeason: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
};

export type MonkStore = StoreSnapshot & MonkActions;

function snapshot(state: MonkStore | MonkMVPState): MonkMVPState {
  return {
    userProfile: state.userProfile,
    appSettings: state.appSettings,
    activeSeason: state.activeSeason,
    goals: state.goals,
    badHabits: state.badHabits,
    weeklyPlans: state.weeklyPlans,
    dayPlans: state.dayPlans,
    focusSessions: state.focusSessions,
    learningEntries: state.learningEntries,
    journalEntries: state.journalEntries,
    relapseLogs: state.relapseLogs,
    timelineDays: state.timelineDays,
    notificationReminders: state.notificationReminders,
    onboarding: state.onboarding,
    learningSessions: state.learningSessions,
    timelineEvents: state.timelineEvents
  };
}

function withPersist(set: (state: Partial<MonkStore>) => void, get: () => MonkStore, patch: Partial<MonkStore>) {
  set(patch);
  saveState(snapshot(get()));
}

function getActiveGoals(state: MonkMVPState) {
  const season = state.activeSeason;
  if (!season) return [];
  return state.goals.filter((goal) => goal.seasonId === season.id && goal.status === "active");
}

function findTodayPlan(state: MonkMVPState) {
  const today = getTodayDateString();
  return state.dayPlans.find(
    (plan) => plan.seasonId === state.activeSeason?.id && plan.date === today
  );
}

function getFocusSessionsForDay(state: MonkMVPState, dayPlan: DayPlan) {
  return state.focusSessions.filter(
    (session) => session.dayPlanId === dayPlan.id && ["completed", "ended_early"].includes(session.status)
  );
}

function getLearningSessionsForDay(state: MonkMVPState, dayPlan: DayPlan) {
  return state.learningSessions.filter((session) => {
    const sessionDate = (session.endedAt ?? session.startedAt).slice(0, 10);
    const sameSeason = !session.seasonId || session.seasonId === dayPlan.seasonId;
    return sessionDate === dayPlan.date && sameSeason && session.status === "completed";
  });
}

function getLegacyLearningEntriesForDay(state: MonkMVPState, dayPlan: DayPlan) {
  return state.learningEntries.filter((entry) => entry.dayPlanId === dayPlan.id);
}

function deriveTimelineStatus(state: MonkMVPState, dayPlan: DayPlan): TimelineStatus {
  const relapses = state.relapseLogs.filter((log) => log.dayPlanId === dayPlan.id);
  if (relapses.length > 0) return "relapse";
  if (dayPlan.dayType === "rest" && dayPlan.status === "completed") return "rest";
  const focusSessions = getFocusSessionsForDay(state, dayPlan).filter(
    (session) => resolveFocusSessionStatus(session) === "completed" || session.status === "ended_early"
  );
  const learningSessions = getLearningSessionsForDay(state, dayPlan);
  const legacyLearningEntries = getLegacyLearningEntriesForDay(state, dayPlan);
  const status = resolveDailyActivityStatus({
    focusSessions,
    learningSessions: learningSessions.length > 0 ? learningSessions : legacyLearningEntries.map((entry) => ({ id: entry.id }))
  });
  if (status !== "not_started") return status;
  if (dayPlan.status === "missed") return "missed";
  return "not_started";
}

function updatedTimelineDays(state: MonkMVPState, dayPlan: DayPlan): TimelineDay[] {
  const timestamp = nowIso();
  const focusMinutes = getFocusSessionsForDay(state, dayPlan)
    .reduce((sum, session) => sum + (session.focusDurationMinutes ?? session.durationMinutes), 0);
  const learningMinutes = getLegacyLearningEntriesForDay(state, dayPlan)
    .reduce((sum, entry) => sum + (entry.durationMinutes ?? 0), 0) +
    getLearningSessionsForDay(state, dayPlan)
      .reduce((sum, session) => sum + Math.round(session.actualDurationSeconds / 60), 0);
  const journalCompleted = state.journalEntries.some((entry) => entry.dayPlanId === dayPlan.id);
  const relapseCount = state.relapseLogs.filter((log) => log.dayPlanId === dayPlan.id).length;
  const existing = state.timelineDays.find(
    (day) => day.seasonId === dayPlan.seasonId && day.date === dayPlan.date
  );
  const nextDay: TimelineDay = {
    id: existing?.id ?? createId("timeline"),
    seasonId: dayPlan.seasonId,
    date: dayPlan.date,
    dayType: dayPlan.dayType,
    goalId: dayPlan.goalId,
    status: deriveTimelineStatus(state, dayPlan),
    focusMinutes,
    learningMinutes,
    journalCompleted,
    relapseCount,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };

  return existing
    ? state.timelineDays.map((day) => (day.id === existing.id ? nextDay : day))
    : [...state.timelineDays, nextDay];
}

function getOrCreateWeekState(state: MonkMVPState, dateString = getTodayDateString()): { weeklyPlan?: WeeklyPlan; state: MonkMVPState } {
  const season = state.activeSeason;
  if (!season) return { state };
  const weekNumber = getCurrentWeekNumber(season.startDate, dateString);
  const existing = state.weeklyPlans.find(
    (plan) => plan.seasonId === season.id && plan.weekNumber === weekNumber
  );
  if (existing) return { weeklyPlan: existing, state };

  const timestamp = nowIso();
  const activeGoals = getActiveGoals(state);
  const weekStart = getWeekStartDate(season.startDate, weekNumber);
  const weeklyPlan: WeeklyPlan = {
    id: createId("week"),
    seasonId: season.id,
    weekNumber,
    startDate: weekStart,
    endDate: getWeekEndDate(season.startDate, weekNumber),
    mode: season.mode,
    goalAllocations: activeGoals.map((g) => ({
      goalId: g.id,
      targetCount: g.weeklyTargetCount,
      completedCount: 0
    })),
    restDayTarget: 1,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const nextState: MonkMVPState = {
    ...state,
    weeklyPlans: [...state.weeklyPlans, weeklyPlan]
  };

  if (season.mode !== "planning") return { weeklyPlan, state: nextState };

  const sequence = buildPlanningSequence(weeklyPlan.goalAllocations);
  const dayPlans = datesInRange(weekStart, 7).map<DayPlan>((date, index) => {
    const theme = sequence[index] ?? "rest";
    const goal = activeGoals.find((item) => item.id === theme);
    return {
      id: createId("day"),
      seasonId: season.id,
      weeklyPlanId: weeklyPlan.id,
      date,
      dayType: theme === "rest" ? "rest" : "goal",
      goalId: theme === "rest" ? undefined : String(theme),
      mainAction: goal?.keystoneAction,
      status: "planned",
      createdAt: timestamp,
      updatedAt: timestamp
    };
  });

  return {
    weeklyPlan,
    state: {
      ...nextState,
      dayPlans: [...nextState.dayPlans, ...dayPlans]
    }
  };
}

function buildPlanningSequence(allocations: GoalAllocation[]) {
  const goalDays = allocations.flatMap((allocation) =>
    Array.from({ length: allocation.targetCount }, () => allocation.goalId)
  );
  return [...goalDays.slice(0, 6), "rest"];
}

function updateAllocationCounts(state: MonkMVPState, weeklyPlanId: string): WeeklyPlan[] {
  const dayPlans = state.dayPlans.filter((day) => day.weeklyPlanId === weeklyPlanId);
  return state.weeklyPlans.map((plan) => {
    if (plan.id !== weeklyPlanId) return plan;
    return {
      ...plan,
      goalAllocations: plan.goalAllocations.map((allocation) => ({
        ...allocation,
        completedCount: dayPlans.filter(
          (day) =>
            day.goalId === allocation.goalId &&
            day.status === "completed"
        ).length
      })),
      updatedAt: nowIso()
    };
  });
}

export const useMonkStore = create<MonkStore>((set, get) => ({
  ...createInitialState(),

  hydrate: () => {
    const stored = loadState();
    if (stored) {
      const focusSessions = (stored.focusSessions || []).map((session) => normalizeFocusSessionRecord(session));
      let timelineEvents = normalizeFocusTimelineEvents(stored.timelineEvents || [], focusSessions);
      if (timelineEvents.length === 0) {
        if (stored.activeSeason) {
          timelineEvents.push({
            id: "legacy_season_started",
            type: "season_started",
            seasonId: stored.activeSeason.id,
            sourceId: stored.activeSeason.id,
            title: "Season Started",
            description: `Committed to Zendo Season I for ${stored.activeSeason.durationDays} days.`,
            occurredAt: stored.activeSeason.createdAt || stored.activeSeason.startDate + "T00:00:00.000Z",
            createdAt: stored.activeSeason.createdAt || nowIso()
          });
        }
        stored.goals.forEach((g) => {
          timelineEvents.push({
            id: `legacy_goal_${g.id}`,
            type: "goal_created",
            seasonId: g.seasonId,
            relatedGoalId: g.id,
            sourceId: g.id,
            title: "Goal Created",
            description: `Set focus goal: "${g.title}" with keystone action: "${g.keystoneAction}"`,
            occurredAt: g.createdAt || nowIso(),
            createdAt: g.createdAt || nowIso()
          });
        });
        stored.journalEntries.forEach((j) => {
          timelineEvents.push({
            id: `legacy_journal_${j.id}`,
            type: "journal_entry",
            seasonId: j.seasonId,
            sourceId: j.id,
            title: "Wrote journal reflection",
            description: j.answers.whatMovedToday || "Closed the day with reflection.",
            occurredAt: j.createdAt || j.date + "T23:59:59.000Z",
            createdAt: j.createdAt || nowIso()
          });
        });
        focusSessions.forEach((s) => {
          if (resolveFocusSessionStatus(s) === "completed") {
            const goal = stored.goals.find((g) => g.id === s.goalId);
            timelineEvents.push({
              id: `legacy_focus_${s.id}`,
              type: "focus_session",
              seasonId: s.seasonId,
              relatedGoalId: s.goalId || null,
              sourceId: s.id,
              title: `${FOCUS_PRESETS[s.preset ?? s.timerMode ?? "deep_work"].shortLabel} completed`,
              description: formatFocusSessionTimelineDescription(s, goal ? `Moved forward: ${goal.title}` : undefined),
              occurredAt: s.endTime || s.startTime,
              createdAt: s.createdAt || nowIso()
            });
          }
        });
      }

      const timelineDays = (stored.timelineDays || []).map((day) => {
        const dayPlan = stored.dayPlans.find(
          (plan) => plan.seasonId === day.seasonId && plan.date === day.date
        );
        if (!dayPlan) return day;
        return {
          ...day,
          status: deriveTimelineStatus({ ...stored, focusSessions }, dayPlan)
        };
      });

      set({
        ...createInitialState(),
        ...stored,
        focusSessions,
        timelineDays,
        timelineEvents,
        appSettings: {
          ...createInitialState().appSettings,
          ...stored.appSettings
        },
        onboarding: {
          ...createDefaultOnboarding(),
          ...stored.onboarding
        }
      });
    }
  },

  persist: () => saveState(snapshot(get())),

  recordOpen: () => {
    const state = get();
    withPersist(set, get, {
      appSettings: {
        ...state.appSettings,
        openCount: (state.appSettings.openCount ?? 0) + 1,
        updatedAt: nowIso()
      }
    });
  },

  resetApp: () => {
    withPersist(set, get, createInitialState());
  },

  ensureSeasonFresh: () => {
    const state = get();
    const season = state.activeSeason;
    if (!season || season.status !== "active" || !isSeasonEnded(season)) return;
    withPersist(set, get, {
      activeSeason: { ...season, status: "ended", updatedAt: nowIso() }
    });
  },

  updateOnboarding: (patch) => {
    const state = get();
    withPersist(set, get, {
      onboarding: { ...state.onboarding, ...patch }
    });
  },

  setOnboardingStep: (step) => {
    const state = get();
    withPersist(set, get, {
      onboarding: { ...state.onboarding, currentStep: step }
    });
  },

  toggleHabit: (category, label) => {
    const state = get();
    const existing = state.onboarding.selectedHabits.find((habit) => habit.category === category);
    const selectedHabits = existing
      ? state.onboarding.selectedHabits.filter((habit) => habit.id !== existing.id)
      : [
          ...state.onboarding.selectedHabits,
          { id: createId("habit_draft"), category, name: label }
        ];
    const frictionActions = { ...state.onboarding.frictionActions };
    if (existing) {
      delete frictionActions[existing.id];
    } else {
      const next = selectedHabits[selectedHabits.length - 1];
      frictionActions[next.id] = frictionActionsForHabit(next);
    }
    withPersist(set, get, { onboarding: { ...state.onboarding, selectedHabits, frictionActions } });
  },

  setCustomHabitName: (name) => {
    const state = get();
    let other = state.onboarding.selectedHabits.find((habit) => habit.category === "other");
    if (!other) {
      other = { id: createId("habit_draft"), category: "other", name: "Other", customName: name };
    }
    const nextHabit: BadHabitDraft = { ...other, name: name || "Other", customName: name };
    const selectedHabits = [
      ...state.onboarding.selectedHabits.filter((habit) => habit.id !== other.id),
      nextHabit
    ];
    withPersist(set, get, {
      onboarding: {
        ...state.onboarding,
        selectedHabits,
        frictionActions: {
          ...state.onboarding.frictionActions,
          [nextHabit.id]: frictionActionsForHabit(nextHabit)
        }
      }
    });
  },

  toggleFrictionAction: (habitId, actionId) => {
    const state = get();
    const actions = state.onboarding.frictionActions[habitId] ?? [];
    withPersist(set, get, {
      onboarding: {
        ...state.onboarding,
        frictionActions: {
          ...state.onboarding.frictionActions,
          [habitId]: actions.map((action) =>
            action.id === actionId ? { ...action, completed: !action.completed } : action
          )
        }
      }
    });
  },

  updateGoalDraft: (id, title) => {
    const state = get();
    withPersist(set, get, {
      onboarding: {
        ...state.onboarding,
        goalDrafts: state.onboarding.goalDrafts.map((goal) =>
          goal.id === id ? { ...goal, title } : goal
        )
      }
    });
  },

  addGoalDraft: () => {
    const state = get();
    if (state.onboarding.goalDrafts.length >= 10) return;
    withPersist(set, get, {
      onboarding: {
        ...state.onboarding,
        goalDrafts: [...state.onboarding.goalDrafts, { id: createId("draft_goal"), title: "" }]
      }
    });
  },

  removeGoalDraft: (id) => {
    const state = get();
    withPersist(set, get, {
      onboarding: {
        ...state.onboarding,
        goalDrafts: state.onboarding.goalDrafts.filter((goal) => goal.id !== id),
        releasedGoalIds: state.onboarding.releasedGoalIds.filter((goalId) => goalId !== id),
        selectedFocusGoalIds: state.onboarding.selectedFocusGoalIds.filter((goalId) => goalId !== id)
      }
    });
  },

  toggleReleasedGoal: (id) => {
    const state = get();
    const released = state.onboarding.releasedGoalIds.includes(id);
    withPersist(set, get, {
      onboarding: {
        ...state.onboarding,
        releasedGoalIds: released
          ? state.onboarding.releasedGoalIds.filter((goalId) => goalId !== id)
          : [...state.onboarding.releasedGoalIds, id],
        selectedFocusGoalIds: state.onboarding.selectedFocusGoalIds.filter((goalId) => goalId !== id)
      }
    });
  },

  toggleFocusGoal: (id) => {
    const state = get();
    const selected = state.onboarding.selectedFocusGoalIds.includes(id);
    if (!selected && state.onboarding.selectedFocusGoalIds.length >= 3) return;
    const selectedFocusGoalIds = selected
      ? state.onboarding.selectedFocusGoalIds.filter((goalId) => goalId !== id)
      : [...state.onboarding.selectedFocusGoalIds, id];
    const weeklyAllocations = defaultWeeklyTargets(selectedFocusGoalIds);
    withPersist(set, get, {
      onboarding: {
        ...state.onboarding,
        selectedFocusGoalIds,
        weeklyAllocations
      }
    });
  },

  setSeasonDuration: (days) => {
    const state = get();
    const start = getTodayDateString();
    withPersist(set, get, {
      onboarding: {
        ...state.onboarding,
        seasonDurationDays: days,
        customDurationDays: [7, 30, 90].includes(days) ? undefined : days,
        seasonStartDate: start,
        seasonEndDate: addDaysToDate(start, days - 1)
      }
    });
  },

  setKeystoneAction: (goalId, action) => {
    const state = get();
    withPersist(set, get, {
      onboarding: {
        ...state.onboarding,
        keystoneActions: { ...state.onboarding.keystoneActions, [goalId]: action }
      }
    });
  },

  setWeeklyMode: (mode) => {
    const state = get();
    withPersist(set, get, {
      onboarding: { ...state.onboarding, weeklyMode: mode }
    });
  },

  setWeeklyAllocation: (goalId, targetCount) => {
    const state = get();
    const allocations = state.onboarding.weeklyAllocations;
    const exists = allocations.some((alloc) => alloc.goalId === goalId);
    let newAllocations;
    if (exists) {
      newAllocations = allocations.map((allocation) =>
        allocation.goalId === goalId
          ? { ...allocation, targetCount: Math.max(1, targetCount) }
          : allocation
      );
    } else {
      newAllocations = [
        ...allocations,
        { goalId, targetCount: Math.max(1, targetCount), completedCount: 0 }
      ];
    }
    withPersist(set, get, {
      onboarding: {
        ...state.onboarding,
        weeklyAllocations: newAllocations
      }
    });
  },

  createSeasonFromOnboarding: () => {
    const state = get();
    const onboarding = state.onboarding;
    const timestamp = nowIso();
    const seasonId = createId("season");
    const focusDrafts = onboarding.selectedFocusGoalIds
      .map((id) => onboarding.goalDrafts.find((goal) => goal.id === id))
      .filter((goal): goal is NonNullable<typeof goal> => Boolean(goal));
    const goals: Goal[] = focusDrafts.map((draft, index) => ({
      id: draft.id,
      seasonId,
      title: draft.title.trim(),
      keystoneAction: onboarding.keystoneActions[draft.id]?.trim() || "Stay with one thing",
      priority: (index + 1) as 1 | 2 | 3,
      weeklyTargetCount:
        onboarding.weeklyAllocations.find((allocation) => allocation.goalId === draft.id)
          ?.targetCount ?? defaultWeeklyTargets(focusDrafts.map((goal) => goal.id))[index].targetCount,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp
    }));
    const badHabits: BadHabit[] = onboarding.selectedHabits.map((habit) => ({
      id: habit.id,
      seasonId,
      name: habit.customName || habit.name,
      category: habit.category,
      frictionActions: onboarding.frictionActions[habit.id] ?? [],
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp
    }));
    const season = {
      id: seasonId,
      name: "Zendo Season I",
      startDate: onboarding.seasonStartDate,
      endDate: onboarding.seasonEndDate,
      durationDays: onboarding.seasonDurationDays,
      status: "active" as const,
      mode: onboarding.weeklyMode,
      goalIds: goals.map((goal) => goal.id),
      badHabitIds: badHabits.map((habit) => habit.id),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const weeklyPlan: WeeklyPlan = {
      id: createId("week"),
      seasonId,
      weekNumber: 1,
      startDate: onboarding.seasonStartDate,
      endDate: addDaysToDate(onboarding.seasonStartDate, 6),
      mode: onboarding.weeklyMode,
      goalAllocations:
        onboarding.weeklyAllocations.length > 0
          ? onboarding.weeklyAllocations
          : defaultWeeklyTargets(goals.map((goal) => goal.id)),
      restDayTarget: 1,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const planningSequence = buildPlanningSequence(weeklyPlan.goalAllocations);
    const dayPlans =
      onboarding.weeklyMode === "planning"
        ? datesInRange(weeklyPlan.startDate, 7).map<DayPlan>((date, index) => {
            const theme = planningSequence[index] ?? "rest";
            const goal = goals.find((item) => item.id === theme);
            return {
              id: createId("day"),
              seasonId,
              weeklyPlanId: weeklyPlan.id,
              date,
              dayType: theme === "rest" ? "rest" : "goal",
              goalId: theme === "rest" ? undefined : theme,
              mainAction: goal?.keystoneAction,
              status: "planned",
              createdAt: timestamp,
              updatedAt: timestamp
            };
          })
        : [];
    const seasonStartedEvent: TimelineEvent = {
      id: createId("event"),
      type: "season_started",
      seasonId,
      sourceId: seasonId,
      title: "Season Started",
      description: `Committed to Zendo Season I for ${onboarding.seasonDurationDays} days.`,
      occurredAt: timestamp,
      createdAt: timestamp
    };

    const goalCreatedEvents: TimelineEvent[] = goals.map((g) => ({
      id: createId("event"),
      type: "goal_created",
      seasonId,
      relatedGoalId: g.id,
      sourceId: g.id,
      title: "Goal Created",
      description: `Set focus goal: "${g.title}" with keystone action: "${g.keystoneAction}"`,
      occurredAt: timestamp,
      createdAt: timestamp
    }));

    withPersist(set, get, {
      userProfile: {
        id: createId("user"),
        onboardingCompleted: true,
        activeSeasonId: seasonId,
        createdAt: timestamp,
        updatedAt: timestamp
      },
      appSettings: {
        ...state.appSettings,
        greyModeGuideCompleted: onboarding.greyModeConfirmed,
        weeklyMode: onboarding.weeklyMode,
        updatedAt: timestamp
      },
      activeSeason: season,
      goals: [...state.goals, ...goals],
      badHabits: [...state.badHabits, ...badHabits],
      weeklyPlans: [...state.weeklyPlans, weeklyPlan],
      dayPlans: [...state.dayPlans, ...dayPlans],
      timelineEvents: [...state.timelineEvents, seasonStartedEvent, ...goalCreatedEvents],
      onboarding: createDefaultOnboarding()
    });
  },

  getOrCreateCurrentWeeklyPlan: () => {
    const { weeklyPlan, state } = getOrCreateWeekState(snapshot(get()));
    withPersist(set, get, state);
    return weeklyPlan;
  },

  createOrUpdateDayPlan: (dateString, input) => {
    const current = get();
    let base = snapshot(current);
    const createdWeek = getOrCreateWeekState(base, dateString);
    base = createdWeek.state;
    const season = base.activeSeason;
    const weeklyPlan = createdWeek.weeklyPlan;
    if (!season || !weeklyPlan) return;
    const goal = input.goalId ? base.goals.find((item) => item.id === input.goalId) : undefined;
    const existing = base.dayPlans.find((day) => day.seasonId === season.id && day.date === dateString);
    const timestamp = nowIso();
    const dayPlan: DayPlan = {
      id: existing?.id ?? createId("day"),
      seasonId: season.id,
      weeklyPlanId: weeklyPlan.id,
      date: dateString,
      dayType: input.dayType,
      goalId: input.dayType === "goal" ? input.goalId : undefined,
      mainAction: input.dayType === "goal" ? (input.mainAction !== undefined ? input.mainAction : (existing?.mainAction ?? goal?.keystoneAction)) : undefined,
      energyLevel: input.energyLevel ?? existing?.energyLevel,
      status: input.status ?? (existing?.status ?? "active"),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };
    let next: MonkMVPState = {
      ...base,
      dayPlans: existing
        ? base.dayPlans.map((day) => (day.id === existing.id ? dayPlan : day))
        : [...base.dayPlans, dayPlan]
    };
    next = { ...next, weeklyPlans: updateAllocationCounts(next, weeklyPlan.id) };
    next = { ...next, timelineDays: updatedTimelineDays(next, dayPlan) };
    withPersist(set, get, next);
  },

  clearDayPlan: (dateString) => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return;
    const existing = state.dayPlans.find((day) => day.seasonId === season.id && day.date === dateString);
    if (!existing) return;

    const dayPlans = state.dayPlans.filter((day) => day.id !== existing.id);
    let next: MonkMVPState = {
      ...snapshot(state),
      dayPlans
    };
    next = { ...next, weeklyPlans: updateAllocationCounts(next, existing.weeklyPlanId) };
    const timelineDays = state.timelineDays.filter((day) => day.date !== dateString);
    next = { ...next, timelineDays };
    withPersist(set, get, next);
  },

  toggleTodayCompletion: () => {
    const state = get();
    const plan = findTodayPlan(state);
    if (!plan) return;
    const timestamp = nowIso();
    const isCompleted = plan.status === "completed";
    const nextStatus = isCompleted ? "active" : "completed";
    const dayPlan = { ...plan, status: nextStatus as any, updatedAt: timestamp };
    const base: MonkMVPState = {
      ...snapshot(state),
      dayPlans: state.dayPlans.map((day) => (day.id === dayPlan.id ? dayPlan : day))
    };
    const next: MonkMVPState = {
      ...base,
      weeklyPlans: updateAllocationCounts(base, dayPlan.weeklyPlanId),
      timelineDays: updatedTimelineDays(base, dayPlan)
    };
    withPersist(set, get, next);
  },

  updateTodayEnergy: (energyLevel) => {
    const state = get();
    const plan = findTodayPlan(state);
    if (!plan) return;
    const dayPlan = { ...plan, energyLevel, updatedAt: nowIso() };
    withPersist(set, get, {
      dayPlans: state.dayPlans.map((day) => (day.id === dayPlan.id ? dayPlan : day))
    });
  },

  completeTodayMainAction: () => {
    const state = get();
    const plan = findTodayPlan(state);
    if (!plan) return;
    const dayPlan = { ...plan, status: "completed" as const, updatedAt: nowIso() };
    const base: MonkMVPState = {
      ...snapshot(state),
      dayPlans: state.dayPlans.map((day) => (day.id === dayPlan.id ? dayPlan : day))
    };
    const next: MonkMVPState = {
      ...base,
      weeklyPlans: updateAllocationCounts(base, dayPlan.weeklyPlanId),
      timelineDays: updatedTimelineDays(base, dayPlan)
    };
    withPersist(set, get, next);
  },

  startFocusSession: (preset = "deep_work", customMinutes = 50) => {
    const state = get();
    const plan = findTodayPlan(state);
    if (!plan || !state.activeSeason) return undefined;
    const timestamp = nowIso();
    const safeCustomMinutes = Math.max(5, Math.round(customMinutes || 50));
    const phases = createFocusPhases(preset, safeCustomMinutes);
    const plannedDurationMinutes = getTotalPlannedMinutes(phases);
    const focusDurationMinutes = phases
      .filter((phase) => phase.type === "focus")
      .reduce((sum, phase) => sum + phase.plannedMinutes, 0);
    const totalFocusBlocks = phases.filter((phase) => phase.type === "focus").length;
    const totalBreakBlocks = phases.filter((phase) => phase.type === "break").length;
    const session: FocusSession = {
      id: createId("focus"),
      seasonId: state.activeSeason.id,
      weeklyPlanId: plan.weeklyPlanId,
      dayPlanId: plan.id,
      goalId: plan.goalId,
      startTime: timestamp,
      durationMinutes: focusDurationMinutes,
      status: "running",
      timerMode: preset,
      timerState: phases[0]?.type === "break" ? "break" : "work",
      elapsedSeconds: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      startedAt: timestamp,
      plannedDurationMinutes,
      actionId: plan.mainAction || null,
      preset,
      completedDurationMinutes: 0,
      focusDurationMinutes: 0,
      breakDurationMinutes: 0,
      completedFocusBlocks: 0,
      completedBreakBlocks: 0,
      totalFocusBlocks,
      totalBreakBlocks,
      currentPhaseIndex: 0,
      phases
    };
    const dayPlan = { ...plan, status: "active" as const, updatedAt: timestamp };
    withPersist(set, get, {
      focusSessions: [...state.focusSessions, session],
      dayPlans: state.dayPlans.map((day) => (day.id === dayPlan.id ? dayPlan : day))
    });
    return session;
  },

  tickFocusSession: (sessionId, elapsedSeconds) => {
    set((state) => ({
      focusSessions: state.focusSessions.map((session) =>
        session.id === sessionId ? { ...session, elapsedSeconds, updatedAt: nowIso() } : session
      )
    }));
  },

  resetFocusSession: (sessionId) => {
    const state = get();
    const session = state.focusSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const timestamp = nowIso();
    const preset = session.preset ?? session.timerMode ?? "deep_work";
    const phases = createFocusPhases(preset, session.durationMinutes);
    const plannedDurationMinutes = getTotalPlannedMinutes(phases);
    const totalFocusBlocks = phases.filter((phase) => phase.type === "focus").length;
    const totalBreakBlocks = phases.filter((phase) => phase.type === "break").length;

    withPersist(set, get, {
      focusSessions: state.focusSessions.map((item) =>
        item.id === sessionId
          ? {
              ...item,
              status: "running" as const,
              startTime: timestamp,
              startedAt: timestamp,
              endTime: undefined,
              endedAt: undefined,
              plannedDurationMinutes,
              actualDurationSeconds: undefined,
              timerState: phases[0]?.type === "break" ? "break" : "work",
              elapsedSeconds: 0,
              completedDurationMinutes: 0,
              focusDurationMinutes: 0,
              breakDurationMinutes: 0,
              completedFocusBlocks: 0,
              completedBreakBlocks: 0,
              totalFocusBlocks,
              totalBreakBlocks,
              currentPhaseIndex: 0,
              phases,
              updatedAt: timestamp
            }
          : item
      )
    });
  },

  advanceFocusPhase: (sessionId) => {
    const state = get();
    const session = state.focusSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const phases = session.phases?.length
      ? session.phases
      : createFocusPhases(session.preset ?? session.timerMode ?? "deep_work", session.durationMinutes);
    const currentIndex = session.currentPhaseIndex ?? 0;
    const nextIndex = currentIndex + 1;
    const updatedPhases = phases.map((phase, index) => {
      if (index === currentIndex) {
        return { ...phase, completedMinutes: phase.plannedMinutes, status: "completed" as const };
      }
      if (index === nextIndex) {
        return { ...phase, status: "running" as const };
      }
      return phase;
    });
    const currentPhase = updatedPhases[nextIndex];
    const completedFocusBlocks = updatedPhases.filter((phase) => phase.type === "focus" && phase.status === "completed").length;
    const completedBreakBlocks = updatedPhases.filter((phase) => phase.type === "break" && phase.status === "completed").length;
    withPersist(set, get, {
      focusSessions: state.focusSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              startTime: nowIso(),
              timerState: currentPhase?.type === "break" ? "break" : "work",
              elapsedSeconds: 0,
              currentPhaseIndex: nextIndex,
              phases: updatedPhases,
              completedFocusBlocks,
              completedBreakBlocks,
              updatedAt: nowIso()
            }
          : session
      )
    });
  },

  pauseFocusSession: (sessionId) => {
    const state = get();
    const session = state.focusSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const currentPhase = getCurrentFocusPhase(session);
    const targetSeconds = currentPhase.plannedMinutes * 60;
    const elapsed = Math.min(
      targetSeconds,
      Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000)
    );
    withPersist(set, get, {
      focusSessions: state.focusSessions.map((s) =>
        s.id === sessionId
          ? { ...s, status: "paused", elapsedSeconds: elapsed, updatedAt: nowIso() }
          : s
      )
    });
  },

  resumeFocusSession: (sessionId) => {
    const state = get();
    const session = state.focusSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const adjustedStart = new Date(Date.now() - (session.elapsedSeconds || 0) * 1000).toISOString();
    withPersist(set, get, {
      focusSessions: state.focusSessions.map((s) =>
        s.id === sessionId
          ? { ...s, status: "running", startTime: adjustedStart, updatedAt: nowIso() }
          : s
      )
    });
  },

  completeFocusSession: (sessionId, completeMainAction = false) => {
    const state = get();
    const session = state.focusSessions.find((item) => item.id === sessionId);
    if (!session) return;
    const endTimestamp = nowIso();
    const phases = session.phases?.length
      ? session.phases
      : createFocusPhases(session.preset ?? session.timerMode ?? "deep_work", session.durationMinutes);
    const completedPhases = phases.map((phase) => ({
      ...phase,
      completedMinutes: phase.plannedMinutes,
      status: "completed" as const
    }));
    const completedSession = { ...session, phases: completedPhases, currentPhaseIndex: phases.length - 1 };
    const summary = summarizeFocusSession(completedSession, endTimestamp, "completed");
    const actualDurationSeconds = summary.completedDurationMinutes * 60;

    const focusSessions = state.focusSessions.map((item) =>
      item.id === sessionId
        ? {
            ...item,
            status: "completed" as const,
            endTime: endTimestamp,
            endedAt: endTimestamp,
            completedAt: endTimestamp,
            durationMinutes: summary.focusDurationMinutes,
            actualDurationSeconds,
            totalDurationSeconds: summary.totalDurationSeconds,
            focusDurationSeconds: summary.focusDurationSeconds,
            breakDurationSeconds: summary.breakDurationSeconds,
            segmentsCompleted: summary.segmentsCompleted,
            expectedTotalDurationSeconds: summary.expectedTotalDurationSeconds,
            expectedFocusDurationSeconds: summary.expectedFocusDurationSeconds,
            expectedBreakDurationSeconds: summary.expectedBreakDurationSeconds,
            expectedSegmentsCompleted: summary.expectedSegmentsCompleted,
            completedDurationMinutes: summary.completedDurationMinutes,
            focusDurationMinutes: summary.focusDurationMinutes,
            breakDurationMinutes: summary.breakDurationMinutes,
            completedFocusBlocks: summary.completedFocusBlocks,
            completedBreakBlocks: summary.completedBreakBlocks,
            totalFocusBlocks: summary.totalFocusBlocks,
            totalBreakBlocks: summary.totalBreakBlocks,
            phases: summary.phases,
            updatedAt: endTimestamp
          }
        : item
    );

    const goal = state.goals.find((g) => g.id === session.goalId);
    const event: TimelineEvent = {
      id: createId("event"),
      type: "focus_session",
      seasonId: state.activeSeason?.id,
      relatedGoalId: session.goalId || null,
      sourceId: sessionId,
      title: `${FOCUS_PRESETS[summary.preset].shortLabel} completed`,
      description: formatFocusSessionTimelineDescription(summary, goal ? `Moved forward: ${goal.title}` : undefined),
      occurredAt: endTimestamp,
      createdAt: endTimestamp,
      focusSession: summary
    };

    const plan = state.dayPlans.find((day) => day.id === session.dayPlanId);
    if (!plan) {
      withPersist(set, get, {
        focusSessions,
        timelineEvents: [...state.timelineEvents, event]
      });
      return;
    }
    const provisionalBase: MonkMVPState = {
      ...snapshot(state),
      focusSessions
    };
    const timelineStatus = deriveTimelineStatus(provisionalBase, plan);
    const dayPlan = {
      ...plan,
      status: timelineStatus === "completed" ? ("completed" as const) : ("active" as const),
      updatedAt: nowIso()
    };
    const base: MonkMVPState = {
      ...snapshot(state),
      focusSessions,
      dayPlans: state.dayPlans.map((day) => (day.id === dayPlan.id ? dayPlan : day))
    };
    withPersist(set, get, {
      ...base,
      weeklyPlans: updateAllocationCounts(base, dayPlan.weeklyPlanId),
      timelineDays: updatedTimelineDays(base, dayPlan),
      timelineEvents: [...state.timelineEvents, event]
    });
  },

  abandonFocusSession: (sessionId) => {
    const state = get();
    const session = state.focusSessions.find((s) => s.id === sessionId);
    if (!session) return;

    const currentPhase = getCurrentFocusPhase(session);
    const elapsedSeconds = Math.min(
      currentPhase.plannedMinutes * 60,
      session.elapsedSeconds || Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000)
    );
    const endTimestamp = nowIso();
    const summary = summarizeFocusSession(session, endTimestamp, "ended_early", elapsedSeconds);
    const focusSessions = state.focusSessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            status: "ended_early" as const,
            endTime: endTimestamp,
            endedAt: endTimestamp,
            actualDurationSeconds: summary.completedDurationMinutes * 60,
            totalDurationSeconds: summary.totalDurationSeconds,
            focusDurationSeconds: summary.focusDurationSeconds,
            breakDurationSeconds: summary.breakDurationSeconds,
            segmentsCompleted: summary.segmentsCompleted,
            expectedTotalDurationSeconds: summary.expectedTotalDurationSeconds,
            expectedFocusDurationSeconds: summary.expectedFocusDurationSeconds,
            expectedBreakDurationSeconds: summary.expectedBreakDurationSeconds,
            expectedSegmentsCompleted: summary.expectedSegmentsCompleted,
            durationMinutes: summary.focusDurationMinutes,
            completedDurationMinutes: summary.completedDurationMinutes,
            focusDurationMinutes: summary.focusDurationMinutes,
            breakDurationMinutes: summary.breakDurationMinutes,
            completedFocusBlocks: summary.completedFocusBlocks,
            completedBreakBlocks: summary.completedBreakBlocks,
            totalFocusBlocks: summary.totalFocusBlocks,
            totalBreakBlocks: summary.totalBreakBlocks,
            phases: summary.phases,
            updatedAt: endTimestamp
          }
        : s
    );

    const event: TimelineEvent = {
      id: createId("event"),
      type: "focus_session",
      seasonId: state.activeSeason?.id,
      relatedGoalId: session.goalId || null,
      sourceId: sessionId,
      title: `${FOCUS_PRESETS[summary.preset].shortLabel} ended early`,
      description: formatFocusSessionTimelineDescription(summary, "saved"),
      occurredAt: endTimestamp,
      createdAt: endTimestamp,
      focusSession: summary
    };

    const plan = state.dayPlans.find((day) => day.id === session.dayPlanId);
    const base: MonkMVPState = { ...snapshot(state), focusSessions };
    withPersist(set, get, {
      focusSessions,
      timelineDays: plan ? updatedTimelineDays(base, plan) : state.timelineDays,
      timelineEvents: [...state.timelineEvents, event]
    });
  },

  saveLearningEntry: (input) => {
    const state = get();
    if (!state.activeSeason || !input.title.trim()) return;
    const plan = findTodayPlan(state);
    const timestamp = nowIso();
    const entry: LearningEntry = {
      id: createId("learning"),
      seasonId: state.activeSeason.id,
      weeklyPlanId: plan?.weeklyPlanId ?? "",
      dayPlanId: plan?.id ?? "",
      goalId: input.goalId !== undefined ? (input.goalId || undefined) : plan?.goalId,
      type: input.type,
      title: input.title.trim(),
      durationMinutes: input.durationMinutes,
      keyInsight: input.keyInsight,
      actionTakeaway: input.actionTakeaway,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const base = { ...snapshot(state), learningEntries: [...state.learningEntries, entry] };
    withPersist(set, get, {
      learningEntries: base.learningEntries,
      timelineDays: plan ? updatedTimelineDays(base, plan) : state.timelineDays
    });
  },

  saveJournalEntry: (answers) => {
    const state = get();
    const plan = findTodayPlan(state);
    if (!state.activeSeason || !plan) return;
    const timestamp = nowIso();
    const today = getTodayDateString();
    const existing = state.journalEntries.find(
      (entry) => entry.seasonId === state.activeSeason?.id && entry.date === today
    );
    const entry = {
      id: existing?.id ?? createId("journal"),
      seasonId: state.activeSeason.id,
      weeklyPlanId: plan.weeklyPlanId,
      dayPlanId: plan.id,
      date: today,
      answers,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };
    const journalEntries = existing
      ? state.journalEntries.map((item) => (item.id === existing.id ? entry : item))
      : [...state.journalEntries, entry];

    // Create journal entry timeline event
    const event: TimelineEvent = {
      id: createId("event"),
      type: "journal_entry",
      seasonId: state.activeSeason?.id,
      sourceId: entry.id,
      title: "Wrote journal reflection",
      description: answers.whatMovedToday || "Closed the day with reflection.",
      occurredAt: timestamp,
      createdAt: timestamp
    };
    const updatedEvents = state.timelineEvents.filter((ev) => ev.sourceId !== entry.id);

    const base = { ...snapshot(state), journalEntries };
    withPersist(set, get, {
      journalEntries,
      timelineDays: updatedTimelineDays(base, plan),
      timelineEvents: [...updatedEvents, event]
    });
  },

  saveRelapseLog: (input) => {
    const state = get();
    const plan = findTodayPlan(state);
    if (!state.activeSeason) return;
    const timestamp = nowIso();
    const entry: RelapseLog = {
      id: createId("relapse"),
      seasonId: state.activeSeason.id,
      weeklyPlanId: plan?.weeklyPlanId,
      dayPlanId: plan?.id,
      date: getTodayDateString(),
      trigger: input.trigger,
      note: input.note,
      recoveryAction: input.recoveryAction,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const relapseLogs = [...state.relapseLogs, entry];
    const base = { ...snapshot(state), relapseLogs };
    withPersist(set, get, {
      relapseLogs,
      timelineDays: plan ? updatedTimelineDays(base, plan) : state.timelineDays
    });
  },

  archiveSeason: () => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return;
    const timestamp = nowIso();
    const event: TimelineEvent = {
      id: createId("event"),
      type: "season_completed",
      seasonId: season.id,
      sourceId: season.id,
      title: "Season Completed",
      description: `Completed Zendo Season: "${season.name}"`,
      occurredAt: timestamp,
      createdAt: timestamp
    };
    withPersist(set, get, {
      activeSeason: { ...season, status: "archived", updatedAt: timestamp },
      userProfile: state.userProfile
        ? { ...state.userProfile, activeSeasonId: undefined, updatedAt: timestamp }
        : state.userProfile,
      timelineEvents: [...state.timelineEvents, event]
    });
  },

  startNewSeason: () => {
    const state = get();
    const timestamp = nowIso();
    withPersist(set, get, {
      activeSeason: state.activeSeason
        ? { ...state.activeSeason, status: "archived", updatedAt: timestamp }
        : null,
      userProfile: state.userProfile
        ? { ...state.userProfile, onboardingCompleted: false, activeSeasonId: undefined }
        : null,
      onboarding: createDefaultOnboarding()
    });
  },

  saveLearningSession: (session) => {
    const state = get();
    const timestamp = nowIso();
    const goal = session.relatedGoalId ? state.goals.find((g) => g.id === session.relatedGoalId) : null;
    const durationMin = Math.round(session.actualDurationSeconds / 60);
    const sessionDate = (session.endedAt ?? session.startedAt).slice(0, 10);
    const plan = state.dayPlans.find(
      (day) => day.seasonId === session.seasonId && day.date === sessionDate
    );
    const learningSessions = [...state.learningSessions, session];

    const event: TimelineEvent = {
      id: createId("event"),
      type: "learning_session",
      seasonId: state.activeSeason?.id,
      relatedGoalId: session.relatedGoalId || null,
      sourceId: session.id,
      title: `Learned for ${durationMin} minutes`,
      description: `From ${session.sourceTitle || "External Source"}${goal ? ` · Connected to: ${goal.title}` : ""}${session.lesson ? ` · Key lesson: ${session.lesson}` : ""}`,
      occurredAt: session.endedAt || timestamp,
      createdAt: timestamp
    };

    if (plan) {
      const base: MonkMVPState = { ...snapshot(state), learningSessions };
      const timelineStatus = deriveTimelineStatus(base, plan);
      const dayPlan = {
        ...plan,
        status: timelineStatus === "completed" ? ("completed" as const) : ("active" as const),
        updatedAt: timestamp
      };
      const baseWithDayPlan: MonkMVPState = {
        ...base,
        dayPlans: state.dayPlans.map((day) => (day.id === dayPlan.id ? dayPlan : day))
      };
      withPersist(set, get, {
        learningSessions,
        dayPlans: baseWithDayPlan.dayPlans,
        timelineDays: updatedTimelineDays(baseWithDayPlan, dayPlan),
        timelineEvents: [...state.timelineEvents, event]
      });
      return;
    }

    withPersist(set, get, {
      learningSessions,
      timelineEvents: [...state.timelineEvents, event]
    });
  },

  addTimelineEvent: (event) => {
    const state = get();
    withPersist(set, get, {
      timelineEvents: [...state.timelineEvents, event]
    });
  },

  updateSettings: (patch) => {
    const state = get();
    withPersist(set, get, {
      appSettings: { ...state.appSettings, ...patch, updatedAt: nowIso() }
    });
  }
}));
