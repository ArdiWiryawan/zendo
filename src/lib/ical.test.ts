import { describe, it, expect } from "vitest";
import { generateIcsContent } from "./ical";
import {
  activityCategoryHex,
  activityCategoryColorName,
  resolveActivityCategory,
  isActivityCategory,
  TIME_BLOCK_CATEGORIES
} from "./activityCategory";
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
    expect(content).toContain("DTSTART");
    expect(content).toContain("20260926T083000");
    expect(content).toContain("DTEND");
    expect(content).toContain("20260926T103000");
    expect(content).toContain("CATEGORIES:DEEP WORK");
    expect(content).toContain("SUMMARY:Istirahat & Makan Siang");
    expect(content).toContain("20260926T120000");
    expect(content).toContain("20260926T130000");
    expect(content).toContain("END:VCALENDAR");
  });

  it("handles empty blocks without error", () => {
    const content = generateIcsContent("2026-09-26", []);
    expect(content).toContain("BEGIN:VCALENDAR");
    expect(content).toContain("END:VCALENDAR");
    expect(content).not.toContain("BEGIN:VEVENT");
  });

  // Test 1 — category color mapping
  it("maps each of the five categories to its own distinct color", () => {
    const hexes = TIME_BLOCK_CATEGORIES.map((c) => activityCategoryHex(c));
    const names = TIME_BLOCK_CATEGORIES.map((c) => activityCategoryColorName(c));
    expect(new Set(hexes).size).toBe(5);
    expect(new Set(names).size).toBe(5);
    expect(activityCategoryHex("deep_work")).toBe("#C46A5B");
    expect(activityCategoryHex("rest")).toBe("#6BB48B");
  });

  // Test 3 + 5 — five events, one file, each keeps its category and gets a color
  it("emits a per-event color for every category and survives an unknown one", () => {
    const blocks: TimeBlock[] = [
      { id: "b1", title: "Merchandising Report", startTime: "09:00", endTime: "10:30", category: "deep_work" },
      { id: "b2", title: "Business Strategy", startTime: "10:45", endTime: "11:30", category: "learning" },
      { id: "b3", title: "Organize Files", startTime: "13:00", endTime: "13:30", category: "shallow" },
      { id: "b4", title: "Break", startTime: "11:30", endTime: "12:00", category: "rest" },
      { id: "b5", title: "Errands", startTime: "16:00", endTime: "17:00", category: "personal" },
      // Unknown id, as a hand-edited or future-build block would arrive.
      { id: "b6", title: "Mystery", startTime: "18:00", endTime: "18:30", category: "nonexistent" as never }
    ];

    const content = generateIcsContent("2026-09-26", blocks);
    const events = content.split("BEGIN:VEVENT").slice(1);
    expect(events).toHaveLength(6);

    // Every event — including the unknown one — carries both color properties.
    for (const event of events) {
      expect(event).toMatch(/COLOR:[a-z]+/);
      expect(event).toMatch(/X-APPLE-CALENDAR-COLOR:#[0-9A-Fa-f]{6}/);
    }

    expect(content).toContain("COLOR:indianred");
    expect(content).toContain("X-APPLE-CALENDAR-COLOR:#C46A5B");
    expect(content).toContain("COLOR:mediumseagreen");
    expect(content).toContain("X-APPLE-CALENDAR-COLOR:#6BB48B");

    // The unknown block must NOT be colored or labelled as deep work.
    const mystery = events[5];
    expect(mystery).toContain("CATEGORIES:PERSONAL");
    expect(mystery).toContain("X-APPLE-CALENDAR-COLOR:#C48BB4");
    expect(mystery).not.toContain("#C46A5B");
  });

  // Test 4 — titles, times, uid preserved
  it("preserves title, times, and a stable UID across repeated exports", () => {
    const blocks: TimeBlock[] = [
      { id: "stable-1", title: "Sprint Review; Q3, final", startTime: "14:00", endTime: "15:00", category: "shallow" }
    ];
    const a = generateIcsContent("2026-09-26", blocks);
    const b = generateIcsContent("2026-09-26", blocks);
    expect(a).toContain("SUMMARY:Sprint Review\\; Q3\\, final");
    expect(a).toContain("20260926T140000");
    // Same block, same day → same UID (DTSTAMP legitimately differs).
    const uidOf = (s: string) => s.match(/UID:[^\r\n]+/)![0];
    expect(uidOf(a)).toBe(uidOf(b));
  });

  // A content line must be exactly one property. `toContain("DTSTART")` passes
  // on "DTSTART:DTSTART;TZID=…", so the doubled-prefix and double-Z mistakes
  // this guards against both need a match on the whole line.
  it("emits well-formed DTSTART, DTEND, and DTSTAMP lines", () => {
    const blocks: TimeBlock[] = [
      { id: "b", title: "Block", startTime: "09:00", endTime: "10:00", category: "rest" }
    ];
    const content = generateIcsContent("2026-09-26", blocks);
    const lines = content.split("\r\n");

    const dtstart = lines.find((l) => l.includes("T090000") && !l.includes("T100000"))!;
    expect(dtstart).toMatch(/^DTSTART(;TZID=[\w/+-]+)?:20260926T090000$/);
    const dtend = lines.find((l) => l.includes("T100000"))!;
    expect(dtend).toMatch(/^DTEND(;TZID=[\w/+-]+)?:20260926T100000$/);
    expect(content).not.toContain("DTSTART:DTSTART");
    expect(content).not.toContain("DTEND:DTEND");

    // Exactly one Z, at the end, after a 15-digit local stamp.
    const dtstamp = lines.find((l) => l.startsWith("DTSTAMP:"))!;
    expect(dtstamp).toMatch(/^DTSTAMP:\d{8}T\d{6}Z$/);
  });

  it("derives a deterministic UID when a block has no id", () => {
    const block = { id: "", title: "Untitled", startTime: "09:00", endTime: "10:00", category: "personal" as const };
    const a = generateIcsContent("2026-09-26", [block]);
    const b = generateIcsContent("2026-09-26", [block]);
    expect(a.match(/UID:[^\r\n]+/)![0]).toBe(b.match(/UID:[^\r\n]+/)![0]);
  });

  // Test 6 — an export of the whole day survives one malformed block
  it("does not abort the export when a block category is undefined", () => {
    const blocks = [
      { id: "ok", title: "Fine", startTime: "09:00", endTime: "10:00", category: "rest" as const },
      { id: "bad", title: "Broken", startTime: "10:00", endTime: "11:00", category: undefined as never }
    ];
    expect(() => generateIcsContent("2026-09-26", blocks)).not.toThrow();
    const content = generateIcsContent("2026-09-26", blocks);
    expect(content.split("BEGIN:VEVENT").length - 1).toBe(2);
  });

  // Test: RFC 5545 §3.1 line folding
  it("folds long content lines at 75 octets without losing characters", () => {
    const title = "A very long deep work block title that comfortably exceeds the seventy-five octet folding limit ".repeat(3);
    const blocks: TimeBlock[] = [
      { id: "long", title, startTime: "09:00", endTime: "10:00", category: "deep_work" }
    ];
    const content = generateIcsContent("2026-09-26", blocks);
    const encoder = new TextEncoder();
    // Every physical line fits the octet limit...
    for (const line of content.split("\r\n")) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
    // ...and every continuation line (not just the first) begins with a space.
    const lines = content.split("\r\n");
    for (let i = 1; i < lines.length; i++) {
      if (!/^(BEGIN|END|VERSION|PRODID|CALSCALE|METHOD|UID|DT|SUMMARY|DESCRIPTION|CATEGORIES|COLOR|X-|STATUS|TRANSP|X-WR)/.test(lines[i])) {
        expect(lines[i].startsWith(" ")).toBe(true);
      }
    }
    // Unfolding recovers the original line exactly — proves no character was
    // dropped or duplicated by the split.
    const unfolded = content.replace(/\r\n[ \t]/g, "");
    expect(unfolded).toContain(`SUMMARY:${title}`);
  });
});

describe("activityCategory", () => {
  it("validates known ids and resolves everything else to personal", () => {
    expect(isActivityCategory("deep_work")).toBe(true);
    expect(isActivityCategory("admin")).toBe(false);
    expect(resolveActivityCategory("deep_work")).toBe("deep_work");
    expect(resolveActivityCategory("admin_shallow")).toBe("personal");
    expect(resolveActivityCategory(undefined)).toBe("personal");
    expect(resolveActivityCategory(null)).toBe("personal");
    expect(resolveActivityCategory(42)).toBe("personal");
    expect(resolveActivityCategory("")).toBe("personal");
  });
});