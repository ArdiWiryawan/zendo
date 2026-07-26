import { describe, expect, it } from "vitest";
import { getDailyStatusHelper, resolveDailyActivityStatus } from "./dailyActivityStatus";

describe("dailyActivityStatus", () => {
  it("resolveDailyActivityStatus", () => {
    expect(resolveDailyActivityStatus({ focusSessions: [], learningSessions: [] })).toBe(
      "not_started"
    );
    expect(
      resolveDailyActivityStatus({ focusSessions: [{ id: "focus-1" }], learningSessions: [] })
    ).toBe("partial");
    expect(
      resolveDailyActivityStatus({
        focusSessions: [],
        learningSessions: [{ id: "learning-1" }]
      })
    ).toBe("partial");
    expect(
      resolveDailyActivityStatus({
        focusSessions: [{ id: "focus-1" }],
        learningSessions: [{ id: "learning-1" }]
      })
    ).toBe("completed");
  });

  it("getDailyStatusHelper", () => {
    expect(
      getDailyStatusHelper({ focusSessions: [{ id: "focus-1" }], learningSessions: [] })
    ).toBe("Focus done · Learning not yet");
  });
});
