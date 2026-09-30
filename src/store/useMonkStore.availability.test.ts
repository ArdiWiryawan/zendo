import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore, normalizeAvailability } from "./useMonkStore";
import type { Goal } from "../types/app";

/**
 * §14: when the work is realistically doable. Deliberately advisory — a guide
 * for suggesting a slot, never a gate that refuses a session outside it.
 */
describe("goal availability", () => {
  const seedGoal = (overrides: Partial<Goal> = {}) => {
    const goal: Goal = {
      id: "goal-1",
      seasonId: "season-test",
      title: "Run a sub-25 5k",
      keystoneAction: "Run 30 minutes",
      priority: 1,
      weeklyTargetCount: 4,
      status: "active",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      ...overrides
    };
    useMonkStore.setState({
      activeSeason: {
        id: "season-test",
        name: "Test Season",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        durationDays: 30,
        status: "active",
        mode: "flow",
        goalIds: ["goal-1"],
        badHabitIds: [],
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z"
      },
      goals: [goal],
      weeklyPlans: []
    });
    return goal;
  };

  const current = () => useMonkStore.getState().goals.find((g) => g.id === "goal-1")!;

  beforeEach(() => {
    useMonkStore.getState().resetApp();
  });

  it("stores preferred days sorted and de-duplicated", () => {
    seedGoal();
    useMonkStore.getState().updateGoalBlueprint("goal-1", {
      availability: { preferredDays: [5, 1, 3, 1] }
    });

    expect(current().availability?.preferredDays).toEqual([1, 3, 5]);
  });

  it("keeps a time window only when it is a real window", () => {
    seedGoal();
    useMonkStore.getState().updateGoalBlueprint("goal-1", {
      availability: { preferredStartTime: "19:00", preferredEndTime: "21:00" }
    });
    expect(current().availability?.preferredStartTime).toBe("19:00");
    expect(current().availability?.preferredEndTime).toBe("21:00");

    // An inverted or half-filled window is noise, not a preference — drop it
    // rather than persist something that can never be true.
    useMonkStore.getState().updateGoalBlueprint("goal-1", {
      availability: { preferredStartTime: "21:00", preferredEndTime: "19:00" }
    });
    expect(current().availability?.preferredStartTime).toBeUndefined();
    expect(current().availability?.preferredEndTime).toBeUndefined();
  });

  it("drops out-of-range weekdays", () => {
    seedGoal();
    useMonkStore.getState().updateGoalBlueprint("goal-1", {
      availability: { preferredDays: [-1, 9, 2] as never }
    });
    expect(current().availability?.preferredDays).toEqual([2]);
  });

  it("an empty availability clears the field instead of storing an empty shell", () => {
    seedGoal({ availability: { preferredDays: [1, 2] } });
    expect(current().availability).toBeDefined();

    useMonkStore.getState().updateGoalBlueprint("goal-1", { availability: {} });
    expect(current().availability).toBeUndefined();
  });

  it("an unrelated edit leaves the availability untouched", () => {
    seedGoal({ availability: { preferredDays: [1, 3], preferredStartTime: "07:00", preferredEndTime: "08:00" } });
    useMonkStore.getState().updateGoalBlueprint("goal-1", { title: "Run a sub-24 5k" });

    const g = current();
    expect(g.title).toBe("Run a sub-24 5k");
    expect(g.availability?.preferredDays).toEqual([1, 3]);
  });

  it("normalizeAvailability is pure and total", () => {
    expect(normalizeAvailability({})).toBeUndefined();
    expect(normalizeAvailability({ preferredDays: [] })).toBeUndefined();
    expect(normalizeAvailability({ preferredStartTime: "07:00" })).toBeUndefined();
    expect(normalizeAvailability({ preferredDays: [6, 0] })).toEqual({ preferredDays: [0, 6], preferredStartTime: undefined, preferredEndTime: undefined });
  });
});
