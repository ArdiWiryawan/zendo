import { beforeEach, describe, expect, it } from "vitest";
import type { FocusSession, MonkMVPState } from "../types/app";
import { createInitialState } from "../constants/defaultData";
import { useMonkStore } from "./useMonkStore";

function baseState(overrides: Partial<MonkMVPState> = {}): MonkMVPState {
  return {
    ...createInitialState(),
    ...overrides
  };
}

describe("goal → practice conversion", () => {
  beforeEach(() => {
    useMonkStore.setState(baseState(), false);
  });

  /** A converted goal needs a real season; reuse the onboarding creation path. */
  function makeSeasonWithGoal(title = "Read more") {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    const draftId = useMonkStore.getState().onboarding.goalDrafts[0].id;
    state.updateGoalDraft(draftId, title);
    state.toggleFocusGoal(draftId);
    state.createSeasonFromOnboarding();
    const goal = useMonkStore.getState().goals[0];
    expect(goal).toBeDefined();
    return goal!;
  }

  function seedFocusSession(goalId: string, seasonId: string): FocusSession {
    const session: FocusSession = {
      id: "fs_history_1",
      seasonId,
      goalId,
      preset: "deep_work",
      status: "completed",
      startedAt: "2026-01-05T09:00:00.000Z",
      endedAt: "2026-01-05T09:25:00.000Z",
      createdAt: "2026-01-05T09:00:00.000Z",
      updatedAt: "2026-01-05T09:25:00.000Z"
    } as FocusSession;
    useMonkStore.setState({ focusSessions: [session] }, false);
    return session;
  }

  it("converts, preserves the goal's createdAt, and marks it released", () => {
    const goal = makeSeasonWithGoal();
    const originalCreatedAt = goal.createdAt;

    const practice = useMonkStore.getState().convertGoalToPractice(goal.id);

    expect(practice).toBeDefined();
    const after = useMonkStore.getState().goals.find((g) => g.id === goal.id);
    expect(after?.status).toBe("released");
    // Reclassification, not a rewrite: the record survives with its birthday.
    expect(after?.createdAt).toBe(originalCreatedAt);
    // The original is still in the list — released, never deleted.
    expect(useMonkStore.getState().goals.some((g) => g.id === goal.id)).toBe(true);
  });

  it("leaves history intact: FocusSession rows keep their original goalId", () => {
    const goal = makeSeasonWithGoal();
    seedFocusSession(goal.id, goal.seasonId);

    useMonkStore.getState().convertGoalToPractice(goal.id, { newGoal: { title: "A new goal" } });

    const sessions = useMonkStore.getState().focusSessions;
    expect(sessions).toHaveLength(1);
    // Still points at the source goal, not at the freshly created one.
    expect(sessions[0].goalId).toBe(goal.id);
  });

  it("standalone conversion leaves the practice's goalId undefined", () => {
    const goal = makeSeasonWithGoal();

    const practice = useMonkStore.getState().convertGoalToPractice(goal.id);

    expect(practice?.goalId).toBeUndefined();
    expect(useMonkStore.getState().practices).toHaveLength(1);
    expect(useMonkStore.getState().practices[0].goalId).toBeUndefined();
  });

  it("conversion with newGoal creates the goal and links the practice to it", () => {
    const goal = makeSeasonWithGoal();
    const goalsBefore = useMonkStore.getState().goals.length;

    const practice = useMonkStore.getState().convertGoalToPractice(goal.id, {
      newGoal: { title: "Ship the launch", why: "Because it matters", desiredOutcome: "It is live" }
    });

    expect(useMonkStore.getState().goals).toHaveLength(goalsBefore + 1);
    const created = useMonkStore.getState().goals.find((g) => g.id === practice?.goalId);
    expect(created).toBeDefined();
    expect(created?.title).toBe("Ship the launch");
    expect(created?.why).toBe("Because it matters");
    expect(created?.desiredOutcome).toBe("It is live");
    expect(created?.seasonId).toBe(goal.seasonId);
    expect(created?.status).toBe("active");
    expect(created?.keystoneAction).toBeTruthy();
  });

  it("maps weeklyTargetCount from the goal's practice rhythm", () => {
    const goal = makeSeasonWithGoal();

    useMonkStore.getState().updateGoalBlueprint(goal.id, { weeklyTargetCount: 5 });
    const withRhythm = useMonkStore.getState().goals.find((g) => g.id === goal.id)!;
    expect(withRhythm.weeklyTargetCount).toBe(5);

    const practice = useMonkStore.getState().convertGoalToPractice(goal.id);

    // Direct 1:1 — the practice rhythm is the goal's rhythm, not the outcome target.
    expect(practice?.weeklyTargetCount).toBe(5);
  });

  it("uses opts.practiceName when supplied, else the goal title", () => {
    const goal = makeSeasonWithGoal("Read more");

    const named = useMonkStore.getState().convertGoalToPractice(goal.id, { practiceName: "Morning pages" });
    expect(named?.name).toBe("Morning pages");

    useMonkStore.setState(baseState(), false);
    const second = makeSeasonWithGoal("Read more");
    const inherited = useMonkStore.getState().convertGoalToPractice(second.id);
    expect(inherited?.name).toBe("Read more");
  });
});
