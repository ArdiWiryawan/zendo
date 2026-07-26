import { describe, expect, it } from "vitest";
import { resolveFocusSessionStatus } from "./focusSessionStatus";

describe("focusSessionStatus", () => {
  it("resolveFocusSessionStatus completed / partial", () => {
    expect(
      resolveFocusSessionStatus({
        mode: "deepWork",
        focusDurationSeconds: 100 * 60,
        breakDurationSeconds: 20 * 60,
        totalDurationSeconds: 120 * 60,
        segmentsCompleted: 4,
        status: "partial"
      })
    ).toBe("completed");

    expect(
      resolveFocusSessionStatus({
        mode: "pomodoro",
        focusDurationSeconds: 100 * 60,
        breakDurationSeconds: 20 * 60,
        totalDurationSeconds: 120 * 60,
        segmentsCompleted: 8,
        status: "partial"
      })
    ).toBe("completed");

    expect(
      resolveFocusSessionStatus({
        mode: "deepWork",
        focusDurationSeconds: 50 * 60,
        breakDurationSeconds: 10 * 60,
        totalDurationSeconds: 60 * 60,
        segmentsCompleted: 2
      })
    ).toBe("partial");

    expect(
      resolveFocusSessionStatus({
        mode: "deepWork",
        focusDurationSeconds: 100 * 60,
        totalDurationSeconds: 120 * 60,
        status: "partial"
      })
    ).toBe("completed");
  });
});
