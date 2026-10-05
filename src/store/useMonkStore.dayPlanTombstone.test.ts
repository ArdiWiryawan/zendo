import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore } from "./useMonkStore";
import { mergeRemoteState } from "../lib/syncMerge";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import type { MonkMVPState } from "../types/app";

/**
 * A cleared day must stay cleared.
 *
 * `clearDayPlan` removes the row locally, but another device that still holds it
 * pushes it back on the next pull and the merge resurrects the day the user just
 * deleted. `notebookDeletedAt` already solved this class of bug with a monotonic
 * tombstone map; `dayPlanDeletedAt` is the same mechanism for day plans.
 *
 * These pin the contract: the clear writes a tombstone, the tombstone survives a
 * merge from a device that still has the row, and it beats the row regardless of
 * `updatedAt` recency.
 */
const DATE = getTodayDateString();

function seedPlannedDay(planId = "day-1") {
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
    dayPlans: [
      {
        id: planId,
        seasonId: "season-1",
        weeklyPlanId: "week-1",
        date: DATE,
        dayType: "goal",
        mainAction: "Write the intro",
        agenda: ["Deep work"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
  });
}

describe("dayPlanDeletedAt tombstone", () => {
  beforeEach(() => {
    seedPlannedDay();
  });

  it("records a tombstone when the day is cleared", () => {
    useMonkStore.getState().clearDayPlan(DATE);

    const state = useMonkStore.getState();
    expect(state.dayPlans).toHaveLength(0);
    expect(Object.keys(state.dayPlanDeletedAt)).toContain("day-1");
  });

  it("does not resurrect a cleared day from a device that still has it", () => {
    useMonkStore.getState().clearDayPlan(DATE);
    const local = useMonkStore.getState() as MonkMVPState;

    // The other device never saw the clear and re-uploads the row, newer.
    const remote = createInitialState();
    remote.dayPlans = [
      {
        ...local.dayPlans[0],
        id: "day-1",
        seasonId: "season-1",
        date: DATE,
        dayType: "goal",
        status: "active",
        createdAt: new Date().toISOString(),
        // Deliberately NEWER than the tombstone time.
        updatedAt: new Date(Date.now() + 60_000).toISOString(),
      } as MonkMVPState["dayPlans"][number],
    ];

    const merged = mergeRemoteState({ ...local, dayPlans: [] }, remote);

    expect(merged.dayPlans?.some((p) => p.id === "day-1")).toBe(false);
    expect(merged.dayPlanDeletedAt?.["day-1"]).toBeDefined();
  });

  it("unions tombstones from both sides of a merge", () => {
    const local = createInitialState();
    local.dayPlanDeletedAt = { "day-a": "2026-08-02T00:00:00.000Z" };
    const remote: Partial<MonkMVPState> = {
      dayPlanDeletedAt: { "day-b": "2026-08-03T00:00:00.000Z" },
    };

    const merged = mergeRemoteState(local, remote);

    expect(merged.dayPlanDeletedAt).toEqual({
      "day-a": "2026-08-02T00:00:00.000Z",
      "day-b": "2026-08-03T00:00:00.000Z",
    });
  });

  it("keeps a local tombstone when the remote client is too old to know about it", () => {
    const local = createInitialState();
    local.dayPlanDeletedAt = { "day-a": "2026-08-02T00:00:00.000Z" };
    // Old client re-uploads the row and sends no tombstone field at all.
    const remote: Partial<MonkMVPState> = {
      dayPlans: [
        {
          id: "day-a",
          seasonId: "season-1",
          weeklyPlanId: "week-1",
          date: DATE,
          dayType: "goal",
          status: "active",
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-05T00:00:00.000Z",
        } as MonkMVPState["dayPlans"][number],
      ],
    };

    const merged = mergeRemoteState(local, remote);

    expect(merged.dayPlanDeletedAt["day-a"]).toBe("2026-08-02T00:00:00.000Z");
    expect(merged.dayPlans?.some((p) => p.id === "day-a")).toBe(false);
  });

  it("keeps a day that was never tombstoned", () => {
    const local = createInitialState();
    local.dayPlanDeletedAt = { "day-a": "2026-08-02T00:00:00.000Z" };
    const remote: Partial<MonkMVPState> = {
      dayPlans: [
        {
          id: "day-b",
          seasonId: "season-1",
          weeklyPlanId: "week-1",
          date: DATE,
          dayType: "goal",
          status: "active",
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-02T00:00:00.000Z",
        } as MonkMVPState["dayPlans"][number],
      ],
    };

    const merged = mergeRemoteState(local, remote);

    expect(merged.dayPlans?.some((p) => p.id === "day-b")).toBe(true);
  });

  it("persists dayPlanDeletedAt through partialize", () => {
    const options = (useMonkStore as any).persist.getOptions();
    const persisted = options.partialize(useMonkStore.getState()) as Record<string, unknown>;
    expect(persisted).toHaveProperty("dayPlanDeletedAt");
  });

  it("lets the user re-plan a day they cleared (new id is not tombstoned)", () => {
    useMonkStore.getState().clearDayPlan(DATE);
    expect(Object.keys(useMonkStore.getState().dayPlanDeletedAt)).toContain("day-1");

    // Re-planning mints a NEW id, so the old tombstone must not shadow it.
    useMonkStore.getState().createOrUpdateDayPlan(DATE, {
      dayType: "goal",
      goalId: "goal-1",
      mainAction: "Try again",
      agenda: ["Second attempt"],
    });

    const state = useMonkStore.getState();
    const replanned = state.dayPlans.find((p) => p.date === DATE);
    expect(replanned).toBeDefined();
    expect(replanned!.id).not.toBe("day-1");
    expect(replanned!.agenda).toEqual(["Second attempt"]);

    // And it survives a merge that still carries the old tombstone.
    const merged = mergeRemoteState(
      { ...state },
      { dayPlanDeletedAt: { "day-1": "2026-08-02T00:00:00.000Z" } }
    );
    expect(merged.dayPlans?.some((p) => p.id === replanned!.id)).toBe(true);
  });
});
