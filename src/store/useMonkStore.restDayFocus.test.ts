import { describe, expect, it } from "vitest";
import type { MonkMVPState, TimelineStatus } from "../types/app";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import { getDailyStatusForDate, resolveDayOutcome } from "../lib/dailyActivity";
import { selectSeasonRhythmAccounting, countSeasonDayPlans } from "../lib/rhythmAccounting";
import { getFocusStreak } from "../lib/focusStreak";
import { shouldSuggestRest } from "../lib/restSuggestion";
import { useMonkStore } from "./useMonkStore";

/**
 * Regression suite for the Day-7 bug: a day SCHEDULED as Rest must not keep
 * reporting rest once the user actually completed a focus session on it.
 *
 * The rule under test is "evidence outranks the schedule": what the user really
 * did decides the day, and the plan only decides a day that has no evidence.
 */

function freshStore(): void {
  useMonkStore.setState(createInitialState(), false);
}

function startSeason(): void {
  const state = useMonkStore.getState();
  state.setSeasonDuration(30);
  state.createSeasonFromOnboarding();
}

function today(): string {
  return getTodayDateString();
}

function currentState(): MonkMVPState {
  return useMonkStore.getState() as MonkMVPState;
}

describe("resolveDayOutcome — the shared day rule", () => {
  const plan = (dayType: "goal" | "rest", status: string) =>
    ({ dayType, status }) as unknown as MonkMVPState["dayPlans"][number];
  const completed = [{ id: "s1", status: "completed" as const, completedDurationMinutes: 50 }] as any;

  it("a scheduled rest day with completed focus resolves completed", () => {
    const status = resolveDayOutcome({
      plan: plan("rest", "rest"),
      focusSessions: completed,
      learningSessions: [],
      relapseCount: 0
    });
    expect(status).toBe("completed");
  });

  it("a scheduled rest day with nothing done stays rest", () => {
    const status = resolveDayOutcome({
      plan: plan("rest", "rest"),
      focusSessions: [],
      learningSessions: [],
      relapseCount: 0
    });
    expect(status).toBe("rest");
  });

  it("an ended-early session makes a rest day partial, not rest", () => {
    const status = resolveDayOutcome({
      plan: plan("rest", "rest"),
      focusSessions: [{ id: "s1", status: "ended_early", completedDurationMinutes: 5 }] as any,
      learningSessions: [],
      relapseCount: 0
    });
    expect(status).toBe("partial");
  });

  it("relapse outranks everything, including real focus evidence", () => {
    const status = resolveDayOutcome({
      plan: plan("goal", "active"),
      focusSessions: completed,
      learningSessions: [],
      relapseCount: 1
    });
    expect(status).toBe("relapse");
  });

  it("a goal day with no evidence falls back to the plan's status", () => {
    expect(
      resolveDayOutcome({
        plan: plan("goal", "missed"),
        focusSessions: [],
        learningSessions: [],
        relapseCount: 0
      })
    ).toBe("missed");
  });

  it("no plan and no evidence is not_started", () => {
    expect(
      resolveDayOutcome({
        plan: undefined,
        focusSessions: [],
        learningSessions: [],
        relapseCount: 0
      })
    ).toBe("not_started");
  });
});

