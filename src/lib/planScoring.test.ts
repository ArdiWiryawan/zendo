import { describe, expect, it } from "vitest";
import type { Goal, Season } from "../types/app";
import { capacityCheck, planStrengthLabel, scorePlan } from "./planScoring";

function season(overrides: Partial<Season> = {}): Season {
  return {
    id: "s1",
    name: "Season",
    startDate: "2026-01-01",
    endDate: "2026-01-30",
    durationDays: 30,
    status: "active",
    mode: "flow",
    goalIds: [],
    badHabitIds: [],
    antiGoals: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    seasonId: "s1",
    title: "Ship",
    keystoneAction: "",
    priority: 1,
    weeklyTargetCount: 0,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("scorePlan", () => {
  it("empty goals scores only antiGoals + duration", () => {
    const result = scorePlan(season({ durationDays: 30, antiGoals: [] }), []);
    expect(result.breakdown.keystoneActions).toBe(0);
    expect(result.breakdown.weeklyTargets).toBe(0);
    expect(result.breakdown.antiGoals).toBe(0);
    expect(result.breakdown.duration).toBe(10);
    expect(result.total).toBe(10);
  });

  it("keystone filled vs empty", () => {
    const empty = scorePlan(season(), [goal({ keystoneAction: "   " })]);
    const filled = scorePlan(season(), [goal({ keystoneAction: "Write daily" })]);
    expect(empty.breakdown.keystoneActions).toBe(0);
    expect(filled.breakdown.keystoneActions).toBe(30);
  });

  it("weekly targets realistic 2-5", () => {
    const low = scorePlan(season(), [goal({ weeklyTargetCount: 1 })]);
    const mid = scorePlan(season(), [goal({ weeklyTargetCount: 3 })]);
    const high = scorePlan(season(), [goal({ weeklyTargetCount: 6 })]);
    expect(low.breakdown.weeklyTargets).toBe(0);
    expect(mid.breakdown.weeklyTargets).toBe(30);
    expect(high.breakdown.weeklyTargets).toBe(0);
  });

  it("antiGoals present add 20", () => {
    const none = scorePlan(season({ antiGoals: ["", "  "] }), []);
    const some = scorePlan(season({ antiGoals: ["No doomscroll"] }), []);
    expect(none.breakdown.antiGoals).toBe(0);
    expect(some.breakdown.antiGoals).toBe(20);
  });

  it("duration heuristics", () => {
    expect(scorePlan(season({ durationDays: 14 }), [goal()]).breakdown.duration).toBe(20);
    expect(
      scorePlan(season({ durationDays: 45 }), [goal({ id: "a" }), goal({ id: "b" })]).breakdown.duration
    ).toBe(20);
    expect(
      scorePlan(season({ durationDays: 75 }), [
        goal({ id: "a" }),
        goal({ id: "b" }),
        goal({ id: "c" })
      ]).breakdown.duration
    ).toBe(20);
    expect(scorePlan(season({ durationDays: 45 }), [goal()]).breakdown.duration).toBe(10);
    expect(scorePlan(season({ durationDays: 120 }), [goal()]).breakdown.duration).toBe(0);
  });

  it("full solid plan totals 100", () => {
    const result = scorePlan(season({ durationDays: 14, antiGoals: ["skip"] }), [
      goal({ keystoneAction: "Do the thing", weeklyTargetCount: 3 })
    ]);
    expect(result.total).toBe(100);
    expect(result.breakdown).toEqual({
      keystoneActions: 30,
      weeklyTargets: 30,
      antiGoals: 20,
      duration: 20
    });
  });
});

describe("planStrengthLabel", () => {
  it("thresholds", () => {
    expect(planStrengthLabel(80)).toBe("Solid");
    expect(planStrengthLabel(79)).toBe("Steady");
    expect(planStrengthLabel(55)).toBe("Steady");
    expect(planStrengthLabel(54)).toBe("Thin");
    expect(planStrengthLabel(35)).toBe("Thin");
    expect(planStrengthLabel(34)).toBe("Fragile");
  });
});

describe("capacityCheck", () => {
  it("freeHoursPerDay <= 0 always ok", () => {
    const result = capacityCheck(0, 10);
    expect(result.ok).toBe(true);
    expect(result.message).toBeUndefined();
    expect(result.loadHours).toBe(15);
    expect(result.availableHours).toBe(0);
  });

  it("overload when load exceeds available", () => {
    // free 1h/day * 6 = 6h; weeklyTargetSum 5 * 1.5 = 7.5h
    const result = capacityCheck(1, 5);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Trim a day/);
  });

  it("tight when load > 85% available", () => {
    // free 2h/day * 6 = 12h; weeklyTargetSum 7 * 1.5 = 10.5h (87.5%)
    const result = capacityCheck(2, 7);
    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/Tight fit/);
  });

  it("ok with buffer", () => {
    // free 3h/day * 6 = 18h; weeklyTargetSum 4 * 1.5 = 6h
    const result = capacityCheck(3, 4);
    expect(result.ok).toBe(true);
    expect(result.message).toBeUndefined();
  });
});
