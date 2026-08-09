import { describe, expect, it } from "vitest";
import { onboardingOrder, routes } from "./routes";

describe("onboarding routes order", () => {
  it("has exactly the 6-step reduced flow in order", () => {
    expect(onboardingOrder).toEqual([
      routes.onboardingWelcome,
      routes.onboardingHabits,
      routes.onboardingGoals,
      routes.onboardingKeystone,
      routes.onboardingSeason,
      routes.onboardingPreview
    ]);
    expect(onboardingOrder.length).toBe(6);
  });

  it("goals (merged narrow) precedes keystone so selections drive the season", () => {
    const goalsIndex = onboardingOrder.indexOf(routes.onboardingGoals);
    const keystoneIndex = onboardingOrder.indexOf(routes.onboardingKeystone);
    expect(goalsIndex).toBeGreaterThan(-1);
    expect(keystoneIndex).toBeGreaterThan(goalsIndex);
  });

  it("removed legacy steps are no longer in the flow", () => {
    const removed = [
      routes.onboardingValues,
      routes.onboardingVision,
      routes.onboardingReality,
      routes.onboardingObstacles,
      routes.onboardingRemove,
      routes.onboardingGreyMode,
      routes.onboardingNarrow,
      routes.onboardingObstacleMitigation,
      routes.onboardingWeekSetup
    ];
    removed.forEach((route) => {
      expect(onboardingOrder).not.toContain(route);
    });
  });
});