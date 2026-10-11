import { describe, it, expect } from "vitest";
import { parseIcsForDate, inferCategory } from "./icsParser";
import type { TimeBlockCategory } from "../types/app";

/** Wrap VEVENT bodies in a minimal VCALENDAR envelope. */
function calendar(...bodies: string[]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Test//EN", ...bodies, "END:VCALENDAR"].join(
    "\r\n"
  );
}

describe("icsParser", () => {
  it("unfolds a folded SUMMARY split mid-word and reads the full title", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART:20261005T083000",
        "DTEND:20261005T103000",
        "SUMMARY:Deep Work: Refactor the syn",
        " c layer before lunch",
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.totalEvents).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("Deep Work: Refactor the sync layer before lunch");
  });

  it("parses a normal DTSTART/DTEND event on the target date", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART:20261005T083000",
        "DTEND:20261005T103000",
        "SUMMARY:Code review",
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.items).toEqual([
      { title: "Code review", startTime: "08:30", endTime: "10:30" }
    ]);
  });

  it("skips an event on a different date", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART:20261006T083000",
        "DTEND:20261006T103000",
        "SUMMARY:Tomorrow's work",
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.items).toEqual([]);
    expect(result.totalEvents).toBe(1);
  });

  it("routes an all-day event to allDayTitles and NOT to items", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART;VALUE=DATE:20261005",
        "DTEND;VALUE=DATE:20261006",
        "SUMMARY:Hari Kemerdekaan",
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.allDayTitles).toEqual(["Hari Kemerdekaan"]);
    expect(result.items).toEqual([]);
    expect(result.totalEvents).toBe(1);
  });

  it("matches a multi-day all-day event on a middle date", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART;VALUE=DATE:20261004",
        "DTEND;VALUE=DATE:20261008",
        "SUMMARY:Retreat",
        "END:VEVENT"
      ].join("\r\n")
    );

    expect(parseIcsForDate(ics, "2026-10-04").allDayTitles).toEqual(["Retreat"]);
    expect(parseIcsForDate(ics, "2026-10-06").allDayTitles).toEqual(["Retreat"]);
    expect(parseIcsForDate(ics, "2026-10-07").allDayTitles).toEqual(["Retreat"]);
    // DTEND is exclusive: the 8th is the first day NOT covered.
    expect(parseIcsForDate(ics, "2026-10-08").allDayTitles).toEqual([]);
    // And it never becomes a timed block.
    expect(parseIcsForDate(ics, "2026-10-06").items).toEqual([]);
  });

  it("dedupes identical all-day titles but keeps file order", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART;VALUE=DATE:20261005",
        "SUMMARY:Fokus Mingguan",
        "END:VEVENT"
      ].join("\r\n"),
      [
        "BEGIN:VEVENT",
        "DTSTART;VALUE=DATE:20261005",
        "SUMMARY:Sprint review",
        "END:VEVENT"
      ].join("\r\n"),
      [
        "BEGIN:VEVENT",
        "DTSTART;VALUE=DATE:20261005",
        "SUMMARY:Fokus Mingguan",
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.allDayTitles).toEqual(["Fokus Mingguan", "Sprint review"]);
    expect(result.totalEvents).toBe(3);
  });

  it("does not count all-day events toward maxItems", () => {
    const allDay = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART;VALUE=DATE:20261005",
        "SUMMARY:All day thing",
        "END:VEVENT"
      ].join("\r\n")
    );
    const timed = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART:20261005T090000",
        "DTEND:20261005T100000",
        "SUMMARY:A",
        "END:VEVENT"
      ].join("\r\n"),
      [
        "BEGIN:VEVENT",
        "DTSTART:20261005T110000",
        "DTEND:20261005T120000",
        "SUMMARY:B",
        "END:VEVENT"
      ].join("\r\n")
    );

    expect(parseIcsForDate(allDay, "2026-10-05", { maxItems: 0 })).toEqual({
      items: [],
      allDayTitles: ["All day thing"],
      totalEvents: 1
    });
    expect(parseIcsForDate(timed, "2026-10-05", { maxItems: 1 }).items).toHaveLength(1);
  });

  it("skips STATUS:CANCELLED", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART:20261005T083000",
        "DTEND:20261005T103000",
        "SUMMARY:Cancelled standup",
        "STATUS:CANCELLED",
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.items).toEqual([]);
    // Still counted: the file really does contain one VEVENT.
    expect(result.totalEvents).toBe(1);
  });

  it("does not leak a VALARM's DESCRIPTION into the event", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART:20261005T083000",
        "DTEND:20261005T103000",
        "SUMMARY:Write RFC",
        "BEGIN:VALARM",
        "TRIGGER:-PT15M",
        "ACTION:DISPLAY",
        "DESCRIPTION:Reminder: do not leak me",
        "END:VALARM",
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.items).toEqual([{ title: "Write RFC", startTime: "08:30", endTime: "10:30" }]);
    expect(result.items[0].title).not.toContain("Reminder");
  });

  it("unescapes newline, comma, semicolon and backslash in SUMMARY", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART:20261005T083000",
        "DTEND:20261005T103000",
        "SUMMARY:Lunch\\, then sync\\; part 2\\\\done\\nSecond line",
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.items[0].title).toBe("Lunch, then sync; part 2\\done\nSecond line");
  });

  it("defaults to 60 minutes when DTEND is absent", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART:20261005T133000",
        "SUMMARY:No end stamp",
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.items).toEqual([
      { title: "No end stamp", startTime: "13:30", endTime: "14:30" }
    ]);
  });

  it("honours DURATION when DTEND is absent", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART:20261005T133000",
        "DURATION:PT1H30M",
        "SUMMARY:Duration event",
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.items).toEqual([
      { title: "Duration event", startTime: "13:30", endTime: "15:00" }
    ]);
  });

  it("keeps wall-clock time for a TZID-qualified DTSTART", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART;TZID=Asia/Jakarta:20261005T083000",
        "DTEND;TZID=Asia/Jakarta:20261005T103000",
        "SUMMARY:Jakarta call",
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.items).toEqual([
      { title: "Jakarta call", startTime: "08:30", endTime: "10:30" }
    ]);
  });

  it("clamps a midnight-crossing event's end to 23:59", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART:20261005T230000",
        "DTEND:20261006T010000",
        "SUMMARY:Overnight deploy",
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.items).toEqual([
      { title: "Overnight deploy", startTime: "23:00", endTime: "23:59" }
    ]);
  });

  it("clamps an inverted DTEND so no block ends before it starts", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART:20261005T100000",
        "DTEND:20261005T090000",
        "SUMMARY:Bad export",
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.items).toEqual([{ title: "Bad export", startTime: "10:00", endTime: "23:59" }]);
  });

  it("respects maxItems while totalEvents reports the true count", () => {
    const bodies = Array.from({ length: 5 }, (_, index) =>
      [
        "BEGIN:VEVENT",
        `DTSTART:20261005T${String(8 + index).padStart(2, "0")}0000`,
        `DTEND:20261005T${String(8 + index).padStart(2, "0")}3000`,
        `SUMMARY:Event ${index + 1}`,
        "END:VEVENT"
      ].join("\r\n")
    );

    const result = parseIcsForDate(calendar(...bodies), "2026-10-05", { maxItems: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe("Event 1");
    expect(result.totalEvents).toBe(5);
  });

  it("skips an event with a blank SUMMARY", () => {
    const ics = calendar(
      [
        "BEGIN:VEVENT",
        "DTSTART:20261005T083000",
        "DTEND:20261005T103000",
        "SUMMARY:   ",
        "END:VEVENT"
      ].join("\r\n")
    );

    expect(parseIcsForDate(ics, "2026-10-05").items).toEqual([]);
    expect(parseIcsForDate(ics, "2026-10-05").totalEvents).toBe(1);
  });

  it("ignores VTODO, VJOURNAL and VTIMEZONE blocks", () => {
    const ics = calendar(
      [
        "BEGIN:VTIMEZONE",
        "TZID:Asia/Jakarta",
        "BEGIN:STANDARD",
        "DTSTART:19700101T000000",
        "TZOFFSETFROM:+0700",
        "TZOFFSETTO:+0700",
        "END:STANDARD",
        "END:VTIMEZONE"
      ].join("\r\n"),
      [
        "BEGIN:VTODO",
        "DTSTART:20261005T083000",
        "SUMMARY:Not a calendar event",
        "END:VTODO"
      ].join("\r\n"),
      [
        "BEGIN:VJOURNAL",
        "DTSTART:20261005T083000",
        "SUMMARY:Journal entry",
        "END:VJOURNAL"
      ].join("\r\n")
    );

    const result = parseIcsForDate(ics, "2026-10-05");

    expect(result.items).toEqual([]);
    expect(result.totalEvents).toBe(0);
  });

  it("returns an empty result for garbage / empty input without throwing", () => {
    const empty = { items: [], allDayTitles: [], totalEvents: 0 };

    expect(() => parseIcsForDate("", "2026-10-05")).not.toThrow();
    expect(parseIcsForDate("", "2026-10-05")).toEqual(empty);
    expect(parseIcsForDate("not a calendar at all", "2026-10-05")).toEqual(empty);
    expect(parseIcsForDate("BEGIN:VCALENDAR\r\nBROKEN", "2026-10-05")).toEqual(empty);
    expect(parseIcsForDate(null as unknown as string, "2026-10-05")).toEqual(empty);
    expect(parseIcsForDate(undefined as unknown as string, "2026-10-05")).toEqual(empty);
    expect(parseIcsForDate(calendar("BEGIN:VEVENT", "DTSTART:20261005T083000"), "2026-10-05")).toEqual(
      empty
    );
  });

  it("parses a bare-LF file (no CRLF) the same way", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART:20261005T083000",
      "DTEND:20261005T103000",
      "SUMMARY:LF only",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\n");

    expect(parseIcsForDate(ics, "2026-10-05").items).toEqual([
      { title: "LF only", startTime: "08:30", endTime: "10:30" }
    ]);
  });

  it("round-trips a Zendo-exported calendar back into blocks", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:block-1-20261005@zendo.app",
      "DTSTART:20261005T083000",
      "DTEND:20261005T103000",
      "SUMMARY:Deep Work: Coding API",
      "CATEGORIES:DEEP WORK",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const result = parseIcsForDate(ics, "2026-10-05");

    // The CATEGORIES property is carried through, not dropped. It is what makes
    // the declared-category branch of inferCategory reachable: an event that
    // says it is deep work should be imported as deep work rather than re-guessed
    // from its title.
    expect(result.items).toEqual([
      { title: "Deep Work: Coding API", startTime: "08:30", endTime: "10:30", categories: "DEEP WORK" }
    ]);
    expect(result.totalEvents).toBe(1);
  });
});

