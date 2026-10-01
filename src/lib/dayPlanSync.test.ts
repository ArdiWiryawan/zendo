import { describe, expect, it } from "vitest";
import { mergeRemoteState } from "./syncMerge";
import { createInitialState } from "../constants/defaultData";
import { selectTodayPlan } from "../store/selectors";
import { getTodayDateString } from "./date";
import type { MonkMVPState, DayPlan } from "../types/app";

const TODAY = getTodayDateString();
const S = "s1";

const plan = (o: Partial<DayPlan>): DayPlan => ({
  id: "x", seasonId: S, weeklyPlanId: "w1", date: TODAY, dayType: "goal",
  status: "active", planningCompleted: false, timeBlocks: [], createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z", ...o,
} as DayPlan);

const withSeason = (plans: DayPlan[], goalIds: string[]): MonkMVPState => {
  const st = createInitialState();
  st.activeSeason = { id: S, goalIds, startDate: "2026-09-01", endDate: "2026-11-30",
    durationDays: 90, status: "active", mode: "planning", updatedAt: "2026-10-01T10:00:00Z" } as any;
  st.dayPlans = plans;
  return st;
};

describe("phone vs laptop: same day, two independently-created rows", () => {
  it("collapses to one row so BOTH devices resolve the same goal + agenda", () => {
    // LAPTOP created its own row: magang, agenda, completed
    const laptopRow = plan({ id: "day_laptop", goalId: "goal-magang", status: "completed",
      timeBlocks: [{ id: "tb1", label: "Standup" } as any], updatedAt: "2026-10-01T12:00:00Z" });
    // PHONE created its own row: youtube, no agenda
    const phoneRow = plan({ id: "day_phone", goalId: "goal-youtube", status: "active",
      timeBlocks: [], updatedAt: "2026-10-01T09:00:00Z" });

    const phone = withSeason([phoneRow], ["goal-youtube"]);
    // pull laptop state onto phone
    const merged = mergeRemoteState(phone, withSeason([laptopRow], ["goal-magang"]));

    expect(merged.dayPlans).toHaveLength(1);
    const picked = selectTodayPlan(merged)!;
    console.log("rows after merge:", merged.dayPlans.length);
    console.log("phone now resolves -> goal:", picked.goalId, "| status:", picked.status,
      "| agenda blocks:", picked.timeBlocks?.length);

    expect(picked.goalId).toBe("goal-magang");
    expect(picked.status).toBe("completed");
    expect(picked.timeBlocks).toHaveLength(1);
  });

  it("is order-independent: merging the other direction agrees", () => {
    const laptopRow = plan({ id: "day_laptop", goalId: "goal-magang", status: "completed",
      timeBlocks: [{ id: "tb1" } as any], updatedAt: "2026-10-01T12:00:00Z" });
    const phoneRow = plan({ id: "day_phone", goalId: "goal-youtube",
      updatedAt: "2026-10-01T09:00:00Z" });

    const a = selectTodayPlan(mergeRemoteState(withSeason([phoneRow], ["goal-youtube"]),
      withSeason([laptopRow], ["goal-magang"])))!;
    const b = selectTodayPlan(mergeRemoteState(withSeason([laptopRow], ["goal-magang"]),
      withSeason([phoneRow], ["goal-youtube"])))!;
    expect(a.goalId).toBe(b.goalId);
    expect(a.status).toBe(b.status);
    expect(a.id).toBe(b.id);
  });

  it("legacy duplicate rows already stored still resolve to the newest", () => {
    // Not merged — straight in the store, as a device that never re-merged would have it.
    const legacy = withSeason([
      plan({ id: "day_phone", goalId: "goal-youtube", updatedAt: "2026-10-01T09:00:00Z" }),
      plan({ id: "day_laptop", goalId: "goal-magang", status: "completed",
        timeBlocks: [{ id: "tb1" } as any], updatedAt: "2026-10-01T12:00:00Z" }),
    ], ["goal-youtube"]);
    const picked = selectTodayPlan(legacy)!;
    expect(picked.goalId).toBe("goal-magang");
    expect(picked.status).toBe("completed");
  });

  it("keeps genuinely different days separate", () => {
    const merged = mergeRemoteState(
      withSeason([plan({ id: "d1", date: "2026-09-30" })], ["g"]),
      withSeason([plan({ id: "d2", date: TODAY })], ["g"]));
    expect(merged.dayPlans).toHaveLength(2);
  });
});
