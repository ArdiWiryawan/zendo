import { describe, expect, it } from "vitest";
import {
  generateIcsContent,
  generateIcsContentForCategory,
  groupTimeBlocksByCategory
} from "./ical";
import type { TimeBlock } from "../types/app";

const block = (over: Partial<TimeBlock>): TimeBlock => ({
  id: "tb-1",
  title: "Block",
  startTime: "09:00",
  endTime: "10:00",
  category: "deep_work",
  completed: false,
  ...over
});

/**
 * Google Calendar colors per CALENDAR, not per event, so the only way to get
 * category colors there is one imported calendar per category. These pin the
 * split that makes that possible: each file carries one category's events and
 * a calendar name the user can recognize in Google's calendar list.
 */
describe("per-category calendar export", () => {
  const blocks: TimeBlock[] = [
    block({ id: "a", title: "Deep work", category: "deep_work", startTime: "08:00", endTime: "10:00" }),
    block({ id: "b", title: "Lunch", category: "rest", startTime: "12:00", endTime: "13:00" }),
    block({ id: "c", title: "Nap", category: "rest", startTime: "15:00", endTime: "15:30" }),
    block({ id: "d", title: "Errands", category: "personal", startTime: "17:00", endTime: "18:00" })
  ];

  it("groups blocks by category in menu order and drops empty categories", () => {
    const groups = groupTimeBlocksByCategory(blocks);
    expect(groups.map((group) => group.category)).toEqual(["deep_work", "rest", "personal"]);
    expect(groups.find((group) => group.category === "rest")?.blocks).toHaveLength(2);
  });

  it("resolves unknown categories into the fallback group instead of dropping them", () => {
    const groups = groupTimeBlocksByCategory([
      block({ id: "x", category: "retired_category" as TimeBlock["category"] })
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe("personal");
  });

  it("emits only that category's events, with its own calendar name and color", () => {
    const content = generateIcsContentForCategory(
      "2026-10-19",
      "rest",
      blocks,
      "Zendo",
      "Istirahat"
    );

    expect(content).toContain("X-WR-CALNAME:Zendo · Istirahat");
    expect(content).toContain("SUMMARY:Lunch");
    expect(content).toContain("SUMMARY:Nap");
    expect(content).not.toContain("SUMMARY:Deep work");
    expect(content).not.toContain("SUMMARY:Errands");
    expect(content).toContain("COLOR:mediumseagreen");
    expect(content).toContain("X-APPLE-CALENDAR-COLOR:#6BB48B");
    expect(content.split("BEGIN:VEVENT")).toHaveLength(3);
  });

  it("keeps the single-file export with every event for clients that honor event colors", () => {
    const content = generateIcsContent("2026-10-19", blocks, "Zendo");
    expect(content.split("BEGIN:VEVENT")).toHaveLength(5);
    expect(content).toContain("SUMMARY:Deep work");
    expect(content).toContain("SUMMARY:Lunch");
    expect(content).toContain("SUMMARY:Errands");
  });
});
