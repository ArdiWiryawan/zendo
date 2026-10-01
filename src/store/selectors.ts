import {
  getCurrentWeekNumber,
  getDaysLeft,
  getDaysPassed,
  getSeasonProgress,
  getTodayDateString
} from "../lib/date";
import { isNewerDayPlan } from "../lib/dayPlans";
import type { DayPlan, EnergyLevel, Goal, MonkMVPState, TimelineDay, WeeklyPlan, FocusSession, LearningSession } from "../types/app";

export function selectActiveGoals(state: MonkMVPState): Goal[] {
  const season = state.activeSeason;
  if (!season) return [];
  // Legacy goals may predate seasonId; with a single active season they belong
  // to it — otherwise the Today picker silently dies.
  return state.goals.filter(
    (goal) => goal.status === "active" && (goal.seasonId === season.id || !goal.seasonId)
  );
}

export function selectCurrentWeeklyPlan(
  state: MonkMVPState,
  today = getTodayDateString()
): WeeklyPlan | undefined {
  const season = state.activeSeason;
  if (!season) return undefined;
  const weekNumber = getCurrentWeekNumber(season.startDate, today);
  return state.weeklyPlans.find(
    (plan) => plan.seasonId === season.id && plan.weekNumber === weekNumber
  );
}

export function selectTodayPlan(
  state: MonkMVPState,
  today = getTodayDateString()
): DayPlan | undefined {
  const season = state.activeSeason;
  if (!season) return undefined;
  // Newest match, not the first one. Two devices could historically each create
  // a row for the same day (different ids, no dedupe), and array order differs
  // per device — which made the phone and the laptop resolve different records,
  // each with its own goalId/timeBlocks/status. mergeRemoteState now collapses
  // those pairs; this tie-break covers rows already stored before that fix.
  return state.dayPlans
    .filter((plan) => plan.seasonId === season.id && plan.date === today)
    .reduce<DayPlan | undefined>(
      (best, plan) => (!best || isNewerDayPlan(plan, best) ? plan : best),
      undefined
    );
}

export function selectGoalById(state: MonkMVPState, goalId?: string) {
  return goalId ? state.goals.find((goal) => goal.id === goalId) : undefined;
}

export function selectSeasonProgress(state: MonkMVPState, today = getTodayDateString()) {
  const season = state.activeSeason;
  if (!season) return null;
  return {
    daysPassed: getDaysPassed(season.startDate, today),
    daysLeft: getDaysLeft(season.endDate, today),
    progressPercent: getSeasonProgress(season, today),
    weekNumber: getCurrentWeekNumber(season.startDate, today)
  };
}

export function selectTimelineDaysForActiveSeason(state: MonkMVPState): TimelineDay[] {
  const season = state.activeSeason;
  if (!season) return [];
  return state.timelineDays.filter((day) => day.seasonId === season.id);
}

export function selectJournalEntryForToday(state: MonkMVPState, today = getTodayDateString()) {
  const season = state.activeSeason;
  if (!season) return undefined;
  return state.journalEntries.find((entry) => entry.seasonId === season.id && entry.date === today);
}

export function selectFocusSessionsForToday(state: MonkMVPState, today = getTodayDateString()) {
  const plan = selectTodayPlan(state, today);
  if (!plan) return [];
  return state.focusSessions.filter((session) => session.dayPlanId === plan.id);
}

// All date-scoped selectors below filter by the ACTIVE season. Old-season
// records stay in the store (history preserved) but must not leak into the
// current season's views when a calendar date is shared across seasons.
// ponytail: an explicit `seasonId` param (defaulting to activeSeason.id) is the
// upgrade path if a cross-season date query ever appears.

export function selectTodayFocusSessions(state: MonkMVPState, today = getTodayDateString()): FocusSession[] {
  const seasonId = state.activeSeason?.id;
  if (!seasonId) return [];
  return state.focusSessions.filter((s) => {
    if (s.seasonId && s.seasonId !== seasonId) return false;
    if (!["completed", "ended_early"].includes(s.status) && (s.focusDurationMinutes ?? 0) <= 0) return false;

    if (s.dayPlanId) {
      const boundPlan = state.dayPlans.find((p) => p.id === s.dayPlanId);
      if (boundPlan) return boundPlan.date === today;
    }

    const raw = s.startedAt || s.createdAt || s.startTime;
    if (!raw) return false;
    const sessionDate = getTodayDateString(new Date(raw));
    return sessionDate === today || raw.slice(0, 10) === today;
  });
}

