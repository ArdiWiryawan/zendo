import { afterEach, describe, expect, it, vi } from "vitest";
import type { MonkMVPState } from "../types/app";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import { getDailyActivity } from "../lib/dailyActivity";
import { selectTotalFocusSecondsForDate, selectTotalLearningSecondsForDate } from "./selectors";
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

  it("removeFocusSession deletes session and removes its timelineEvent", () => {
    useMonkStore.setState(baseState(), false);
    useMonkStore.getState().setSeasonDuration(30);
    useMonkStore.getState().createSeasonFromOnboarding();
    useMonkStore.getState().createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal" });
    const session = useMonkStore.getState().startFocusSession("custom", 10)!;
    useMonkStore.getState().completeFocusSession(session.id);

    expect(useMonkStore.getState().focusSessions.length).toBe(1);
    expect(useMonkStore.getState().timelineEvents.some((ev) => ev.sourceId === session.id)).toBe(true);

    useMonkStore.getState().removeFocusSession(session.id);
    expect(useMonkStore.getState().focusSessions.length).toBe(0);
    expect(useMonkStore.getState().timelineEvents.some((ev) => ev.sourceId === session.id)).toBe(false);
  });

  it("records midnight-crossing focus session on day 1 start date", () => {
    const day1 = "2026-08-01";
    const day2 = "2026-08-02";
    const season = {
      id: "s1",
      name: "Test Season",
      startDate: day1,
      endDate: "2026-08-30",
      durationDays: 30,
      status: "active" as const,
      mode: "planning" as const,
      goalIds: [],
      badHabitIds: [],
      createdAt: new Date(2026, 7, 1).toISOString(),
      updatedAt: new Date(2026, 7, 1).toISOString(),
    };

    useMonkStore.setState({
      ...baseState(),
      activeSeason: season,
      dayPlans: [
        {
          id: "dp-1",
          seasonId: season.id,
          weeklyPlanId: "wp-1",
          date: day1,
          dayType: "goal",
          status: "completed",
          mainAction: "Deep Work",
          createdAt: new Date(2026, 7, 1, 8, 0, 0).toISOString(),
          updatedAt: new Date(2026, 7, 1, 8, 0, 0).toISOString(),
        }
      ]
    }, false);

    const startedAt = new Date(2026, 7, 1, 23, 0, 0).toISOString();
    const endedAt = new Date(2026, 7, 2, 1, 0, 0).toISOString();

    useMonkStore.setState((prev) => ({
      ...prev,
      focusSessions: [
        {
          id: "sess-overnight-1",
          seasonId: season.id,
          weeklyPlanId: "wp-1",
          dayPlanId: "dp-1",
          preset: "custom",
          status: "completed",
          focusDurationMinutes: 120,
          durationMinutes: 120,
          completedDurationMinutes: 120,
          startedAt,
          startTime: new Date(2026, 7, 2, 0, 0, 0).toISOString(), // simulated phase transition at midnight
          endedAt,
          phases: [{ type: "focus", label: "Focus", plannedMinutes: 120, completedMinutes: 120, status: "completed" }],
          currentPhaseIndex: 0,
          distractionCount: 0,
          createdAt: startedAt,
          updatedAt: endedAt,
        }
      ],
      timelineEvents: [
        {
          id: "evt-overnight-1",
          seasonId: season.id,
          type: "focus_session",
          title: "Focus Session",
          occurredAt: startedAt,
          sourceId: "sess-overnight-1",
          createdAt: startedAt,
          payload: { focusSessionId: "sess-overnight-1", durationMinutes: 120 }
        }
      ]
    }));

    const currentStore = useMonkStore.getState();

    // 1. Day 1 Daily Activity reflects the focus session
    const activityDay1 = getDailyActivity(currentStore, day1);
    expect(activityDay1.focusSessions.length).toBe(1);
    expect(activityDay1.focusSessions[0].id).toBe("sess-overnight-1");

    // 2. Day 2 Daily Activity does NOT claim the session started on Day 1
    const activityDay2 = getDailyActivity(currentStore, day2);
    expect(activityDay2.focusSessions.length).toBe(0);

    // 3. Selectors match day 1
    expect(selectTotalFocusSecondsForDate(currentStore, day1)).toBe(120 * 60);
    expect(selectTotalFocusSecondsForDate(currentStore, day2)).toBe(0);
  });

  it("records midnight-crossing learning session on day 1 start date", () => {
    const day1 = "2026-08-01";
    const day2 = "2026-08-02";
    const season = {
      id: "s1",
      name: "Test Season",
      startDate: day1,
      endDate: "2026-08-30",
      durationDays: 30,
      status: "active" as const,
      mode: "planning" as const,
      goalIds: [],
      badHabitIds: [],
      createdAt: new Date(2026, 7, 1).toISOString(),
      updatedAt: new Date(2026, 7, 1).toISOString(),
    };

    useMonkStore.setState({
      ...baseState(),
      activeSeason: season,
      dayPlans: [
        {
          id: "dp-1",
          seasonId: season.id,
          weeklyPlanId: "wp-1",
          date: day1,
          dayType: "goal",
          status: "completed",
          mainAction: "Learning",
          createdAt: new Date(2026, 7, 1, 8, 0, 0).toISOString(),
          updatedAt: new Date(2026, 7, 1, 8, 0, 0).toISOString(),
        }
      ]
    }, false);

    const startedAt = new Date(2026, 7, 1, 23, 30, 0).toISOString();
    const endedAt = new Date(2026, 7, 2, 0, 30, 0).toISOString();

    useMonkStore.setState((prev) => ({
      ...prev,
      learningSessions: [
        {
          id: "learn-overnight-1",
          seasonId: season.id,
          dayPlanId: "dp-1",
          sourceType: "book",
          sourceTitle: "Midnight Reading",
          status: "completed",
          actualDurationSeconds: 3600,
          startedAt,
          endedAt,
          createdAt: startedAt,
          updatedAt: endedAt
        }
      ]
    }));

    const currentStore = useMonkStore.getState();

    // 1. Day 1 Daily Activity reflects learning session
    const activityDay1 = getDailyActivity(currentStore, day1);
    expect(activityDay1.learningSessions.length).toBe(1);
    expect(activityDay1.learningSessions[0].id).toBe("learn-overnight-1");

    // 2. Day 2 does NOT claim Day 1 learning session
    const activityDay2 = getDailyActivity(currentStore, day2);
    expect(activityDay2.learningSessions.length).toBe(0);

    // 3. Selectors match day 1
    expect(selectTotalLearningSecondsForDate(currentStore, day1)).toBe(3600);
    expect(selectTotalLearningSecondsForDate(currentStore, day2)).toBe(0);
  });
});

