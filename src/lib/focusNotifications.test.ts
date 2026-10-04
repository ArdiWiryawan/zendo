import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("running session boundaries are strictly ascending and never in the past", () => {
    // Ordering contract the sync layer relies on: it dedupes by triggerTime and
    // cancels anything not in the expected set, so an out-of-order or past
    // boundary would make the schedule churn.
    const now = T0 + 5 * MIN;
    const out = computeFocusNotificationSchedule(session(), now);
    const times = out.map((n) => n.triggerTime);
    expect(times.every((t) => t > now)).toBe(true);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("provided phases take precedence over preset-derived ones", () => {
    // 2-phase session: the schedule must follow session.phases, not deep_work's
    // default 4 phases (createFocusPhases fallback).
    const twoPhase = session({
      phases: [
        { type: "focus", label: "Sprint", plannedMinutes: 25, completedMinutes: 0, status: "running" },
        { type: "break", label: "Short break", plannedMinutes: 5, completedMinutes: 0, status: "pending" }
      ]
    });
    const out = computeFocusNotificationSchedule(twoPhase, T0);
    expect(out.map((n) => n.triggerTime)).toEqual([T0 + 25 * MIN, T0 + 30 * MIN]);
  });

  describe("after a phase advance / pause-resume (regression)", () => {
    // startTime is the CURRENT phase's start and currentPhaseIndex says which
    // phase that is. The schedule must anchor there, not at index 0 — otherwise
    // every boundary drifts by the elapsed time and is mislabeled.
    it("break boundary stays anchored to the current phase start, not re-derived from index 0", () => {
      const t1 = T0 + 50 * MIN; // focus 1 (50m) just completed → break 1 begins now.
      const advanced = session({
        startTime: new Date(t1).toISOString(),
        currentPhaseIndex: 1
      });
      const out = computeFocusNotificationSchedule(advanced, t1);
      expect(out.map((n) => n.triggerTime)).toEqual([
        t1 + 10 * MIN, // break 1 ends  (T0+60)  — was wrongly T0+110 before the fix
        t1 + 60 * MIN, // focus 2 ends  (T0+110)
        t1 + 70 * MIN  // break 2 ends  (T0+120) = session complete
      ]);
      expect(out[0]).toMatchObject({ title: "Focus block" }); // break 1 → focus 2
      expect(out[2]).toMatchObject({ title: "Session complete" });
    });

    it("in the middle of a break schedules the real break end, not a focus boundary", () => {
      const t1 = T0 + 50 * MIN;
      const inBreak = session({ startTime: new Date(t1).toISOString(), currentPhaseIndex: 1 });
      const out = computeFocusNotificationSchedule(inBreak, t1 + 4 * MIN); // 4m into the 10m break
      expect(out.map((n) => n.triggerTime)).toEqual([t1 + 10 * MIN, t1 + 60 * MIN, t1 + 70 * MIN]);
    });

    it("resume mid-phase keeps the boundary absolute (startTime rebased to now - phaseElapsed)", () => {
      // 30m into a 50m focus phase, paused then resumed → startTime = now-30m.
      const now = T0 + 120 * MIN;
      const resumed = session({ startTime: new Date(now - 30 * MIN).toISOString(), currentPhaseIndex: 0 });
      const out = computeFocusNotificationSchedule(resumed, now);
      expect(out[0]?.triggerTime).toBe(now + 20 * MIN); // 20m of focus left, then break
      expect(out[0]).toMatchObject({ title: "Break time" });
    });
  });

  describe("with a mocked clock", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("paused mid-session yields [] so the sync layer closes pending triggers", () => {
      vi.useFakeTimers();
      vi.setSystemTime(T0 + 30 * MIN);
      // 30 min into a 50 min first phase; if paused were not guarded, the
      // remaining focus/break boundaries would still be scheduled and fire.
      const out = computeFocusNotificationSchedule(session({ status: "paused" }));
      expect(out).toEqual([]);
    });

    it("completed after the last boundary yields []", () => {
      vi.useFakeTimers();
      vi.setSystemTime(T0 + 130 * MIN);
      expect(computeFocusNotificationSchedule(session({ status: "completed" }))).toEqual([]);
    });
  });
});
