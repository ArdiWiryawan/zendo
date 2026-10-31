import { describe, expect, it } from "vitest";
import type { FocusSession } from "../types/app";
import { planFocusTick } from "./focusTicker.worker";

const T0 = new Date("2026-08-10T08:00:00Z").getTime();

const iso = (ms: number) => new Date(ms).toISOString();

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

  it("single boundary advance at the end of the first focus block, anchored to the nominal boundary", () => {
    const plan = planFocusTick(session(), T0 + 50 * 60 * 1000);
    expect(plan.actions).toEqual([{ type: "advance", at: iso(T0 + 50 * 60 * 1000) }]);
    expect(plan.bell).toEqual({ title: "Break time", body: "Step away and recharge.", vibrate: [200, 100, 200] });
  });

  it("multi-phase catch-up crosses focus+break+focus with one bell for the settled phase", () => {
    const plan = planFocusTick(session(), T0 + (50 + 10 + 50 + 9) * 60 * 1000);
    expect(plan.actions).toEqual([
      { type: "advance", at: iso(T0 + 50 * 60 * 1000) },
      { type: "advance", at: iso(T0 + 60 * 60 * 1000) },
      { type: "advance", at: iso(T0 + 110 * 60 * 1000) }
    ]);
    expect(plan.bell).toEqual({ title: "Break time", body: "Step away and recharge.", vibrate: [200, 100, 200] });
  });

  it("final-phase complete when the whole session has elapsed, anchored to the nominal finish", () => {
    const plan = planFocusTick(session(), T0 + (50 + 10 + 50 + 10) * 60 * 1000);
    expect(plan.actions).toEqual([
      { type: "advance", at: iso(T0 + 50 * 60 * 1000) },
      { type: "advance", at: iso(T0 + 60 * 60 * 1000) },
      { type: "advance", at: iso(T0 + 110 * 60 * 1000) },
      { type: "complete", at: iso(T0 + 120 * 60 * 1000) }
    ]);
    expect(plan.bell).toEqual({ title: "Session complete", body: "You did the work. Rest well.", vibrate: 300 });
  });

  it("paused session returns no actions", () => {
    const plan = planFocusTick(session({ status: "paused" }), T0 + 60 * 1000);
    expect(plan.actions).toEqual([]);
    expect(plan.bell).toBeUndefined();
  });

  it("pomodoro preset advances 25m work to 5m break", () => {
    const pomo = session({
      preset: "pomodoro",
      durationMinutes: 25,
      phases: [
        { type: "focus", label: "Pomodoro 1", plannedMinutes: 25, completedMinutes: 0, status: "running" },
        { type: "break", label: "Short Break 1", plannedMinutes: 5, completedMinutes: 0, status: "pending" },
        { type: "focus", label: "Pomodoro 2", plannedMinutes: 25, completedMinutes: 0, status: "pending" },
        { type: "break", label: "Short Break 2", plannedMinutes: 5, completedMinutes: 0, status: "pending" }
      ]
    });
    const plan = planFocusTick(pomo, T0 + 25 * 60 * 1000);
    expect(plan.actions).toEqual([{ type: "advance", at: iso(T0 + 25 * 60 * 1000) }]);
    expect(plan.bell?.title).toBe("Break time");
  });

  it("pomodoro preset advances 5m break back to 25m focus", () => {
    const pomoInBreak = session({
      preset: "pomodoro",
      currentPhaseIndex: 1,
      timerState: "break",
      phases: [
        { type: "focus", label: "Pomodoro 1", plannedMinutes: 25, completedMinutes: 25, status: "completed" },
        { type: "break", label: "Short Break 1", plannedMinutes: 5, completedMinutes: 0, status: "running" },
        { type: "focus", label: "Pomodoro 2", plannedMinutes: 25, completedMinutes: 0, status: "pending" },
        { type: "break", label: "Short Break 2", plannedMinutes: 5, completedMinutes: 0, status: "pending" }
      ]
    });
    const plan = planFocusTick(pomoInBreak, T0 + 5 * 60 * 1000);
    expect(plan.actions).toEqual([{ type: "advance", at: iso(T0 + 5 * 60 * 1000) }]);
    expect(plan.bell?.title).toBe("Focus block");
  });
});

describe("planFocusTick drift anchoring", () => {
  it("late detection still anchors the advance to the nominal boundary, not the late now", () => {
    // Detected 3 minutes late (frozen tab / suspended worker / delayed catch-up):
    // the 50m focus actually ended at T0+50m. The advance must carry that
    // instant — stamping the late "now" shifted every later bell by the delay.
    const late = T0 + 53 * 60 * 1000;
    const plan = planFocusTick(session(), late);
    // Exact-match assertion doubles as the "not the late now" proof.
    expect(plan.actions).toEqual([{ type: "advance", at: iso(T0 + 50 * 60 * 1000) }]);
  });

  it("multi-boundary burst after a long suspension carries each nominal crossing instant", () => {
    // 25/5 pomodoro suspended for 40 minutes: focus1→break1→focus2 boundaries
    // all passed; the catch-up burst must anchor each advance at its own
    // schedule instant so the settled phase resumes from the schedule, too.
    const pomo = session({
      preset: "pomodoro",
      durationMinutes: 25,
      phases: [
        { type: "focus", label: "Pomodoro 1", plannedMinutes: 25, completedMinutes: 0, status: "running" },
        { type: "break", label: "Short Break 1", plannedMinutes: 5, completedMinutes: 0, status: "pending" },
        { type: "focus", label: "Pomodoro 2", plannedMinutes: 25, completedMinutes: 0, status: "pending" },
        { type: "break", label: "Short Break 2", plannedMinutes: 5, completedMinutes: 0, status: "pending" }
      ]
    });
    const plan = planFocusTick(pomo, T0 + 40 * 60 * 1000);
    expect(plan.actions).toEqual([
      { type: "advance", at: iso(T0 + 25 * 60 * 1000) },
      { type: "advance", at: iso(T0 + 30 * 60 * 1000) }
    ]);
    // Settled into Pomodoro 2, which started at T0+30m — 10 minutes elapsed.
    expect(plan.bell?.title).toBe("Focus block");
  });
});