export function selectTodayLearningSessions(state: MonkMVPState, today = getTodayDateString()): LearningSession[] {
  const seasonId = state.activeSeason?.id;
  if (!seasonId) return [];
  return state.learningSessions.filter((s) => {
    if (s.seasonId && s.seasonId !== seasonId) return false;
    if (s.status !== "completed") return false;

    if (s.dayPlanId) {
      const boundPlan = state.dayPlans.find((p) => p.id === s.dayPlanId);
      if (boundPlan) return boundPlan.date === today;
    }

    const raw = s.startedAt || s.createdAt;
    if (!raw) return false;
    const sessionDate = getTodayDateString(new Date(raw));
    return sessionDate === today || raw.slice(0, 10) === today;
  });
}

export function selectTotalFocusSecondsForDate(state: MonkMVPState, date: string): number {
  const seasonId = state.activeSeason?.id;
  if (!seasonId) return 0;
  return state.focusSessions
    .filter((s) => {
      if (s.seasonId && s.seasonId !== seasonId) return false;
      const isValidStatus = ["completed", "ended_early"].includes(s.status) || (s.focusDurationMinutes ?? 0) > 0;
      if (!isValidStatus) return false;

      if (s.dayPlanId) {
        const boundPlan = state.dayPlans.find((p) => p.id === s.dayPlanId);
        if (boundPlan) return boundPlan.date === date;
      }

      const raw = s.startedAt || s.createdAt || s.startTime;
      if (!raw) return false;
      const sessionDate = getTodayDateString(new Date(raw));
      return sessionDate === date || raw.slice(0, 10) === date;
    })
    .reduce((sum, s) => {
      const mins = s.focusDurationMinutes ?? s.completedDurationMinutes ?? s.durationMinutes ?? 0;
      return sum + (mins * 60);
    }, 0);
}

export function selectTotalLearningSecondsForDate(state: MonkMVPState, date: string): number {
  const seasonId = state.activeSeason?.id;
  if (!seasonId) return 0;
  return state.learningSessions
    .filter((s) => {
      if (s.seasonId && s.seasonId !== seasonId) return false;
      if (s.status !== "completed") return false;

      if (s.dayPlanId) {
        const boundPlan = state.dayPlans.find((p) => p.id === s.dayPlanId);
        if (boundPlan) return boundPlan.date === date;
      }

      const raw = s.startedAt || s.createdAt;
      if (!raw) return false;
      const sessionDate = getTodayDateString(new Date(raw));
      return sessionDate === date || raw.slice(0, 10) === date;
    })
    .reduce((sum, s) => sum + (s.actualDurationSeconds || 0), 0);
}

export function selectFocusSessionsByGoal(state: MonkMVPState, goalId: string): FocusSession[] {
  return state.focusSessions.filter((s) => s.goalId === goalId);
}

export function selectLearningSessionsByGoal(state: MonkMVPState, goalId: string): LearningSession[] {
  return state.learningSessions.filter((s) => s.relatedGoalId === goalId);
}

export function selectSeasonFocusSummary(state: MonkMVPState, seasonId: string) {
  const sessions = state.focusSessions.filter(
    (s) => (s.seasonId === seasonId || !s.seasonId) && (["completed", "ended_early"].includes(s.status) || (s.focusDurationMinutes ?? 0) > 0)
  );
  const totalSeconds = sessions.reduce((sum, s) => {
    const mins = s.focusDurationMinutes ?? s.completedDurationMinutes ?? s.durationMinutes ?? 0;
    return sum + (mins * 60);
  }, 0);
  return {
    count: sessions.length,
    totalSeconds,
    totalMinutes: Math.round(totalSeconds / 60)
  };
}

export function selectSeasonLearningSummary(state: MonkMVPState, seasonId: string) {
  const sessions = state.learningSessions.filter((s) => s.seasonId === seasonId && s.status === "completed");
  const totalSeconds = sessions.reduce((sum, s) => sum + s.actualDurationSeconds, 0);
  return {
    count: sessions.length,
    totalSeconds,
    totalMinutes: Math.round(totalSeconds / 60)
  };
}

export function selectEnergyForDate(state: MonkMVPState, date: string): EnergyLevel | undefined {
  return state.energyLogs.find((e) => e.date === date)?.level;
}

export function selectSeasonGoals(state: MonkMVPState, seasonId: string): Goal[] {
  return state.goals.filter((g) => g.seasonId === seasonId);
}

export function selectSeasonDayPlanCounts(state: MonkMVPState, seasonId: string) {
  const days = state.dayPlans.filter((d) => d.seasonId === seasonId);
  return { planned: days.length, completed: days.filter((d) => d.status === "completed").length };
}
