import { afterEach, describe, expect, it, vi } from "vitest";
import type { MonkMVPState } from "../types/app";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import { planFocusTick } from "../lib/focusTicker.worker";
import { useMonkStore } from "./useMonkStore";

function baseState(): MonkMVPState {
  return createInitialState();
}

const T0 = new Date("2026-08-10T08:00:00Z");
const NOMINAL_BOUNDARY = new Date(T0.getTime() + 25 * 60 * 1000).toISOString(); // pomodoro 25m work
const DETECTED_LATE = new Date(T0.getTime() + 28 * 60 * 1000).getTime(); // caught 3 minutes late

describe("advanceFocusPhase nominal anchoring", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("anchors the next phase to the nominal boundary so later bells stay on schedule", () => {
    vi.setSystemTime(DETECTED_LATE);
    useMonkStore.setState(baseState(), false);
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal" });
    const session = state.startFocusSession("pomodoro", 25)!;

    state.advanceFocusPhase(session.id, NOMINAL_BOUNDARY);

    const advanced = useMonkStore.getState().focusSessions.find((s) => s.id === session.id)!;
    expect(advanced.currentPhaseIndex).toBe(1);
    expect(advanced.startTime).toBe(NOMINAL_BOUNDARY);
    // 3 minutes of the 5-minute break already elapsed at detection time —
    // the countdown must show 2 minutes left, not a fresh 5.
    expect(advanced.elapsedSeconds).toBe(3 * 60);
    expect(advanced.timerState).toBe("break");

    // The NEXT boundary lands on the schedule, not shifted by the 3-minute delay.
    const plan = planFocusTick(advanced, DETECTED_LATE + 2 * 60 * 1000);
    expect(plan.actions).toEqual([
      { type: "advance", at: new Date(T0.getTime() + 30 * 60 * 1000).toISOString() }
    ]);
    expect(plan.bell?.title).toBe("Focus block");
  });

  it("without a nominal instant falls back to now (backward compatible)", () => {
    useMonkStore.setState(baseState(), false);
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal" });
    const session = state.startFocusSession("pomodoro", 25)!;

    state.advanceFocusPhase(session.id);

    const advanced = useMonkStore.getState().focusSessions.find((s) => s.id === session.id)!;
    expect(advanced.startTime).not.toBe(NOMINAL_BOUNDARY);
    expect(advanced.elapsedSeconds).toBe(0);
  });

  it("ignores a nominal instant in the future (defensive)", () => {
    useMonkStore.setState(baseState(), false);
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal" });
    const session = state.startFocusSession("pomodoro", 25)!;

    state.advanceFocusPhase(session.id, new Date(Date.now() + 60 * 1000).toISOString());

    const advanced = useMonkStore.getState().focusSessions.find((s) => s.id === session.id)!;
    // A future nominal would freeze the countdown; fall back to now instead.
    expect(advanced.elapsedSeconds).toBe(0);
    expect(advanced.startTime).not.toBe(new Date(Date.now() + 60 * 1000).toISOString());
  });

  it("tickFocusSession rejects a paused session (elapsed stays frozen)", () => {
    // Fake clock: pauseFocusSession freezes from the wall clock, so the wall
    // clock must agree with the cached tick at the moment of the pause.
    vi.useFakeTimers();
    const base = new Date("2026-08-10T08:00:00Z").getTime();
    vi.setSystemTime(base);
    useMonkStore.setState(baseState(), false);
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal" });
    const session = state.startFocusSession("pomodoro", 25)!;

    vi.setSystemTime(base + 120 * 1000);
    state.tickFocusSession(session.id, 120);
    state.pauseFocusSession(session.id);
    expect(
      useMonkStore.getState().focusSessions.find((s) => s.id === session.id)!.elapsedSeconds
    ).toBe(120);

    // A stale in-flight tick (or a second tab that never saw the pause) must
    // not keep growing the elapsed time of a session the user stopped.
    state.tickFocusSession(session.id, 600);

    const frozen = useMonkStore.getState().focusSessions.find((s) => s.id === session.id)!;
    expect(frozen.status).toBe("paused");
    expect(frozen.elapsedSeconds).toBe(120);
  });
});
