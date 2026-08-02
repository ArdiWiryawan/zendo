import { describe, expect, it } from "vitest";
import { shouldSuggestRest } from "./restSuggestion";
import type { MonkMVPState, DayPlan } from "../types/app";

function baseStore(): MonkMVPState {
  return {
    activeSeason: { id: "s1", status: "active", startDate: "2026-07-25", endDate: "2026-08-23", durationDays: 30 },
    dayPlans: [],
    energyLogs: [],
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

const TODAY = "2026-08-02";
const days = (n: number) => {
  const dates: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(2026, 7, 2 - i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return dates;
};

describe("shouldSuggestRest", () => {

  it("suggests when today's energy is low", () => {
    const store = baseStore();
    store.energyLogs = [{ id: "e1", date: TODAY, level: "low", createdAt: "" }];
    expect(shouldSuggestRest(store, TODAY)).toBe(true);
  });

  it("does not suggest on medium/high energy with no streak", () => {
    const store = baseStore();
    store.energyLogs = [{ id: "e1", date: TODAY, level: "high", createdAt: "" }];
    expect(shouldSuggestRest(store, TODAY)).toBe(false);
  });

  it("suggests after 5 consecutive goal-days preceding today", () => {
    const store = baseStore();
    // days(6) = today..today-5; slice(1) = today-1..today-5 (the 5 preceding days)
    store.dayPlans = [goalPlan(TODAY, "active"), ...days(6).slice(1).map((d) => goalPlan(d, "completed"))];
    expect(shouldSuggestRest(store, TODAY)).toBe(true);
  });

  it("does not suggest on a 4-day streak", () => {
    const store = baseStore();
    store.dayPlans = [goalPlan(TODAY, "active"), ...days(5).slice(1).map((d) => goalPlan(d, "completed"))];
    expect(shouldSuggestRest(store, TODAY)).toBe(false);
  });

  it("does not suggest when a rest day breaks the streak", () => {
    const store = baseStore();
    const prior = days(6).slice(1); // today-1..today-5
    store.dayPlans = [
      goalPlan(TODAY, "active"),
      ...prior.map((d, i) =>
        i === 2 ? { ...goalPlan(d, "planned"), dayType: "rest" as const } : goalPlan(d, "completed")
      ),
    ];
    expect(shouldSuggestRest(store, TODAY)).toBe(false);
  });

  it("does not suggest when today's goal is already completed", () => {
    const store = baseStore();
    store.dayPlans = [goalPlan(TODAY, "completed"), ...days(6).slice(1).map((d) => goalPlan(d, "completed"))];
    expect(shouldSuggestRest(store, TODAY)).toBe(false);
  });

  it("does not suggest when today's plan is already rest", () => {
    const store = baseStore();
    store.energyLogs = [{ id: "e1", date: TODAY, level: "low", createdAt: "" }];
    store.dayPlans = [{ ...goalPlan(TODAY, "active"), dayType: "rest" }];
    expect(shouldSuggestRest(store, TODAY)).toBe(false);
  });
});
