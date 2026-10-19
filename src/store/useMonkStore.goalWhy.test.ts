import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore } from "./useMonkStore";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import { MAX_GOAL_WHYS, goalWhys } from "../lib/goalWhy";

const now = "2026-10-01T08:00:00.000Z";

/**
 * Reasons are the part of a goal that decays. These pin the list behaviour the
 * daily hero depends on: appending never loses older reasons, a legacy single
 * `why` is adopted on first edit, and the mirrored `why` always matches the
 * first entry so older surfaces cannot show a deleted reason.
 */
describe("goal whys", () => {
  beforeEach(() => {
    useMonkStore.setState(createInitialState(), false);
    useMonkStore.setState({
      activeSeason: {
        id: "season-1",
        name: "Test Season",
        startDate: getTodayDateString(),
        endDate: "2099-09-30",
        durationDays: 30,
        status: "active",
        mode: "flow",
        goalIds: [],
        badHabitIds: [],
        createdAt: now,
        updatedAt: now
      },
      goals: [
        {
          id: "goal-1",
          seasonId: "season-1",
          title: "Ship the report",
          keystoneAction: "Draft the findings",
          priority: 1,
          status: "active",
          weeklyTargetCount: 2,
          createdAt: now,
          updatedAt: now
        }
      ]
    });
  });

  const current = () => useMonkStore.getState().goals.find((goal) => goal.id === "goal-1")!;

  it("appends reasons and keeps the mirrored why on the first one", () => {
    useMonkStore.getState().addGoalWhy("goal-1", "For my parents");
    useMonkStore.getState().addGoalWhy("goal-1", "So I stop feeling behind");

    expect(goalWhys(current()).map((item) => item.text)).toEqual([
      "For my parents",
      "So I stop feeling behind"
    ]);
    expect(current().why).toBe("For my parents");
  });

  it("ignores blanks and duplicates", () => {
    useMonkStore.getState().addGoalWhy("goal-1", "   ");
    useMonkStore.getState().addGoalWhy("goal-1", "For my parents");
    useMonkStore.getState().addGoalWhy("goal-1", " for my PARENTS ");

    expect(goalWhys(current())).toHaveLength(1);
  });

  it("adopts a legacy single why into the list before editing it", () => {
    useMonkStore.setState({
      goals: useMonkStore.getState().goals.map((goal) => ({ ...goal, why: "Legacy reason" }))
    });

    useMonkStore.getState().addGoalWhy("goal-1", "New reason");

    expect(goalWhys(current()).map((item) => item.text)).toEqual(["Legacy reason", "New reason"]);
    expect(current().why).toBe("Legacy reason");
  });

  it("removes one reason and re-points the mirror", () => {
    useMonkStore.getState().addGoalWhy("goal-1", "First");
    useMonkStore.getState().addGoalWhy("goal-1", "Second");

    const first = goalWhys(current())[0];
    useMonkStore.getState().removeGoalWhy("goal-1", first.id);

    expect(goalWhys(current()).map((item) => item.text)).toEqual(["Second"]);
    expect(current().why).toBe("Second");
  });

  it("stops at the limit instead of growing forever", () => {
    for (let i = 0; i < MAX_GOAL_WHYS + 3; i += 1) {
      useMonkStore.getState().addGoalWhy("goal-1", `Reason ${i}`);
    }
    expect(goalWhys(current())).toHaveLength(MAX_GOAL_WHYS);
  });

  it("clearing the primary reason keeps the rest", () => {
    useMonkStore.getState().addGoalWhy("goal-1", "First");
    useMonkStore.getState().addGoalWhy("goal-1", "Second");

    useMonkStore.getState().updateGoalWhy("goal-1", "");

    expect(goalWhys(current()).map((item) => item.text)).toEqual(["Second"]);
  });

  it("saving the blueprint replaces the whole list", () => {
    useMonkStore.getState().addGoalWhy("goal-1", "Old");

    useMonkStore.getState().updateGoalBlueprint("goal-1", {
      whys: [
        { id: "w1", text: "New first", createdAt: now },
        { id: "w2", text: "New second", createdAt: now }
      ]
    });

    expect(goalWhys(current()).map((item) => item.text)).toEqual(["New first", "New second"]);
    expect(current().why).toBe("New first");
  });
});
