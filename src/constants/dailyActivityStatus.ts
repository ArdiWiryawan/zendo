import type { FocusSession, LearningSession, TimelineStatus } from "../types/app";

export type DailyActivity = {
  focusSessions?: Array<
    Pick<FocusSession, "id"> &
    Partial<Pick<FocusSession, "status" | "completedDurationMinutes" | "focusDurationMinutes" | "durationMinutes">>
  >;
  learningSessions?: Array<
    Pick<LearningSession, "id"> &
    Partial<Pick<LearningSession, "status" | "actualDurationSeconds">>
  >;
};

export type DailyActivityStatus = Extract<TimelineStatus, "not_started" | "partial" | "completed">;

export const DAILY_STATUS_LABELS: Record<DailyActivityStatus, string> = {
  not_started: "Not started",
  partial: "Partial",
  completed: "Completed"
};

export function resolveDailyActivityStatus(day: DailyActivity): DailyActivityStatus {
  const focusSessions = day.focusSessions ?? [];
  const learningSessions = day.learningSessions ?? [];

  if (focusSessions.length === 0 && learningSessions.length === 0) {
    return "not_started";
  }

  // 1. Check if any focus session is completed (e.g. completed Pomodoro 25m, Deep Work, etc.)
  const hasCompletedFocusSession = focusSessions.some(
    (s) => s.status === "completed"
  );

  // 2. Calculate total focus minutes logged for the day
  const totalFocusMinutes = focusSessions.reduce((sum, s) => {
    const mins = s.completedDurationMinutes ?? s.focusDurationMinutes ?? s.durationMinutes ?? 0;
    return sum + mins;
  }, 0);

  // 3. Calculate total learning minutes logged for the day
  const totalLearningMinutes = learningSessions.reduce((sum, s) => {
    const mins = s.actualDurationSeconds ? Math.round(s.actualDurationSeconds / 60) : 0;
    return sum + mins;
  }, 0);

  const hasCompletedLearning = learningSessions.some((s) => s.status === "completed");

  // DONE (completed):
  // - Completed any standard session (pomodoro, deep work, etc. with status === "completed")
  // - OR total accumulated focus is at least 30 minutes (e.g. 100 min deep work, or multiple blocks)
  // - OR learning session is completed and focus is at least 15 min
  // - OR both focus and learning sessions are present (compatibility)
  if (
    hasCompletedFocusSession ||
    totalFocusMinutes >= 30 ||
    (hasCompletedLearning && (totalFocusMinutes >= 15 || totalLearningMinutes >= 30)) ||
    (focusSessions.length > 0 && learningSessions.length > 0)
  ) {
    return "completed";
  }

  // PARTIAL:
  // - Stopped in the middle (ended early) or focus duration < 30 minutes without a completed session
  if (focusSessions.length > 0 || learningSessions.length > 0) {
    return "partial";
  }

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
