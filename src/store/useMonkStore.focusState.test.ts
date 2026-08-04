import { describe, expect, it } from "vitest";
import type { MonkMVPState } from "../types/app";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import { useMonkStore } from "./useMonkStore";

function baseState(): MonkMVPState {
  return createInitialState();
}

describe("focus session state machine guards", () => {
  it("advanceFocusPhase after complete is a no-op (stale tick)", () => {
    useMonkStore.setState(baseState(), false);
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal" });
    const plan = useMonkStore.getState().dayPlans.find((p) => p.date === getTodayDateString())!;
    const session = state.startFocusSession("deep_work")!;

    // Simulate the tick race: both the interval and the visibilitychange handler
    // fire completeFocusSession for the final phase.
    state.advanceFocusPhase(session.id);
    state.advanceFocusPhase(session.id);
    state.advanceFocusPhase(session.id);
    state.completeFocusSession(session.id);

    const eventsBefore = useMonkStore.getState().timelineEvents.length;
    // Stale tick fires again on the now-completed session.
    state.advanceFocusPhase(session.id);
    state.completeFocusSession(session.id);
    const eventsAfter = useMonkStore.getState().timelineEvents.length;
    const finished = useMonkStore.getState().focusSessions.find((s) => s.id === session.id)!;

    expect(finished.status).toBe("completed");
    expect(finished.currentPhaseIndex).toBe((finished.phases?.length ?? 0) - 1);
    expect(eventsAfter).toBe(eventsBefore); // no duplicate timeline event
  });

  it("abandon after complete does not downgrade the session", () => {
    useMonkStore.setState(baseState(), false);
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal" });
    const plan = useMonkStore.getState().dayPlans.find((p) => p.date === getTodayDateString())!;
    const session = state.startFocusSession("custom", 5)!;

    state.advanceFocusPhase(session.id);
    state.completeFocusSession(session.id);
    // Stale End button / double-tap fires abandon afterwards.
    state.abandonFocusSession(session.id);

    const finished = useMonkStore.getState().focusSessions.find((s) => s.id === session.id)!;
    expect(finished.status).toBe("completed");
  });

  it("advance/pause on a paused or completed session is a no-op", () => {
    useMonkStore.setState(baseState(), false);
    useMonkStore.getState().setSeasonDuration(30);
    useMonkStore.getState().createSeasonFromOnboarding();
    useMonkStore.getState().createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal" });
    const plan = useMonkStore.getState().dayPlans.find((p) => p.date === getTodayDateString())!;
    const session = useMonkStore.getState().startFocusSession("deep_work")!;

    // Pause, then a stale tick tries to advance the paused session.
    useMonkStore.getState().pauseFocusSession(session.id);
    useMonkStore.getState().advanceFocusPhase(session.id);
    let s = useMonkStore.getState().focusSessions.find((x) => x.id === session.id)!;
    expect(s.currentPhaseIndex).toBe(0);
    expect(s.status).toBe("paused");

    // Resume is only legal while paused; a stale resume on a running session must not rewind startTime.
    useMonkStore.getState().resumeFocusSession(session.id);
    const startTimeAfterResume = useMonkStore.getState().focusSessions.find((x) => x.id === session.id)!.startTime;
    useMonkStore.getState().resumeFocusSession(session.id); // no-op (now running)
    s = useMonkStore.getState().focusSessions.find((x) => x.id === session.id)!;
    expect(s.status).toBe("running");
    expect(s.startTime).toBe(startTimeAfterResume);
  });
});