describe("inferCategory", () => {
  it("maps Indonesian rest keywords to rest", () => {
    expect(inferCategory("Istirahat siang")).toBe("rest");
    expect(inferCategory("Makan siang bareng tim")).toBe("rest");
    expect(inferCategory("Tidur awal")).toBe("rest");
  });

  it("maps English rest keywords to rest", () => {
    expect(inferCategory("Lunch break")).toBe("rest");
    expect(inferCategory("Coffee break")).toBe("rest");
  });

  it("maps learning keywords to learning", () => {
    expect(inferCategory("Belajar TypeScript")).toBe("learning");
    expect(inferCategory("Kuliah pagi")).toBe("learning");
    expect(inferCategory("Reading: Deep Work")).toBe("learning");
    expect(inferCategory("Study session")).toBe("learning");
  });

  it("maps meeting/admin keywords to shallow", () => {
    expect(inferCategory("Team sync")).toBe("shallow");
    expect(inferCategory("Weekly meeting")).toBe("shallow");
    expect(inferCategory("Email triage")).toBe("shallow");
  });

  it("uses CATEGORIES as an explicit declaration, outranking the title", () => {
    // The file's own CATEGORIES is the author saying what the event is, so it
    // beats a title guess — including a title that would match elsewhere.
    expect(inferCategory("Block 1", "REST")).toBe("rest");
    expect(inferCategory("Deep work sprint", "MEETING")).toBe("shallow");
  });

  it("does NOT default to deep_work", () => {
    // This was the bug: deep_work was the fallback, so every unrecognized
    // event — errands, appointments, admin — imported as deep work and a whole
    // calendar read as focus time. An unknown event is `personal`, and deep
    // work has to be named.
    expect(inferCategory("Dokter gigi")).toBe("personal");
    expect(inferCategory("Antar anak ke sekolah")).toBe("personal");
    expect(inferCategory("Renovasi kamar")).toBe("personal");
    expect(inferCategory("Olahraga sore")).toBe("personal");
    expect(inferCategory("")).toBe("personal");
    expect(inferCategory(undefined as unknown as string)).toBe("personal");
  });

  it("only calls it deep_work when the title says so", () => {
    expect(inferCategory("Deep work: refactor the sync merge")).toBe("deep_work");
    expect(inferCategory("Focus block")).toBe("deep_work");
    expect(inferCategory("Ngoding fitur login")).toBe("deep_work");
  });

  it("routes the bulk of a real calendar to shallow", () => {
    // Meetings, admin and coordination are what most events actually are.
    expect(inferCategory("Standup pagi")).toBe("shallow");
    expect(inferCategory("Review desain onboarding")).toBe("shallow");
    expect(inferCategory("Ngobrol sama klien")).toBe("shallow");
    expect(inferCategory("Cek invoice dan pajak")).toBe("shallow");
    expect(inferCategory("Briefing vendor")).toBe("shallow");
  });

  it("first keyword group wins when several could match", () => {
    // "lunch" (rest) is checked before the shallow words in the title.
    expect(inferCategory("Lunch meeting with client")).toBe("rest");
    const expected: TimeBlockCategory = "rest";
    expect(inferCategory("Lunch meeting with client")).toBe(expected);
  });

  it("is case-insensitive", () => {
    expect(inferCategory("LUNCH")).toBe("rest");
    expect(inferCategory("MeEtInG")).toBe("shallow");
  });

  it("matches whole words, not substrings", () => {
    // Substring matching made "restaurant" hit "rest" and an imported dinner
    // booking landed as rest work; "breakout" hit "break" the same way.
    expect(inferCategory("Restaurant reservation")).toBe("personal");
    expect(inferCategory("Breakout room setup")).toBe("personal");
    // The real keyword still matches as a standalone word.
    expect(inferCategory("Lunch")).toBe("rest");
  });

  it("lets an explicit deep-work title outrank a generic keyword", () => {
    // "Deep work: refactor the sync merge" used to import as shallow because
    // "sync" is a meeting keyword; the title states its own category.
    expect(inferCategory("Deep work: refactor the sync merge")).toBe("deep_work");
    expect(inferCategory("Focus block")).toBe("deep_work");
    // A plain meeting keyword still resolves to shallow on its own.
    expect(inferCategory("Team sync")).toBe("shallow");
  });
});
