import type { FocusSession, FocusSessionPreset, FocusSessionTimelineDetails, TimelineEvent } from "../types/app";

export type ResolvedFocusSessionStatus = "completed" | "partial" | "abandoned";

export type FocusSessionRecord = Omit<Partial<FocusSession>, "status"> &
  Omit<Partial<FocusSessionTimelineDetails>, "status"> & {
    mode?: FocusSessionPreset | "deepWork" | "deep_work";
    status?: string;
    totalDurationSeconds?: number;
    focusDurationSeconds?: number;
    breakDurationSeconds?: number;
    segmentsCompleted?: number;
    expectedTotalDurationSeconds?: number;
    expectedFocusDurationSeconds?: number;
    expectedBreakDurationSeconds?: number;
    expectedSegmentsCompleted?: number;
    completedAt?: string;
  };

export type ExpectedFocusSessionConfig = {
  expectedTotalDurationSeconds: number;
  expectedFocusDurationSeconds: number;
  expectedBreakDurationSeconds: number;
  expectedSegmentsCompleted: number;
};

function minutesToSeconds(minutes?: number) {
  return typeof minutes === "number" && Number.isFinite(minutes) ? Math.max(0, Math.round(minutes * 60)) : undefined;
}

function normalizePreset(mode?: string | null): FocusSessionPreset | null {
  if (mode === "deepWork" || mode === "deep_work") return "deep_work";
  if (mode === "pomodoro" || mode === "custom") return mode;
  return null;
}

export function getFocusSessionPreset(session: FocusSessionRecord): FocusSessionPreset {
  return normalizePreset(session.preset) ?? normalizePreset(session.timerMode) ?? normalizePreset(session.mode) ?? "deep_work";
}

export function getExpectedSessionConfig(mode?: FocusSessionPreset | "deepWork" | "deep_work" | null): ExpectedFocusSessionConfig | null {
  const preset = normalizePreset(mode);

  if (preset === "deep_work") {
    return {
      expectedTotalDurationSeconds: 120 * 60,
      expectedFocusDurationSeconds: 100 * 60,
      expectedBreakDurationSeconds: 20 * 60,
      expectedSegmentsCompleted: 4
    };
  }

  if (preset === "pomodoro") {
    return {
      expectedTotalDurationSeconds: 120 * 60,
      expectedFocusDurationSeconds: 100 * 60,
      expectedBreakDurationSeconds: 20 * 60,
      expectedSegmentsCompleted: 8
    };
  }

  return null;
}

function sumCompletedPhaseSeconds(session: FocusSessionRecord, type?: "focus" | "break") {
  if (!session.phases?.length) return undefined;

  return session.phases
    .filter((phase) => !type || phase.type === type)
    .reduce((sum, phase) => sum + (minutesToSeconds(phase.completedMinutes) ?? 0), 0);
}

export function getFocusSessionTiming(session: FocusSessionRecord) {
  const focusDurationSeconds =
    session.focusDurationSeconds ??
    minutesToSeconds(session.focusDurationMinutes) ??
    sumCompletedPhaseSeconds(session, "focus") ??
    minutesToSeconds(session.durationMinutes);

  const explicitTotalDurationSeconds =
    session.totalDurationSeconds ??
    session.actualDurationSeconds ??
    minutesToSeconds(session.completedDurationMinutes);

  const totalDurationSeconds =
    explicitTotalDurationSeconds ??
    sumCompletedPhaseSeconds(session) ??
    (
      focusDurationSeconds !== undefined || session.breakDurationSeconds !== undefined || session.breakDurationMinutes !== undefined
        ? (focusDurationSeconds ?? 0) + (session.breakDurationSeconds ?? minutesToSeconds(session.breakDurationMinutes) ?? 0)
        : undefined
    );

  const breakDurationSeconds =
    session.breakDurationSeconds ??
    minutesToSeconds(session.breakDurationMinutes) ??
    sumCompletedPhaseSeconds(session, "break") ??
    (
      totalDurationSeconds !== undefined && focusDurationSeconds !== undefined
        ? Math.max(0, totalDurationSeconds - focusDurationSeconds)
        : undefined
    );

  const segmentsCompleted =
    session.segmentsCompleted ??
    (
      typeof session.completedFocusBlocks === "number" || typeof session.completedBreakBlocks === "number"
        ? (session.completedFocusBlocks ?? 0) + (session.completedBreakBlocks ?? 0)
        : undefined
    ) ??
    session.phases?.filter((phase) => phase.status === "completed").length ??
    0;

  return {
    focusDurationSeconds: focusDurationSeconds ?? 0,
    breakDurationSeconds: breakDurationSeconds ?? 0,
    totalDurationSeconds: totalDurationSeconds ?? (focusDurationSeconds ?? 0) + (breakDurationSeconds ?? 0),
    segmentsCompleted
  };
}

