import type { FocusSession, LearningSession, TimelineStatus } from "../types/app";

export type DailyActivity = {
  focusSessions?: Array<Pick<FocusSession, "id">>;
  learningSessions?: Array<Pick<LearningSession, "id">>;
};

export type DailyActivityStatus = Extract<TimelineStatus, "not_started" | "partial" | "completed">;

export const DAILY_STATUS_LABELS: Record<DailyActivityStatus, string> = {
  not_started: "Not started",
  partial: "Partial",
  completed: "Completed"
};

export function resolveDailyActivityStatus(day: DailyActivity): DailyActivityStatus {
  const hasFocusSession = (day.focusSessions ?? []).length > 0;
  const hasLearningSession = (day.learningSessions ?? []).length > 0;

  if (hasFocusSession && hasLearningSession) return "completed";
  if (hasFocusSession || hasLearningSession) return "partial";
  return "not_started";
}

export function getDailyStatusHelper(day: DailyActivity) {
  const hasFocusSession = (day.focusSessions ?? []).length > 0;
  const hasLearningSession = (day.learningSessions ?? []).length > 0;

  if (hasFocusSession && hasLearningSession) return "Focus done · Learning done";
  if (hasFocusSession) return "Focus done · Learning not yet";
  if (hasLearningSession) return "Learning done · Focus not yet";
  return "No activity yet";
}
