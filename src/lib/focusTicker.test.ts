import { describe, expect, it } from "vitest";
import type { FocusSession } from "../types/app";
import { planFocusTick } from "./focusTicker.worker";

const T0 = new Date("2026-08-10T08:00:00Z").getTime();

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

describe("planFocusTick", () => {
  it("in-phase tick emits elapsedSeconds clamped to the phase plan", () => {
    const plan = planFocusTick(session(), T0 + 65 * 1000);
    expect(plan.actions).toEqual([{ type: "tick", elapsedSeconds: 65 }]);
    expect(plan.bell).toBeUndefined();
  });

  it("single boundary advance at the end of the first focus block", () => {
    const plan = planFocusTick(session(), T0 + 50 * 60 * 1000);
    expect(plan.actions).toEqual([{ type: "advance" }]);
    expect(plan.bell).toEqual({ title: "Break time", body: "Step away and recharge.", vibrate: [200, 100, 200] });
  });

  it("multi-phase catch-up crosses focus+break+focus with one bell for the settled phase", () => {
    const plan = planFocusTick(session(), T0 + (50 + 10 + 50 + 9) * 60 * 1000);
    expect(plan.actions).toEqual([{ type: "advance" }, { type: "advance" }, { type: "advance" }]);
    expect(plan.bell).toEqual({ title: "Break time", body: "Step away and recharge.", vibrate: [200, 100, 200] });
  });

  it("final-phase complete when the whole session has elapsed", () => {
    const plan = planFocusTick(session(), T0 + (50 + 10 + 50 + 10) * 60 * 1000);
    expect(plan.actions).toEqual([{ type: "advance" }, { type: "advance" }, { type: "advance" }, { type: "complete" }]);
    expect(plan.bell).toEqual({ title: "Session complete", body: "You did the work. Rest well.", vibrate: 300 });
  });

  it("paused session returns no actions", () => {
    const plan = planFocusTick(session({ status: "paused" }), T0 + 60 * 1000);
    expect(plan.actions).toEqual([]);
    expect(plan.bell).toBeUndefined();
  });

  it("already-completed session returns no actions", () => {
    const plan = planFocusTick(session({ status: "completed" }), T0 + 60 * 1000);
    expect(plan.actions).toEqual([]);
  });
});