describe("abandonFocusSession elapsed accounting (regression: paused sessions credit wall-clock)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function startSession(preset: "deep_work" | "custom", minutes?: number) {
    useMonkStore.setState(baseState(), false);
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal" });
    return useMonkStore.getState().startFocusSession(preset, minutes)!;
  }

  function sessionById(id: string) {
    return useMonkStore.getState().focusSessions.find((s) => s.id === id)!;
  }

  it("pause at 0 elapsed -> long pause -> abandon credits ~0, not the paused duration", () => {
    vi.useFakeTimers();
    const base = new Date("2026-09-30T09:00:00.000Z").getTime();
    vi.setSystemTime(base);

    const session = startSession("custom", 25);
    // Pause at a true 0 elapsed: no tick has credited any focus yet.
    useMonkStore.getState().pauseFocusSession(session.id);
    expect(sessionById(session.id).elapsedSeconds).toBe(0);
    expect(sessionById(session.id).pausedAt).toBeDefined();

    // Ten minutes of paused wall-clock pass. startTime is NOT advanced by pause,
    // so raw `Date.now() - startTime` would wrongly credit the whole pause.
    vi.setSystemTime(base + 10 * 60 * 1000);
    useMonkStore.getState().abandonFocusSession(session.id);

    const finished = sessionById(session.id);
    expect(finished.status).toBe("ended_early");
    // Regression: `elapsedSeconds || wallClock` treated 0 as falsy -> 600s credited.
    expect(finished.focusDurationSeconds).toBe(0);
    expect(finished.actualDurationSeconds).toBe(0);
    expect(finished.completedDurationMinutes).toBe(0);
  });

  it("pause mid-phase -> abandon while paused credits the frozen elapsed, not wall-clock", () => {
    vi.useFakeTimers();
    const base = new Date("2026-09-30T09:00:00.000Z").getTime();
    vi.setSystemTime(base);

    const session = startSession("custom", 25);
    // Credit 90s through the real tick path so the frozen cache is derived, not assumed.
    vi.setSystemTime(base + 90 * 1000);
    useMonkStore.getState().tickFocusSession(session.id, 90);
    useMonkStore.getState().pauseFocusSession(session.id);
    expect(sessionById(session.id).elapsedSeconds).toBe(90);

    // Sit paused for 20 minutes, then abandon.
    vi.setSystemTime(base + 90 * 1000 + 20 * 60 * 1000);
    useMonkStore.getState().abandonFocusSession(session.id);

    const finished = sessionById(session.id);
    expect(finished.status).toBe("ended_early");
    // Not 90 + 1200: the paused span must never be counted.
    expect(finished.focusDurationSeconds).toBe(60);
    expect(finished.completedDurationMinutes).toBe(1);
  });

  it("sets pausedAt on pause and clears it on resume", () => {
    vi.useFakeTimers();
    const base = new Date("2026-09-30T09:00:00.000Z").getTime();
    vi.setSystemTime(base);

    const session = startSession("custom", 25);
    expect(sessionById(session.id).pausedAt).toBeUndefined();

    vi.setSystemTime(base + 60 * 1000);
    useMonkStore.getState().pauseFocusSession(session.id);
    const paused = sessionById(session.id);
    expect(paused.status).toBe("paused");
    expect(paused.pausedAt).toBe(new Date(base + 60 * 1000).toISOString());

    vi.setSystemTime(base + 120 * 1000);
    useMonkStore.getState().resumeFocusSession(session.id);
    const resumed = sessionById(session.id);
    expect(resumed.status).toBe("running");
    expect(resumed.pausedAt).toBeUndefined();
  });

  it("running abandon still uses wall-clock elapsed", () => {
    vi.useFakeTimers();
    const base = new Date("2026-09-30T09:00:00.000Z").getTime();
    vi.setSystemTime(base);

    const session = startSession("custom", 25);
    vi.setSystemTime(base + 3 * 60 * 1000);
    useMonkStore.getState().abandonFocusSession(session.id);

    const finished = sessionById(session.id);
    expect(finished.status).toBe("ended_early");
    // Running sessions are unchanged by the paused-path fix.
    expect(finished.focusDurationSeconds).toBe(180);
  });

  it("completeFocusSession still works and is unaffected by the abandon fix", () => {
    vi.useFakeTimers();
    const base = new Date("2026-09-30T09:00:00.000Z").getTime();
    vi.setSystemTime(base);

    const session = startSession("custom", 25);
    vi.setSystemTime(base + 60 * 1000);
    useMonkStore.getState().tickFocusSession(session.id, 60);
    useMonkStore.getState().pauseFocusSession(session.id);
    useMonkStore.getState().resumeFocusSession(session.id);
    vi.setSystemTime(base + 90 * 1000);
    useMonkStore.getState().completeFocusSession(session.id);

    const finished = sessionById(session.id);
    expect(finished.status).toBe("completed");
    expect(finished.focusDurationSeconds).toBe(60);
    expect(finished.pausedAt).toBeUndefined();
  });
});

