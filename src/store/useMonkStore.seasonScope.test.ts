import { beforeEach, describe, expect, it } from "vitest";
import type { MonkMVPState } from "../types/app";
import { createInitialState } from "../constants/defaultData";
import { useMonkStore } from "./useMonkStore";

function baseState(overrides: Partial<MonkMVPState> = {}): MonkMVPState {
  return {
    ...createInitialState(),
    ...overrides
  };
}

function startSeasonWithGoal(goalTitle = "Read more") {
  const state = useMonkStore.getState();
  state.setSeasonDuration(30);
  const draftId = useMonkStore.getState().onboarding.goalDrafts[0].id;
  state.updateGoalDraft(draftId, goalTitle);
  state.toggleFocusGoal(draftId);
  state.createSeasonFromOnboarding();
  return useMonkStore.getState().activeSeason!;
}

describe("goal desiredOutcome (optional)", () => {
  beforeEach(() => {
    useMonkStore.setState(baseState(), false);
  });

  it("persists onboarding outcome onto the created goal", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    const draftId = useMonkStore.getState().onboarding.goalDrafts[0].id;
    state.updateGoalDraft(draftId, "Read more");
    state.toggleFocusGoal(draftId);
    state.updateOnboarding({ goalDesiredOutcomes: { [draftId]: "Finish the book" } });
    state.createSeasonFromOnboarding();

    expect(useMonkStore.getState().goals[0]!.desiredOutcome).toBe("Finish the book");
  });

  it("stays undefined when skipped, and tolerates legacy states without the map", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    const draftId = useMonkStore.getState().onboarding.goalDrafts[0].id;
    state.updateGoalDraft(draftId, "Read more");
    state.toggleFocusGoal(draftId);
    // Simulate a persisted state from before the field existed.
    const raw = useMonkStore.getState().onboarding as unknown as Record<string, unknown>;
    delete raw.goalDesiredOutcomes;
    state.createSeasonFromOnboarding();

    expect(useMonkStore.getState().goals[0]!.desiredOutcome).toBeUndefined();
  });

  it("updates via updateGoalBlueprint without touching other fields", () => {
    startSeasonWithGoal();
    const goal = useMonkStore.getState().goals[0]!;
    useMonkStore.getState().updateGoalBlueprint(goal.id, { desiredOutcome: "Ship the draft" });

    const updated = useMonkStore.getState().goals[0]!;
    expect(updated.desiredOutcome).toBe("Ship the draft");
    expect(updated.title).toBe(goal.title);
    expect(updated.keystoneAction).toBe(goal.keystoneAction);
  });
});

describe("season cap (max 3)", () => {
  beforeEach(() => {
    useMonkStore.setState(baseState(), false);
  });

  it("keeps at most 3 total seasons across repeated new-season creation", () => {
    startSeasonWithGoal("Goal one");
    useMonkStore.getState().startNewSeason();
    startSeasonWithGoal("Goal two");
    useMonkStore.getState().startNewSeason();
    startSeasonWithGoal("Goal three");
    useMonkStore.getState().startNewSeason();
    startSeasonWithGoal("Goal four");

    const { activeSeason, pastSeasons } = useMonkStore.getState();
    expect(activeSeason).toBeDefined();
    expect(pastSeasons.length + 1).toBeLessThanOrEqual(3);
    // Newest history retained, oldest dropped.
    expect(pastSeasons.length).toBe(2);
  });
});
