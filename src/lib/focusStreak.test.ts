import { describe, expect, it } from "vitest";
import { getFocusStreak, shouldWarnMissTwice } from "./focusStreak";
import type { MonkMVPState, DayPlan } from "../types/app";

function baseStore(): MonkMVPState {
  return {
    activeSeason: { id: "s1", status: "active", startDate: "2026-07-25", endDate: "2026-08-23", durationDays: 30 },
    dayPlans: [],
  } as unknown as MonkMVPState;
}

function goalPlan(date: string, status: DayPlan["status"]): DayPlan {
  return {
    id: `d-${date}`,
    seasonId: "s1",
    weeklyPlanId: "w1",
    date,
    dayType: "goal",
    status,
    createdAt: "",
    updatedAt: "",
  } as DayPlan;
}

function restPlan(date: string): DayPlan {
  return { ...goalPlan(date, "planned"), dayType: "rest" } as DayPlan;
}

// 2026-08-02 = season day 9 (season starts 2026-07-25)
const TODAY = "2026-08-02";
const ago = (n: number) => {
  const d = new Date(2026, 7, 2 - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const SEASON_START = ago(8);

describe("getFocusStreak", () => {
  it("counts consecutive completed goal days ending today", () => {
    const store = baseStore();
    store.dayPlans = [goalPlan(ago(2), "completed"), goalPlan(ago(1), "completed"), goalPlan(TODAY, "completed")];
    expect(getFocusStreak(store, TODAY)).toEqual({ count: 3, best: 3 });
  });

  it("counts partial as held", () => {
    const store = baseStore();
    store.dayPlans = [goalPlan(ago(1), "partial"), goalPlan(TODAY, "partial")];
    expect(getFocusStreak(store, TODAY)).toEqual({ count: 2, best: 2 });
  });

  it("a miss today does not kill the streak through yesterday", () => {
    const store = baseStore();
    store.dayPlans = [goalPlan(ago(2), "completed"), goalPlan(ago(1), "completed"), goalPlan(TODAY, "missed")];
    expect(getFocusStreak(store, TODAY)).toEqual({ count: 2, best: 2 });
  });

  it("rest day does not break the streak", () => {
    const store = baseStore();
    store.dayPlans = [goalPlan(ago(2), "completed"), restPlan(ago(1)), goalPlan(TODAY, "completed")];
    expect(getFocusStreak(store, TODAY)).toEqual({ count: 2, best: 2 });
  });

  it("a non-held goal day breaks the streak", () => {
    const store = baseStore();
    store.dayPlans = [goalPlan(ago(2), "completed"), goalPlan(ago(1), "missed"), goalPlan(TODAY, "completed")];
    expect(getFocusStreak(store, TODAY)).toEqual({ count: 1, best: 1 });
  });

  it("scan stops at season start (no day before it)", () => {
    const store = baseStore();
    store.dayPlans = [
      goalPlan(SEASON_START, "completed"),
      goalPlan(ago(7), "completed"),
      goalPlan(ago(6), "completed"),
      goalPlan(ago(5), "completed"),
      goalPlan(ago(4), "completed"),
      goalPlan(ago(3), "completed"),
      goalPlan(ago(2), "completed"),
      goalPlan(ago(1), "completed"),
      goalPlan(TODAY, "completed"),
    ];
    expect(getFocusStreak(store, TODAY)).toEqual({ count: 9, best: 9 });
  });

  it("no season → zero", () => {
    const store = baseStore();
    store.activeSeason = null as unknown as NonNullable<MonkMVPState["activeSeason"]>;
    expect(getFocusStreak(store, TODAY)).toEqual({ count: 0, best: 0 });
  });

  it("tracks best across a broken streak", () => {
    const store = baseStore();
    store.dayPlans = [
      goalPlan(ago(2), "completed"),
      goalPlan(ago(1), "missed"),
      goalPlan(ago(4), "completed"),
      goalPlan(ago(3), "completed"),
      goalPlan(TODAY, "completed"),
    ];
    expect(getFocusStreak(store, TODAY)).toEqual({ count: 1, best: 3 });
  });

  it("a held run before a missed day feeds best", () => {
    const store = baseStore();
    store.dayPlans = [
      goalPlan(ago(5), "completed"),
      goalPlan(ago(4), "completed"),
      goalPlan(ago(3), "completed"),
      goalPlan(ago(2), "missed"),
      goalPlan(ago(1), "completed"),
      goalPlan(TODAY, "completed"),
    ];
    expect(getFocusStreak(store, TODAY)).toEqual({ count: 2, best: 3 });
  });
});

describe("shouldWarnMissTwice", () => {
  it("warns when yesterday missed and today not held", () => {
    const store = baseStore();
    store.dayPlans = [goalPlan(TODAY, "active"), goalPlan(ago(1), "missed")];
    expect(shouldWarnMissTwice(store, TODAY)).toBe(true);
  });

  it("warns when no plan yesterday and today open", () => {
    const store = baseStore();
    store.dayPlans = [goalPlan(TODAY, "active")];
    expect(shouldWarnMissTwice(store, TODAY)).toBe(true);
  });

  it("does not warn when today is held", () => {
    const store = baseStore();
    store.dayPlans = [goalPlan(TODAY, "completed"), goalPlan(ago(1), "missed")];
    expect(shouldWarnMissTwice(store, TODAY)).toBe(false);
  });

  it("does not warn when yesterday was held", () => {
    const store = baseStore();
    store.dayPlans = [goalPlan(TODAY, "active"), goalPlan(ago(1), "completed")];
    expect(shouldWarnMissTwice(store, TODAY)).toBe(false);
  });

  it("does not warn when no active season", () => {
    const store = baseStore();
    store.activeSeason = null as unknown as NonNullable<MonkMVPState["activeSeason"]>;
    expect(shouldWarnMissTwice(store, TODAY)).toBe(false);
  });

  it("does not warn when today is a planned rest day", () => {
    const store = baseStore();
    store.dayPlans = [restPlan(TODAY), goalPlan(ago(1), "missed")];
    expect(shouldWarnMissTwice(store, TODAY)).toBe(false);
  });

  it("does not warn when the streak still stands at 3", () => {
    const store = baseStore();
    store.dayPlans = [
      goalPlan(ago(2), "completed"),
      goalPlan(ago(1), "completed"),
      goalPlan(TODAY, "active"),
    ];
    expect(shouldWarnMissTwice(store, TODAY)).toBe(false);
  });
});
