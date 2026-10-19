import type { TimeBlock } from "../types/app";
import {
  TIME_BLOCK_CATEGORIES,
  activityCategoryColorName,
  activityCategoryHex,
  resolveActivityCategory,
  type ActivityCategory
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

export type IcsCategoryGroup = {
  category: ActivityCategory;
  blocks: TimeBlock[];
};

/**
 * Split a day's blocks into one group per category, in menu order.
 *
 * This exists because of a hard limit in Google Calendar: on ICS *import* it
 * ignores a per-event `COLOR` and assigns one color to the whole calendar.
 * The only way to get "green = rest, red = deep work" there is to import each
 * category as its own calendar and pick that calendar's color — so the export
 * needs the same split the user will perform by hand.
 */
export function groupTimeBlocksByCategory(timeBlocks: TimeBlock[]): IcsCategoryGroup[] {
  const byCategory = new Map<ActivityCategory, TimeBlock[]>();
  for (const block of timeBlocks || []) {
    const category = resolveActivityCategory(block.category);
    const bucket = byCategory.get(category);
    if (bucket) bucket.push(block);
    else byCategory.set(category, [block]);
  }
  return TIME_BLOCK_CATEGORIES.filter((category) => byCategory.has(category)).map((category) => ({
    category,
    blocks: byCategory.get(category) ?? []
  }));
}

type IcsBuildOptions = {
  /** Calendar display name. Google reads this as the calendar name on import. */
  calendarName?: string;
  /** When set, only blocks in this category are emitted. */
  category?: ActivityCategory;
};

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
 * and ignores an event's color on ICS import. `generateIcsContentForCategory`
 * below is the workaround — one file per category, so each lands as its own
 * calendar and the user sets one color per calendar.
 */
function buildIcsContent(
  date: string,
  timeBlocks: TimeBlock[],
  seasonTitle: string,
  options: IcsBuildOptions
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

  const blocksForCalendar = options.category
    ? (timeBlocks || []).filter(
        (block) => resolveActivityCategory(block.category) === options.category
      )
    : timeBlocks || [];

  const events = blocksForCalendar.map((block) => {
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
    `X-WR-CALNAME:${escapeIcsText(options.calendarName ?? `${seasonTitle} - ${date}`)}`
  ].map(foldLine);

  return [...header, ...events, "END:VCALENDAR"].join("\r\n");
}

export function generateIcsContent(
  date: string,
  timeBlocks: TimeBlock[],
  seasonTitle = "Zendo Focus"
): string {
  return buildIcsContent(date, timeBlocks, seasonTitle, {});
}

/**
 * One calendar per activity category.
 *
 * `label` is the already-translated category name, so the imported calendar
 * reads in the user's language instead of showing `deep_work`.
 */
export function generateIcsContentForCategory(
  date: string,
  category: ActivityCategory,
  timeBlocks: TimeBlock[],
  seasonTitle = "Zendo Focus",
  label?: string
): string {
  return buildIcsContent(date, timeBlocks, seasonTitle, {
    category,
    calendarName: `${seasonTitle} · ${label ?? category.replace(/_/g, " ")}`
  });
}

/** Browser download for one already-serialized calendar. */
function downloadIcsText(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking synchronously can cancel the download in some browsers; one turn
  // of the event loop is enough for the click to be consumed.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  downloadIcsText(`zendo-plan-${date}.ics`, generateIcsContent(date, timeBlocks, seasonTitle));
}

/**
 * Downloads one .ics per category present in the day.
 *
 * All clicks fire synchronously inside the user's gesture: a stagger via
 * `setTimeout` loses the activation and browsers then block every file after
 * the first. Chrome may still ask "allow multiple downloads" — that prompt is
 * the intended behaviour, not a bug.
 *
 * Returns how many files were queued, so the caller can tell the user what to
 * expect. Names are deterministic (`zendo-2026-10-19-rest.ics`) so re-importing
 * after an edit updates the same calendar instead of stacking duplicates.
 */
export function downloadIcsFilesByCategory(
  date: string,
  timeBlocks: TimeBlock[],
  seasonTitle = "Zendo Focus",
  labels: Partial<Record<ActivityCategory, string>> = {}
): number {
  const groups = groupTimeBlocksByCategory(timeBlocks);
  for (const group of groups) {
    const content = generateIcsContentForCategory(
      date,
      group.category,
      group.blocks,
      seasonTitle,
      labels[group.category]
    );
    downloadIcsText(`zendo-${date}-${group.category}.ics`, content);
  }
  return groups.length;
}