describe("focus on a scheduled rest day — end to end", () => {
  it("counts the day as focus, not rest, in season accounting", () => {
    freshStore();
    startSeason();
    const date = today();

    // Day scheduled as rest — the reported Day-7 situation.
    useMonkStore.getState().createOrUpdateDayPlan(date, { dayType: "rest" });
    expect(getDailyStatusForDate(currentState(), date)).toBe("rest");

    // The user runs and completes a real focus session anyway.
    const session = useMonkStore.getState().startFocusSession("deep_work")!;
    expect(session).toBeTruthy();
    useMonkStore.getState().completeFocusSession(session.id);

    // Evidence wins: the day is a focus day.
    const status = getDailyStatusForDate(currentState(), date);
    expect(status).not.toBe("rest");
    expect(status).toBe("completed");

    // And the season agrees.
    const accounting = selectSeasonRhythmAccounting(currentState(), [date]);
    expect(accounting.focusDays).toBe(1);
    expect(accounting.restDays).toBe(0);
  });

  it("promotes the plan off dayType rest when real focus starts", () => {
    freshStore();
    startSeason();
    const date = today();
    useMonkStore.getState().createOrUpdateDayPlan(date, { dayType: "rest" });

    const session = useMonkStore.getState().startFocusSession("pomodoro", 25)!;
    expect(session).toBeTruthy();

    const plan = currentState().dayPlans.find((p) => p.date === date)!;
    expect(plan.dayType).toBe("goal");
  });

  it("a rest day left untouched stays rest", () => {
    freshStore();
    startSeason();
    const date = today();
    useMonkStore.getState().createOrUpdateDayPlan(date, { dayType: "rest" });

    expect(getDailyStatusForDate(currentState(), date)).toBe("rest");
    const accounting = selectSeasonRhythmAccounting(currentState(), [date]);
    expect(accounting.restDays).toBe(1);
    expect(accounting.focusDays).toBe(0);
  });

  it("a worked rest day extends the streak instead of pausing it", () => {
    freshStore();
    startSeason();
    const date = today();
    useMonkStore.getState().createOrUpdateDayPlan(date, { dayType: "rest" });

    expect(getFocusStreak(currentState(), date).count).toBe(0);

    const session = useMonkStore.getState().startFocusSession("deep_work")!;
    useMonkStore.getState().completeFocusSession(session.id);

    expect(getFocusStreak(currentState(), date).count).toBe(1);
  });

  it("never suggests rest on a day with completed focus evidence", () => {
    freshStore();
    startSeason();
    const date = today();
    useMonkStore.getState().createOrUpdateDayPlan(date, { dayType: "rest" });

    const session = useMonkStore.getState().startFocusSession("deep_work")!;
    useMonkStore.getState().completeFocusSession(session.id);

    expect(shouldSuggestRest(currentState(), date)).toBe(false);
  });
});

describe("a completed day is never demoted or double-counted", () => {
  it("a later partial session does not erase the completion", () => {
    freshStore();
    startSeason();
    const date = today();
    useMonkStore.getState().createOrUpdateDayPlan(date, { dayType: "goal" });

    const first = useMonkStore.getState().startFocusSession("deep_work")!;
    useMonkStore.getState().completeFocusSession(first.id);
    expect(getDailyStatusForDate(currentState(), date)).toBe("completed");

    // A second, short session ends early — it must not demote the day.
    const second = useMonkStore.getState().startFocusSession("pomodoro", 5)!;
    useMonkStore.getState().abandonFocusSession(second.id);

    expect(getDailyStatusForDate(currentState(), date)).toBe("completed");
    const plan = currentState().dayPlans.find((p) => p.date === date)!;
    expect(plan.status).toBe("completed");
  });

  it("countSeasonDayPlans never counts one day in both buckets", () => {
    freshStore();
    startSeason();
    const seasonId = currentState().activeSeason!.id;
    const date = today();
    useMonkStore.getState().createOrUpdateDayPlan(date, { dayType: "rest" });

    const session = useMonkStore.getState().startFocusSession("deep_work")!;
    useMonkStore.getState().completeFocusSession(session.id);

    const counts = countSeasonDayPlans(currentState(), seasonId);
    expect(counts.accounted).toBeLessThanOrEqual(counts.planned);
    expect(counts.completed + counts.rest).toBe(counts.accounted);
  });
});

describe("completed sessions are immutable", () => {
  it("a post-completion tick cannot alter the recorded session", () => {
    freshStore();
    startSeason();
    useMonkStore.getState().createOrUpdateDayPlan(today(), { dayType: "goal" });

    const session = useMonkStore.getState().startFocusSession("deep_work")!;
    useMonkStore.getState().completeFocusSession(session.id);
    const finished = currentState().focusSessions.find((s) => s.id === session.id)!;

    // A stale ticker tick lands after completion.
    useMonkStore.getState().tickFocusSession(session.id, 99999);

    const after = currentState().focusSessions.find((s) => s.id === session.id)!;
    expect(after.status).toBe("completed");
    expect(after.elapsedSeconds).toBe(finished.elapsedSeconds);
    expect(after.focusDurationMinutes).toBe(finished.focusDurationMinutes);
  });

  it("the same date gives the same verdict on every read path", () => {
    freshStore();
    startSeason();
    const date = today();
    useMonkStore.getState().createOrUpdateDayPlan(date, { dayType: "rest" });
    const session = useMonkStore.getState().startFocusSession("deep_work")!;
    useMonkStore.getState().completeFocusSession(session.id);

    const state = currentState();
    const viaDaily = getDailyStatusForDate(state, date);
    const viaTimeline = state.timelineDays.find((d) => d.date === date)!.status;
    const viaAccounting = selectSeasonRhythmAccounting(state, [date]);

    expect(viaDaily).toBe("completed");
    expect(viaTimeline).toBe(viaDaily);
    expect(viaAccounting.focusDays).toBe(1);
    expect(viaAccounting.restDays).toBe(0);
  });
});
