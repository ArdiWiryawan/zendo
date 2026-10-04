import { beforeEach, describe, expect, it } from "vitest";
import type { MonkMVPState } from "../types/app";
import { createInitialState } from "../constants/defaultData";
import { useMonkStore } from "../store/useMonkStore";
import { reviewIsComplete } from "./WeeklyReviewModal";

function baseState(overrides: Partial<MonkMVPState> = {}): MonkMVPState {
  return { ...createInitialState(), ...overrides };
}

describe("reviewIsComplete", () => {
  it("treats a submitted review as complete", () => {
    expect(reviewIsComplete({ date: "2026-10-01T00:00:00.000Z", decisions: {} })).toBe(true);
  });

  it("does NOT present a skipped review as complete", () => {
    expect(reviewIsComplete({ date: "2026-10-01T00:00:00.000Z", decisions: {}, skipped: true })).toBe(
      false
    );
  });

  it("treats a missing review as not complete", () => {
    expect(reviewIsComplete(undefined)).toBe(false);
    expect(reviewIsComplete(null)).toBe(false);
  });
});

describe("reviewWeek idempotency", () => {
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
    return { goalId: goal!.id, weekId: week!.id };
  }

  it("keying by weekId yields exactly one entry after two calls", () => {
    const { goalId, weekId } = makeSeasonWithGoal();
    const decisions = { [goalId]: { action: "continue" as const } };

    expect(() => {
      useMonkStore.getState().reviewWeek(weekId, decisions);
      useMonkStore.getState().reviewWeek(weekId, decisions);
    }).not.toThrow();

    const reviews = useMonkStore.getState().weeklyReviews;
    expect(Object.keys(reviews)).toEqual([weekId]);
    expect(Object.values(reviews)).toHaveLength(1);
  });

  it("re-submitting an identical review does not double-apply releaseGoalFromSeason", () => {
    const { goalId, weekId } = makeSeasonWithGoal();
    const released: string[] = [];
    useMonkStore.setState((s) => ({
      ...s,
      releaseGoalFromSeason: (id: string) => {
        released.push(id);
      }
    }));

    useMonkStore.getState().reviewWeek(weekId, { [goalId]: { action: "release" } });
    // Same decisions again — the guarded path must skip the destructive side effect.
    useMonkStore.getState().reviewWeek(weekId, { [goalId]: { action: "release" } });

    expect(released).toEqual([goalId]);
  });

  it("a changed decision set still applies the side effect", () => {
    const { goalId, weekId } = makeSeasonWithGoal();
    const released: string[] = [];
    useMonkStore.setState((s) => ({
      ...s,
      releaseGoalFromSeason: (id: string) => {
        released.push(id);
      }
    }));

    useMonkStore.getState().reviewWeek(weekId, { [goalId]: { action: "continue" } });
    useMonkStore.getState().reviewWeek(weekId, { [goalId]: { action: "release" } });

    expect(released).toEqual([goalId]);
  });

  it("records energy and keeps it when a later save omits it", () => {
    const { goalId, weekId } = makeSeasonWithGoal();

    useMonkStore
      .getState()
      .reviewWeek(weekId, { [goalId]: { action: "continue" } }, { energy: "medium" });
    expect(useMonkStore.getState().weeklyReviews[weekId].energy).toBe("medium");

    useMonkStore.getState().reviewWeek(weekId, { [goalId]: { action: "continue" } }, {});
    expect(useMonkStore.getState().weeklyReviews[weekId].energy).toBe("medium");
  });
});