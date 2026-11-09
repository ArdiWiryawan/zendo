import { describe, expect, it } from "vitest";
import { generateIdealWeekIcs } from "./idealWeekExport";
import type { IdealBlock } from "../types/app";

const work: IdealBlock = { id: "work", title: "Code, review; plan\nNext", startTime: "09:30", duration: 120, days: [1,2,3,4,5], category: "deep_work", flexible: true };
describe("Ideal Week export", () => {
  it("exports selected weekdays over an inclusive date range with stable IDs and escaped titles", () => {
    const content = generateIdealWeekIcs([work], "2026-11-09", "2026-11-15");
    expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(5);
    expect(content).toContain("20261109T093000");
    expect(content).not.toContain("20261114T093000");
    expect(content).toContain("SUMMARY:Code\\, review\\; plan\\nNext");
    expect(content.match(/UID:.+/g)).toEqual(generateIdealWeekIcs([work], "2026-11-09", "2026-11-15").match(/UID:.+/g));
  });
  it("exports overnight portions on selected days with valid next-midnight timestamps", () => {
    const content = generateIdealWeekIcs([{...work, id:"sleep",startTime:"22:00",duration:420,days:[1]}], "2026-11-09", "2026-11-10");
    expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(content).toContain("20261109T000000");
    expect(content).toContain("20261109T050000");
    expect(content).toContain("20261109T220000");
    expect(content).toContain("20261110T000000");
    expect(content).not.toContain("T240000");
    expect(content.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
  });
  it("rejects invalid, reversed, and excessive date ranges", () => {
    for (const [start,end] of [["2026-02-30","2026-03-02"],["2026-11-10","2026-11-09"],["2026-01-01","2027-02-01"]]) {
      expect(()=>generateIdealWeekIcs([work],start,end)).toThrow();
    }
    expect(generateIdealWeekIcs([],"2026-11-09","2026-11-09")).not.toContain("BEGIN:VEVENT");
  });
});
