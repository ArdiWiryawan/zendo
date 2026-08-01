import { describe, expect, it } from "vitest";
import { isRetroEligible } from "./dailyActivity";

describe("isRetroEligible", () => {
  it("rejects today and future dates", () => {
    expect(isRetroEligible("2026-08-01", "not_started", "2026-08-01")).toBe(false);
    expect(isRetroEligible("2026-08-02", "not_started", "2026-08-01")).toBe(false);
  });

  it("accepts yesterday not_started", () => {
    expect(isRetroEligible("2026-07-31", "not_started", "2026-08-01")).toBe(true);
  });

  it("rejects not_started older than 3 calendar days", () => {
    expect(isRetroEligible("2026-07-28", "not_started", "2026-08-01")).toBe(false);
  });

  it("accepts yesterday missed, rejects completed/partial/relapse", () => {
    expect(isRetroEligible("2026-07-31", "missed", "2026-08-01")).toBe(true);
    expect(isRetroEligible("2026-07-31", "completed", "2026-08-01")).toBe(false);
    expect(isRetroEligible("2026-07-31", "partial", "2026-08-01")).toBe(false);
    expect(isRetroEligible("2026-07-31", "relapse", "2026-08-01")).toBe(false);
  });

  it("accepts exactly 3 calendar days ago", () => {
    expect(isRetroEligible("2026-07-29", "not_started", "2026-08-01")).toBe(true);
  });
});
