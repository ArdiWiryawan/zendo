import { describe, expect, it } from "vitest";
import { goalWhyForDate, goalWhys, hasGoalWhy, primaryGoalWhy } from "./goalWhy";
import type { Goal } from "../types/app";

const now = "2026-10-01T08:00:00.000Z";

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: "goal-1",
  seasonId: "season-1",
  title: "Ship the report",
  keystoneAction: "Draft the findings",
  priority: 1,
  weeklyTargetCount: 2,
  status: "active",
  createdAt: now,
  updatedAt: now,
  ...over
});

describe("goal whys", () => {
  it("falls back to the legacy single why so old goals still show a reason", () => {
    const legacy = goal({ why: "So I stop feeling behind" });
    expect(goalWhys(legacy)).toHaveLength(1);
    expect(primaryGoalWhy(legacy)).toBe("So I stop feeling behind");
    expect(hasGoalWhy(legacy)).toBe(true);
  });

  it("prefers the list and drops blank entries", () => {
    const list = goal({
      why: "legacy",
      whys: [
        { id: "w1", text: "For my parents", createdAt: now },
        { id: "w2", text: "   ", createdAt: now },
        { id: "w3", text: "To prove I can finish", createdAt: now }
      ]
    });
    expect(goalWhys(list).map((item) => item.text)).toEqual([
      "For my parents",
      "To prove I can finish"
    ]);
    expect(primaryGoalWhy(list)).toBe("For my parents");
  });

  it("returns nothing for a goal with no reason at all", () => {
    const empty = goal();
    expect(goalWhys(empty)).toEqual([]);
    expect(primaryGoalWhy(empty)).toBeUndefined();
    expect(hasGoalWhy(empty)).toBe(false);
  });

  it("rotates deterministically by calendar day", () => {
    const rotating = goal({
      whys: [
        { id: "w1", text: "one", createdAt: now },
        { id: "w2", text: "two", createdAt: now },
        { id: "w3", text: "three", createdAt: now }
      ]
    });

    const first = goalWhyForDate(rotating, "2026-10-19");
    // Same date, same reason — reopening the app must not reshuffle it.
    expect(goalWhyForDate(rotating, "2026-10-19")?.text).toBe(first?.text);

    const week = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"].map(
      (date) => goalWhyForDate(rotating, date)?.text
    );
    expect(new Set(week).size).toBeGreaterThan(1);
  });

  it("keeps showing the only reason when there is just one", () => {
    const single = goal({ whys: [{ id: "w1", text: "only", createdAt: now }] });
    expect(goalWhyForDate(single, "2026-10-19")?.text).toBe("only");
    expect(goalWhyForDate(single, "2026-11-02")?.text).toBe("only");
  });
});
