import { beforeEach, describe, expect, it } from "vitest";
import type { MonkMVPState } from "../types/app";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString, addDaysToDate } from "../lib/date";
import { getCoreDailyStatusForDate, getDailyStatusForDate } from "../lib/dailyActivity";
import { useMonkStore } from "./useMonkStore";

function baseState(overrides: Partial<MonkMVPState> = {}): MonkMVPState {
  return {
    ...createInitialState(),
    ...overrides
  };
}

// Capture today at import so every test in this file targets the same date
const today = getTodayDateString();

// Run a complete deep-work session (2 focus + 2 break phases) against a day plan.
function runCompleteFocusSession(planId: string) {
  const state = useMonkStore.getState();
  const session = state.startFocusSession("deep_work")!;
  expect(session).toBeDefined();
  expect(session.dayPlanId).toBe(planId);
  state.advanceFocusPhase(session.id); // phase 0 focus done -> break
  state.advanceFocusPhase(session.id); // phase 1 break done -> focus
  state.advanceFocusPhase(session.id); // phase 2 focus done -> break
  state.completeFocusSession(session.id);
}

describe("retro focus goal resolves partial", () => {
  beforeEach(() => {
    useMonkStore.setState(baseState(), false);
  });

  it("day plan completed with no focus/learning sessions resolves partial", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, {
      dayType: "goal",
      goalId: undefined,
      mainAction: "Focus block"
    });
    // Re-read state: mutations create new state objects via set()
    const plan = useMonkStore.getState().dayPlans.find((p) => p.date === today)!;
    expect(plan).toBeDefined();
    useMonkStore.getState().toggleTodayCompletion(); // planned/active -> completed

    const timelineDay = useMonkStore.getState().timelineDays.find((d) => d.date === today);
    expect(timelineDay?.status).toBe("partial");
    // getDailyStatusForDate recomputes core status from raw sessions (focus/learning), not stored timelineDay
    expect(getCoreDailyStatusForDate(useMonkStore.getState(), today)).toBe("not_started");
  });

  it("real day with focus session resolves partial (focus alone never completes)", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, {
      dayType: "goal",
      goalId: undefined,
      mainAction: "Focus block"
    });
    const plan = useMonkStore.getState().dayPlans.find((p) => p.date === today)!;
    expect(plan).toBeDefined();
    runCompleteFocusSession(plan.id);
    useMonkStore.getState().toggleTodayCompletion(); // active -> completed

    const timelineDay = useMonkStore.getState().timelineDays.find((d) => d.date === today);
    expect(timelineDay?.status).toBe("partial");
    expect(getDailyStatusForDate(useMonkStore.getState(), today)).toBe("partial");
  });

  it("rest day completed resolves rest", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, { dayType: "rest" });
    state.toggleTodayCompletion(); // -> completed

    const timelineDay = useMonkStore.getState().timelineDays.find((d) => d.date === today);
    expect(timelineDay?.status).toBe("rest");
    expect(getDailyStatusForDate(useMonkStore.getState(), today)).toBe("rest");
  });

  it("relapse log wins over completed plan", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, {
      dayType: "goal",
      goalId: undefined,
      mainAction: "Focus block"
    });
    state.toggleTodayCompletion(); // -> completed
    state.saveRelapseLog({ trigger: "stress" });

    const timelineDay = useMonkStore.getState().timelineDays.find((d) => d.date === today);
    expect(timelineDay?.status).toBe("relapse");
    expect(getDailyStatusForDate(useMonkStore.getState(), today)).toBe("relapse");
  });

  it("reentry answer logs against the missed date, not today", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    // Yesterday was a missed goal day; today is a fresh open day.
    state.createOrUpdateDayPlan(addDaysToDate(today, -1), {
      dayType: "goal",
      goalId: undefined,
      mainAction: "Focus block"
    });
    state.createOrUpdateDayPlan(today, {
      dayType: "goal",
      goalId: undefined,
      mainAction: "Focus block"
    });

    // Re-entry card answers point at the missed day (H2a fix).
    state.saveRelapseLog({ trigger: "fatigue", date: addDaysToDate(today, -1) });

    const yesterday = addDaysToDate(today, -1);
    const yesterdayTimeline = useMonkStore.getState().timelineDays.find((d) => d.date === yesterday);
    expect(yesterdayTimeline?.status).toBe("relapse");
    expect(getDailyStatusForDate(useMonkStore.getState(), yesterday)).toBe("relapse");
    // Today stays open — answering a diagnostic is not a relapse.
    expect(getDailyStatusForDate(useMonkStore.getState(), today)).not.toBe("relapse");
  });
});
