import { describe, expect, it } from "vitest";
import type { Practice, PracticeLog, Season } from "../types/app";
import {
  practiceMonthView,
  practiceSeasonView,
  practiceWeekView
} from "./practiceHistory";

/**
 * Every test passes its own reference dates. Nothing here reads the clock —
 * two earlier tests in this repo were fixed for hardcoding a date and breaking
 * on calendar rollover, and these must not reintroduce that.
 *
 * The reference weeks below are real calendar weeks:
 *   2026-08-31 is a Monday, 2026-09-06 is its Sunday.
 *   2026-09-07 is the following Monday.
 */

function makePractice(overrides: Partial<Practice> = {}): Practice {
  return {
    id: "p1",
    seasonId: "s1",
    name: "Read",
    weeklyTargetCount: 5,
    status: "active",
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
    ...overrides
  };
}

function makeLog(date: string, practiceId = "p1"): PracticeLog {
  return {
    id: `log-${practiceId}-${date}`,
    practiceId,
    seasonId: "s1",
    date,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`
  };
}

function makeSeason(overrides: Partial<Season> = {}): Season {
  return {
    id: "s1",
    name: "Autumn",
    startDate: "2026-09-01",
    endDate: "2026-11-29", // 90 days
    durationDays: 90,
    status: "active",
    mode: "flow",
    goalIds: [],
    badHabitIds: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides
  };
}

describe("practiceWeekView", () => {
  it("marks the days that were logged and counts them", () => {
    const practice = makePractice();
    const logs = [makeLog("2026-08-31"), makeLog("2026-09-02"), makeLog("2026-09-04")];

    const view = practiceWeekView(logs, practice, "2026-08-31");

    expect(view.startDate).toBe("2026-08-31");
    expect(view.endDate).toBe("2026-09-06");
    expect(view.days).toHaveLength(7);
    expect(view.days.map((d) => d.date)).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06"
    ]);
    expect(view.days.map((d) => d.done)).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
      false
    ]);
    expect(view.done).toBe(3);
    expect(view.target).toBe(5);
  });

  it("does not count a missed day, and does not zero the total because of it", () => {
    const practice = makePractice();
    // Four of seven logged, three gaps: the gaps subtract nothing.
    const logs = [
      makeLog("2026-08-31"),
      makeLog("2026-09-01"),
      makeLog("2026-09-03"),
      makeLog("2026-09-05")
    ];

    const view = practiceWeekView(logs, practice, "2026-08-31");

    expect(view.done).toBe(4);
    expect(view.days.filter((d) => !d.done)).toHaveLength(3);
    // The only numbers the view can produce are non-negative counts.
    expect(view.done).toBeGreaterThanOrEqual(0);
    expect(view.target).toBeGreaterThan(0);
  });

  it("returns an empty-but-shaped week for no logs", () => {
    const view = practiceWeekView([], makePractice(), "2026-08-31");

    expect(view.days).toHaveLength(7);
    expect(view.done).toBe(0);
    expect(view.target).toBe(5);
    expect(view.days.every((d) => d.done === false)).toBe(true);
  });

  it("handles a single log", () => {
    const view = practiceWeekView([makeLog("2026-09-03")], makePractice(), "2026-08-31");

    expect(view.done).toBe(1);
    expect(view.days.find((d) => d.date === "2026-09-03")?.done).toBe(true);
  });

  it("ignores logs belonging to another practice", () => {
    const logs = [makeLog("2026-08-31"), makeLog("2026-09-01", "p2")];

    const view = practiceWeekView(logs, makePractice(), "2026-08-31");

    expect(view.done).toBe(1);
  });

  it("takes its target from the practice, not a constant", () => {
    const view = practiceWeekView([], makePractice({ weeklyTargetCount: 2 }), "2026-08-31");

    expect(view.target).toBe(2);
  });
});

describe("practiceMonthView", () => {
  it("buckets sessions by weekday, Monday-first", () => {
    const practice = makePractice();
    // Mondays: 2026-09-07, 2026-09-14. Wednesdays: 2026-09-02, 2026-09-09, 2026-09-16.
    const logs = [
      makeLog("2026-09-02"), // Wed
      makeLog("2026-09-07"), // Mon
      makeLog("2026-09-09"), // Wed
      makeLog("2026-09-14"), // Mon
      makeLog("2026-09-16") // Wed
    ];

    const view = practiceMonthView(logs, practice, "2026-09-20");

    expect(view.startDate).toBe("2026-09-01");
    expect(view.byWeekday).toHaveLength(7);
    // index 0 = Monday, index 2 = Wednesday
    expect(view.byWeekday[0]).toBe(2);
    expect(view.byWeekday[2]).toBe(3);
    expect(view.byWeekday[1]).toBe(0);
    expect(view.byWeekdayTotal).toBe(5);
    expect(view.byWeekdayTotal).toBe(view.done);
    expect(view.done).toBe(5);
  });

  it("names the modal weekday once there is enough data", () => {
    const logs = [
      makeLog("2026-09-02"), // Wed
      makeLog("2026-09-07"), // Mon
      makeLog("2026-09-09"), // Wed
      makeLog("2026-09-14"), // Mon
      makeLog("2026-09-16") // Wed
    ];

    const view = practiceMonthView(logs, makePractice(), "2026-09-20");

    expect(view.modalWeekday).toBe(2); // Wednesday
    expect(view.modalWeekdayCount).toBe(3);
  });

  it("stays silent about a pattern when the data is thin", () => {
    const logs = [makeLog("2026-09-02"), makeLog("2026-09-09")];

    const view = practiceMonthView(logs, makePractice(), "2026-09-20");

    expect(view.done).toBe(2);
    expect(view.modalWeekday).toBeNull();
    expect(view.modalWeekdayCount).toBe(0);
  });

  it("excludes logs outside the month", () => {
    const logs = [
      makeLog("2026-08-31"), // previous month
      makeLog("2026-09-15"), // inside
      makeLog("2026-10-01") // next month
    ];

    const view = practiceMonthView(logs, makePractice(), "2026-09-20");

    expect(view.done).toBe(1);
    expect(view.byWeekdayTotal).toBe(1);
  });

  it("scales the target to the days elapsed, never charging for days that have not happened", () => {
    const practice = makePractice({ weeklyTargetCount: 7 });

    // Reference day is inside the month, so the window ends at the reference.
    const view = practiceMonthView([], practice, "2026-09-10");

    expect(view.endDate).toBe("2026-09-10");
    // 10 elapsed days at 7/week = 10.
    expect(view.target).toBe(10);
  });

  it("returns a shaped empty view for no logs", () => {
    const view = practiceMonthView([], makePractice(), "2026-09-20");

    expect(view.done).toBe(0);
    expect(view.byWeekday).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(view.byWeekdayTotal).toBe(0);
    expect(view.modalWeekday).toBeNull();
    expect(view.target).toBeGreaterThan(0);
  });

  it("handles a single log", () => {
    const view = practiceMonthView([makeLog("2026-09-07")], makePractice(), "2026-09-20");

    expect(view.done).toBe(1);
    expect(view.byWeekday[0]).toBe(1);
    expect(view.modalWeekday).toBeNull(); // one session is not a pattern
  });
});

describe("practiceSeasonView", () => {
  it("totals across multiple months of a season", () => {
    const season = makeSeason(); // 2026-09-01 .. 2026-11-29
    const logs = [
      makeLog("2026-09-02"),
      makeLog("2026-09-10"),
      makeLog("2026-10-05"),
      makeLog("2026-10-27"),
      makeLog("2026-11-20")
    ];

    const view = practiceSeasonView(logs, makePractice(), season);

    expect(view.done).toBe(5);
    expect(view.startDate).toBe("2026-09-01");
    expect(view.endDate).toBe("2026-11-29");
    expect(view.weeks).toBe(13); // ceil(90 / 7)
    expect(view.target).toBe(65); // 5/week * 13 weeks
  });

  it("clamps to the season window, ignoring logs from either side of it", () => {
    const season = makeSeason();
    const logs = [
      makeLog("2026-08-30"), // before the season
      makeLog("2026-09-15"), // inside
      makeLog("2026-12-01") // after the season
    ];

    const view = practiceSeasonView(logs, makePractice(), season);

    expect(view.done).toBe(1);
  });

  it("returns a shaped empty view for no logs", () => {
    const view = practiceSeasonView([], makePractice(), makeSeason());

    expect(view.done).toBe(0);
    expect(view.target).toBe(65);
    expect(view.weeks).toBe(13);
  });

  it("handles a single log", () => {
    const view = practiceSeasonView([makeLog("2026-09-02")], makePractice(), makeSeason());

    expect(view.done).toBe(1);
  });

  it("scales the target to the season length, not a fixed 12 weeks", () => {
    const week = makeSeason({
      startDate: "2026-09-01",
      endDate: "2026-09-07",
      durationDays: 7
    });

    const view = practiceSeasonView([], makePractice({ weeklyTargetCount: 3 }), week);

    expect(view.weeks).toBe(1);
    expect(view.target).toBe(3);
  });
});
