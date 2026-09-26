import { describe, expect, it } from "vitest";
import { onboardingOrder, routes } from "./routes";

describe("onboarding routes order", () => {
  it("has exactly the 7-step flow in order", () => {
    expect(onboardingOrder).toEqual([
      routes.onboardingWelcome,
      routes.onboardingHabits,
      routes.onboardingFriction,
      routes.onboardingGoals,
      routes.onboardingKeystone,
      routes.onboardingSeason,
      routes.onboardingPreview
    ]);
    expect(onboardingOrder.length).toBe(7);
  });

  it("goals (merged narrow) precedes keystone so selections drive the season", () => {
    const goalsIndex = onboardingOrder.indexOf(routes.onboardingGoals);
    const keystoneIndex = onboardingOrder.indexOf(routes.onboardingKeystone);
    expect(goalsIndex).toBeGreaterThan(-1);
    expect(keystoneIndex).toBeGreaterThan(goalsIndex);
  });
});