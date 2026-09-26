import { describe, it, expect } from "vitest";
import { generateIcsContent } from "./ical";
import type { TimeBlock } from "../types/app";

describe("ical utility", () => {
  it("generates valid RFC 5545 calendar string with VEVENTs", () => {
    const timeBlocks: TimeBlock[] = [
      {
        id: "block-1",
        title: "Deep Work: Coding API",
        startTime: "08:30",
        endTime: "10:30",
        category: "deep_work",
        completed: false
      },
      {
        id: "block-2",
        title: "Istirahat & Makan Siang",
        startTime: "12:00",
        endTime: "13:00",
        category: "rest"
      }
    ];

    const content = generateIcsContent("2026-09-26", timeBlocks, "Zendo Season I");

    expect(content).toContain("BEGIN:VCALENDAR");
    expect(content).toContain("VERSION:2.0");
    expect(content).toContain("PRODID:-//Zendo//Focus Timeblocking//ID");
    expect(content).toContain("BEGIN:VEVENT");
    expect(content).toContain("SUMMARY:Deep Work: Coding API");
    expect(content).toContain("DTSTART:20260926T083000");
    expect(content).toContain("DTEND:20260926T103000");
    expect(content).toContain("CATEGORIES:DEEP WORK");
    expect(content).toContain("SUMMARY:Istirahat & Makan Siang");
    expect(content).toContain("DTSTART:20260926T120000");
    expect(content).toContain("DTEND:20260926T130000");
    expect(content).toContain("END:VCALENDAR");
  });

  it("handles empty blocks without error", () => {
    const content = generateIcsContent("2026-09-26", []);
    expect(content).toContain("BEGIN:VCALENDAR");
    expect(content).toContain("END:VCALENDAR");
    expect(content).not.toContain("BEGIN:VEVENT");
  });
});
