import { describe, expect, it } from "vitest";
import type { FocusSession } from "../types/app";
import { computeFocusNotificationSchedule } from "./focusNotifications";

const T0 = new Date("2026-08-10T08:00:00Z").getTime();
const MIN = 60 * 1000;

function session(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: "s1",
    seasonId: "sea_1",
    weeklyPlanId: "wp_1",
    dayPlanId: "dp_1",
    startTime: new Date(T0).toISOString(),
    durationMinutes: 50,
    status: "running",
    preset: "deep_work",
    timerState: "work",
    elapsedSeconds: 0,
    currentPhaseIndex: 0,
    phases: [
      { type: "focus", label: "Deep Work 1", plannedMinutes: 50, completedMinutes: 0, status: "running" },
      { type: "break", label: "Break 1", plannedMinutes: 10, completedMinutes: 0, status: "pending" },
      { type: "focus", label: "Deep Work 2", plannedMinutes: 50, completedMinutes: 0, status: "pending" },
      { type: "break", label: "Break 2", plannedMinutes: 10, completedMinutes: 0, status: "pending" }
    ],
    createdAt: new Date(T0).toISOString(),
    updatedAt: new Date(T0).toISOString(),
    ...overrides
  };
}

describe("computeFocusNotificationSchedule", () => {
  it("in-phase (just started) schedules all future boundaries", () => {
    const out = computeFocusNotificationSchedule(session(), T0);
    expect(out.map((n) => n.triggerTime)).toEqual([
      T0 + 50 * MIN,
      T0 + 60 * MIN,
      T0 + 110 * MIN,
      T0 + 120 * MIN
    ]);
    expect(out[0]).toMatchObject({ title: "Break time", body: "Step away and recharge." });
    expect(out[1]).toMatchObject({ title: "Focus block", body: "Back to deep work. You've got this." });
    expect(out[3]).toMatchObject({ title: "Session complete", body: "You did the work. Rest well." });
  });

  it("reopen after partial elapse schedules only future boundaries (no duplicates of crossed)", () => {
    // 62 min in = first focus done, in the middle of break 1.
    const out = computeFocusNotificationSchedule(session(), T0 + 62 * MIN);
    expect(out.map((n) => n.triggerTime)).toEqual([T0 + 110 * MIN, T0 + 120 * MIN]);
  });

  it("exactly at a boundary counts as crossed (catch-up handles it, not a notification)", () => {
    const out = computeFocusNotificationSchedule(session(), T0 + 50 * MIN);
    expect(out.map((n) => n.triggerTime)).toEqual([T0 + 60 * MIN, T0 + 110 * MIN, T0 + 120 * MIN]);
  });

  it("paused session returns nothing (cancel everything)", () => {
    expect(computeFocusNotificationSchedule(session({ status: "paused" }), T0)).toEqual([]);
  });

  it("completed / ended / abandoned sessions return nothing", () => {
    for (const status of ["completed", "ended_early", "abandoned"] as const) {
      expect(computeFocusNotificationSchedule(session({ status }), T0)).toEqual([]);
    }
  });

  it("single-phase custom session schedules one complete boundary", () => {
    const custom = session({
      preset: "custom",
      durationMinutes: 50,
      phases: [{ type: "focus", label: "Custom Focus", plannedMinutes: 50, completedMinutes: 0, status: "running" }]
    });
    const out = computeFocusNotificationSchedule(custom, T0);
    expect(out).toEqual([{ triggerTime: T0 + 50 * MIN, title: "Session complete", body: "You did the work. Rest well." }]);
  });
});
