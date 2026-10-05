import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deleteImage } from "../lib/imageStore";
import {
  createDefaultOnboarding,
  createDefaultReminders,
  createInitialState,
  DEFAULT_FALLBACK_NOTEBOOK_CATEGORY_ID,
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
import { dedupeDayPlans, isNewerDayPlan } from "../lib/dayPlans";
import { MAX_ACTIVE_GOAL_TRACKS, MAX_SEASON_GOALS, validateWeeklyAllocation } from "../lib/validation";
import { parseIntention } from "../lib/implementationIntention";
import { loadState } from "../lib/storage";
import { stopMusic } from "../lib/focusMusic";
import { syncFocusNotifications } from "../lib/focusNotifications";
import { resolveLinkedNoteIds } from "../lib/notebookLinks";
import { computeWeeklyRhythm } from "../lib/rhythmAccounting";
import { t } from "../i18n";
import type {
  AppSettings,
  BadHabit,
  BadHabitCategory,
  BadHabitDraft,
  DateOnlyString,
  DayPlan,
  DayStatus,
  EnergyLevel,
  EnergyLog,
  FocusSession,
  Goal,
  GoalAllocation,
  GoalAvailability,
  GoalTask,
  GoalTrack,
  GoalType,
  GoalWeekday,
  JournalAnswers,
  JournalPackAnswer,
  LearningSession,
  LearningSourceType,
  NotebookCategory,
  NotebookEntry,
  NotificationReminder,
  Practice,
  PracticeLog,
  Project,
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
  PracticeHistoryScale,
  WeeklyMode,
  WeeklyPlan,
  WeeklyReviewDecision,
  WeeklyReflectionAnswers,
  RestActivityItem,
  TimeBlock,
  TimeBlockCategory,
  ValidationResult
} from "../types/app";

type StoreSnapshot = MonkMVPState;

type PickTodayInput = {
  goalId?: string;
  dayType: "goal" | "rest";
  energyLevel?: EnergyLevel;
  mainAction?: string;
  highlight?: string;
  agenda?: string[];
  status?: DayStatus;
  planningCompleted?: boolean;
  timeBlocks?: TimeBlock[];
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
  togglePattern: (category: BadHabitCategory, label: string) => void;
  setCustomPatternName: (name: string) => void;
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
  setPracticeHistoryScale: (scale: PracticeHistoryScale) => void;
  setWeeklyAllocation: (goalId: string, targetCount: number) => void;
  createSeasonFromOnboarding: () => void;
  getOrCreateCurrentWeeklyPlan: () => WeeklyPlan | undefined;
  createOrUpdateDayPlan: (dateString: string, input: PickTodayInput) => void;
  saveDayTimeBlocks: (dateString: string, timeBlocks: TimeBlock[], planningCompleted?: boolean, highlight?: string) => void;
  setDayPlanningCompleted: (dateString: string, completed: boolean) => void;
  clearDayPlan: (dateString: string) => void;
  toggleTodayCompletion: () => void;
  setTodayHighlight: (highlight: string) => void;
  /** Set the day's Main Action — the step Focus mode runs on. */
  setDayMainAction: (dateString: string, mainAction: string) => void;
  setDayAgenda: (dateString: string, agenda: string[]) => void;
  /** §23-25: create a positive practice, optionally supporting a goal. */
  addPractice: (input: { name: string; goalId?: string; weeklyTargetCount?: number; cue?: string }) => Practice | undefined;
  /**
   * §23-25: reclassify a goal as a practice instead of a goal. Not a new record
   * model — a link plus a status change. Past activity (FocusSession/DayPlan
   * `goalId`) keeps pointing at the original goal, which is only marked
   * `released`, never rewritten or deleted.
   */
  convertGoalToPractice: (
    goalId: string,
    opts?: {
      practiceName?: string;
      weeklyTargetCount?: number;
      /** When supplied, a NEW goal is created and the practice links to it. */
      newGoal?: { title: string; why?: string; desiredOutcome?: string };
    }
  ) => Practice | undefined;
  updatePractice: (id: string, patch: Partial<Pick<Practice, "name" | "goalId" | "weeklyTargetCount" | "cue" | "status">>) => void;
  removePractice: (id: string) => void;
  /** Mark a practice done on a date. Idempotent per (practice, date). */
  togglePracticeLog: (practiceId: string, date: string) => void;
  /** §16: open a finite unit of work under a goal. */
  addProject: (input: { goalId: string; title: string }) => Project | undefined;
  updateProject: (id: string, patch: Partial<Pick<Project, "title" | "status">>) => void;
  removeProject: (id: string) => void;
  /** §16: attach a step to a project, or detach it with `undefined`. */
  setGoalTaskProject: (goalId: string, taskId: string, projectId: string | undefined) => void;
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
  saveLearningSession: (session: LearningSession) => void;
  removeLearningSession: (id: string) => void;
  removeFocusSession: (id: string) => void;
  removeTimelineEvent: (id: string) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  saveJournalEntry: (answers: JournalAnswers, opts?: { date?: string; tab?: "morning" | "reflection" }) => void;
  saveRelapseLog: (input: RelapseInput) => void;
  archiveSeason: () => void;
  startNewSeason: () => void;
  resumeSeason: () => void;
  updateSeasonWhy: (why: SeasonWhy) => void;
  updateGoalWhy: (goalId: string, why: string) => void;
  updateGoalBlueprint: (
    goalId: string,
    blueprint: {
      title?: string;
      keystoneAction?: string;
      weeklyTargetCount?: number;
      type?: GoalType;
      outcomeFrequencyPerWeek?: number;
      why?: string;
      desiredOutcome?: string;
      track?: string;
      tasks?: GoalTask[];
      whenWhere?: string;
      availability?: GoalAvailability;
      definitionOfDone?: string;
      obstacle?: string;
      obstacleMitigation?: string;
    }
  ) => void;
  addGoalTask: (goalId: string, title: string) => void;
  toggleGoalTask: (goalId: string, taskId: string) => void;
  deleteGoalTask: (goalId: string, taskId: string) => void;
  updateGoalTrack: (goalId: string, track: string) => void;
  /**
   * GOAL TRACKS — the named focus-area layer above goals. `Goal.track` keeps
   * holding the track NAME, so these actions manage identity/order/lifecycle and
   * keep the goal strings in sync on rename.
   */
  addGoalTrack: (name: string) => GoalTrack | undefined;
  renameGoalTrack: (id: string, name: string) => void;
  removeGoalTrack: (id: string) => void;
  reorderGoalTracks: (orderedIds: string[]) => void;
  setGoalTrackStatus: (id: string, status: GoalTrack["status"]) => void;
  /**
   * §20-22: what happens to the focus capacity a released goal frees up. This is
   * the ONLY writer of the rhythm invariant — releasing a goal never recomputes
   * anything, it just leaves the freed day unclaimed, and these three choices
   * claim it. Invalid combinations are rejected (never written) so `focus +
   * rest === 7` cannot silently break again.
   */
  reallocateFreeDays: (
    choice:
      | { kind: "addToGoal"; goalId: string }
      | { kind: "toRest" }
  ) => ValidationResult;
  releaseGoalFromSeason: (goalId: string, note?: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateReminder: (id: string, patch: Partial<NotificationReminder>) => void;
  resetReminders: () => void;
  importState: (data: Partial<MonkMVPState>) => void;

  // Weekly re-decide review
  reviewWeek: (
    weekId: string,
    decisions: Record<string, WeeklyReviewDecision>,
    opts?: {
      skipped?: boolean;
      reflection?: WeeklyReflectionAnswers;
      restActivity?: RestActivityItem;
      /** Optional so callers written before energy was recorded stay valid. */
      energy?: EnergyLevel;
    }
  ) => void;
  skipWeekReview: (weekId: string) => void;
  updateGoalKeystoneAction: (goalId: string, action: string) => void;

  // Notebook actions
  addNotebookCategory: (name: string, icon?: string) => void;
  renameNotebookCategory: (id: string, name: string) => void;
  deleteNotebookCategory: (id: string) => void;
  saveNotebookEntry: (entry: NotebookEntry) => void;
  saveNotebookDrawing: (entryId: string, pageIndex: number, imageId: string) => void;
  deleteNotebookEntry: (id: string) => void;
  duplicateNotebookEntry: (
    id: string,
    /**
     * Localized copy strings. The store has no access to t(), so the UI layer
     * supplies these. Defaults match the app's default language (id), which
     * also keeps existing non-UI callers and tests working unchanged.
     */
    copyText?: { copySuffix?: string; untitledCopyTitle?: string }
  ) => NotebookEntry | undefined;
  togglePinNotebookEntry: (id: string) => void;
  /** Soft-hide: set archivedAt only. paraType stays, so restore is lossless. */
  archiveNotebookEntry: (id: string) => void;
  restoreNotebookEntry: (id: string) => void;

  // Energy tracking
  logEnergy: (level: EnergyLevel) => void;

  // Journal Pack actions
  startJournalPack: (packId: string) => string | undefined;
  /** `null` clears an attached sketch; `undefined` leaves it as it is. */
  savePackAnswer: (
    sessionId: string,
    questionId: string,
    answer: string,
    drawingImageId?: string | null
  ) => void;
  completeJournalPack: (sessionId: string) => void;
  purchasePack: (packId: string) => void;
  unlockPro: (tier?: "lifetime" | "season") => void;
  syncPurchases: () => Promise<void>;
};

export type MonkStore = StoreSnapshot & MonkActions;

// ponytail: snapshot kept as internal helper for state construction; persist middleware handles localStorage writes
/**
 * §14: keep availability honest. A window needs both ends and start < end, so a
 * partially-filled window collapses to "no window stated" rather than being
 * stored and later read as a real commitment. An empty day list is likewise
 * dropped — "no preferred days" and "no days" must not look the same.
 */
export function normalizeAvailability(input: GoalAvailability): GoalAvailability | undefined {
  const days = (input.preferredDays ?? [])
    .filter((d): d is GoalWeekday => Number.isInteger(d) && d >= 0 && d <= 6)
    .filter((d, i, all) => all.indexOf(d) === i)
    .sort((a, b) => a - b);
  const start = input.preferredStartTime?.trim();
  const end = input.preferredEndTime?.trim();
  const timeOk = Boolean(start && end && start < end);

  if (days.length === 0 && !timeOk) return undefined;
  return {
    preferredDays: days.length > 0 ? days : undefined,
    preferredStartTime: timeOk ? start : undefined,
    preferredEndTime: timeOk ? end : undefined
  };
}

function snapshot(state: MonkStore | MonkMVPState): MonkMVPState {  return {
    userProfile: state.userProfile,
    appSettings: state.appSettings,
    activeSeason: state.activeSeason,
    goals: state.goals,
    goalTracks: state.goalTracks ?? [],
    badHabits: state.badHabits,
    practices: state.practices ?? [],
    practiceLogs: state.practiceLogs ?? [],
    projects: state.projects ?? [],
    weeklyPlans: state.weeklyPlans,
    dayPlans: state.dayPlans,
    focusSessions: state.focusSessions,
    journalEntries: state.journalEntries,
    relapseLogs: state.relapseLogs,
    timelineDays: state.timelineDays,
    notificationReminders: state.notificationReminders,
    onboarding: state.onboarding,
    learningSessions: state.learningSessions,
    timelineEvents: state.timelineEvents,
    notebookCategories: state.notebookCategories,
    notebookEntries: state.notebookEntries,
    notebookDeletedAt: state.notebookDeletedAt ?? {},
    notebookCategoryDeletedAt: state.notebookCategoryDeletedAt ?? {},
    journalPacks: state.journalPacks,
    journalPackSessions: state.journalPackSessions,
    purchasedPackIds: state.purchasedPackIds ?? [],
    isPro: state.isPro ?? true,
    proTier: state.proTier ?? "lifetime",
    proExpiresAt: state.proExpiresAt ?? null,
    proPurchasedAt: state.proPurchasedAt ?? null,
    energyLogs: state.energyLogs,
    weeklyReviews: state.weeklyReviews,
    releasedSeasonGoals: state.releasedSeasonGoals,
    pastSeasons: state.pastSeasons
  };
}

// ── Notebook tombstone helpers ──
// A tombstone (entry id → deletion ISO time) makes a notebook delete survive
// multi-device merge: any entry whose id is tombstoned is dropped on merge and
// hidden at render, regardless of updatedAt recency — delete always wins over a
// stale resurrect. Tombstones are pruned when older than 30 days so the map
// cannot grow without bound; a resurrect older than a month is treated as a
// genuinely new write.
const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function purgeTombstones(deletedAt: Record<string, string>): Record<string, string> {
  const cutoff = Date.now() - TOMBSTONE_RETENTION_MS;
  const out: Record<string, string> = {};
  for (const [id, iso] of Object.entries(deletedAt ?? {})) {
    const ts = new Date(iso).getTime();
    if (!Number.isNaN(ts) && ts > cutoff) out[id] = iso;
  }
  return out;
}

function pruneTombstonedEntries(entries: NotebookEntry[], deletedAt: Record<string, string>): NotebookEntry[] {
  const tombstoned = new Set(Object.keys(deletedAt));
  if (tombstoned.size === 0) return entries;
  return entries.filter((e) => !tombstoned.has(e.id));
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
  return findDayPlan(state, state.activeSeason?.id, today);
}

/**
 * Resolve the newest DayPlan for a (season, date), not the first one found.
 * Two devices could each create a row for the same day before syncing (random
 * ids, no dedupe), and array order differs per device — so a plain `find` made
 * each device act on a different record, each with its own goalId/status.
 */
function findDayPlan(state: MonkMVPState, seasonId: string | undefined, date: string) {
  return state.dayPlans
    .filter((plan) => plan.seasonId === seasonId && plan.date === date)
    .reduce<DayPlan | undefined>(
      (best, plan) => (!best || isNewerDayPlan(plan, best) ? plan : best),
      undefined
    );
}

function getFocusSessionsForDay(state: MonkMVPState, dayPlan: DayPlan) {
  return state.focusSessions.filter((session) => {
    if (session.dayPlanId === dayPlan.id) return ["completed", "ended_early"].includes(session.status);
    const raw = session.startedAt || session.createdAt || session.startTime;
    if (!raw) return false;
    const sessionDate = getTodayDateString(new Date(raw));
    const sameSeason = !session.seasonId || session.seasonId === dayPlan.seasonId;
    return (sessionDate === dayPlan.date || raw.slice(0, 10) === dayPlan.date) && sameSeason && ["completed", "ended_early"].includes(session.status);
  });
}

function getLearningSessionsForDay(state: MonkMVPState, dayPlan: DayPlan) {
  return state.learningSessions.filter((session) => {
    if (session.dayPlanId === dayPlan.id && session.status === "completed") return true;
    const raw = session.startedAt || session.createdAt || session.endedAt;
    if (!raw) return false;
    const sessionDate = getTodayDateString(new Date(raw));
    const sameSeason = !session.seasonId || session.seasonId === dayPlan.seasonId;
    return (sessionDate === dayPlan.date || raw.slice(0, 10) === dayPlan.date) && sameSeason && session.status === "completed";
  });
}

function deriveTimelineStatus(state: MonkMVPState, dayPlan: DayPlan): TimelineStatus {
  const relapses = state.relapseLogs.filter((log) => log.dayPlanId === dayPlan.id);
  if (relapses.length > 0) return "relapse";
  if (dayPlan.dayType === "rest" || dayPlan.status === "rest") return "rest";
  if (dayPlan.status === "completed") return "completed";
  const focusSessions = getFocusSessionsForDay(state, dayPlan).filter(
    (session) => resolveFocusSessionStatus(session) === "completed" || session.status === "ended_early"
  );
  const learningSessions = getLearningSessionsForDay(state, dayPlan);
  const status = resolveDailyActivityStatus({ focusSessions, learningSessions });
  if (status !== "not_started") return status;
  if (dayPlan.status === "missed") return "missed";
  return "not_started";
}

function updatedTimelineDays(state: MonkMVPState, dayPlan: DayPlan): TimelineDay[] {
  const timestamp = nowIso();
  const focusMinutes = getFocusSessionsForDay(state, dayPlan)
    .reduce((sum, session) => sum + (session.focusDurationMinutes ?? session.durationMinutes), 0);
  const learningMinutes = getLearningSessionsForDay(state, dayPlan)
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

/**
 * Evidence for a goal is a focus session the user actually finished ON that
 * goal — not merely a day the plan happened to mark completed.
 *
 * §13/§27: progress is DERIVED from these records every time it is asked for,
 * never accumulated into a counter. That is what makes it self-correcting: if a
 * session is deleted, re-linked, abandoned, or the goal's target changes, the
 * next derivation simply reflects the new truth. A `progress += 1` counter
 * cannot do that — it silently keeps counting work that no longer exists, which
 * is exactly the trust bug this replaces.
 *
 * Only `completed` counts. A running, paused or abandoned session is not yet
 * evidence (§8), and pausing then resuming stays one session, so it can never
 * become two (§12) — the session id is the unit, not the number of times the
 * session was touched.
 */
export function goalEvidence(
  state: MonkMVPState,
  goalId: string,
  opts?: { since?: string; until?: string }
): FocusSession[] {
  return state.focusSessions.filter((session) => {
    if (session.goalId !== goalId) return false;
    if (session.status !== "completed") return false;
    // ISO timestamps sort lexicographically, so a plain string compare is the
    // whole range check. Undefined bounds mean "unbounded on that side".
    const at = session.completedAt || session.endedAt || session.startTime;
    if (!at) return false;
    if (opts?.since && at < opts.since) return false;
    if (opts?.until && at > opts.until) return false;
    return true;
  });
}

/**
 * Progress for a goal within a period, as evidence count over target.
 *
 * §9: only FREQUENCY goals have a meaningful automatic target — they are the
 * "show up N times" commitment, so completed qualifying sessions map 1:1 onto
 * the target. Other goal types must not be given an invented number:
 *
 *   - `achievement` / `maintenance` have no per-period count, so they report
 *     evidence but no target rather than a misleading "2/2".
 *   - an OUTPUT-style goal (publish a video) is NOT completed by doing deep
 *     work on it — the sessions are supporting evidence only. Reporting them as
 *     the completion count would claim the goal is done when nothing shipped,
 *     so the caller is told there is no automatic target.
 *
 * `count` is always real and always shown; only `target` can be undefined.
 */
export function goalProgress(
  state: MonkMVPState,
  goal: Goal,
  opts?: { since?: string; until?: string }
): { count: number; target?: number } {
  const evidence = goalEvidence(state, goal.id, opts);
  const hasTarget = goal.type === "frequency";
  return {
    count: evidence.length,
    target: hasTarget ? goal.outcomeFrequencyPerWeek ?? goal.weeklyTargetCount : undefined
  };
}

function updateAllocationCounts(state: MonkMVPState, weeklyPlanId: string): WeeklyPlan[] {
  const plan = state.weeklyPlans.find((item) => item.id === weeklyPlanId);
  if (!plan) return state.weeklyPlans;

  // Period bounds come from the weekly plan itself rather than being assumed,
  // so the count always describes the week the allocation belongs to. The plan
  // stores date-only strings; widen them to full-day ISO bounds so the
  // lexicographic compare in goalEvidence includes the whole final day.
  const since = `${plan.startDate}T00:00:00.000Z`;
  const until = `${plan.endDate}T23:59:59.999Z`;

  return state.weeklyPlans.map((item) => {
    if (item.id !== weeklyPlanId) return item;
    return {
      ...item,
      goalAllocations: item.goalAllocations.map((allocation) => ({
        ...allocation,
        completedCount: goalEvidence(state, allocation.goalId, { since, until }).length
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
      const todayDate = getTodayDateString();
      const focusSessions = (stored.focusSessions || []).map((session) => {
        const norm = normalizeFocusSessionRecord(session);
        if (["running", "paused"].includes(norm.status)) {
          const sessionDate = (norm.startedAt || norm.startTime || "").slice(0, 10);
          const isPastDay = sessionDate && sessionDate !== todayDate;
          const isStale = (Date.now() - new Date(norm.updatedAt || norm.startTime).getTime()) > 3 * 60 * 60 * 1000;
          if (isPastDay || isStale) {
            return {
              ...norm,
              status: "ended_early" as const,
              endedAt: norm.updatedAt || norm.startTime,
              endTime: norm.updatedAt || norm.startTime
            };
          }
        }
        return norm;
      });
      // 1. Backfill and normalize Timeline Events
      let timelineEvents = normalizeFocusTimelineEvents(stored.timelineEvents || [], focusSessions);
      const existingSourceIds = new Set(timelineEvents.map((e) => e.sourceId).filter(Boolean));

      if (stored.activeSeason && !timelineEvents.some((e) => e.type === "season_started")) {
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
        if (!existingSourceIds.has(g.id)) {
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
        }
      });

      (stored.journalEntries ?? []).forEach((j) => {
        if (!existingSourceIds.has(j.id)) {
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
        }
      });

      focusSessions.forEach((s) => {
        if (!existingSourceIds.has(s.id)) {
          const completed = resolveFocusSessionStatus(s) === "completed";
          const mins = s.focusDurationMinutes ?? s.completedDurationMinutes ?? s.durationMinutes ?? 0;
          if (completed || s.status === "ended_early" || mins > 0) {
            const goal = (stored.goals ?? []).find((g) => g.id === s.goalId);
            const preset = s.preset ?? s.timerMode ?? "deep_work";
            timelineEvents.push({
              id: `legacy_focus_${s.id}`,
              type: "focus_session",
              seasonId: s.seasonId,
              relatedGoalId: s.goalId || null,
              sourceId: s.id,
              title: `${FOCUS_PRESETS[preset]?.shortLabel ?? "Focus"} ${completed ? "completed" : "session"}`,
              description: formatFocusSessionTimelineDescription(s, goal ? `Moved forward: ${goal.title}` : undefined),
              occurredAt: s.startedAt || s.createdAt || s.startTime || s.endedAt || s.endTime || nowIso(),
              createdAt: s.createdAt || nowIso(),
              focusSession: s as any
            });
          }
        }
      });

      // 2. Ensure Day Plans exist and are marked completed for dates with focus work
      let dayPlans = [...(stored.dayPlans || [])];
      const activeSeasonId = stored.activeSeason?.id;

      focusSessions.forEach((s) => {
        const raw = s.startedAt || s.createdAt || s.startTime;
        const sessionDate = raw ? getTodayDateString(new Date(raw)) : "";
        if (!sessionDate) return;

        let plan = dayPlans.find((p) => p.date === sessionDate && (p.seasonId === s.seasonId || !p.seasonId));
        const mins = s.focusDurationMinutes ?? s.completedDurationMinutes ?? s.durationMinutes ?? 0;
        const shouldBeCompleted = mins >= 15 || s.status === "completed";

        if (!plan && activeSeasonId) {
          plan = {
            id: createId("day"),
            seasonId: s.seasonId || activeSeasonId,
            weeklyPlanId: s.weeklyPlanId || (stored.weeklyPlans?.[0]?.id ?? createId("week")),
            goalId: s.goalId,
            date: sessionDate,
            dayType: "goal",
            status: shouldBeCompleted ? "completed" : "active",
            createdAt: s.createdAt || nowIso(),
            updatedAt: nowIso()
          };
          dayPlans.push(plan);
        } else if (plan && shouldBeCompleted && plan.status !== "completed") {
          dayPlans = dayPlans.map((p) => (p.id === plan?.id ? { ...p, status: "completed" as const, updatedAt: nowIso() } : p));
        }
      });

      // 3. Sync Weekly Plans allocation counts
      const provisionalBase: MonkMVPState = { ...stored, focusSessions, dayPlans, timelineEvents };
      const weeklyPlans = (stored.weeklyPlans || []).map((wp) => {
        return updateAllocationCounts(provisionalBase, wp.id)[0] || wp;
      });

      // 4. Sync Timeline Days
      const timelineDays = (stored.timelineDays || []).map((day) => {
        const dayPlan = dayPlans.find(
          (plan) => plan.seasonId === day.seasonId && plan.date === day.date
        );
        if (!dayPlan) return day;
        return {
          ...day,
          status: deriveTimelineStatus(provisionalBase, dayPlan)
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
        dayPlans,
        weeklyPlans,
        pastSeasons,
        journalPacks: fresh.journalPacks,
        purchasedPackIds: Array.from(new Set([...(stored.purchasedPackIds ?? []), ...fresh.journalPacks.map((p) => p.id)])),
        isPro: true,
        proTier: stored.proTier ?? "lifetime",
        weeklyReviews: stored.weeklyReviews ?? {},
        releasedSeasonGoals: stored.releasedSeasonGoals ?? [],
        // Goal Tracks arrived after goals existed: nobody had a named track
        // entity before, so an empty list is honest (goals keep their `track`
        // string either way and read as untracked).
        goalTracks: stored.goalTracks ?? [],
        // §23: practices arrived after `badHabits`, so any state written before
        // them has no such arrays. Defaulting to empty is honest here — nobody
        // had a positive practice to lose.
        practices: stored.practices ?? [],
        practiceLogs: stored.practiceLogs ?? [],
        // §16: nobody had a project before the layer existed.
        projects: stored.projects ?? [],
        // Backfill the goal type/frequency split (§12-13). Goals written before
        // the split carry only `weeklyTargetCount`, which has always meant
        // "days per week" — i.e. practice rhythm. So leave it as the rhythm and
        // default `type` to "achievement" (the historical reading: a goal with a
        // done state). Nothing is invented: `outcomeFrequencyPerWeek` stays
        // undefined rather than guessing a commitment the user never made.
        goals: (stored.goals ?? []).map((g) => ({ ...g, type: g.type ?? "achievement" })),
        // Tombstone purge: drop tombstones older than 30 days along with any
        // surviving entry they shadow (a resurrect older than a month is treated
        // as a genuinely new write). Unioned with remote on merge — tombstones
        // are never lost by a stale pull, only by this time-based expiry.
        notebookDeletedAt: purgeTombstones(stored.notebookDeletedAt ?? {}),
        notebookEntries: pruneTombstonedEntries(
          stored.notebookEntries ?? [],
          purgeTombstones(stored.notebookDeletedAt ?? {})
        ),
        focusSessions,
        timelineDays,
        timelineEvents,
        appSettings: {
          ...fresh.appSettings,
          ...stored.appSettings
        },
        onboarding: {
          ...createDefaultOnboarding(),
          ...stored.onboarding,
          // Backfill for persisted states predating goalDesiredOutcomes.
          goalDesiredOutcomes: stored.onboarding?.goalDesiredOutcomes ?? {}
        },
        // Seed habit cues on first run / legacy states (empty array → defaults).
        // Deduplicate by type and enforce deterministic IDs so duplicates never persist.
        notificationReminders: (() => {
          const raw = Array.isArray(stored.notificationReminders) && stored.notificationReminders.length > 0
            ? stored.notificationReminders
            : createDefaultReminders();
          const map = new Map<string, NotificationReminder>();
          raw.forEach((r) => {
            if (r.type && !map.has(r.type)) {
              map.set(r.type, { ...r, id: `rem_${r.type}` });
            }
          });
          return Array.from(map.values());
        })()
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
      onboarding: { ...state.onboarding, ...patch, updatedAt: nowIso() }
    });
  },

  setOnboardingStep: (step) => {
    const state = get();
    set({
      onboarding: { ...state.onboarding, currentStep: step, updatedAt: nowIso() }
    });
  },

  togglePattern: (category, label) => {
    const state = get();
    const existing = state.onboarding.selectedHabits.find((habit) => habit.category === category);
    const selectedHabits = existing
      ? state.onboarding.selectedHabits.filter((habit) => habit.id !== existing.id)
      : [
          ...state.onboarding.selectedHabits,
          { id: createId("pattern_draft"), category, name: label }
        ];
    const frictionActions = { ...state.onboarding.frictionActions };
    if (existing) {
      delete frictionActions[existing.id];
    } else {
      const next = selectedHabits[selectedHabits.length - 1];
      frictionActions[next.id] = frictionActionsForHabit(next);
    }
    set({ onboarding: { ...state.onboarding, selectedHabits, frictionActions, updatedAt: nowIso() } });
  },

  setCustomPatternName: (name) => {
    const state = get();
    let other = state.onboarding.selectedHabits.find((habit) => habit.category === "other");
    if (!other) {
      other = { id: createId("pattern_draft"), category: "other", name: "Other", customName: name };
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
        },
        updatedAt: nowIso()
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
        },
        updatedAt: nowIso()
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
        ),
        updatedAt: nowIso()
      }
    });
  },

  addGoalDraft: () => {
    const state = get();
    if (state.onboarding.goalDrafts.length >= 10) return;
    set({
      onboarding: {
        ...state.onboarding,
        goalDrafts: [...state.onboarding.goalDrafts, { id: createId("draft_goal"), title: "" }],
        updatedAt: nowIso()
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
        selectedFocusGoalIds: state.onboarding.selectedFocusGoalIds.filter((goalId) => goalId !== id),
        updatedAt: nowIso()
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
        selectedFocusGoalIds: state.onboarding.selectedFocusGoalIds.filter((goalId) => goalId !== id),
        updatedAt: nowIso()
      }
    });
  },

  toggleFocusGoal: (id) => {
    const state = get();
    const selected = state.onboarding.selectedFocusGoalIds.includes(id);
    // Season holds at most MAX_SEASON_GOALS Goal Tracks (intentional constraint).
    // Unselecting is always allowed; only adding past the cap is refused. The UI
    // reads the same constant to explain why, so this is no longer a silent no-op.
    if (!selected && state.onboarding.selectedFocusGoalIds.length >= MAX_SEASON_GOALS) return;
    const selectedFocusGoalIds = selected
      ? state.onboarding.selectedFocusGoalIds.filter((goalId) => goalId !== id)
      : [...state.onboarding.selectedFocusGoalIds, id];
    const weeklyAllocations = defaultWeeklyTargets(selectedFocusGoalIds);
    set({
      onboarding: {
        ...state.onboarding,
        selectedFocusGoalIds,
        weeklyAllocations,
        updatedAt: nowIso()
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
        seasonEndDate: addDaysToDate(start, days - 1),
        updatedAt: nowIso()
      }
    });
  },

  setKeystoneAction: (goalId, action) => {
    const state = get();
    set({
      onboarding: {
        ...state.onboarding,
        keystoneActions: { ...state.onboarding.keystoneActions, [goalId]: action },
        updatedAt: nowIso()
      }
    });
  },

  setObstacleMitigation: (goalId, mitigation) => {
    const state = get();
    set({
      onboarding: {
        ...state.onboarding,
        obstacleMitigations: { ...state.onboarding.obstacleMitigations, [goalId]: mitigation },
        updatedAt: nowIso()
      }
    });
  },

  setWeeklyMode: (mode) => {
    const state = get();
    set({
      onboarding: { ...state.onboarding, weeklyMode: mode, updatedAt: nowIso() }
    });
  },

  /**
   * Remember which history scale the practice card was left on. A small
   * preference, kept on `appSettings` so it syncs through the existing scalar
   * merge instead of needing its own path.
   */
  setPracticeHistoryScale: (scale) => {
    const state = get();
    set({
      appSettings: { ...state.appSettings, practiceHistoryScale: scale, updatedAt: nowIso() }
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
        weeklyAllocations: newAllocations,
        updatedAt: nowIso()
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
      desiredOutcome: onboarding.goalDesiredOutcomes?.[draft.id]?.trim() || undefined,
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
    const existing = findDayPlan(base, season.id, dateString);
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
      // `agenda` was the one planning field with no `existing?.` fallback here,
      // so every rebuild of this literal — rest-day toggle, Plan B switch,
      // journal, weekly review — silently dropped the morning plan and the user
      // had to redo it. Carried over like the fields above; only an explicit
      // `agenda` replaces it.
      agenda: input.agenda !== undefined ? input.agenda : (existing?.agenda ?? []),
      energyLevel: input.energyLevel ?? existing?.energyLevel,
      status: input.status ?? (existing?.status ?? (input.dayType === "rest" ? "rest" : "active")),
      planningCompleted: input.planningCompleted !== undefined ? input.planningCompleted : (existing?.planningCompleted ?? false),
      timeBlocks: input.timeBlocks !== undefined ? input.timeBlocks : (existing?.timeBlocks ?? []),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };
    let next: MonkMVPState = {
      ...base,
      dayPlans: existing
        ? base.dayPlans.map((day) => (day.id === existing.id ? dayPlan : day))
        : [...base.dayPlans, dayPlan]
    };
    // Collapse any other row for this same (season, date) that a second device
    // created independently. Without this the pair persists: both rows stay in
    // the array, the winner is chosen by array order, and one device keeps
    // showing its own goalId/timeBlocks/status. Only this date's rows are
    // rebuilt from `dayPlan`, so untouched days keep their object identity.
    next = { ...next, dayPlans: dedupeDayPlans(next.dayPlans) ?? [] };
    next = { ...next, weeklyPlans: updateAllocationCounts(next, weeklyPlan.id) };
    next = { ...next, timelineDays: updatedTimelineDays(next, dayPlan) };
    set(next);
  },

  saveDayTimeBlocks: (dateString, timeBlocks, planningCompleted = true, highlight) => {
    const current = get();
    let base = snapshot(current);
    const season = base.activeSeason;
    if (!season) return;
    const existing = findDayPlan(base, season.id, dateString);
    const trimmedHighlight = highlight !== undefined ? highlight.trim() : undefined;
    if (!existing) {
      get().createOrUpdateDayPlan(dateString, {
        dayType: "goal",
        timeBlocks,
        planningCompleted,
        highlight: trimmedHighlight
      });
      return;
    }
    const timestamp = nowIso();
    const updatedPlan: DayPlan = {
      ...existing,
      timeBlocks,
      highlight: trimmedHighlight !== undefined ? (trimmedHighlight || undefined) : existing.highlight,
      planningCompleted: planningCompleted !== undefined ? planningCompleted : (existing.planningCompleted ?? false),
      updatedAt: timestamp
    };
    set({
      dayPlans: base.dayPlans.map((day) => (day.id === existing.id ? updatedPlan : day))
    });
  },

  setDayPlanningCompleted: (dateString, completed) => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return;
    const existing = state.dayPlans.find((day) => day.seasonId === season.id && day.date === dateString);
    if (!existing) return;
    const timestamp = nowIso();
    const updatedPlan: DayPlan = {
      ...existing,
      planningCompleted: completed,
      updatedAt: timestamp
    };
    set({
      dayPlans: state.dayPlans.map((day) => (day.id === existing.id ? updatedPlan : day))
    });
  },

  clearDayPlan: (dateString) => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return;
    const existing = state.dayPlans.find((day) => day.seasonId === season.id && day.date === dateString);
    if (!existing) return;

    const dayPlans = state.dayPlans.filter((day) => day.id !== existing.id);
    const focusSessions = state.focusSessions.filter((session) => session.dayPlanId !== existing.id);
    const learningSessions = state.learningSessions.filter((session) => {
      const raw = session.startedAt || session.createdAt || session.endedAt;
      if (!raw) return true;
      const sessionDate = getTodayDateString(new Date(raw));
      return !(session.seasonId === existing.seasonId && (sessionDate === dateString || raw.slice(0, 10) === dateString));
    });
    let next: MonkMVPState = {
      ...snapshot(state),
      dayPlans,
      focusSessions,
      learningSessions
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

  setDayMainAction: (dateString, mainAction) => {
    const state = get();
    const plan = state.dayPlans.find((day) => day.date === dateString);
    if (!plan) return;
    // The day owns its Main Action (§22). Clearing leaves it empty — it must NOT
    // fall back to the goal's keystone action. That fallback is what made the
    // rendered action silently revert to a stale goal-level string after the user
    // cleared or replaced it: the keystone is a starting suggestion, not a value
    // the day inherits forever. The suggestion is still offered explicitly in the
    // Today UI, so nothing is lost by not writing it automatically.
    const next = mainAction.trim();
    // No-op writes would bump updatedAt and make the sync merge think this
    // record changed, which can clobber a newer edit from another device.
    if ((plan.mainAction || "") === next) return;
    const dayPlan = { ...plan, mainAction: next, updatedAt: nowIso() };
    set({
      dayPlans: state.dayPlans.map((day) => (day.id === dayPlan.id ? dayPlan : day))
    });
  },

  setDayAgenda: (dateString, agenda) => {    const state = get();
    const season = state.activeSeason;
    if (!season) return;
    const existing = state.dayPlans.find((day) => day.seasonId === season.id && day.date === dateString);
    if (!existing) return;
    const dayPlan = { ...existing, agenda, updatedAt: nowIso() };
    set({
      dayPlans: state.dayPlans.map((day) => (day.id === dayPlan.id ? dayPlan : day))
    });
  },

  addPractice: (input) => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return undefined;
    const name = input.name.trim();
    if (!name) return undefined;
    const now = nowIso();
    const practice: Practice = {
      id: createId("practice"),
      seasonId: season.id,
      name,
      goalId: input.goalId,
      // Clamped to a real week, same bound as a goal's practice rhythm.
      weeklyTargetCount: Math.max(1, Math.min(7, input.weeklyTargetCount ?? 7)),
      cue: input.cue?.trim() || undefined,
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    set({ practices: [...state.practices, practice] });
    return practice;
  },

  convertGoalToPractice: (goalId, opts) => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return undefined;
    const goal = state.goals.find((g) => g.id === goalId);
    if (!goal) return undefined;

    const name = (opts?.practiceName ?? goal.title).trim();
    if (!name) return undefined;

    const now = nowIso();
    // Same unit both sides document as "days per week you intend to show up",
    // so this is a direct 1:1 map — the outcome target is a different concept.
    const weeklyTargetCount = Math.max(
      1,
      Math.min(7, opts?.weeklyTargetCount ?? goal.weeklyTargetCount)
    );

    // A new goal only exists to hold the practice; it inherits the rhythm and
    // the next-step text, and takes the next free priority slot.
    const newGoal: Goal | undefined = opts?.newGoal
      ? {
          id: createId("goal"),
          seasonId: goal.seasonId,
          title: opts.newGoal.title.trim() || name,
          keystoneAction: name,
          why: opts.newGoal.why?.trim() || undefined,
          desiredOutcome: opts.newGoal.desiredOutcome?.trim() || undefined,
          priority: Math.min(3, state.goals.filter((g) => g.status === "active").length + 1) as 1 | 2 | 3,
          weeklyTargetCount,
          status: "active",
          createdAt: now,
          updatedAt: now
        }
      : undefined;

    const practice: Practice = {
      id: createId("practice"),
      seasonId: season.id,
      name,
      goalId: newGoal?.id,
      weeklyTargetCount,
      // The goal's Plan B is the closest existing "when X, I will Y" text.
      cue: goal.obstacleMitigation?.trim() || undefined,
      status: "active",
      createdAt: now,
      updatedAt: now
    };

    // History stays put: FocusSession/DayPlan rows keep their original goalId,
    // and the source goal is only reclassified — never rewritten or deleted.
    // Skipping an already-released goal avoids bumping updatedAt for nothing.
    const goals =
      goal.status === "released"
        ? state.goals
        : state.goals.map((g) => (g.id === goal.id ? { ...g, status: "released" as const, updatedAt: now } : g));

    set({
      goals: newGoal ? [...goals, newGoal] : goals,
      practices: [...state.practices, practice]
    });
    return practice;
  },

  updatePractice: (id, patch) => {
    const state = get();
    set({
      practices: state.practices.map((p) =>
        p.id === id
          ? {
              ...p,
              ...patch,
              name: patch.name !== undefined ? patch.name.trim() || p.name : p.name,
              weeklyTargetCount:
                patch.weeklyTargetCount !== undefined
                  ? Math.max(1, Math.min(7, patch.weeklyTargetCount))
                  : p.weeklyTargetCount,
              updatedAt: nowIso()
            }
          : p
      )
    });
  },

  removePractice: (id) => {
    const state = get();
    // Logs go with the practice — an orphaned log would read as a completion
    // of something that no longer exists.
    set({
      practices: state.practices.filter((p) => p.id !== id),
      practiceLogs: state.practiceLogs.filter((l) => l.practiceId !== id)
    });
  },

  togglePracticeLog: (practiceId, date) => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return;
    const existing = state.practiceLogs.find(
      (l) => l.practiceId === practiceId && l.date === date
    );
    if (existing) {
      set({ practiceLogs: state.practiceLogs.filter((l) => l.id !== existing.id) });
      return;
    }
    const now = nowIso();
    set({
      practiceLogs: [
        ...state.practiceLogs,
        {
          id: createId("plog"),
          practiceId,
          seasonId: season.id,
          date,
          createdAt: now,
          updatedAt: now
        }
      ]
    });
  },

  addProject: (input) => {
    const state = get();
    const season = state.activeSeason;
    const title = input.title.trim();
    if (!season || !title) return undefined;
    // A project must hang off a goal it belongs to. Accepting one without a
    // parent would create work nothing can report progress against.
    if (!state.goals.some((g) => g.id === input.goalId)) return undefined;
    const now = nowIso();
    const project: Project = {
      id: createId("project"),
      seasonId: season.id,
      goalId: input.goalId,
      title,
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    set({ projects: [...state.projects, project] });
    return project;
  },

  updateProject: (id, patch) => {
    const state = get();
    const title = patch.title !== undefined ? patch.title.trim() : undefined;
    set({
      projects: state.projects.map((p) =>
        p.id === id
          ? {
              ...p,
              // A blank rename is a mis-click, not an intent to have no name.
              title: title !== undefined && title ? title : p.title,
              status: patch.status ?? p.status,
              updatedAt: nowIso()
            }
          : p
      )
    });
  },

  removeProject: (id) => {
    const state = get();
    // Its steps survive — they were real work; they just stop being grouped.
    set({
      projects: state.projects.filter((p) => p.id !== id),
      goals: state.goals.map((g) =>
        (g.tasks ?? []).some((t) => t.projectId === id)
          ? {
              ...g,
              tasks: (g.tasks ?? []).map((t) =>
                t.projectId === id ? { ...t, projectId: undefined } : t
              )
            }
          : g
      )
    });
  },

  setGoalTaskProject: (goalId, taskId, projectId) => {
    const state = get();
    set({
      goals: state.goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              tasks: (g.tasks ?? []).map((t) => (t.id === taskId ? { ...t, projectId } : t)),
              updatedAt: nowIso()
            }
          : g
      )
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
    if (!state.activeSeason) return undefined;
    const today = getTodayDateString();
    let plan = findTodayPlan(state);
    let allDayPlans = state.dayPlans;

    if (!plan) {
      const weeklyPlan = state.weeklyPlans.find((w) => w.seasonId === state.activeSeason!.id) ?? state.getOrCreateCurrentWeeklyPlan();
      plan = {
        id: createId("day"),
        seasonId: state.activeSeason.id,
        weeklyPlanId: weeklyPlan?.id ?? createId("week"),
        date: today,
        dayType: "goal",
        status: "active",
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      allDayPlans = [...state.dayPlans, plan];
    }

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
      dayPlans: allDayPlans.map((day) => (day.id === dayPlan.id ? dayPlan : day))
    });
    // TRANSITION ONLY (never the 1 Hz tick): reconcile OS phase-boundary triggers.
    // The helper is a pure recompute + cancel-stale/dedupe, so re-invoking it per
    // transition is safe and idempotent.
    void syncFocusNotifications(get().focusSessions.find((s) => s.id === session.id));
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
    // Reset rewinds to a fresh clock → reschedule the full boundary set.
    void syncFocusNotifications(get().focusSessions.find((s) => s.id === sessionId));
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
    // Phase advanced → startTime moved; reschedule the new future boundaries.
    void syncFocusNotifications(get().focusSessions.find((s) => s.id === sessionId));
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
          ? { ...s, status: "paused", elapsedSeconds: elapsed, pausedAt: nowIso(), updatedAt: nowIso() }
          : s
      )
    });
    // Paused → status !== "running" → empty expected set → cancel all pending.
    void syncFocusNotifications(get().focusSessions.find((s) => s.id === sessionId));
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
          ? { ...s, status: "running" as const, startTime: adjustedStart, elapsedSeconds: phaseElapsed, pausedAt: undefined, updatedAt: nowIso() }
          : s
      )
    });
    // Resumed → recompute from the adjusted startTime.
    void syncFocusNotifications(get().focusSessions.find((s) => s.id === sessionId));
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
      occurredAt: session.startedAt || session.createdAt || session.startTime || endTimestamp,
      createdAt: endTimestamp,
      focusSession: summary
    };

    const plan = state.dayPlans.find((day) => day.id === session.dayPlanId);
    if (!plan) {
      set({
        focusSessions,
        timelineEvents: [...state.timelineEvents, event]
      });
      // Session ended → clear every pending trigger (undefined = request to clear).
      void syncFocusNotifications(undefined);
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
    // Session ended → clear every pending trigger (undefined = request to clear).
    void syncFocusNotifications(undefined);
  },

  abandonFocusSession: (sessionId) => {
    const state = get();
    const session = state.focusSessions.find((s) => s.id === sessionId);
    // Guard: abandoning a session that already completed would downgrade it from
    // "completed" to "ended_early" and lose the completion.
    if (!session || (session.status !== "running" && session.status !== "paused")) return;

    const currentPhase = getCurrentFocusPhase(session);
    // While paused, `startTime` is stale: pausing does not advance it, so raw
    // wall-clock math would count the whole paused duration as focus time.
    // `elapsedSeconds` is the trustworthy frozen cache — use it outright and never
    // reach for `startTime` on this path.
    // While running, mirror completeFocusSession: take the max of the tick cache and
    // wall-clock. `??` (not `||`) so a stale-but-real 0 is not silently discarded,
    // and Math.max keeps the true elapsed when a ticker has not fired yet.
    const elapsedSeconds =
      session.status === "paused"
        ? Math.min(currentPhase.plannedMinutes * 60, session.elapsedSeconds ?? 0)
        : Math.min(
            currentPhase.plannedMinutes * 60,
            Math.max(
              session.elapsedSeconds ?? 0,
              Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000)
            )
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
      occurredAt: session.startedAt || session.createdAt || session.startTime || endTimestamp,
      createdAt: endTimestamp,
      focusSession: summary
    };

    const plan = state.dayPlans.find((day) => day.id === session.dayPlanId);
    if (!plan) {
      set({
        focusSessions,
        timelineEvents: [...state.timelineEvents, event]
      });
      // Ended early → clear every pending trigger.
      void syncFocusNotifications(undefined);
      return;
    }
    const provisionalBase: MonkMVPState = {
      ...snapshot(state),
      focusSessions
    };
    const timelineStatus = deriveTimelineStatus(provisionalBase, plan);
    const dayPlan = {
      ...plan,
      status: (summary.focusDurationMinutes >= 15 || timelineStatus === "completed") ? ("completed" as const) : plan.status,
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
    // Ended early → clear every pending trigger.
    void syncFocusNotifications(undefined);
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

  removeLearningSession: (id) => {
    const state = get();
    const target = state.learningSessions.find((s) => s.id === id);
    if (!target) return;
    const learningSessions = state.learningSessions.filter((s) => s.id !== id);
    // Cascade: drop the session's timeline event (appended by saveLearningSession)
    // so no orphan "Learned for X minutes" entry survives the delete.
    const timelineEvents = state.timelineEvents.filter((ev) => ev.sourceId !== id);
    const base: MonkMVPState = { ...snapshot(state), learningSessions, timelineEvents };
    const raw = target.startedAt || target.createdAt || target.endedAt;
    const targetDate = raw ? getTodayDateString(new Date(raw)) : "";
    const plan = raw
      ? state.dayPlans.find(
          (day) => day.seasonId === target.seasonId && (day.date === targetDate || day.date === raw.slice(0, 10))
        )
      : undefined;
    set(
      plan
        ? {
            ...base,
            learningSessions,
            timelineEvents,
            timelineDays: updatedTimelineDays(base, plan)
          }
        : { ...base, learningSessions, timelineEvents }
    );
  },

  removeFocusSession: (sessionId) => {
    const state = get();
    const target = state.focusSessions.find((s) => s.id === sessionId);
    if (!target) return;
    const focusSessions = state.focusSessions.filter((s) => s.id !== sessionId);
    const timelineEvents = state.timelineEvents.filter((ev) => ev.sourceId !== sessionId);
    const base: MonkMVPState = { ...snapshot(state), focusSessions, timelineEvents };
    const plan = state.dayPlans.find((day) => day.id === target.dayPlanId);
    set(
      plan
        ? {
            ...base,
            focusSessions,
            timelineEvents,
            timelineDays: updatedTimelineDays(base, plan),
            weeklyPlans: updateAllocationCounts(base, plan.weeklyPlanId)
          }
        : { ...base, focusSessions, timelineEvents }
    );
  },

  removeTimelineEvent: (eventId) => {
    const state = get();
    const event = state.timelineEvents.find((ev) => ev.id === eventId);
    if (!event) return;
    if (event.type === "focus_session" && event.sourceId) {
      get().removeFocusSession(event.sourceId);
      return;
    }
    if (event.type === "learning_session" && event.sourceId) {
      get().removeLearningSession(event.sourceId);
      return;
    }
    const timelineEvents = state.timelineEvents.filter((ev) => ev.id !== eventId);
    set({ timelineEvents });
  },

  saveJournalEntry: (answers, opts) => {
    const state = get();
    const date = opts?.date ?? getTodayDateString();
    const seasonId = state.activeSeason?.id ?? state.pastSeasons?.[0]?.id ?? "season_1";
    const plan =
      (date !== getTodayDateString()
        ? state.dayPlans.find((p) => (p.seasonId === seasonId || !p.seasonId) && p.date === date)
        : findTodayPlan(state)) ??
      state.dayPlans.find((p) => (p.seasonId === seasonId || !p.seasonId) && p.date === date);
    const timestamp = nowIso();
    const existing = state.journalEntries.find(
      (entry) => (entry.seasonId === seasonId || !entry.seasonId) && entry.date === date
    );
    const mergedAnswers: JournalAnswers = {
      ...(existing?.answers ?? {}),
      ...answers
    };
    const entry = {
      id: existing?.id ?? createId("journal"),
      seasonId,
      weeklyPlanId: plan?.weeklyPlanId,
      dayPlanId: plan?.id,
      date,
      answers: mergedAnswers,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };
    const journalEntries = existing
      ? state.journalEntries.map((item) => (item.id === existing.id ? entry : item))
      : [...state.journalEntries, entry];

    // Create journal entry timeline event
    const lang = state.appSettings.language ?? "id";
    const hasReflection = !!mergedAnswers.whatMovedToday?.trim();
    const hasMorningPages = !!mergedAnswers.morningPages?.trim();
    let eventTitle = t(lang, "timeline.wroteReflection");
    let eventDesc = "";

    if (hasMorningPages && hasReflection) {
      eventTitle = t(lang, "timeline.wroteBoth");
      eventDesc = `${t(lang, "timeline.morningPagesLabel")}:\n${mergedAnswers.morningPages}\n\n${t(lang, "timeline.reflectionLabel")}:\n${mergedAnswers.whatMovedToday}`;
    } else if (hasMorningPages) {
      eventTitle = t(lang, "timeline.wroteMorning");
      eventDesc = mergedAnswers.morningPages || "";
    } else if (hasReflection) {
      eventTitle = t(lang, "timeline.wroteReflection");
      eventDesc = mergedAnswers.whatMovedToday || "";
    }

    const event: TimelineEvent = {
      id: createId("event"),
      type: "journal_entry",
      seasonId,
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
      const existingDay = state.timelineDays.find((day) => (day.seasonId === seasonId || !day.seasonId) && day.date === date);
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
    // Preserve full season history — no cap (the max-3 plan constraint is for goal tracks, not seasons).
    const nextPast = state.activeSeason ? archiveIntoPastSeasons(state, { ...state.activeSeason, status: "archived", updatedAt: timestamp }) : state.pastSeasons;
    set({
      activeSeason: state.activeSeason
        ? { ...state.activeSeason, status: "archived", updatedAt: timestamp }
        : null,
      pastSeasons: nextPast,
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
    const intrinsicWhy = (why.why ?? why.identity ?? "").trim();
    const costOfInaction = (why.antiWhy ?? why.consequenceOfInaction ?? "").trim();
    const outcome = (why.desiredOutcome ?? "").trim();
    const next: SeasonWhy = {
      identity: intrinsicWhy,
      consequenceOfInaction: costOfInaction,
      protectValues: (why.protectValues ?? []).slice(0, 3),
      why: intrinsicWhy,
      desiredOutcome: outcome,
      antiWhy: costOfInaction,
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

  updateGoalBlueprint: (goalId, blueprint) => {
    const state = get();
    const existing = state.goals.find((g) => g.id === goalId);
    if (!existing) return;
    const updatedGoals = state.goals.map((g) => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        title: blueprint.title !== undefined ? (blueprint.title.trim() || g.title) : g.title,
        keystoneAction: blueprint.keystoneAction !== undefined ? (blueprint.keystoneAction.trim() || g.keystoneAction) : g.keystoneAction,
        weeklyTargetCount: blueprint.weeklyTargetCount !== undefined ? Math.max(1, Math.min(7, blueprint.weeklyTargetCount)) : g.weeklyTargetCount,
        type: blueprint.type !== undefined ? blueprint.type : g.type,
        // Only `frequency` goals carry an outcome target; clearing the type (or
        // moving to achievement/maintenance) drops it so a stale number can't
        // keep reading as a commitment the user no longer made.
        outcomeFrequencyPerWeek:
          blueprint.type !== undefined
            ? blueprint.type === "frequency"
              ? blueprint.outcomeFrequencyPerWeek !== undefined
                ? Math.max(1, Math.min(7, blueprint.outcomeFrequencyPerWeek))
                : g.outcomeFrequencyPerWeek
              : undefined
            : g.outcomeFrequencyPerWeek,
        why: blueprint.why !== undefined ? (blueprint.why.trim() || undefined) : g.why,
        desiredOutcome: blueprint.desiredOutcome !== undefined ? (blueprint.desiredOutcome.trim() || undefined) : g.desiredOutcome,
        track: blueprint.track !== undefined ? (blueprint.track.trim() || undefined) : g.track,
        tasks: blueprint.tasks !== undefined ? blueprint.tasks : g.tasks,
        whenWhere: blueprint.whenWhere !== undefined ? (blueprint.whenWhere.trim() || undefined) : g.whenWhere,
        // §14: normalized on write so a half-filled window (start with no end)
        // can never reach storage and read later as a real commitment.
        availability:
          blueprint.availability !== undefined ? normalizeAvailability(blueprint.availability) : g.availability,
        definitionOfDone: blueprint.definitionOfDone !== undefined ? (blueprint.definitionOfDone.trim() || undefined) : g.definitionOfDone,
        obstacle: blueprint.obstacle !== undefined ? (blueprint.obstacle.trim() || undefined) : g.obstacle,
        obstacleMitigation: blueprint.obstacleMitigation !== undefined ? (blueprint.obstacleMitigation.trim() || undefined) : g.obstacleMitigation,
        updatedAt: nowIso()
      };
    });

    let weeklyPlans = state.weeklyPlans;
    if (blueprint.weeklyTargetCount !== undefined) {
      const currentPlan = state.weeklyPlans.find((p) => p.seasonId === existing.seasonId && p.status === "active");
      if (currentPlan) {
        weeklyPlans = state.weeklyPlans.map((p) => {
          if (p.id !== currentPlan.id) return p;
          return {
            ...p,
            goalAllocations: p.goalAllocations.map((a) =>
              a.goalId === goalId ? { ...a, targetCount: blueprint.weeklyTargetCount! } : a
            ),
            updatedAt: nowIso()
          };
        });
      }
    }

    set({ goals: updatedGoals, weeklyPlans });
  },

  addGoalTask: (goalId, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const state = get();
    const newTask: GoalTask = {
      id: createId("task"),
      title: trimmed,
      completed: false,
      createdAt: nowIso()
    };
    set({
      goals: state.goals.map((g) =>
        g.id === goalId ? { ...g, tasks: [...(g.tasks || []), newTask], updatedAt: nowIso() } : g
      )
    });
  },

  toggleGoalTask: (goalId, taskId) => {
    const state = get();
    set({
      goals: state.goals.map((g) => {
        if (g.id !== goalId) return g;
        return {
          ...g,
          tasks: (g.tasks || []).map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
          updatedAt: nowIso()
        };
      })
    });
  },

  deleteGoalTask: (goalId, taskId) => {
    const state = get();
    set({
      goals: state.goals.map((g) => {
        if (g.id !== goalId) return g;
        return {
          ...g,
          tasks: (g.tasks || []).filter((t) => t.id !== taskId),
          updatedAt: nowIso()
        };
      })
    });
  },

  updateGoalTrack: (goalId, track) => {
    const state = get();
    const trimmed = track.trim() || undefined;
    set({
      goals: state.goals.map((g) => (g.id === goalId ? { ...g, track: trimmed, updatedAt: nowIso() } : g))
    });
  },

  addGoalTrack: (name) => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return undefined;
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    const seasonTracks = (state.goalTracks ?? []).filter((track) => track.seasonId === season.id);
    // The cap is on ACTIVE tracks: pausing one frees a slot for a new focus.
    if (seasonTracks.filter((track) => track.status === "active").length >= MAX_ACTIVE_GOAL_TRACKS) {
      return undefined;
    }
    const now = nowIso();
    const track: GoalTrack = {
      id: createId("track"),
      seasonId: season.id,
      name: trimmed,
      order: seasonTracks.reduce((max, item) => Math.max(max, item.order), 0) + 1,
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    set({ goalTracks: [...(state.goalTracks ?? []), track] });
    return track;
  },

  renameGoalTrack: (id, name) => {
    const state = get();
    const existing = (state.goalTracks ?? []).find((track) => track.id === id);
    if (!existing) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === existing.name) return;
    const now = nowIso();
    // Rename rewrites the goal strings in the same set: `Goal.track` holds the
    // NAME, so leaving it stale would strand those goals under a track that no
    // longer exists. Same write, so the two can never be observed apart.
    const oldName = existing.name;
    set({
      goalTracks: (state.goalTracks ?? []).map((track) =>
        track.id === id ? { ...track, name: trimmed, updatedAt: now } : track
      ),
      goals: state.goals.map((goal) =>
        goal.seasonId === existing.seasonId && goal.track === oldName
          ? { ...goal, track: trimmed, updatedAt: now }
          : goal
      )
    });
  },

  removeGoalTrack: (id) => {
    const state = get();
    const existing = (state.goalTracks ?? []).find((track) => track.id === id);
    if (!existing) return;
    // Removes the track only. Goals keep their `track` string and simply read as
    // untracked — deleting a grouping must never destroy the work under it.
    set({ goalTracks: (state.goalTracks ?? []).filter((track) => track.id !== id) });
  },

  reorderGoalTracks: (orderedIds) => {
    const state = get();
    if (orderedIds.length === 0) return;
    const now = nowIso();
    const position = new Map(orderedIds.map((id, index) => [id, index + 1]));
    let changed = false;
    const goalTracks = (state.goalTracks ?? []).map((track) => {
      const nextOrder = position.get(track.id);
      if (nextOrder === undefined || nextOrder === track.order) return track;
      changed = true;
      return { ...track, order: nextOrder, updatedAt: now };
    });
    if (!changed) return;
    set({ goalTracks });
  },

  setGoalTrackStatus: (id, status) => {
    const state = get();
    const existing = (state.goalTracks ?? []).find((track) => track.id === id);
    if (!existing || existing.status === status) return;
    // A track from another season cannot be revived by the active-season guard.
    set({
      goalTracks: (state.goalTracks ?? []).map((track) =>
        track.id === id ? { ...track, status, updatedAt: nowIso() } : track
      )
    });
  },

  reviewWeek: (weekId, decisions, opts) => {
    const state = get();
    const season = state.activeSeason;
    if (!season) return;

    // Side effects below (release / keystone change) are destructive, so they
    // must run once per week. `weeklyReviews` is keyed by weekId, which makes
    // the record idempotent, but a plain re-submit (same "Edit review" pass,
    // or a double-tap on Finish) would re-run releaseGoalFromSeason and
    // overwrite a keystone action the user has since re-set. An unchanged
    // decision set is a no-op; changed decisions still apply.
    const previous = state.weeklyReviews?.[weekId];
    const previousEnergy = previous?.energy;
    const sameDecisions =
      previous !== undefined &&
      previous.skipped !== true &&
      JSON.stringify(previous.decisions ?? {}) === JSON.stringify(decisions ?? {});

    set({
      weeklyReviews: {
        ...state.weeklyReviews,
        [weekId]: {
          date: nowIso(),
          decisions,
          reflection: opts?.reflection,
          restActivity: opts?.restActivity,
          // Keep a previously recorded energy when the caller only re-saves text.
          energy: opts?.energy ?? previousEnergy,
          skipped: opts?.skipped
        }
      }
    });

    if (sameDecisions) return;

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

  reallocateFreeDays: (choice) => {
    const base = snapshot(get());
    const { weeklyPlan } = getOrCreateWeekState(base);
    if (!weeklyPlan) return { valid: false, message: "No weekly plan yet." };
    const { freeDays } = computeWeeklyRhythm(weeklyPlan);
    if (freeDays <= 0) return { valid: false, message: "No free day to place." };

    // Both choices claim ALL free days, so the outcome is always focus+rest=7;
    // a partial claim would leave a residue the UI has no language for.
    const nextAllocations =
      choice.kind === "addToGoal"
        ? weeklyPlan.goalAllocations.map((a) =>
            a.goalId === choice.goalId ? { ...a, targetCount: a.targetCount + freeDays } : a
          )
        : weeklyPlan.goalAllocations;
    if (choice.kind === "addToGoal" && !nextAllocations.some((a) => a.goalId === choice.goalId)) {
      return { valid: false, message: "That goal is not in this week's rhythm." };
    }
    const nextRest = choice.kind === "toRest" ? weeklyPlan.restDayTarget + freeDays : weeklyPlan.restDayTarget;

    // Refuse to write state that breaks the invariant the whole card reads from.
    const check = validateWeeklyAllocation(nextAllocations, nextRest);
    if (!check.valid) return check;

    const timestamp = nowIso();
    const updated: WeeklyPlan = {
      ...weeklyPlan,
      goalAllocations: nextAllocations,
      restDayTarget: nextRest,
      updatedAt: timestamp
    };
    set({ weeklyPlans: base.weeklyPlans.map((p) => (p.id === weeklyPlan.id ? updated : p)) });
    return check;
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
    const raw = session.startedAt || session.createdAt || session.endedAt;
    const sessionDate = raw ? getTodayDateString(new Date(raw)) : getTodayDateString();
    const plan = state.dayPlans.find(
      (day) => day.seasonId === session.seasonId && (day.date === sessionDate || (raw ? day.date === raw.slice(0, 10) : false))
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
      occurredAt: session.startedAt || session.createdAt || session.endedAt || timestamp,
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
    // Safe delete: never destroy entries — reassign them to the default "Lainnya"
    // category so no note (or its blobs) is lost. Blob cleanup is therefore a
    // no-op here (nothing is deleted); reassignment also guarantees the
    // categoryId always resolves to a real category. The last remaining
    // category is undeletable — deleting it would leave dangling categoryIds.
    if (state.notebookCategories.length <= 1) return;
    // Prefer the default fallback, but never the category being deleted
    // (deleting "Lainnya" itself must still land its entries on a live category).
    const fallback =
      state.notebookCategories.find((c) => c.id !== id && c.id === DEFAULT_FALLBACK_NOTEBOOK_CATEGORY_ID) ??
      state.notebookCategories.find((c) => c.id !== id);
    if (!fallback) return;
    const timestamp = nowIso();
    set({
      notebookCategories: state.notebookCategories.filter((c) => c.id !== id),
      notebookEntries: state.notebookEntries.map((e) =>
        e.categoryId === id ? { ...e, categoryId: fallback.id, updatedAt: timestamp } : e
      ),
      notebookCategoryDeletedAt: { ...(state.notebookCategoryDeletedAt ?? {}), [id]: timestamp }
    });
  },

  /**
   * Attach one stored sketch to a note. A note keeps a single sketch: saving a
   * new one retires the previous id and the caller is expected to have removed
   * its `{{img:<id>}}` marker already. Ids are de-duplicated so a re-save of the
   * same blob cannot list it twice.
   */
  saveNotebookDrawing: (entryId, pageIndex, imageId) => {
    const state = get();
    const entry = state.notebookEntries.find((e) => e.id === entryId);
    if (!entry) return;
    const timestamp = nowIso();
    const previous = entry.drawingImageId;
    if (previous === imageId) return;
    set({
      notebookEntries: state.notebookEntries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              drawingImageId: imageId,
              drawingPageIndex: pageIndex,
              images: Array.from(new Set([...(e.images ?? []), imageId])).filter(
                (id) => id !== previous
              ),
              updatedAt: timestamp
            }
          : e
      )
    });
  },

  saveNotebookEntry: (entry) => {
    const state = get();
    const existing = state.notebookEntries.find((e) => e.id === entry.id);
    const timestamp = nowIso();
    const extractedIds = resolveLinkedNoteIds(entry.body || "", state.notebookEntries);
    const mergedLinked = Array.from(new Set([...(entry.linkedNoteIds || []), ...extractedIds]));
    const updated: NotebookEntry = {
      ...entry,
      // The editor owns text, but not the sketch pointer: its payload is built
      // from an entry snapshot and would drop a drawing saved mid-session.
      drawingImageId: entry.drawingImageId ?? existing?.drawingImageId,
      drawingPageIndex: entry.drawingPageIndex ?? existing?.drawingPageIndex,
      linkedNoteIds: mergedLinked,
      updatedAt: timestamp
    };
    set({
      notebookEntries: existing
        ? state.notebookEntries.map((e) => e.id === entry.id ? updated : e)
        : [...state.notebookEntries, { ...updated, createdAt: entry.createdAt || timestamp }]
    });
  },

  duplicateNotebookEntry: (id, copyText) => {
    const state = get();
    const entry = state.notebookEntries.find((e) => e.id === id);
    if (!entry) return undefined;
    const timestamp = nowIso();
    // Localized by the caller (the store has no access to t()). Defaults are
    // the app's default-language (id) strings, so callers that don't pass
    // copyText behave exactly as before.
    const copySuffix = copyText?.copySuffix ?? " (Salinan)";
    const untitledCopyTitle = copyText?.untitledCopyTitle ?? "Salinan Catatan";
    const newEntry: NotebookEntry = {
      ...entry,
      id: createId("nb_entry"),
      title: entry.title ? `${entry.title}${copySuffix}` : untitledCopyTitle,
      isPinned: false,
      // A copy of an archived note must NOT inherit archivedAt: it would be
      // created already-hidden (absent from All and its PARA tab), reading as
      // data loss. Duplicating is an intent to use the note now.
      archivedAt: undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      pages: entry.pages && entry.pages.length > 0 ? [...entry.pages] : (entry.body ? [entry.body] : [""]),
      images: entry.images ? [...entry.images] : [],
      tags: entry.tags ? [...entry.tags] : []
    };
    set({
      notebookEntries: [newEntry, ...state.notebookEntries]
    });
    return newEntry;
  },

  deleteNotebookEntry: (id) => {
    const state = get();
    const entry = state.notebookEntries.find((e) => e.id === id);
    set({
      notebookEntries: state.notebookEntries.filter((e) => e.id !== id),
      // Tombstone the id so the delete survives merge on every device — a
      // delete always wins over a stale resurrect, regardless of updatedAt.
      notebookDeletedAt: { ...(state.notebookDeletedAt ?? {}), [id]: nowIso() }
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

  archiveNotebookEntry: (id) => {
    const state = get();
    const timestamp = nowIso();
    set({
      notebookEntries: state.notebookEntries.map((e) =>
        e.id === id ? { ...e, archivedAt: timestamp, updatedAt: timestamp } : e
      )
    });
  },

  restoreNotebookEntry: (id) => {
    const state = get();
    set({
      notebookEntries: state.notebookEntries.map((e) =>
        e.id === id ? { ...e, archivedAt: undefined, updatedAt: nowIso() } : e
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

  savePackAnswer: (sessionId, questionId, answer, drawingImageId) => {
    const state = get();
    const session = state.journalPackSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const existingIdx = session.answers.findIndex((a) => a.questionId === questionId);
    // `undefined` means "I have no opinion, keep what is there" — a plain text
    // save must not drop a sketch attached to the same answer. `null` means
    // "the sketch is gone", which is what the pad sends after Clear, so the
    // answer stops pointing at a blob that no longer exists.
    const previous = existingIdx >= 0 ? session.answers[existingIdx] : undefined;
    const nextAnswer: JournalPackAnswer = {
      questionId,
      answer,
      drawingImageId: drawingImageId === undefined ? previous?.drawingImageId : drawingImageId ?? undefined
    };
    const answers = existingIdx >= 0
      ? session.answers.map((a) => a.questionId === questionId ? nextAnswer : a)
      : [...session.answers, nextAnswer];
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

  unlockPro: (tier = "lifetime") => {
    const timestamp = nowIso();
    const expiresAt = tier === "season" ? addDaysToDate(getTodayDateString(), 30) : null;
    const allPackIds = get().journalPacks.map((p) => p.id);
    set((state) => ({
      isPro: true,
      proTier: tier,
      proPurchasedAt: timestamp,
      proExpiresAt: expiresAt,
      purchasedPackIds: Array.from(new Set([...state.purchasedPackIds, ...allPackIds]))
    }));
  },

  syncPurchases: async () => {
    // Pull packs confirmed paid via the Bayar GG webhook (Supabase) and merge
    // them into the local unlock set. Safe to call on app start / after checkout.
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
      goalTracks: data.goalTracks !== undefined ? data.goalTracks : state.goalTracks,
      badHabits: data.badHabits !== undefined ? data.badHabits : state.badHabits,
      practices: data.practices !== undefined ? data.practices : state.practices,
      practiceLogs: data.practiceLogs !== undefined ? data.practiceLogs : state.practiceLogs,
      projects: data.projects !== undefined ? data.projects : state.projects,
      weeklyPlans: data.weeklyPlans !== undefined ? data.weeklyPlans : state.weeklyPlans,
      dayPlans: data.dayPlans !== undefined ? data.dayPlans : state.dayPlans,
      focusSessions: data.focusSessions !== undefined ? data.focusSessions : state.focusSessions,
      journalEntries: data.journalEntries !== undefined ? data.journalEntries : state.journalEntries,
      relapseLogs: data.relapseLogs !== undefined ? data.relapseLogs : state.relapseLogs,
      timelineDays: data.timelineDays !== undefined ? data.timelineDays : state.timelineDays,
      learningSessions: data.learningSessions !== undefined ? data.learningSessions : state.learningSessions,
      timelineEvents: data.timelineEvents !== undefined ? data.timelineEvents : state.timelineEvents,
      notebookCategories: data.notebookCategories !== undefined ? data.notebookCategories : state.notebookCategories,
      notebookEntries: data.notebookEntries !== undefined ? data.notebookEntries : state.notebookEntries,
      notebookDeletedAt: data.notebookDeletedAt !== undefined ? data.notebookDeletedAt : state.notebookDeletedAt,
      notebookCategoryDeletedAt: data.notebookCategoryDeletedAt !== undefined ? data.notebookCategoryDeletedAt : state.notebookCategoryDeletedAt,
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
        goalTracks: state.goalTracks,
        badHabits: state.badHabits,
        // §23 positive practices and their logged history. Written by
        // addPractice/logPractice; omitted here they only ever lived in memory,
        // so hydrate's `stored.practices ?? []` wiped them on any reload.
        practices: state.practices,
        practiceLogs: state.practiceLogs,
        // §16 projects — same class of omission as the two above.
        projects: state.projects,
        weeklyPlans: state.weeklyPlans,
        dayPlans: state.dayPlans,
        focusSessions: state.focusSessions,
        journalEntries: state.journalEntries,
        relapseLogs: state.relapseLogs,
        timelineDays: state.timelineDays,
        notificationReminders: state.notificationReminders,
        onboarding: state.onboarding,
        learningSessions: state.learningSessions,
        timelineEvents: state.timelineEvents,
        notebookCategories: state.notebookCategories,
        notebookEntries: state.notebookEntries,
        notebookDeletedAt: state.notebookDeletedAt ?? {},
        notebookCategoryDeletedAt: state.notebookCategoryDeletedAt ?? {},
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
