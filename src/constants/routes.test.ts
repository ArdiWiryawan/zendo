import { describe, expect, it } from "vitest";
import { onboardingOrder, routes } from "./routes";

describe("onboarding routes order", () => {
  it("verifies narrow goals comes before choose season and vision", () => {
    const narrowIndex = onboardingOrder.indexOf(routes.onboardingNarrow);
    const seasonIndex = onboardingOrder.indexOf(routes.onboardingSeason);
    const visionIndex = onboardingOrder.indexOf(routes.onboardingVision);

    expect(narrowIndex).toBeGreaterThan(-1);
    expect(seasonIndex).toBeGreaterThan(-1);
    expect(visionIndex).toBeGreaterThan(-1);

    expect(narrowIndex).toBeLessThan(seasonIndex);
    expect(narrowIndex).toBeLessThan(visionIndex);
  });
});
