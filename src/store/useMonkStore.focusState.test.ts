import { describe, expect, it } from "vitest";
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

