import { beforeEach, describe, expect, it } from "vitest";
import type { MonkMVPState } from "../types/app";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import { useMonkStore } from "./useMonkStore";

function baseState(overrides: Partial<MonkMVPState> = {}): MonkMVPState {
  return {
    ...createInitialState(),
    ...overrides
  };
}

const today = getTodayDateString();

function findTodayPlan() {
  return useMonkStore.getState().dayPlans.find((p) => p.date === today);
}

describe("today's highlight", () => {
  beforeEach(() => {
    useMonkStore.setState(baseState(), false);
  });

  it("sets the highlight on today's plan", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, { dayType: "goal", mainAction: "Focus block" });

    useMonkStore.getState().setTodayHighlight("Ship the landing page");

    expect(findTodayPlan()?.highlight).toBe("Ship the landing page");
  });

  it("clears the highlight when set to empty", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, { dayType: "goal", mainAction: "Focus block" });
    useMonkStore.getState().setTodayHighlight("Ship the landing page");

    useMonkStore.getState().setTodayHighlight("");

    expect(findTodayPlan()?.highlight).toBeUndefined();
  });

  it("trims whitespace-only highlights away", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, { dayType: "goal", mainAction: "Focus block" });

    useMonkStore.getState().setTodayHighlight("   ");

    expect(findTodayPlan()?.highlight).toBeUndefined();
  });

  it("fails gracefully when no plan exists for today", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();

    expect(() => useMonkStore.getState().setTodayHighlight("Ship the landing page")).not.toThrow();
    expect(findTodayPlan()).toBeUndefined();
  });

  it("survives a createOrUpdateDayPlan that does not pass highlight", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, { dayType: "goal", mainAction: "Focus block" });
    useMonkStore.getState().setTodayHighlight("Ship the landing page");

    useMonkStore.getState().createOrUpdateDayPlan(today, { dayType: "goal", mainAction: "Focus block 2" });

    expect(findTodayPlan()?.highlight).toBe("Ship the landing page");
  });
});
