import { beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "../constants/defaultData";
import { getCurrentWeekNumber, getTodayDateString } from "../lib/date";
import { saveState } from "../lib/storage";
import { useMonkStore } from "./useMonkStore";
import type { MonkMVPState, Goal } from "../types/app";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  } as Storage;
}

function orphanGoal(seasonId: string): Goal {
  return {
    id: `g_${seasonId}`,
    seasonId,
    title: "Old goal",
    keystoneAction: "Do the thing",
    priority: 1,
    weeklyTargetCount: 1,
    status: "active",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  };
}

describe("season recovery from orphaned data", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
    useMonkStore.setState(createInitialState(), false);
  });

  it("reconstructs a past season from orphaned goals on hydrate", () => {
    const state = useMonkStore.getState();
    state.activeSeason = { id: "s_new", name: "New Season", status: "active", startDate: "2026-08-01", endDate: "2026-08-30", durationDays: 30, mode: "planning", goalIds: [], badHabitIds: [], createdAt: "", updatedAt: "" };
    state.goals = [orphanGoal("s_old")];
    state.dayPlans = [{ id: "d1", seasonId: "s_old", weeklyPlanId: "w", date: "2026-06-05", dayType: "goal", status: "completed", createdAt: "", updatedAt: "" } as MonkMVPState["dayPlans"][number]];
    useMonkStore.setState({ activeSeason: state.activeSeason, goals: state.goals, dayPlans: state.dayPlans });
    saveState(useMonkStore.getState());

    useMonkStore.getState().hydrate();

    const { pastSeasons } = useMonkStore.getState();
    expect(pastSeasons.length).toBe(1);
    expect(pastSeasons[0].id).toBe("s_old");
    expect(pastSeasons[0].name).toBe("Recovered Season");
    expect(pastSeasons[0].startDate).toBe("2026-06-05");
    expect(pastSeasons[0].goalIds).toContain("g_s_old");
  });

  it("re-seeds weekly allocations for an active goal missing seasonId", () => {
    const state = useMonkStore.getState();
    // Legacy goal: seasonId falsy (predates the field), weeklyTargetCount invalid.
    const legacyGoal: Goal = {
      ...orphanGoal("s_active"),
      seasonId: "",
      weeklyTargetCount: 0,
    };
    state.activeSeason = { id: "s_active", name: "Season", status: "active", startDate: "2026-07-18", endDate: "2026-10-16", durationDays: 90, mode: "planning", goalIds: [], badHabitIds: [], createdAt: "", updatedAt: "" };
    state.goals = [legacyGoal];
    const weekNumber = getCurrentWeekNumber("2026-07-18", getTodayDateString());
    state.weeklyPlans = [{ id: "w1", seasonId: "s_active", weekNumber, startDate: "2026-07-18", endDate: "2026-07-24", mode: "planning", goalAllocations: [], restDayTarget: 1, status: "active", createdAt: "", updatedAt: "" } as MonkMVPState["weeklyPlans"][number]];
    useMonkStore.setState({ activeSeason: state.activeSeason, goals: state.goals, weeklyPlans: state.weeklyPlans });

    useMonkStore.getState().getOrCreateCurrentWeeklyPlan();

    const plan = useMonkStore.getState().weeklyPlans.find((p) => p.id === "w1")!;
    expect(plan.goalAllocations.length).toBe(1);
    expect(plan.goalAllocations[0].goalId).toBe("g_s_active");
    expect(plan.goalAllocations[0].targetCount).toBe(1);
  });

  it("does not duplicate a season already in pastSeasons", () => {
    const state = useMonkStore.getState();
    state.activeSeason = { id: "s_new", name: "New", status: "active", startDate: "2026-08-01", endDate: "2026-08-30", durationDays: 30, mode: "planning", goalIds: [], badHabitIds: [], createdAt: "", updatedAt: "" };
    state.pastSeasons = [{ id: "s_old", name: "Old", status: "archived", startDate: "2026-06-01", endDate: "2026-06-30", durationDays: 30, mode: "planning", goalIds: [], badHabitIds: [], createdAt: "", updatedAt: "" }];
    state.goals = [orphanGoal("s_old")];
    useMonkStore.setState({ activeSeason: state.activeSeason, pastSeasons: state.pastSeasons, goals: state.goals });
    saveState(useMonkStore.getState());

    useMonkStore.getState().hydrate();

    const { pastSeasons } = useMonkStore.getState();
    expect(pastSeasons.length).toBe(1);
    expect(pastSeasons[0].id).toBe("s_old");
  });
});