export function resolveFocusSessionStatus(session: FocusSessionRecord): ResolvedFocusSessionStatus {
  if (session.status === "completed") return "completed";
  if (session.status === "abandoned") return "abandoned";

  const config = getExpectedSessionConfig(getFocusSessionPreset(session));
  if (!config) return session.status === "abandoned" ? "abandoned" : "partial";

  const timing = getFocusSessionTiming(session);
  const completedByFocusAndBreak =
    timing.focusDurationSeconds >= config.expectedFocusDurationSeconds &&
    timing.breakDurationSeconds >= config.expectedBreakDurationSeconds;
  const completedByTotalAndSegments =
    timing.totalDurationSeconds >= config.expectedTotalDurationSeconds &&
    timing.segmentsCompleted >= config.expectedSegmentsCompleted;
  const completedByTotalOnly = timing.totalDurationSeconds >= config.expectedTotalDurationSeconds;
  const completedByCompletedAtAndSegments =
    Boolean(session.completedAt || session.endedAt) &&
    timing.segmentsCompleted >= config.expectedSegmentsCompleted;

  if (
    completedByFocusAndBreak ||
    completedByTotalAndSegments ||
    completedByTotalOnly ||
    completedByCompletedAtAndSegments
  ) {
    return "completed";
  }

  return "partial";
}

export function normalizeFocusSessionRecord<T extends FocusSessionRecord>(session: T): T {
  const preset = getFocusSessionPreset(session);
  const config = getExpectedSessionConfig(preset);
  const timing = getFocusSessionTiming(session);
  const resolvedStatus = resolveFocusSessionStatus(session);

  return {
    ...session,
    preset: session.preset ?? preset,
    status: resolvedStatus === "completed" ? "completed" : session.status,
    totalDurationSeconds: session.totalDurationSeconds ?? timing.totalDurationSeconds,
    focusDurationSeconds: session.focusDurationSeconds ?? timing.focusDurationSeconds,
    breakDurationSeconds: session.breakDurationSeconds ?? timing.breakDurationSeconds,
    segmentsCompleted: session.segmentsCompleted ?? timing.segmentsCompleted,
    ...(config ?? {})
  };
}

function formatMinutes(seconds: number) {
  return `${Math.round(seconds / 60)} min`;
}

function formatTotal(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}h`;
  if (minutes > 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes} min`;
}

export function formatFocusSessionTimelineDescription(session: FocusSessionRecord, suffix?: string) {
  const timing = getFocusSessionTiming(session);
  const parts = [
    `${formatMinutes(timing.focusDurationSeconds)} focus`,
    timing.breakDurationSeconds > 0 ? `${formatMinutes(timing.breakDurationSeconds)} break` : null,
    `${formatTotal(timing.totalDurationSeconds)} total`,
    suffix
  ].filter(Boolean);

  return parts.join(" · ");
}

export function normalizeFocusTimelineEvent(event: TimelineEvent, focusSessions: FocusSession[] = []): TimelineEvent {
  if (event.type !== "focus_session") return event;

  const sourceSession = focusSessions.find((session) => session.id === event.sourceId);
  const record = event.focusSession ?? sourceSession;
  if (!record) return event;

  const normalizedRecord = normalizeFocusSessionRecord(record);
  const resolvedStatus = resolveFocusSessionStatus(normalizedRecord);
  if (resolvedStatus !== "completed") {
    return event.focusSession ? { ...event, focusSession: normalizedRecord as FocusSessionTimelineDetails } : event;
  }

  const preset = getFocusSessionPreset(normalizedRecord);
  const label = preset === "deep_work" ? "Deep Work" : preset === "pomodoro" ? "Pomodoro" : "Custom";

  return {
    ...event,
    title: `${label} completed`,
    description: formatFocusSessionTimelineDescription(normalizedRecord),
    focusSession: event.focusSession ? normalizedRecord as FocusSessionTimelineDetails : event.focusSession
  };
}

export function normalizeFocusTimelineEvents(events: TimelineEvent[] = [], focusSessions: FocusSession[] = []) {
  return events.map((event) => normalizeFocusTimelineEvent(event, focusSessions));
}
