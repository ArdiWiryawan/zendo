import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deleteImage } from "../lib/imageStore";
import {
  createDefaultOnboarding,
  createDefaultReminders,
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
import { parseIntention } from "../lib/implementationIntention";
import { loadState } from "../lib/storage";
import { stopMusic } from "../lib/focusMusic";
import { t } from "../i18n";
import type {
  AppSettings,
  BadHabit,
  BadHabitCategory,
  BadHabitDraft,
  DateOnlyString,
  DayPlan,
  EnergyLevel,
  EnergyLog,
  FocusSession,
  Goal,
  GoalAllocation,
  JournalAnswers,
  JournalPackAnswer,
  LearningEntry,
  LearningType,
  LearningSession,
  LearningSourceType,
  NotebookCategory,
  NotebookEntry,
  NotificationReminder,
  TimelineEvent,
  TimelineEventType,
  FocusSessionPreset,
  MonkMVPState,
  OnboardingState,
  RelapseLog,
  ReleasedSeasonGoal,
  Season,
  SeasonWhy,
  TimelineDay,
  TimelineStatus,
  WeeklyMode,
  WeeklyPlan,
  WeeklyReviewDecision
} from "../types/app";

type StoreSnapshot = MonkMVPState;

type PickTodayInput = {
  goalId?: string;
  dayType: "goal" | "rest";
  energyLevel?: EnergyLevel;
  mainAction?: string;
  highlight?: string;
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
  reflection?: string;
  recoveryAction?: string;
  date?: DateOnlyString;
};

type MonkActions = {
  hydrate: () => void;
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
  setObstacleMitigation: (goalId: string, mitigation: string) => void;
  setWeeklyMode: (mode: WeeklyMode) => void;
  setWeeklyAllocation: (goalId: string, targetCount: number) => void;
  createSeasonFromOnboarding: () => void;
  getOrCreateCurrentWeeklyPlan: () => WeeklyPlan | undefined;
  createOrUpdateDayPlan: (dateString: string, input: PickTodayInput) => void;
  clearDayPlan: (dateString: string) => void;
  toggleTodayCompletion: () => void;
  setTodayHighlight: (highlight: string) => void;
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
  bumpFocusDistraction: (sessionId: string) => void;
  saveLearningEntry: (input: LearningInput) => void;
  saveLearningSession: (session: LearningSession) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  saveJournalEntry: (answers: JournalAnswers, opts?: { date?: string; tab?: "morning" | "reflection" }) => void;
  saveRelapseLog: (input: RelapseInput) => void;
  archiveSeason: () => void;
  startNewSeason: () => void;
  resumeSeason: () => void;
  updateSeasonWhy: (why: SeasonWhy) => void;
  updateGoalWhy: (goalId: string, why: string) => void;
  releaseGoalFromSeason: (goalId: string, note?: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateReminder: (id: string, patch: Partial<NotificationReminder>) => void;
  resetReminders: () => void;
  importState: (data: Partial<MonkMVPState>) => void;

  // Weekly re-decide review
  reviewWeek: (weekId: string, decisions: Record<string, WeeklyReviewDecision>, opts?: { skipped?: boolean }) => void;
  skipWeekReview: (weekId: string) => void;
  updateGoalKeystoneAction: (goalId: string, action: string) => void;

  // Notebook actions
  addNotebookCategory: (name: string, icon?: string) => void;
  renameNotebookCategory: (id: string, name: string) => void;
  deleteNotebookCategory: (id: string) => void;
  saveNotebookEntry: (entry: NotebookEntry) => void;
  deleteNotebookEntry: (id: string) => void;
  togglePinNotebookEntry: (id: string) => void;

  // Energy tracking
  logEnergy: (level: EnergyLevel) => void;

  // Journal Pack actions
  startJournalPack: (packId: string) => string | undefined;
  savePackAnswer: (sessionId: string, questionId: string, answer: string) => void;
  completeJournalPack: (sessionId: string) => void;
  purchasePack: (packId: string) => void;
  syncPurchases: () => Promise<void>;
};

export type MonkStore = StoreSnapshot & MonkActions;

// ponytail: snapshot kept as internal helper for state construction; persist middleware handles localStorage writes
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
    timelineEvents: state.timelineEvents,
    notebookCategories: state.notebookCategories,
    notebookEntries: state.notebookEntries,
    journalPacks: state.journalPacks,
    journalPackSessions: state.journalPackSessions,
    purchasedPackIds: state.purchasedPackIds,
    energyLogs: state.energyLogs,
    weeklyReviews: state.weeklyReviews,
    releasedSeasonGoals: state.releasedSeasonGoals,
    pastSeasons: state.pastSeasons
  };
}

// Idempotent — a season is archived into pastSeasons at most once (by id), so
// re-running archiveSeason/startNewSeason never duplicates it.
function archiveIntoPastSeasons(state: MonkMVPState, archived: Season): Season[] {
  return state.pastSeasons.some((s) => s.id === archived.id)
    ? state.pastSeasons
    : [...state.pastSeasons, archived];
}

