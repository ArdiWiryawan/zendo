import { describe, expect, it } from "vitest";
import { addDaysToDate, getDayNumber, getDaysPassed } from "./date";

describe("date", () => {
  const startDate = "2026-06-28";

  it("getDayNumber", () => {
    expect(getDayNumber("2026-06-28", startDate)).toBe(1);
    expect(getDayNumber("2026-06-29", startDate)).toBe(2);
    expect(getDayNumber("2026-06-30", startDate)).toBe(3);
    expect(getDayNumber("2026-06-27", startDate)).toBe(0);
  });

  it("addDaysToDate / getDaysPassed", () => {
    expect(addDaysToDate(startDate, 1)).toBe("2026-06-29");
    expect(getDaysPassed(startDate, "2026-06-30")).toBe(3);
  });
});
