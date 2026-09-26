import { describe, it, expect, beforeEach } from "vitest";
import { useMonkStore } from "./useMonkStore";
import type { TimeBlock } from "../types/app";

describe("time blocking and daily planning store actions", () => {
  beforeEach(() => {
    useMonkStore.getState().resetApp();
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
      goals: [
        {
          id: "goal-1",
          seasonId: "season-test",
          title: "Build Zendo Timeblocking",
          keystoneAction: "Deep work coding 90 min",
          priority: 1,
          weeklyTargetCount: 5,
          status: "active",
          createdAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z"
        }
      ],
      weeklyPlans: [
        {
          id: "week-1",
          seasonId: "season-test",
          weekNumber: 1,
          startDate: "2026-09-01",
          endDate: "2026-09-07",
          mode: "flow",
          goalAllocations: [{ goalId: "goal-1", targetCount: 5, completedCount: 0 }],
          restDayTarget: 1,
          status: "active",
          createdAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z"
        }
      ],
      dayPlans: []
    });
  });

  it("creates day plan and saves time blocks with planningCompleted=true", () => {
    const blocks: TimeBlock[] = [
      {
        id: "tb-1",
        title: "Deep Work Sprint",
        startTime: "09:00",
        endTime: "10:30",
        category: "deep_work"
      },
      {
        id: "tb-2",
        title: "Break",
        startTime: "12:00",
        endTime: "13:00",
        category: "rest"
      }
    ];

    useMonkStore.getState().saveDayTimeBlocks("2026-09-02", blocks, true);

    const savedPlan = useMonkStore
      .getState()
      .dayPlans.find((d) => d.date === "2026-09-02");

    expect(savedPlan).toBeDefined();
    expect(savedPlan?.planningCompleted).toBe(true);
    expect(savedPlan?.timeBlocks).toHaveLength(2);
    expect(savedPlan?.timeBlocks?.[0].title).toBe("Deep Work Sprint");
  });

  it("updates existing day plan with new time blocks", () => {
    // First create a day plan
    useMonkStore.getState().createOrUpdateDayPlan("2026-09-02", {
      dayType: "goal",
      goalId: "goal-1",
      mainAction: "Initial action"
    });

    const initialPlan = useMonkStore
      .getState()
      .dayPlans.find((d) => d.date === "2026-09-02");
    expect(initialPlan?.planningCompleted).toBe(false);

    const blocks: TimeBlock[] = [
      {
        id: "tb-new",
        title: "Learning Session",
        startTime: "14:00",
        endTime: "15:00",
        category: "learning"
      }
    ];

    useMonkStore.getState().saveDayTimeBlocks("2026-09-02", blocks, true);

    const updatedPlan = useMonkStore
      .getState()
      .dayPlans.find((d) => d.date === "2026-09-02");
    expect(updatedPlan?.planningCompleted).toBe(true);
    expect(updatedPlan?.timeBlocks).toHaveLength(1);
    expect(updatedPlan?.timeBlocks?.[0].title).toBe("Learning Session");
  });

  it("sets planningCompleted flag directly", () => {
    useMonkStore.getState().createOrUpdateDayPlan("2026-09-03", {
      dayType: "goal",
      goalId: "goal-1"
    });

    useMonkStore.getState().setDayPlanningCompleted("2026-09-03", true);

    const plan = useMonkStore
      .getState()
      .dayPlans.find((d) => d.date === "2026-09-03");
    expect(plan?.planningCompleted).toBe(true);

    useMonkStore.getState().setDayPlanningCompleted("2026-09-03", false);
    const plan2 = useMonkStore
      .getState()
      .dayPlans.find((d) => d.date === "2026-09-03");
    expect(plan2?.planningCompleted).toBe(false);
  });

  it("saves highlight and customCategory in saveDayTimeBlocks", () => {
    const blocks: TimeBlock[] = [
      {
        id: "tb-custom",
        title: "Gym Workout",
        startTime: "06:00",
        endTime: "07:00",
        category: "personal",
        customCategory: "Fitness"
      }
    ];

    useMonkStore.getState().saveDayTimeBlocks("2026-09-04", blocks, true, "Ship v2 release");

    const plan = useMonkStore
      .getState()
      .dayPlans.find((d) => d.date === "2026-09-04");

    expect(plan).toBeDefined();
    expect(plan?.highlight).toBe("Ship v2 release");
    expect(plan?.mainAction).toBe("Ship v2 release");
    expect(plan?.timeBlocks?.[0].customCategory).toBe("Fitness");
  });
});

