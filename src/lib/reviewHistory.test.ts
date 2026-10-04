import { describe, expect, it } from "vitest";
import { buildReviewHistory, filterReviewHistory } from "./reviewHistory";
import type { WeeklyPlan, WeeklyReview } from "../types/app";

function plan(id: string, weekNumber: number, startDate: string, endDate: string): WeeklyPlan {
  return {
    id,
    seasonId: "s1",
    weekNumber,
    startDate,
    endDate,
    mode: "standard" as WeeklyPlan["mode"],
    goalAllocations: [],
    restDayTarget: 1,
    status: "completed",
    createdAt: `${startDate}T00:00:00.000Z`,
    updatedAt: `${startDate}T00:00:00.000Z`
  };
}

describe("buildReviewHistory", () => {
  it("returns reviews newest-first", () => {
    const plans = [
      plan("w1", 1, "2026-01-05", "2026-01-11"),
      plan("w2", 2, "2026-01-12", "2026-01-18"),
      plan("w3", 3, "2026-01-19", "2026-01-25")
    ];
    const reviews: Record<string, WeeklyReview> = {
      w1: { date: "2026-01-11T10:00:00.000Z", decisions: {}, reflection: { wins: "first" } },
      w3: { date: "2026-01-25T10:00:00.000Z", decisions: {}, reflection: { wins: "third" } },
      w2: { date: "2026-01-18T10:00:00.000Z", decisions: {}, reflection: { wins: "second" } }
    };

    const items = buildReviewHistory(reviews, plans);

    expect(items.map((i) => i.id)).toEqual(["w3", "w2", "w1"]);
    expect(items.map((i) => i.weekNumber)).toEqual([3, 2, 1]);
  });

  it("keeps a review whose week plan is missing instead of dropping it", () => {
    const plans = [plan("w1", 1, "2026-01-05", "2026-01-11")];
    const reviews: Record<string, WeeklyReview> = {
      w1: { date: "2026-01-11T10:00:00.000Z", decisions: {} },
      "released-orphan": { date: "2026-01-04T10:00:00.000Z", decisions: {}, reflection: { wins: "kept" } }
    };

    const items = buildReviewHistory(reviews, plans);

    expect(items).toHaveLength(2);
    const orphan = items.find((i) => i.id === "released-orphan");
    expect(orphan).toBeDefined();
    expect(orphan?.planFound).toBe(false);
    expect(orphan?.weekNumber).toBeNull();
    // Falls back to the review's own date rather than an opaque week id.
    expect(orphan?.startDate).toBe("2026-01-04T10:00:00.000Z");
    expect(orphan?.endDate).toBeNull();
    // Still scannable, still searchable.
    expect(orphan?.reflections[0]?.value).toBe("kept");
    expect(filterReviewHistory(items, "kept")).toHaveLength(1);
  });

  it("flags a skipped review as skipped and hides its reflection", () => {
    const plans = [plan("w1", 1, "2026-01-05", "2026-01-11")];
    const reviews: Record<string, WeeklyReview> = {
      w1: { date: "2026-01-11T10:00:00.000Z", decisions: {}, skipped: true, reflection: { wins: "half written" } }
    };

    const [item] = buildReviewHistory(reviews, plans);

    expect(item.skipped).toBe(true);
    expect(item.reflections).toEqual([]);
  });

  it("builds a review with no reflection and no decisions without throwing", () => {
    const plans = [plan("w1", 1, "2026-01-05", "2026-01-11")];
    const reviews: Record<string, WeeklyReview> = {
      // Deliberately malformed: decisions absent even though the type requires it.
      w1: { date: "2026-01-11T10:00:00.000Z" } as WeeklyReview
    };

    expect(() => buildReviewHistory(reviews, plans)).not.toThrow();
    const [item] = buildReviewHistory(reviews, plans);
    expect(item.decisions).toEqual({ cont: 0, adj: 0, rel: 0, total: 0 });
    expect(item.reflections).toEqual([]);
    expect(item.skipped).toBe(false);
  });

  it("counts decisions by action", () => {
    const plans = [plan("w1", 1, "2026-01-05", "2026-01-11")];
    const reviews: Record<string, WeeklyReview> = {
      w1: {
        date: "2026-01-11T10:00:00.000Z",
        decisions: {
          a: { action: "continue" },
          b: { action: "continue" },
          c: { action: "adjust", mainAction: "write 200 words" },
          d: { action: "release" }
        }
      }
    };

    const [item] = buildReviewHistory(reviews, plans);

    expect(item.decisions).toEqual({ cont: 2, adj: 1, rel: 1, total: 4 });
  });

  it("only exposes energy when the optional field is present", () => {
    const plans = [plan("w1", 1, "2026-01-05", "2026-01-11"), plan("w2", 2, "2026-01-12", "2026-01-18")];
    const reviews: Record<string, WeeklyReview> = {
      w1: { date: "2026-01-11T10:00:00.000Z", decisions: {}, energy: "high" },
      w2: { date: "2026-01-18T10:00:00.000Z", decisions: {} }
    };

    const items = buildReviewHistory(reviews, plans);

    // Newest-first: w2 (2026-01-12) sorts ahead of w1, and w2 recorded no energy.
    expect(items[0].id).toBe("w2");
    expect(items[0].energy).toBeUndefined();
    expect(items[1].id).toBe("w1");
    expect(items[1].energy).toBe("high");
  });

  it("handles missing reviews and missing plans", () => {
    expect(buildReviewHistory(undefined, undefined)).toEqual([]);
    expect(buildReviewHistory({}, undefined)).toEqual([]);
  });
});

describe("filterReviewHistory", () => {
  const plans = [plan("w1", 1, "2026-01-05", "2026-01-11"), plan("w2", 2, "2026-01-12", "2026-01-18")];
  const reviews: Record<string, WeeklyReview> = {
    w1: { date: "2026-01-11T10:00:00.000Z", decisions: {}, reflection: { wins: "Shipped the draft", challenges: "Sleep" } },
    w2: { date: "2026-01-18T10:00:00.000Z", decisions: {}, reflection: { lesson: "Small steps compound" } }
  };

  it("filters by reflection text", () => {
    const items = buildReviewHistory(reviews, plans);

    const matched = filterReviewHistory(items, "compound");

    expect(matched).toHaveLength(1);
    expect(matched[0].id).toBe("w2");
  });

  it("matches case-insensitively across any reflection field", () => {
    const items = buildReviewHistory(reviews, plans);

    expect(filterReviewHistory(items, "SHIPPED")).toHaveLength(1);
    expect(filterReviewHistory(items, "sleep")).toHaveLength(1);
  });

  it("returns everything for a blank query and nothing for a miss", () => {
    const items = buildReviewHistory(reviews, plans);

    expect(filterReviewHistory(items, "   ")).toHaveLength(2);
    expect(filterReviewHistory(items, "no-such-review")).toHaveLength(0);
  });

  it("can still find text the user wrote before skipping", () => {
    const items = buildReviewHistory(
      { w1: { date: "2026-01-11T10:00:00.000Z", decisions: {}, skipped: true, reflection: { wins: "unique-skip-phrase" } } },
      plans
    );

    expect(items[0].skipped).toBe(true);
    expect(items[0].reflections).toEqual([]);
    expect(filterReviewHistory(items, "unique-skip-phrase")).toHaveLength(1);
  });
});
