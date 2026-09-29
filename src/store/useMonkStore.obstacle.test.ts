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

/**
 * WOOP step writes onboarding.obstacleMitigations as a "When X, I will Y"
 * intention. createSeasonFromOnboarding must parse it back into the goal so
 * TodayScreen stops flagging the goal as unclarified.
 */
describe("goal obstacle persistence", () => {
  beforeEach(() => {
    useMonkStore.setState(baseState(), false);
  });

  function makeGoalWithObstacle() {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    const draftId = useMonkStore.getState().onboarding.goalDrafts[0].id;
    state.updateGoalDraft(draftId, "Read more");
    state.toggleFocusGoal(draftId);
    return draftId;
  }

  it("parses obstacle and mitigation onto the created goal", () => {
    const draftId = makeGoalWithObstacle();
    useMonkStore.getState().updateOnboarding({
      obstacleMitigations: { [draftId]: "When I feel too tired after work, I will read five minutes" }
    });
    useMonkStore.getState().createSeasonFromOnboarding();

    const goal = useMonkStore.getState().goals[0];
    expect(goal).toBeDefined();
    expect(goal!.obstacle).toBe("I feel too tired after work");
    expect(goal!.obstacleMitigation).toBe("read five minutes");
    // Goal is no longer "unclarified" once why + obstacle are present.
    expect(goal!.obstacle).toBeTruthy();
  });

  it("leaves obstacle undefined when the step is skipped", () => {
    makeGoalWithObstacle();
    useMonkStore.getState().createSeasonFromOnboarding();

    const goal = useMonkStore.getState().goals[0];
    expect(goal!.obstacle).toBeUndefined();
    expect(goal!.obstacleMitigation).toBeUndefined();
  });

  it("keeps goalWhys wired from the keystone step", () => {
    const draftId = makeGoalWithObstacle();
    useMonkStore.getState().updateOnboarding({ goalWhys: { [draftId]: "I want to think clearly" } });
    useMonkStore.getState().createSeasonFromOnboarding();

    expect(useMonkStore.getState().goals[0]!.why).toBe("I want to think clearly");
  });
});
