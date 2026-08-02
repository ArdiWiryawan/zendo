import { describe, expect, it } from "vitest";
import { onboardingOrder, routes } from "./routes";

describe("onboarding routes order", () => {
  it("verifies goal selection comes after season and vision", () => {
    const narrowIndex = onboardingOrder.indexOf(routes.onboardingNarrow);
    const seasonIndex = onboardingOrder.indexOf(routes.onboardingSeason);
    const visionIndex = onboardingOrder.indexOf(routes.onboardingVision);

    expect(narrowIndex).toBeGreaterThan(-1);
    expect(seasonIndex).toBeGreaterThan(-1);
    expect(visionIndex).toBeGreaterThan(-1);

    expect(seasonIndex).toBeLessThan(narrowIndex);
    expect(visionIndex).toBeLessThan(narrowIndex);
  });

  it("places obstacle-mitigation between keystone and week-setup", () => {
    const keystoneIndex = onboardingOrder.indexOf(routes.onboardingKeystone);
    const obstacleIndex = onboardingOrder.indexOf(routes.onboardingObstacleMitigation);
    const weekIndex = onboardingOrder.indexOf(routes.onboardingWeekSetup);

    expect(obstacleIndex).toBeGreaterThan(-1);
    expect(keystoneIndex).toBeLessThan(obstacleIndex);
    expect(obstacleIndex).toBeLessThan(weekIndex);
  });
});
