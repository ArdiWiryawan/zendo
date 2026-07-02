import {
  getCurrentWeekNumber,
  getDaysLeft,
  getDaysPassed,
  getSeasonProgress,
  getTodayDateString
} from "../lib/date";
import type { DayPlan, Goal, MonkMVPState, TimelineDay, WeeklyPlan, FocusSession, LearningSession } from "../types/app";

export function selectActiveGoals(state: MonkMVPState): Goal[] {
  const season = state.activeSeason;
  if (!season) return [];
  return state.goals.filter(
    (goal) => goal.seasonId === season.id && goal.status === "active"
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
  return state.dayPlans.find((plan) => plan.seasonId === season.id && plan.date === today);
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

export function selectLearningEntriesForToday(state: MonkMVPState, today = getTodayDateString()) {
  const plan = selectTodayPlan(state, today);
  if (!plan) return [];
  return state.learningEntries.filter((entry) => entry.dayPlanId === plan.id);
}

export function selectFocusSessionsForToday(state: MonkMVPState, today = getTodayDateString()) {
  const plan = selectTodayPlan(state, today);
  if (!plan) return [];
  return state.focusSessions.filter((session) => session.dayPlanId === plan.id);
}

export function selectTodayFocusSessions(state: MonkMVPState, today = getTodayDateString()): FocusSession[] {
  return state.focusSessions.filter((s) => s.startTime.slice(0, 10) === today || s.startedAt?.slice(0, 10) === today);
}

export function selectTodayLearningSessions(state: MonkMVPState, today = getTodayDateString()): LearningSession[] {
  return state.learningSessions.filter((s) => s.startedAt.slice(0, 10) === today);
}

export function selectTotalFocusSecondsForDate(state: MonkMVPState, date: string): number {
  return state.focusSessions
    .filter((s) => (s.startTime.slice(0, 10) === date || s.startedAt?.slice(0, 10) === date) && ["completed", "ended_early"].includes(s.status))
    .reduce((sum, s) => sum + ((s.focusDurationMinutes ?? s.durationMinutes) * 60), 0);
}

export function selectTotalLearningSecondsForDate(state: MonkMVPState, date: string): number {
  return state.learningSessions
    .filter((s) => s.startedAt.slice(0, 10) === date && s.status === "completed")
    .reduce((sum, s) => sum + s.actualDurationSeconds, 0);
}

export function selectFocusSessionsByGoal(state: MonkMVPState, goalId: string): FocusSession[] {
  return state.focusSessions.filter((s) => s.goalId === goalId);
}

export function selectLearningSessionsByGoal(state: MonkMVPState, goalId: string): LearningSession[] {
  return state.learningSessions.filter((s) => s.relatedGoalId === goalId);
}

export function selectSeasonFocusSummary(state: MonkMVPState, seasonId: string) {
  const sessions = state.focusSessions.filter((s) => s.seasonId === seasonId && ["completed", "ended_early"].includes(s.status));
  const totalSeconds = sessions.reduce((sum, s) => sum + ((s.focusDurationMinutes ?? s.durationMinutes) * 60), 0);
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
