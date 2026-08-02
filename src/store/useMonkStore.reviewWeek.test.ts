import { beforeEach, describe, expect, it } from "vitest";
import type { MonkMVPState } from "../types/app";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import { useMonkStore } from "./useMonkStore";

function baseState(overrides: Partial<MonkMVPState> = {}): MonkMVPState {
  return {
    ...createInitialState(),
    ...overrides
  };
}

const today = getTodayDateString();

describe("weekly re-decide review", () => {
  beforeEach(() => {
    useMonkStore.setState(baseState(), false);
  });

  function makeSeasonWithGoal() {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    const draftId = useMonkStore.getState().onboarding.goalDrafts[0].id;
    state.updateGoalDraft(draftId, "Read more");
    state.toggleFocusGoal(draftId);
    state.createSeasonFromOnboarding();
    const goal = useMonkStore.getState().goals[0];
    const week = useMonkStore.getState().weeklyPlans[0];
    expect(goal).toBeDefined();
    expect(week).toBeDefined();
    return { goalId: goal!.id, weekId: week!.id };
  }

  it("stores decisions and delegates adjust to keystone action update", () => {
    const { goalId, weekId } = makeSeasonWithGoal();
    const goal = useMonkStore.getState().goals[0];

    useMonkStore.getState().reviewWeek(weekId, {
      [goalId]: { action: "adjust", mainAction: "Read one chapter" }
    });

    const review = useMonkStore.getState().weeklyReviews[weekId];
    expect(review?.decisions[goalId].action).toBe("adjust");
    expect(review?.decisions[goalId].mainAction).toBe("Read one chapter");
    expect(review?.skipped).toBeUndefined();
    // Adjust delegates to the keystone action update
    const updated = useMonkStore.getState().goals.find((g) => g.id === goalId);
    expect(updated?.keystoneAction).toBe("Read one chapter");
  });

  it("release decision delegates to releaseGoalFromSeason", () => {
    const { goalId, weekId } = makeSeasonWithGoal();

    expect(() => {
      useMonkStore.getState().reviewWeek(weekId, {
        [goalId]: { action: "release" }
      });
    }).not.toThrow();

    const review = useMonkStore.getState().weeklyReviews[weekId];
    expect(review?.decisions[goalId].action).toBe("release");
    // releaseGoalFromSeason is present post-merge → goal is released, not active
    const goalAfter = useMonkStore.getState().goals.find((g) => g.id === goalId);
    expect(goalAfter?.status).toBe("released");
  });

  it("skipWeekReview persists skipped flag", () => {
    const { weekId } = makeSeasonWithGoal();

    useMonkStore.getState().skipWeekReview(weekId);
    const review = useMonkStore.getState().weeklyReviews[weekId];
    expect(review?.skipped).toBe(true);
    expect(review?.decisions).toEqual({});
  });

  it("release delegates to releaseGoalFromSeason when present (release ritual worktree)", () => {
    const { goalId, weekId } = makeSeasonWithGoal();
    const released: string[] = [];
    // Simulate the parallel release-ritual worktree having merged the action in.
    useMonkStore.setState((s) => ({
      ...s,
      releaseGoalFromSeason: (id: string) => {
        released.push(id);
      }
    }));

    useMonkStore.getState().reviewWeek(weekId, {
      [goalId]: { action: "release" }
    });

    expect(released).toEqual([goalId]);
  });
});
