import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore } from "./useMonkStore";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";

/**
 * The morning plan must survive everything the day throws at it.
 *
 * `createOrUpdateDayPlan` rebuilds the DayPlan object from a fixed field list.
 * Every field except `agenda` had an `existing?.` fallback, so any later call
 * for the same date — the rest-day toggle, a Plan B switch, a journal entry,
 * a weekly review — silently dropped the agenda the user had just typed. The
 * plan came back empty and looked as if it had never been saved.
 *
 * These pin the carry-over for each of those callers, plus the explicit-agenda
 * case that must still overwrite.
 */
const DATE = getTodayDateString();
const AGENDA = ["Deep work: draft the intro", "Reply to the client", "Gym"];

function seedSeasonWithGoal() {
  useMonkStore.setState(createInitialState(), false);
  const now = new Date().toISOString();
  useMonkStore.setState({
    activeSeason: {
      id: "season-1",
      name: "Test Season",
      startDate: DATE,
      endDate: "2099-09-30",
      durationDays: 30,
      status: "active",
      mode: "flow",
      goalIds: [],
      badHabitIds: [],
      createdAt: now,
      updatedAt: now,
    },
    goals: [
      {
        id: "goal-1",
        seasonId: "season-1",
        title: "Ship the launch",
        keystoneAction: "Record one clip",
        track: "YouTube",
        priority: 1,
        status: "active",
        weeklyTargetCount: 4,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });
}

/** The agenda currently stored for `date` under the active season. */
function storedAgenda(date = DATE): string[] | undefined {
  const seasonId = useMonkStore.getState().activeSeason?.id;
  return useMonkStore
    .getState()
    .dayPlans.find((day) => day.seasonId === seasonId && day.date === date)?.agenda;
}

function planDay() {
  useMonkStore.getState().createOrUpdateDayPlan(DATE, {
    dayType: "goal",
    goalId: "goal-1",
    mainAction: "Record one clip",
  });
  useMonkStore.getState().setDayAgenda(DATE, AGENDA);
}

describe("agenda survives a DayPlan rewrite", () => {
  beforeEach(() => {
    seedSeasonWithGoal();
    planDay();
    expect(storedAgenda()).toEqual(AGENDA); // guard the fixture itself
  });

  it("survives the rest-day toggle", () => {
    useMonkStore.getState().createOrUpdateDayPlan(DATE, { dayType: "rest" });
    expect(storedAgenda()).toEqual(AGENDA);
  });

  it("survives a Plan B switch (main action only)", () => {
    useMonkStore.getState().createOrUpdateDayPlan(DATE, {
      dayType: "goal",
      goalId: "goal-1",
      mainAction: "Record 30 seconds instead",
    });
    expect(storedAgenda()).toEqual(AGENDA);
  });

  it("survives a status-only rewrite", () => {
    useMonkStore.getState().createOrUpdateDayPlan(DATE, {
      dayType: "goal",
      goalId: "goal-1",
      status: "completed",
    });
    expect(storedAgenda()).toEqual(AGENDA);
  });

  it("survives a time-block save that creates no agenda", () => {
    useMonkStore.getState().saveDayTimeBlocks(DATE, [], true, "Finish the draft");
    expect(storedAgenda()).toEqual(AGENDA);
  });

  it("is still replaced when the caller passes one explicitly", () => {
    useMonkStore.getState().createOrUpdateDayPlan(DATE, {
      dayType: "goal",
      goalId: "goal-1",
      agenda: ["Only this"],
    });
    expect(storedAgenda()).toEqual(["Only this"]);
  });

  it("is written empty when the user clears every row", () => {
    useMonkStore.getState().setDayAgenda(DATE, []);
    expect(storedAgenda()).toEqual([]);
  });

  it("starts empty on a day that was never planned", () => {
    expect(storedAgenda("2099-01-01")).toBeUndefined();
  });
});
