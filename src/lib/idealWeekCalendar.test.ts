import { describe, expect, it } from "vitest";
import type { IdealBlock } from "../types/app";
import { calendarSegments, timeDuration, timeLabel } from "./idealWeekCalendar";

const sleep: IdealBlock = {
  id: "sleep",
  title: "Sleep",
  startTime: "22:00",
  duration: 480,
  days: [0],
  category: "rest",
  flexible: true,
};

describe("Ideal Week calendar times", () => {
  it("calculates overnight duration and rejects missing/equal times", () => {
    expect(timeDuration("22:00", "06:00")).toBe(480);
    expect(timeDuration("08:00", "17:00")).toBe(540);
    expect(timeDuration("08:00", "08:00")).toBe(0);
    expect(timeDuration("", "06:00")).toBe(0);
    expect(timeDuration("25:00", "06:00")).toBe(0);
    expect(timeLabel(1800)).toBe("06:00");
  });
  it("keeps both overnight portions on the selected calendar day", () => {
    expect(calendarSegments([sleep], 0)).toMatchObject([
      { start: 0, end: 360, continuation: true },
      { start: 1320, end: 1440, continuation: false },
    ]);
    expect(calendarSegments([sleep], 1)).toEqual([]);
    expect(calendarSegments([sleep], 2)).toEqual([]);
  });
  it.each([
    ["weekdays", [1, 2, 3, 4, 5]],
    ["weekends", [6, 0]],
  ])("shows 22:00–05:00 only on selected %s", (_, days) => {
    const block = { ...sleep, duration: timeDuration("22:00", "05:00"), days };
    for (let day = 0; day < 7; day++) {
      expect(calendarSegments([block], day).map(({ start, end }) => [start, end]))
        .toEqual(days.includes(day) ? [[0, 300], [1320, 1440]] : []);
    }
  });
  it("does not create a zero-length tail at midnight", () => {
    expect(calendarSegments([{ ...sleep, duration: 120 }], 0)).toMatchObject([
      { start: 1320, end: 1440, continuation: false },
    ]);
  });
  it("keeps every repeated overnight tail and start in its own day", () => {
    const parts = calendarSegments(
      [{ ...sleep, days: [0, 1, 2, 3, 4, 5, 6] }],
      3,
    );
    expect(parts).toHaveLength(2);
    expect(parts.map((p) => [p.start, p.end])).toEqual([
      [0, 360],
      [1320, 1440],
    ]);
  });
  it("lays overlapping blocks side by side and reuses lanes at adjacent boundaries", () => {
    const blocks = [
      { ...sleep, id: "a", startTime: "08:00", duration: 120 },
      { ...sleep, id: "b", startTime: "09:00", duration: 120 },
      { ...sleep, id: "c", startTime: "10:00", duration: 60 },
      { ...sleep, id: "d", startTime: "11:00", duration: 60 },
    ];
    const parts = calendarSegments(blocks, 0);
    expect(parts.map((p) => p.lane)).toEqual([0, 1, 0, 0]);
    expect(parts.map((p) => p.lanes)).toEqual([2, 2, 2, 1]);
  });
});
