import type { FocusSession, FocusSessionPhase, FocusSessionPreset, FocusSessionTimelineDetails } from "../types/app";
import { getExpectedSessionConfig } from "./focusSessionStatus";

export type FocusPresetConfig = {
  id: FocusSessionPreset;
  title: string;
  shortLabel: string;
  description: string;
  summary: string;
  buildPhases: (customMinutes?: number) => FocusSessionPhase[];
};

function phase(type: FocusSessionPhase["type"], label: string, plannedMinutes: number): FocusSessionPhase {
  return {
    type,
    label,
    plannedMinutes,
    completedMinutes: 0,
    status: "pending"
  };
}

export const FOCUS_PRESETS: Record<FocusSessionPreset, FocusPresetConfig> = {
  custom: {
    id: "custom",
    title: "Custom Focus Session",
    shortLabel: "Custom",
    description: "Choose your own focus duration.",
    summary: "Choose your own focus duration.",
    buildPhases: (customMinutes = 50) => [phase("focus", "Custom Focus", customMinutes)]
  },
  deep_work: {
    id: "deep_work",
    title: "Deep Work Focus Session",
    shortLabel: "Deep Work",
    description: "Best for serious work. 50 minutes focus, 10 minutes rest, repeated twice.",
    summary: "2 hours total · 50 min deep work + 10 min break x 2",
    buildPhases: () => [
      phase("focus", "Deep Work 1", 50),
      phase("break", "Break 1", 10),
      phase("focus", "Deep Work 2", 50),
      phase("break", "Break 2", 10)
    ]
  },
  pomodoro: {
    id: "pomodoro",
    title: "Pomodoro Focus Session",
    shortLabel: "Pomodoro",
    description: "Best for getting started. 25 minutes focus, 5 minutes rest, repeated 4 times.",
    summary: "4 rounds · 25 min focus + 5 min break",
    buildPhases: () => [
      phase("focus", "Pomodoro 1", 25),
      phase("break", "Break 1", 5),
      phase("focus", "Pomodoro 2", 25),
      phase("break", "Break 2", 5),
      phase("focus", "Pomodoro 3", 25),
      phase("break", "Break 3", 5),
      phase("focus", "Pomodoro 4", 25),
      phase("break", "Break 4", 5)
    ]
  }
};

export function createFocusPhases(preset: FocusSessionPreset, customMinutes?: number) {
  return FOCUS_PRESETS[preset].buildPhases(customMinutes).map((item, index) => ({
    ...item,
    status: index === 0 ? "running" as const : "pending" as const
  }));
}

export function getCurrentFocusPhase(session: FocusSession): FocusSessionPhase {
  const phases = session.phases?.length
    ? session.phases
    : createFocusPhases(session.timerMode ?? "deep_work", session.durationMinutes);
  return phases[session.currentPhaseIndex ?? 0] ?? phases[0];
}

export function getTotalPlannedMinutes(phases: FocusSessionPhase[]) {
  return phases.reduce((sum, item) => sum + item.plannedMinutes, 0);
}

export function getCompletedSeconds(session: FocusSession) {
  const phases = session.phases ?? [];
  const currentIndex = session.currentPhaseIndex ?? 0;
  return phases.reduce((sum, item, index) => {
    const phaseSeconds = index === currentIndex && ["running", "paused"].includes(session.status)
      ? Math.max(item.completedMinutes * 60, session.elapsedSeconds ?? 0)
      : item.completedMinutes * 60;
    return sum + phaseSeconds;
  }, 0);
}

export function summarizeFocusSession(
  session: FocusSession,
  endedAt: string,
  status: FocusSessionTimelineDetails["status"],
  phaseElapsedSeconds = session.elapsedSeconds ?? 0
): FocusSessionTimelineDetails {
  const phases = (session.phases?.length
    ? session.phases
    : createFocusPhases(session.preset ?? session.timerMode ?? "deep_work", session.durationMinutes)
  ).map((item, index) => {
    if (index !== (session.currentPhaseIndex ?? 0) || status === "completed") return item;
    const completedMinutes = Math.min(item.plannedMinutes, Math.floor(phaseElapsedSeconds / 60));
    return {
      ...item,
      completedMinutes,
      status: status === "ended_early" ? "ended_early" as const : item.status
    };
  });

  const plannedDurationMinutes = session.plannedDurationMinutes ?? getTotalPlannedMinutes(phases);
  const completedDurationMinutes = phases.reduce((sum, item) => sum + item.completedMinutes, 0);
  const focusDurationMinutes = phases
    .filter((item) => item.type === "focus")
    .reduce((sum, item) => sum + item.completedMinutes, 0);
  const breakDurationMinutes = phases
    .filter((item) => item.type === "break")
    .reduce((sum, item) => sum + item.completedMinutes, 0);
  const completedFocusBlocks = phases.filter((item) => item.type === "focus" && item.status === "completed").length;
  const completedBreakBlocks = phases.filter((item) => item.type === "break" && item.status === "completed").length;
  const totalFocusBlocks = phases.filter((item) => item.type === "focus").length;
  const totalBreakBlocks = phases.filter((item) => item.type === "break").length;
  const preset = session.preset ?? session.timerMode ?? "deep_work";
  const title = FOCUS_PRESETS[preset].title;
  const expectedConfig = getExpectedSessionConfig(preset);
  const totalDurationSeconds = completedDurationMinutes * 60;
  const focusDurationSeconds = focusDurationMinutes * 60;
  const breakDurationSeconds = breakDurationMinutes * 60;
  const segmentsCompleted = completedFocusBlocks + completedBreakBlocks;

  return {
    id: session.id,
    type: "focus_session",
    preset,
    title,
    startedAt: session.startedAt ?? session.startTime,
    endedAt,
    completedAt: status === "completed" ? endedAt : undefined,
    plannedDurationMinutes,
    completedDurationMinutes,
    totalDurationSeconds,
    focusDurationSeconds,
    breakDurationSeconds,
    segmentsCompleted,
    ...(expectedConfig ?? {}),
    focusDurationMinutes,
    breakDurationMinutes,
    completedFocusBlocks,
    completedBreakBlocks,
    totalFocusBlocks,
    totalBreakBlocks,
    status,
    phases
  };
}
