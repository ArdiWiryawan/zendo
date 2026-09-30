import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore } from "./useMonkStore";
import type { Goal } from "../types/app";

/**
 * §12-13: a goal's KIND, and the split between practice rhythm (how often you
 * show up) and outcome frequency (how often you complete the outcome). These
 * were previously one field, which made "train 5x/week" and "run 3 times"
 * indistinguishable.
 */
describe("goal type and practice/outcome frequency split", () => {
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

  it("a frequency goal keeps its outcome target separate from the practice rhythm", () => {
    seedGoal();
    useMonkStore.getState().updateGoalBlueprint("goal-1", {
      type: "frequency",
      outcomeFrequencyPerWeek: 3,
      weeklyTargetCount: 5
    });

    const g = current();
    expect(g.type).toBe("frequency");
    expect(g.outcomeFrequencyPerWeek).toBe(3);
    // The two numbers are genuinely independent — showing up 5x is not the
    // same commitment as completing the outcome 3x.
    expect(g.weeklyTargetCount).toBe(5);
  });

  it("changing the type away from frequency clears a stale outcome target", () => {
    seedGoal();
    useMonkStore.getState().updateGoalBlueprint("goal-1", {
      type: "frequency",
      outcomeFrequencyPerWeek: 3
    });
    expect(current().outcomeFrequencyPerWeek).toBe(3);

    useMonkStore.getState().updateGoalBlueprint("goal-1", { type: "achievement" });
    expect(current().type).toBe("achievement");
    // A leftover "3x/week" on an achievement goal would read as a commitment
    // the user no longer made.
    expect(current().outcomeFrequencyPerWeek).toBeUndefined();
  });

  it("outcome frequency is clamped to a sane 1-7 week", () => {
    seedGoal();
    useMonkStore.getState().updateGoalBlueprint("goal-1", {
      type: "frequency",
      outcomeFrequencyPerWeek: 99
    });
    expect(current().outcomeFrequencyPerWeek).toBe(7);

    useMonkStore.getState().updateGoalBlueprint("goal-1", {
      type: "frequency",
      outcomeFrequencyPerWeek: 0
    });
    expect(current().outcomeFrequencyPerWeek).toBe(1);
  });

  it("omitting type leaves an existing goal's type and target untouched", () => {
    seedGoal({ type: "frequency", outcomeFrequencyPerWeek: 2 });
    // An unrelated edit (e.g. renaming) must not silently reset the split.
    useMonkStore.getState().updateGoalBlueprint("goal-1", { title: "Run a sub-24 5k" });

    const g = current();
    expect(g.title).toBe("Run a sub-24 5k");
    expect(g.type).toBe("frequency");
    expect(g.outcomeFrequencyPerWeek).toBe(2);
  });

  it("a maintenance goal carries no outcome target", () => {
    seedGoal();
    useMonkStore.getState().updateGoalBlueprint("goal-1", { type: "maintenance" });
    expect(current().type).toBe("maintenance");
    expect(current().outcomeFrequencyPerWeek).toBeUndefined();
  });
});
