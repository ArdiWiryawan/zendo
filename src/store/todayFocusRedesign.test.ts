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

function sessionById(id: string) {
  return useMonkStore.getState().focusSessions.find((s) => s.id === id);
}

describe("today's highlight and main action are independent", () => {
  beforeEach(() => {
    useMonkStore.setState(baseState(), false);
  });

  it("keeps the highlight and the main action when each is set separately", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, { dayType: "goal", mainAction: "Original action" });

    useMonkStore.getState().setTodayHighlight("Ship the landing page");
    useMonkStore.getState().setDayMainAction(today, "Write the changelog");

    expect(findTodayPlan()?.highlight).toBe("Ship the landing page");
    expect(findTodayPlan()?.mainAction).toBe("Write the changelog");
  });

  it("leaves a set highlight untouched when the main action is saved twice", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, { dayType: "goal", mainAction: "Original action" });
    useMonkStore.getState().setTodayHighlight("Ship the landing page");

    useMonkStore.getState().setDayMainAction(today, "Write the changelog");
    useMonkStore.getState().setDayMainAction(today, "Review the changelog");

    expect(findTodayPlan()?.highlight).toBe("Ship the landing page");
    expect(findTodayPlan()?.mainAction).toBe("Review the changelog");
  });

  it("clearing the highlight to whitespace leaves the main action intact", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, { dayType: "goal", mainAction: "Original action" });
    useMonkStore.getState().setTodayHighlight("Ship the landing page");

    useMonkStore.getState().setTodayHighlight("   ");

    expect(findTodayPlan()?.highlight).toBeUndefined();
    expect(findTodayPlan()?.mainAction).toBe("Original action");
  });

  it("preserves an existing highlight when createOrUpdateDayPlan passes only mainAction", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, { dayType: "goal", mainAction: "Original action" });
    useMonkStore.getState().setTodayHighlight("Ship the landing page");

    useMonkStore.getState().createOrUpdateDayPlan(today, { dayType: "goal", mainAction: "Write the changelog" });

    expect(findTodayPlan()?.highlight).toBe("Ship the landing page");
    expect(findTodayPlan()?.mainAction).toBe("Write the changelog");
  });
});

describe("the five-minute quick start", () => {
  beforeEach(() => {
    useMonkStore.setState(baseState(), false);
  });

  it("starts a custom session whose first phase is a five-minute focus block", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, { dayType: "goal" });

    const session = useMonkStore.getState().startFocusSession("custom", 5)!;

    expect(session.phases?.[0].type).toBe("focus");
    expect(session.phases?.[0].plannedMinutes).toBe(5);
    expect(session.plannedDurationMinutes).toBe(5);
  });

  it("floors a custom session at five minutes", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, { dayType: "goal" });

    const session = useMonkStore.getState().startFocusSession("custom", 1)!;

    expect(session.phases?.[0].plannedMinutes).toBe(5);
    expect(session.plannedDurationMinutes).toBe(5);
  });

  it("builds a custom session as a single focus block with no break", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, { dayType: "goal" });

    const session = useMonkStore.getState().startFocusSession("custom", 5)!;

    expect(session.phases).toHaveLength(1);
    expect(session.phases?.some((phase) => phase.type === "break")).toBe(false);
    expect(session.totalBreakBlocks).toBe(0);
  });

  it("returns the started session and stores it in the active session state", () => {
    const state = useMonkStore.getState();
    state.setSeasonDuration(30);
    state.createSeasonFromOnboarding();
    state.createOrUpdateDayPlan(today, { dayType: "goal" });

    const session = useMonkStore.getState().startFocusSession("custom", 5);

    expect(session).toBeDefined();
    const stored = sessionById(session!.id)!;
    expect(stored.status).toBe("running");
    expect(stored.timerMode).toBe("custom");
    expect(stored.plannedDurationMinutes).toBe(5);
  });
});
