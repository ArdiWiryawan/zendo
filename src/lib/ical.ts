import type { TimeBlock } from "../types/app";
import {
  activityCategoryColorName,
  activityCategoryHex,
  resolveActivityCategory
} from "./activityCategory";

/**
 * Clean date string "YYYY-MM-DD" to "YYYYMMDD"
 */
function toIcsDate(date: string): string {
  return date.replace(/-/g, "");
}

/**
 * Clean time string "HH:mm" to "HHmm00"
 */
function toIcsTime(time: string): string {
  const parts = time.split(":");
  const h = (parts[0] || "00").padStart(2, "0");
  const m = (parts[1] || "00").padStart(2, "0");
  return `${h}${m}00`;
}

/**
 * Escape iCalendar text (newlines, backslashes, semicolons, commas)
 */
function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * The IANA zone the app is running in, or null when it cannot be determined.
 * Read per call rather than cached: the user can change zones while the tab is
 * open, and an export should use the zone the user is in *now*.
 */
function localTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Fold a content line to RFC 5545 §3.1's 75-octet limit.
 *
 * The limit is octets, not characters, so the split is made on a UTF-8 byte
 * budget — a title full of em dashes or CJK must not be cut mid-codepoint, which
 * would emit an invalid continuation. A folded line continues on the next
 * physical line, which begins with a single space (that leading space is
 * *consumed* by the parser and is not part of the value).
 *
 * Continuation lines get a 74-octet budget rather than 75 because the leading
 * space counts toward the octet limit.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const segments: string[] = [];
  let current = "";
  let currentBytes = 0;
  // The first physical line may use the full 75 octets; every continuation
  // line spends one of its octets on the leading space, so it gets 74.
  let budget = 75;

  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    if (currentBytes + charBytes > budget) {
      segments.push(current);
      current = "";
      currentBytes = 0;
      budget = 74;
    }
    current += char;
    currentBytes += charBytes;
  }
  segments.push(current);

  // "\r\n " between segments supplies the required leading space on every
  // continuation line — including the last one. Prepending the space to the
  // finished segment instead (an earlier mistake here) leaves the final
  // continuation unfolded with no space, which deletes a character on import.
  return segments.join("\r\n ");
}

const EVENT_STATUS = "STATUS:CONFIRMED";
const EVENT_TRANSP = "TRANSP:OPAQUE";

/**
 * Generate standard RFC 5545 iCalendar file content from TimeBlock[]
 *
 * Each event carries its category's color so the exported calendar shows what
 * kind of activity each block is, not just when it happens. Two properties are
 * written per event, because no single one is honoured everywhere:
 *
 *   COLOR                     RFC 7986, a CSS3 color *name*. Standards-compliant;
 *                             honoured by clients that implement RFC 7986.
 *   X-APPLE-CALENDAR-COLOR    the exact hex, honoured by Apple Calendar. This is
 *                             a vendor extension, so it is additive only.
 *
 * Neither is guaranteed on import: Google Calendar assigns color per calendar
 * and ignores an event's color on ICS import. That limitation is real and not
 * something a file can work around; the CATEGORIES property below still carries
 * the category text for clients that read it.
 */
export function generateIcsContent(
  date: string,
  timeBlocks: TimeBlock[],
  seasonTitle = "Zendo Focus"
): string {
  const now = new Date();
  // toISOString() is already UTC and already ends in "Z" once the separators
  // and milliseconds are stripped — appending another "Z" would emit
  // "…ZZ" and make the file unreadable to a strict parser.
  const dtstamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const icsDate = toIcsDate(date);
  const tzid = localTimeZone();
  // `TZID=` pins each instant to the zone it was authored in. Without it the
  // values are RFC 5545 floating times, read as "whatever zone the importing
  // client is in" — so an exporter in Jakarta and a client in UTC silently
  // disagree by seven hours. Falls back to floating only if the zone is unknown,
  // which is no worse than the previous behaviour.
  const dateLine = (name: "DTSTART" | "DTEND", time: string) =>
    tzid
      ? `${name};TZID=${tzid}:${icsDate}T${toIcsTime(time)}`
      : `${name}:${icsDate}T${toIcsTime(time)}`;

  const events = (timeBlocks || []).map((block) => {
    // Resolve before anything reads the category. An id from older state, a
    // hand-edited payload, or a future build used to reach
    // `block.category.replace(...)` and throw, aborting the export of every
    // other block in the day over one bad value.
    const categoryId = resolveActivityCategory(block.category);
    const uid = `${block.id || `${icsDate}-${block.startTime}-${block.title}`}-${icsDate}@zendo.app`;
    const summary = escapeIcsText(block.title);
    // customCategory is a user's free-text tag ("Q3 planning"), a different kind
    // of thing from the category id. Prefer the tag as the human-facing label,
    // but never let it stand in for the category itself.
    const label = block.customCategory || categoryId.replace(/_/g, " ").toUpperCase();
    const category = escapeIcsText(label);
    const description = escapeIcsText(
      `[Zendo Plan] ${block.title}\nKategori: ${label}\nTanggal: ${date}`
    );

    // Each entry is a complete content line. Building the DTSTART/DTEND lines
    // whole — rather than pairing a name with a value in a lookup table — is
    // deliberate: a table that prepends `${name}:` to a value that already
    // begins `DTSTART;TZID=` emits `DTSTART:DTSTART;TZID=…`, which is what a
    // previous revision of this function did.
    const lines = [
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      dateLine("DTSTART", block.startTime),
      dateLine("DTEND", block.endTime),
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `CATEGORIES:${category}`,
      `COLOR:${activityCategoryColorName(categoryId)}`,
      `X-APPLE-CALENDAR-COLOR:${activityCategoryHex(categoryId)}`,
      EVENT_STATUS,
      EVENT_TRANSP
    ];

    return [
      "BEGIN:VEVENT",
      ...lines.map(foldLine),
      "END:VEVENT"
    ].join("\r\n");
  });

  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zendo//Focus Timeblocking//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(seasonTitle)} - ${date}`
  ].map(foldLine);

  return [...header, ...events, "END:VCALENDAR"].join("\r\n");
}

/**
 * Triggers a browser download of the .ics calendar file
 */
export function downloadIcsFile(
  date: string,
  timeBlocks: TimeBlock[],
  seasonTitle = "Zendo Focus"
): void {
  if (timeBlocks.length === 0) return;
  const content = generateIcsContent(date, timeBlocks, seasonTitle);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `zendo-plan-${date}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
