import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore } from "./useMonkStore";
import type { DayPlan, Goal } from "../types/app";

/**
 * Focus mode reads `DayPlan.mainAction` as the thing it is running on. The
 * planning modal is where that text must come from, so setting it has to be a
 * first-class store operation rather than a side effect of saving time blocks.
 */
describe("setDayMainAction", () => {
  const DATE = "2026-09-30";

  const seed = () => {
    const goal: Goal = {
      id: "goal-1",
      seasonId: "season-test",
      title: "Ship the redesign",
      keystoneAction: "Write the nav copy",
      priority: 1,
      weeklyTargetCount: 3,
      status: "active",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z"
    };
    const plan: DayPlan = {
      id: "day-1",
      seasonId: "season-test",
      weeklyPlanId: "week-1",
      date: DATE,
      dayType: "goal",
      goalId: "goal-1",
      mainAction: "Write the nav copy",
      status: "active",
      createdAt: "2026-09-30T00:00:00.000Z",
      updatedAt: "2026-09-30T00:00:00.000Z"
    };
    useMonkStore.setState({
      activeSeason: {
        id: "season-test",
        name: "Test Season",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        durationDays: 30,
        status: "active",
        mode: "flow",
        goalIds: ["goal-1"],
        badHabitIds: [],
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z"
      },
      goals: [goal],
      dayPlans: [plan]
    });
  };

  const plan = () => useMonkStore.getState().dayPlans.find((d) => d.date === DATE)!;

  beforeEach(() => {
    useMonkStore.getState().resetApp();
  });

  it("records the text Focus will run on", () => {
    seed();
    useMonkStore.getState().setDayMainAction(DATE, "Write the first 300 words");
    expect(plan().mainAction).toBe("Write the first 300 words");
  });

  it("trims surrounding whitespace", () => {
    seed();
    useMonkStore.getState().setDayMainAction(DATE, "   Draft the outline   ");
    expect(plan().mainAction).toBe("Draft the outline");
  });

  it("falls back to the goal's keystone action when cleared", () => {
    seed();
    useMonkStore.getState().setDayMainAction(DATE, "");
    expect(plan().mainAction).toBe("Write the nav copy");
  });

  it("leaves the day untouched when there is no plan for that date", () => {
    seed();
    const before = plan().mainAction;
    useMonkStore.getState().setDayMainAction("2026-01-01", "Something else");
    expect(plan().mainAction).toBe(before);
  });

  it("does not bump updatedAt on a no-op write", () => {
    seed();
    const before = plan().updatedAt;
    useMonkStore.getState().setDayMainAction(DATE, "Write the nav copy");
    // A touched timestamp here would look like a fresh edit to the sync merge
    // and could win over a genuinely newer change from another device.
    expect(plan().updatedAt).toBe(before);
  });

  it("does bump updatedAt on a real change", () => {
    seed();
    const before = plan().updatedAt;
    useMonkStore.getState().setDayMainAction(DATE, "A genuinely new step");
    expect(plan().updatedAt).not.toBe(before);
  });

  it("keeps the highlight and main action independent", () => {
    seed();
    useMonkStore.getState().setDayMainAction(DATE, "Write the first 300 words");
    useMonkStore.getState().setTodayHighlight("Ship the redesign");

    expect(plan().mainAction).toBe("Write the first 300 words");
    expect(plan().highlight).toBe("Ship the redesign");
  });
});