function getActiveGoals(state: MonkMVPState) {
  const season = state.activeSeason;
  if (!season) return [];
  // Legacy goals may predate seasonId (and weeklyTargetCount); with a single
  // active season they belong to it — otherwise the Today picker silently dies.
  return state.goals.filter(
    (goal) => goal.status === "active" && (goal.seasonId === season.id || !goal.seasonId)
  );
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
  if (dayPlan.status === "completed" || dayPlan.status === "planned") return "partial";
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
  const journalCompleted = state.journalEntries.some(
    (entry) =>
      entry.dayPlanId === dayPlan.id ||
      (entry.seasonId === dayPlan.seasonId && entry.date === dayPlan.date)
  );
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
  if (existing) {
    // Self-heal: a plan whose allocations were lost (legacy data, orphan goals)
    // is re-seeded from the active goals so the Today picker never runs dry.
    if (existing.goalAllocations.length === 0 && getActiveGoals(state).length > 0) {
      const healed = {
        ...existing,
        goalAllocations: getActiveGoals(state).map((g) => ({
          goalId: g.id,
          targetCount: g.weeklyTargetCount > 0 ? g.weeklyTargetCount : 1,
          completedCount: 0
        })),
        updatedAt: nowIso()
      };
      return { weeklyPlan: healed, state: { ...state, weeklyPlans: state.weeklyPlans.map((p) => (p.id === existing.id ? healed : p)) } };
    }
    return { weeklyPlan: existing, state };
  }

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
      targetCount: g.weeklyTargetCount > 0 ? g.weeklyTargetCount : 1,
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

export const useMonkStore = create<MonkStore>()(
  persist(
    (set, get) => ({
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
        (stored.goals ?? []).forEach((g) => {
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
        (stored.journalEntries ?? []).forEach((j) => {
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
            const goal = (stored.goals ?? []).find((g) => g.id === s.goalId);
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

      const fresh = createInitialState();

      // Data recovery: reconstruct pastSeasons from orphaned seasonIds if the
      // Season envelope was lost before the pastSeasons array was implemented.
      let pastSeasons = stored.pastSeasons ?? [];
      const knownSeasonIds = new Set([stored.activeSeason?.id, ...pastSeasons.map((s) => s.id)].filter(Boolean));

      const allOrphanedIds = new Set<string>();
      (stored.goals ?? []).forEach((g) => { if (g.seasonId && !knownSeasonIds.has(g.seasonId)) allOrphanedIds.add(g.seasonId); });
      (focusSessions ?? []).forEach((s) => { if (s.seasonId && !knownSeasonIds.has(s.seasonId)) allOrphanedIds.add(s.seasonId); });

      if (allOrphanedIds.size > 0) {
        const recovered = Array.from(allOrphanedIds).map((id) => {
          // Derive a rough start/end date from the orphaned day plans or sessions
          const days = (stored.dayPlans ?? []).filter((d) => d.seasonId === id).map((d) => d.date).sort();
          const start = days[0] || "2026-01-01";
          const end = days[days.length - 1] || start;
          const durationDays = days.length || 30;
          return {
            id,
            name: "Recovered Season",
            startDate: start,
            endDate: end,
            durationDays,
            status: "archived" as const,
            mode: "planning" as const,
            goalIds: (stored.goals ?? []).filter((g) => g.seasonId === id).map((g) => g.id),
            badHabitIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        });
        pastSeasons = [...pastSeasons, ...recovered];
      }

      set({
        ...fresh,
        ...stored,
        pastSeasons,
        // Always use latest pack definitions (stale localStorage must not overwrite)
        journalPacks: fresh.journalPacks,
        purchasedPackIds: stored.purchasedPackIds ?? [],
        weeklyReviews: stored.weeklyReviews ?? {},
        releasedSeasonGoals: stored.releasedSeasonGoals ?? [],
        focusSessions,
        timelineDays,
        timelineEvents,
        appSettings: {
          ...fresh.appSettings,
          ...stored.appSettings
        },
        onboarding: {
          ...createDefaultOnboarding(),
          ...stored.onboarding
        },
        // Seed habit cues on first run / legacy states (empty array → defaults).
        // Keeps id+type identity so updateReminder/sync merge never dupe a type.
        notificationReminders:
          Array.isArray(stored.notificationReminders) && stored.notificationReminders.length > 0
            ? stored.notificationReminders
            : createDefaultReminders()
      });
    }
  },


  recordOpen: () => {
    const state = get();
    set({
      appSettings: {
        ...state.appSettings,
        openCount: (state.appSettings.openCount ?? 0) + 1,
        updatedAt: nowIso()
      }
    });
  },

  resetApp: () => {
    set(createInitialState());
  },

  ensureSeasonFresh: () => {
    const state = get();
    const season = state.activeSeason;
    if (!season || season.status !== "active" || !isSeasonEnded(season)) return;
    set({
      activeSeason: { ...season, status: "ended", updatedAt: nowIso() }
    });
  },

  updateOnboarding: (patch) => {
    const state = get();
    set({
      onboarding: { ...state.onboarding, ...patch }
    });
  },

  setOnboardingStep: (step) => {
    const state = get();
    set({
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
    set({ onboarding: { ...state.onboarding, selectedHabits, frictionActions } });
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
    set({
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
    set({
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
    set({
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
    set({
      onboarding: {
        ...state.onboarding,
        goalDrafts: [...state.onboarding.goalDrafts, { id: createId("draft_goal"), title: "" }]
      }
    });
  },

  removeGoalDraft: (id) => {
    const state = get();
    set({
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
    set({
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
    set({
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
    set({
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
    set({
      onboarding: {
        ...state.onboarding,
        keystoneActions: { ...state.onboarding.keystoneActions, [goalId]: action }
      }
    });
  },

  setObstacleMitigation: (goalId, mitigation) => {
    const state = get();
    set({
      onboarding: {
        ...state.onboarding,
        obstacleMitigations: { ...state.onboarding.obstacleMitigations, [goalId]: mitigation }
      }
    });
  },

  setWeeklyMode: (mode) => {
    const state = get();
    set({
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
    set({
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
      why: onboarding.goalWhys[draft.id]?.trim() || undefined,
      obstacle: parseIntention(onboarding.obstacleMitigations[draft.id] ?? "")?.when || undefined,
      obstacleMitigation: parseIntention(onboarding.obstacleMitigations[draft.id] ?? "")?.action || undefined,
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
    const identity =
      onboarding.legacyVision.proudChange.trim() ||
      onboarding.identityDraftV1.trim() ||
      onboarding.whyDiscovery.identityStatement.trim();
    const consequence = onboarding.legacyVision.consequenceOfInaction.trim();
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
      antiGoals: onboarding.antiGoals.filter((ag) => ag.trim()),
      obstacles: onboarding.obstacles.filter((ob) => ob.trim()),
      why:
        identity || consequence || onboarding.valueTradeoffs.protect.length
          ? {
              identity,
              consequenceOfInaction: consequence,
              protectValues: onboarding.valueTradeoffs.protect
            }
          : undefined,
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
            void goal;
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

    set({
      // Preserve the previous season's envelope before overwriting activeSeason —
      // otherwise its metadata (name/startDate/endDate) is lost forever.
      pastSeasons: state.activeSeason ? archiveIntoPastSeasons(state, state.activeSeason) : state.pastSeasons,
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
    set(state);
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
      highlight: input.highlight !== undefined ? input.highlight : existing?.highlight,
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
    set(next);
  },

  clearDayPlan: (dateString) => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return;
    const existing = state.dayPlans.find((day) => day.seasonId === season.id && day.date === dateString);
    if (!existing) return;

    const dayPlans = state.dayPlans.filter((day) => day.id !== existing.id);
    const focusSessions = state.focusSessions.filter((session) => session.dayPlanId !== existing.id);
    const learningSessions = state.learningSessions.filter(
      (session) =>
        !(session.seasonId === existing.seasonId && (session.endedAt ?? session.startedAt).slice(0, 10) === dateString)
    );
    const learningEntries = state.learningEntries.filter((entry) => entry.dayPlanId !== existing.id);
    let next: MonkMVPState = {
      ...snapshot(state),
      dayPlans,
      focusSessions,
      learningSessions,
      learningEntries
    };
    next = { ...next, weeklyPlans: updateAllocationCounts(next, existing.weeklyPlanId) };
    // Scope by season — the same calendar date may exist in a previous season's
    // timeline; deleting it there would corrupt history.
    const timelineDays = state.timelineDays.filter(
      (day) => !(day.seasonId === existing.seasonId && day.date === dateString)
    );
    next = { ...next, timelineDays };
    set(next);
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
    set(next);
  },

  setTodayHighlight: (highlight) => {
    const state = get();
    const plan = findTodayPlan(state);
    if (!plan) return;
    const dayPlan = { ...plan, highlight: highlight.trim() || undefined, updatedAt: nowIso() };
    set({
      dayPlans: state.dayPlans.map((day) => (day.id === dayPlan.id ? dayPlan : day))
    });
  },

  updateTodayEnergy: (energyLevel) => {
    const state = get();
    const plan = findTodayPlan(state);
    if (!plan) return;
    const dayPlan = { ...plan, energyLevel, updatedAt: nowIso() };
    set({
      dayPlans: state.dayPlans.map((day) => (day.id === dayPlan.id ? dayPlan : day))
    });
  },

  logEnergy: (level) => {
    const state = get();
    const today = getTodayDateString();
    const existing = state.energyLogs.filter((e) => e.date !== today);
    const log: EnergyLog = {
      id: createId("energy"),
      date: today,
      level,
      createdAt: nowIso(),
    };
    set({
      energyLogs: [...existing, log]
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
    set(next);
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
    set({
      focusSessions: [...state.focusSessions, session],
      dayPlans: state.dayPlans.map((day) => (day.id === dayPlan.id ? dayPlan : day))
    });
    return session;
  },

  tickFocusSession: (sessionId, elapsedSeconds) => {
    const current = snapshot(get());
    const session = current.focusSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const dayPlan = current.dayPlans.find((d) => d.id === session.dayPlanId);
    if (!dayPlan) return;
    set({
      focusSessions: current.focusSessions.map((s) =>
        s.id === sessionId ? { ...s, elapsedSeconds, updatedAt: nowIso() } : s
      ),
      timelineDays: updatedTimelineDays(current, dayPlan)
    });
  },

  resetFocusSession: (sessionId) => {
    const state = get();
    const session = state.focusSessions.find((s) => s.id === sessionId);
    // Guard: never resurrect a session that already ended (completed/ended_early).
    if (!session || (session.status !== "running" && session.status !== "paused")) return;
    const timestamp = nowIso();
    const preset = session.preset ?? session.timerMode ?? "deep_work";
    const phases = createFocusPhases(preset, session.durationMinutes);
    const plannedDurationMinutes = getTotalPlannedMinutes(phases);
    const totalFocusBlocks = phases.filter((phase) => phase.type === "focus").length;
    const totalBreakBlocks = phases.filter((phase) => phase.type === "break").length;

    set({
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
    // Idempotence guard: a tick (interval or visibilitychange) can fire twice for
    // the same phase boundary; once the session left "running" we must not advance
    // again or we'd skip the break / double-complete.
    if (!session || session.status !== "running") return;
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
    set({
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
    if (!session || session.status !== "running") return;
    const currentPhase = getCurrentFocusPhase(session);
    const targetSeconds = currentPhase.plannedMinutes * 60;
    const elapsed = Math.min(
      targetSeconds,
      Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000)
    );
    set({
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
    if (!session || session.status !== "paused") return;
    const currentPhase = getCurrentFocusPhase(session);
    const phaseElapsed = currentPhase.plannedMinutes * 60 - Math.max(0, currentPhase.plannedMinutes * 60 - (session.elapsedSeconds ?? 0));
    const adjustedStart = new Date(Date.now() - phaseElapsed * 1000).toISOString();
    set({
      focusSessions: state.focusSessions.map((s) =>
        s.id === sessionId
          ? { ...s, status: "running" as const, startTime: adjustedStart, elapsedSeconds: phaseElapsed, updatedAt: nowIso() }
          : s
      )
    });
  },

  completeFocusSession: (sessionId, completeMainAction = false) => {
    const state = get();
    const session = state.focusSessions.find((item) => item.id === sessionId);
    // Guard: a stale tick can fire completeFocusSession after the session already
    // completed; without this we'd append a duplicate timeline event + summary.
    if (!session || session.status !== "running") return;
    const endTimestamp = nowIso();
    const phases = session.phases?.length
      ? session.phases
      : createFocusPhases(session.preset ?? session.timerMode ?? "deep_work", session.durationMinutes);
    const currentIndex = session.currentPhaseIndex ?? 0;
    const currentPlannedSeconds = (phases[currentIndex]?.plannedMinutes ?? 0) * 60;
    // Actual elapsed for the phase in progress, clamped to its plan. Without this,
    // an auto-complete that fires after the user stepped away would record the FULL
    // planned duration, inflating focus stats. Prior phases keep their completed
    // minutes (recorded by advanceFocusPhase); unreached phases stay pending.
    const phaseElapsedSeconds = Math.min(
      currentPlannedSeconds,
      Math.max(
        session.elapsedSeconds ?? 0,
        Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000)
      )
    );
    const completedPhases = phases.map((phase, index) => {
      if (index > currentIndex) return phase;
      const completedMinutes =
        index === currentIndex
          ? Math.min(phase.plannedMinutes, Math.floor(phaseElapsedSeconds / 60))
          : phase.completedMinutes;
      return { ...phase, completedMinutes, status: "completed" as const };
    });
    const completedSession = { ...session, phases: completedPhases, currentPhaseIndex: phases.length - 1 };
    const summary = summarizeFocusSession(completedSession, endTimestamp, "completed");
    stopMusic();
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
      set({
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
    set({
      ...base,
      weeklyPlans: updateAllocationCounts(base, dayPlan.weeklyPlanId),
      timelineDays: updatedTimelineDays(base, dayPlan),
      timelineEvents: [...state.timelineEvents, event]
    });
  },

  abandonFocusSession: (sessionId) => {
    const state = get();
    const session = state.focusSessions.find((s) => s.id === sessionId);
    // Guard: abandoning a session that already completed would downgrade it from
    // "completed" to "ended_early" and lose the completion.
    if (!session || (session.status !== "running" && session.status !== "paused")) return;

    const currentPhase = getCurrentFocusPhase(session);
    const elapsedSeconds = Math.min(
      currentPhase.plannedMinutes * 60,
      session.elapsedSeconds || Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000)
    );
    const endTimestamp = nowIso();
    const summary = summarizeFocusSession(session, endTimestamp, "ended_early", elapsedSeconds);
    stopMusic();
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
    set({
      focusSessions,
      timelineDays: plan ? updatedTimelineDays(base, plan) : state.timelineDays,
      timelineEvents: [...state.timelineEvents, event]
    });
  },

  bumpFocusDistraction: (sessionId) => {
    const state = get();
    set({
      focusSessions: state.focusSessions.map((s) => {
        if (s.id !== sessionId) return s;
        const prev = /^distractions:(\d+)/.exec(s.note ?? "");
        const n = (prev ? Number(prev[1]) : 0) + 1;
        return { ...s, note: `distractions:${n}`, updatedAt: nowIso() };
      })
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
    set({
      learningEntries: base.learningEntries,
      timelineDays: plan ? updatedTimelineDays(base, plan) : state.timelineDays
    });
  },

  saveJournalEntry: (answers, opts) => {
    const state = get();
    const date = opts?.date ?? getTodayDateString();
    const plan =
      (date !== getTodayDateString()
        ? state.dayPlans.find((p) => p.seasonId === state.activeSeason?.id && p.date === date)
        : findTodayPlan(state)) ??
      state.dayPlans.find((p) => p.seasonId === state.activeSeason?.id && p.date === date);
    if (!state.activeSeason) return;
    const timestamp = nowIso();
    const existing = state.journalEntries.find(
      (entry) => entry.seasonId === state.activeSeason?.id && entry.date === date
    );
    const entry = {
      id: existing?.id ?? createId("journal"),
      seasonId: state.activeSeason.id,
      weeklyPlanId: plan?.weeklyPlanId,
      dayPlanId: plan?.id,
      date,
      answers,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };
    const journalEntries = existing
      ? state.journalEntries.map((item) => (item.id === existing.id ? entry : item))
      : [...state.journalEntries, entry];

    // Create journal entry timeline event
    const lang = state.appSettings.language ?? "id";
    const hasReflection = !!answers.whatMovedToday?.trim();
    const hasMorningPages = !!answers.morningPages?.trim();
    let eventTitle = t(lang, "timeline.wroteReflection");
    let eventDesc = "";

    if (hasMorningPages && hasReflection) {
      eventTitle = t(lang, "timeline.wroteBoth");
      eventDesc = `${t(lang, "timeline.morningPagesLabel")}:\n${answers.morningPages}\n\n${t(lang, "timeline.reflectionLabel")}:\n${answers.whatMovedToday}`;
    } else if (hasMorningPages) {
      eventTitle = t(lang, "timeline.wroteMorning");
      eventDesc = answers.morningPages || "";
    } else if (hasReflection) {
      eventTitle = t(lang, "timeline.wroteReflection");
      eventDesc = answers.whatMovedToday || "";
    }

    const event: TimelineEvent = {
      id: createId("event"),
      type: "journal_entry",
      seasonId: state.activeSeason?.id,
      sourceId: entry.id,
      title: eventTitle,
      description: eventDesc,
      occurredAt: timestamp,
      createdAt: timestamp
    };
    const updatedEvents = state.timelineEvents.filter((ev) => ev.sourceId !== entry.id);

    const base = { ...snapshot(state), journalEntries };
    let timelineDays = state.timelineDays;
    if (plan) {
      timelineDays = updatedTimelineDays(base, plan);
    } else {
      // Standalone entry (no day plan for that date): upsert a timeline row so
      // journalCompleted still reads true. No auto-created day plan.
      const seasonId = state.activeSeason!.id;
      const existingDay = state.timelineDays.find((day) => day.seasonId === seasonId && day.date === date);
      const nextDay: TimelineDay = {
        id: existingDay?.id ?? createId("timeline"),
        seasonId,
        date,
        dayType: existingDay?.dayType ?? "goal",
        goalId: existingDay?.goalId,
        status: existingDay?.status ?? "not_started",
        focusMinutes: existingDay?.focusMinutes ?? 0,
        learningMinutes: existingDay?.learningMinutes ?? 0,
        journalCompleted: true,
        relapseCount: existingDay?.relapseCount ?? 0,
        createdAt: existingDay?.createdAt ?? timestamp,
        updatedAt: timestamp
      };
      timelineDays = existingDay
        ? state.timelineDays.map((day) => (day.id === existingDay.id ? nextDay : day))
        : [...state.timelineDays, nextDay];
    }
    set({
      journalEntries,
      timelineDays,
      timelineEvents: [...updatedEvents, event]
    });
  },

  saveRelapseLog: (input) => {
    const state = get();
    const date = input.date ?? getTodayDateString();
    const plan =
      (input.date && state.dayPlans.find((p) => p.seasonId === state.activeSeason?.id && p.date === input.date)) ||
      findTodayPlan(state);
    if (!state.activeSeason) return;
    const timestamp = nowIso();
    const entry: RelapseLog = {
      id: createId("relapse"),
      seasonId: state.activeSeason.id,
      weeklyPlanId: plan?.weeklyPlanId,
      dayPlanId: plan?.id,
      date,
      trigger: input.trigger,
      note: input.note,
      reflection: input.reflection,
      recoveryAction: input.recoveryAction,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const relapseLogs = [...state.relapseLogs, entry];
    const base = { ...snapshot(state), relapseLogs };
    set({
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
    set({
      activeSeason: { ...season, status: "archived", updatedAt: timestamp },
      pastSeasons: archiveIntoPastSeasons(state, season),
      userProfile: state.userProfile
        ? { ...state.userProfile, activeSeasonId: undefined, updatedAt: timestamp }
        : state.userProfile,
      timelineEvents: [...state.timelineEvents, event]
    });
  },

  startNewSeason: () => {
    const state = get();
    const timestamp = nowIso();
    set({
      activeSeason: state.activeSeason
        ? { ...state.activeSeason, status: "archived", updatedAt: timestamp }
        : null,
      pastSeasons: state.activeSeason ? archiveIntoPastSeasons(state, state.activeSeason) : state.pastSeasons,
      userProfile: state.userProfile
        ? { ...state.userProfile, onboardingCompleted: false, activeSeasonId: undefined }
        : null,
      onboarding: createDefaultOnboarding()
    });
  },

  resumeSeason: () => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return;
    // Re-open a season that ended/archived early but still has days left.
    // Keeps the same goals/history; only status returns to active.
    set({
      activeSeason: { ...season, status: "active", updatedAt: nowIso() },
      userProfile: state.userProfile
        ? { ...state.userProfile, onboardingCompleted: true, activeSeasonId: season.id, updatedAt: nowIso() }
        : state.userProfile
    });
  },

  updateSeasonWhy: (why) => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return;
    const timestamp = nowIso();
    const next: SeasonWhy = {
      identity: why.identity.trim(),
      consequenceOfInaction: why.consequenceOfInaction.trim(),
      protectValues: why.protectValues.slice(0, 3)
    };
    set({
      activeSeason: { ...season, why: next, updatedAt: timestamp }
    });
  },

  updateGoalKeystoneAction: (goalId, action) => {
    const state = get();
    const trimmed = action.trim();
    if (!trimmed) return;
    set({
      goals: state.goals.map((g) =>
        g.id === goalId
          ? { ...g, keystoneAction: trimmed, updatedAt: nowIso() }
          : g
      )
    });
  },

  updateGoalWhy: (goalId, why) => {
    const state = get();
    const trimmed = why.trim();
    set({
      goals: state.goals.map((g) =>
        g.id === goalId
          ? { ...g, why: trimmed || undefined, updatedAt: nowIso() }
          : g
      )
    });
  },

  reviewWeek: (weekId, decisions, opts) => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return;
    set({
      weeklyReviews: {
        ...state.weeklyReviews,
        [weekId]: {
          date: nowIso(),
          decisions,
          skipped: opts?.skipped
        }
      }
    });
    const storeWithRelease = get() as MonkStore & { releaseGoalFromSeason?: (goalId: string) => void };
    Object.entries(decisions).forEach(([goalId, decision]) => {
      if (decision.action === "adjust" && decision.mainAction?.trim()) {
        // Re-decide: apply the adjusted keystone action so next week uses it.
        get().updateGoalKeystoneAction(goalId, decision.mainAction);
      }
      if (decision.action !== "release") return;
      if (typeof storeWithRelease.releaseGoalFromSeason === "function") {
        storeWithRelease.releaseGoalFromSeason(goalId);
      }
    });
  },

  skipWeekReview: (weekId) => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return;
    set({
      weeklyReviews: {
        ...state.weeklyReviews,
        [weekId]: { date: nowIso(), decisions: {}, skipped: true }
      }
    });
  },

  releaseGoalFromSeason: (goalId, note) => {
    const state = get();
    const goal = state.goals.find((g) => g.id === goalId && g.seasonId === state.activeSeason?.id && g.status === "active");
    if (!goal) return;
    const timestamp = nowIso();
    const trimmedNote = note?.trim();
    const released: ReleasedSeasonGoal = {
      goalId,
      note: trimmedNote || undefined,
      releasedAt: timestamp
    };
    const already = state.releasedSeasonGoals.some((r) => r.goalId === goalId);
    set({
      goals: state.goals.map((g) =>
        g.id === goalId
          ? { ...g, status: "released" as const, keystoneAction: "", updatedAt: timestamp }
          : g
      ),
      // Clear the goal out of every week's allocations; completed counts/history in dayPlans stay untouched.
      weeklyPlans: state.weeklyPlans.map((plan) => ({
        ...plan,
        goalAllocations: plan.goalAllocations.filter((a) => a.goalId !== goalId),
        updatedAt: timestamp
      })),
      releasedSeasonGoals: already
        ? state.releasedSeasonGoals
        : [...state.releasedSeasonGoals, released]
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
      set({
        learningSessions,
        dayPlans: baseWithDayPlan.dayPlans,
        timelineDays: updatedTimelineDays(baseWithDayPlan, dayPlan),
        timelineEvents: [...state.timelineEvents, event]
      });
      return;
    }

    set({
      learningSessions,
      timelineEvents: [...state.timelineEvents, event]
    });
  },

  addTimelineEvent: (event) => {
    const state = get();
    set({
      timelineEvents: [...state.timelineEvents, event]
    });
  },

  updateSettings: (patch) => {
    const state = get();
    set({
      appSettings: { ...state.appSettings, ...patch, updatedAt: nowIso() }
    });
  },

  // ── Reminders (habit cues) ──

  updateReminder: (id, patch) => {
    const state = get();
    set({
      notificationReminders: state.notificationReminders.map((rem) =>
        rem.id === id ? { ...rem, ...patch, updatedAt: nowIso() } : rem
      )
    });
  },

  resetReminders: () => {
    set({ notificationReminders: createDefaultReminders() });
  },

  // ── Notebook Actions ──

  addNotebookCategory: (name, icon) => {
    const state = get();
    const maxSort = state.notebookCategories.reduce((m, c) => Math.max(m, c.sortOrder), 0);
    const cat: NotebookCategory = {
      id: createId("nb_cat"),
      name,
      icon: icon ?? "MoreHorizontal",
      isBuiltIn: false,
      sortOrder: maxSort + 1,
    };
    set({
      notebookCategories: [...state.notebookCategories, cat]
    });
  },

  renameNotebookCategory: (id, name) => {
    const state = get();
    set({
      notebookCategories: state.notebookCategories.map((c) =>
        c.id === id ? { ...c, name } : c
      )
    });
  },

  deleteNotebookCategory: (id) => {
    const state = get();
    const removed = state.notebookEntries.filter((e) => e.categoryId === id);
    set({
      notebookCategories: state.notebookCategories.filter((c) => c.id !== id),
      notebookEntries: state.notebookEntries.filter((e) => e.categoryId !== id)
    });
    for (const e of removed) {
      for (const imgId of e.images ?? []) void deleteImage(imgId);
    }
  },

  saveNotebookEntry: (entry) => {
    const state = get();
    const existing = state.notebookEntries.find((e) => e.id === entry.id);
    const timestamp = nowIso();
    set({
      notebookEntries: existing
        ? state.notebookEntries.map((e) => e.id === entry.id ? { ...entry, updatedAt: timestamp } : e)
        : [...state.notebookEntries, { ...entry, createdAt: entry.createdAt || timestamp, updatedAt: timestamp }]
    });
  },

  deleteNotebookEntry: (id) => {
    const state = get();
    const entry = state.notebookEntries.find((e) => e.id === id);
    set({
      notebookEntries: state.notebookEntries.filter((e) => e.id !== id)
    });
    // Cascade: remove this entry's blobs from IndexedDB (fire-and-forget).
    if (entry) for (const imgId of entry.images ?? []) void deleteImage(imgId);
  },

  togglePinNotebookEntry: (id) => {
    const state = get();
    set({
      notebookEntries: state.notebookEntries.map((e) =>
        e.id === id ? { ...e, isPinned: !e.isPinned, updatedAt: nowIso() } : e
      )
    });
  },

  // ── Journal Pack Actions ──

  startJournalPack: (packId) => {
    const state = get();
    const existing = state.journalPackSessions.find(
      (s) => s.packId === packId && !s.completedAt
    );
    if (existing) return existing.id;
    const timestamp = nowIso();
    const session = {
      id: createId("jp_session"),
      packId,
      answers: [] as JournalPackAnswer[],
      startedAt: timestamp,
      completedAt: undefined,
      progress: 0,
    };
    set({
      journalPackSessions: [...state.journalPackSessions, session]
    });
    return session.id;
  },

  savePackAnswer: (sessionId, questionId, answer) => {
    const state = get();
    const session = state.journalPackSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const existingIdx = session.answers.findIndex((a) => a.questionId === questionId);
    const answers = existingIdx >= 0
      ? session.answers.map((a) => a.questionId === questionId ? { ...a, answer } : a)
      : [...session.answers, { questionId, answer }];
    // Find pack for progress calc
    const pack = state.journalPacks.find((p) => p.id === session.packId);
    const progress = pack ? Math.round((answers.filter((a) => a.answer.trim()).length / pack.questions.length) * 100) : 0;
    set({
      journalPackSessions: state.journalPackSessions.map((s) =>
        s.id === sessionId ? { ...s, answers, progress } : s
      )
    });
  },

  completeJournalPack: (sessionId) => {
    const state = get();
    const timestamp = nowIso();
    set({
      journalPackSessions: state.journalPackSessions.map((s) =>
        s.id === sessionId
          ? { ...s, completedAt: timestamp, progress: 100 }
          : s
      )
    });
  },

  purchasePack: (packId) => {
    const state = get();
    if (state.purchasedPackIds.includes(packId)) return;
    set({
      purchasedPackIds: [...state.purchasedPackIds, packId]
    });
  },

  syncPurchases: async () => {
    // Pull packs confirmed paid via the Mayar webhook (Supabase) and merge them
    // into the local unlock set. Safe to call on app start / after checkout.
    try {
      const { getPurchases } = await import("../lib/supabase");
      const paid = await getPurchases();
      if (paid.length === 0) return;
      const state = get();
      const next = Array.from(new Set([...state.purchasedPackIds, ...paid]));
      if (next.length !== state.purchasedPackIds.length) {
        set({ purchasedPackIds: next });
      }
    } catch {
      /* offline or unconfigured — non-fatal */
    }
  },

  importState: (data) => {
    const state = get();
    set({
      userProfile: data.userProfile !== undefined ? data.userProfile : state.userProfile,
      appSettings: data.appSettings !== undefined ? { ...state.appSettings, ...data.appSettings } : state.appSettings,
      activeSeason: data.activeSeason !== undefined ? data.activeSeason : state.activeSeason,
      goals: data.goals !== undefined ? data.goals : state.goals,
      badHabits: data.badHabits !== undefined ? data.badHabits : state.badHabits,
      weeklyPlans: data.weeklyPlans !== undefined ? data.weeklyPlans : state.weeklyPlans,
      dayPlans: data.dayPlans !== undefined ? data.dayPlans : state.dayPlans,
      focusSessions: data.focusSessions !== undefined ? data.focusSessions : state.focusSessions,
      learningEntries: data.learningEntries !== undefined ? data.learningEntries : state.learningEntries,
      journalEntries: data.journalEntries !== undefined ? data.journalEntries : state.journalEntries,
      relapseLogs: data.relapseLogs !== undefined ? data.relapseLogs : state.relapseLogs,
      timelineDays: data.timelineDays !== undefined ? data.timelineDays : state.timelineDays,
      learningSessions: data.learningSessions !== undefined ? data.learningSessions : state.learningSessions,
      timelineEvents: data.timelineEvents !== undefined ? data.timelineEvents : state.timelineEvents,
      notebookCategories: data.notebookCategories !== undefined ? data.notebookCategories : state.notebookCategories,
      notebookEntries: data.notebookEntries !== undefined ? data.notebookEntries : state.notebookEntries,
      journalPacks: data.journalPacks !== undefined ? data.journalPacks : state.journalPacks,
      journalPackSessions: data.journalPackSessions !== undefined ? data.journalPackSessions : state.journalPackSessions,
      purchasedPackIds: data.purchasedPackIds !== undefined ? data.purchasedPackIds : state.purchasedPackIds,
      energyLogs: data.energyLogs !== undefined ? data.energyLogs : state.energyLogs,
      weeklyReviews: data.weeklyReviews !== undefined ? data.weeklyReviews : state.weeklyReviews,
      releasedSeasonGoals: data.releasedSeasonGoals !== undefined ? data.releasedSeasonGoals : state.releasedSeasonGoals,
      pastSeasons: data.pastSeasons !== undefined ? data.pastSeasons : state.pastSeasons,
    });
  }
}),
    {
      name: "monk_mode_pwa_state_v1",
      partialize: (state) => ({
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
        timelineEvents: state.timelineEvents,
        notebookCategories: state.notebookCategories,
        notebookEntries: state.notebookEntries,
        journalPacks: state.journalPacks,
        journalPackSessions: state.journalPackSessions,
        purchasedPackIds: state.purchasedPackIds,
        energyLogs: state.energyLogs,
        weeklyReviews: state.weeklyReviews,
        releasedSeasonGoals: state.releasedSeasonGoals,
        pastSeasons: state.pastSeasons
      }),
      // ponytail: custom storage adapter to keep multi-key writes + normalization; simplify when migration done
      storage: {
        getItem: () => null, // hydrate action handles reads
        setItem: (name, value) => {
          if (typeof localStorage === "undefined") return;
          // zustand wraps persisted data as { state, version }; loadState expects the raw
          // state object under STORAGE_KEY, so unwrap before writing.
          const state = ((value as { state?: MonkMVPState })?.state ?? value) as unknown as MonkMVPState;
          localStorage.setItem(name, JSON.stringify(state));
          if (state.focusSessions) localStorage.setItem("focusSessions", JSON.stringify(state.focusSessions));
          if (state.learningSessions) localStorage.setItem("learningSessions", JSON.stringify(state.learningSessions));
          if (state.timelineEvents) localStorage.setItem("timelineEvents", JSON.stringify(state.timelineEvents));
        },
        removeItem: (name) => {
          if (typeof localStorage === "undefined") return;
          localStorage.removeItem(name);
          localStorage.removeItem("focusSessions");
          localStorage.removeItem("learningSessions");
          localStorage.removeItem("timelineEvents");
        }
      }
    }
  )
);
