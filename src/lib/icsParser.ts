import type { TimeBlockCategory } from "../types/app";

/**
 * Result of parsing ONE calendar day out of an .ics file.
 */
export type ParsedCalendar = {
  /** Timed VEVENTs on the requested date → time blocks. */
  items: Array<{
    title: string;
    startTime: string;
    endTime: string;
    /**
     * The VEVENT's CATEGORIES value, joined when the file states several.
     * Carried through so `inferCategory` can honour a category the file itself
     * declared instead of guessing from the title — its first parameter was
     * always optional, but nothing ever passed it, so that branch was dead and
     * every import fell back to title keyword matching.
     */
    categories?: string;
  }>;
  /** All-day (VALUE=DATE) VEVENTs on the requested date → agenda lines. */
  allDayTitles: string[];
  /** VEVENT count in the file before date filtering. */
  totalEvents: number;
};

/** One unfolded content line, split into its name, params and raw value. */
type IcsProperty = {
  name: string;
  params: Record<string, string>;
  value: string;
};

/** Default block length when a VEVENT carries neither DTEND nor DURATION. */
const DEFAULT_DURATION_MINUTES = 60;

/** Hard cap on how many items we will hand back for a single day. */
const DEFAULT_MAX_ITEMS = 50;

/** End-of-day wall clock used to clamp blocks that run past midnight. */
const END_OF_DAY = "23:59";

/**
 * A parsed event date-time: the wall-clock fields plus the calendar day they
 * land on, since a UTC-suffixed stamp can slide across a day boundary.
 */
type EventDate = {
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
};

/**
 * Unfold RFC 5545 line folding: a CRLF (or bare LF) followed by a single SPACE
 * or TAB is a continuation of the previous line. Google/Apple/Outlook exports
 * fold long SUMMARY/DESCRIPTION values mid-word, so this MUST run before any
 * property parsing — a naive split("\n") mangles every folded line.
 */
function unfoldLines(content: string): string[] {
  const physical = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const logical: string[] = [];

  for (const line of physical) {
    if (logical.length > 0 && (line.startsWith(" ") || line.startsWith("\t"))) {
      // Continuation: drop exactly one leading whitespace character.
      logical[logical.length - 1] += line.slice(1);
    } else {
      logical.push(line);
    }
  }

  return logical;
}

/**
 * Parse a content line into name, params and value. The value starts at the
 * FIRST colon, since a colon is legal inside the value itself. Params live to
 * the left as `;KEY=val` and may be quoted when they contain `;` or `,`.
 */
function parseProperty(line: string): IcsProperty | null {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return null;

  const left = line.slice(0, colonIndex);
  const value = line.slice(colonIndex + 1);
  const segments = splitParams(left);
  const name = (segments.shift() || "").trim().toUpperCase();
  if (!name) return null;

  const params: Record<string, string> = {};
  for (const segment of segments) {
    const eq = segment.indexOf("=");
    if (eq === -1) continue;
    const key = segment.slice(0, eq).trim().toUpperCase();
    let paramValue = segment.slice(eq + 1).trim();
    if (paramValue.startsWith('"') && paramValue.endsWith('"') && paramValue.length >= 2) {
      paramValue = paramValue.slice(1, -1);
    }
    params[key] = paramValue;
  }

  return { name, params, value };
}

/**
 * Split the left-hand side of a content line on `;`, ignoring separators that
 * sit inside a quoted parameter value (e.g. `TZID="Asia/Jakarta;Legacy"`).
 */
function splitParams(left: string): string[] {
  const segments: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of left) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ";" && !inQuotes) {
      segments.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  segments.push(current);

  return segments;
}

/**
 * Unescape an RFC 5545 TEXT value: `\n`/`\N` → newline, `\,` → `,`, `\;` → `;`
 * and `\\` → `\`. Scanning left to right means a `\\n` (escaped backslash
 * followed by a literal "n") is not mistaken for a newline.
 */
function unescapeIcsText(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char !== "\\") {
      out += char;
      continue;
    }
    const next = value[i + 1];
    if (next === undefined) {
      out += char;
      continue;
    }
    i += 1;
    if (next === "n" || next === "N") out += "\n";
    else if (next === "," || next === ";" || next === "\\") out += next;
    else out += next;
  }
  return out;
}

/**
 * Parse an iCalendar DATE / DATE-TIME value.
 * `hasTime` is false for an all-day `VALUE=DATE` stamp, which carries no
 * time-of-day and therefore cannot become a time block.
 *
 * A trailing `Z` means UTC, so the instant is converted to the DEVICE's local
 * wall clock — a block written as 08:30Z in Jakarta must import where it
 * actually happens, not as 08:30 device-local. Floating and TZID-qualified
 * stamps keep their wall-clock time verbatim (a TZID denotes the zone the
 * time is already expressed in, so converting it would double-shift).
 */
function parseIcsDateValue(value: string, hasTime: boolean): EventDate | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute, second, utc] = match;
  const hasClock = hasTime && hour !== undefined && minute !== undefined;
  if (!hasClock) {
    return { date: `${year}-${month}-${day}`, time: "00:00" };
  }

  const hours = Number(hour);
  const minutes = Number(minute);
  const seconds = second !== undefined ? Number(second) : 0;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours > 23 || minutes > 59 || seconds > 59) return null;

  if (!utc) {
    return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
  }

  const instant = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), hours, minutes, seconds)
  );
  if (Number.isNaN(instant.getTime())) return null;

  const localDate = [
    String(instant.getFullYear()).padStart(4, "0"),
    String(instant.getMonth() + 1).padStart(2, "0"),
    String(instant.getDate()).padStart(2, "0")
  ].join("-");
  const localTime = [
    String(instant.getHours()).padStart(2, "0"),
    String(instant.getMinutes()).padStart(2, "0")
  ].join(":");

  return { date: localDate, time: localTime };
}

/** Parse an RFC 5545 DURATION value (`PT1H30M`, `P1D`, `-PT15M`) to minutes. */
function parseDurationMinutes(value: string): number | null {
  const match = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    value.trim().toUpperCase()
  );
  if (!match) return null;

  const [, sign, weeks, days, hours, minutes, seconds] = match;
  const totalMinutes =
    (Number(weeks ?? 0) * 7 + Number(days ?? 0)) * 24 * 60 +
    Number(hours ?? 0) * 60 +
    Number(minutes ?? 0) +
    Math.round(Number(seconds ?? 0) / 60);

  if (totalMinutes === 0 && !weeks && !days && !hours && !minutes && !seconds) return null;
  return sign === "-" ? -totalMinutes : totalMinutes;
}

/** Add minutes to a "HH:mm" wall-clock time, clamping past midnight to 23:59. */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  if (total >= 24 * 60) return END_OF_DAY;
  const clamped = Math.max(0, total);
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** Convert a calendar day "YYYY-MM-DD" to UTC epoch ms for span comparisons. */
function dayToUtcMs(day: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(ms) ? null : ms;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Extract the events of ONE calendar day as agenda / time-block candidates.
 * Pure: no DOM, no store, no clock. Never throws — garbage, empty or truncated
 * input yields `{ items: [], allDayTitles: [], totalEvents: 0 }`.
 *
 * `maxItems` caps `items` only; all-day titles and `totalEvents` are not
 * affected by it.
 */
export function parseIcsForDate(
  content: string,
  date: string,
  opts?: { maxItems?: number }
): ParsedCalendar {
  const empty: ParsedCalendar = { items: [], allDayTitles: [], totalEvents: 0 };
  if (typeof content !== "string" || content.trim() === "") return empty;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return empty;

  const maxItems = opts?.maxItems ?? DEFAULT_MAX_ITEMS;
  const lines = unfoldLines(content);

  const items: ParsedCalendar["items"] = [];
  const allDayTitles: string[] = [];
  let totalEvents = 0;
  let inEvent = false;
  let depth = 0;
  // VEVENTs are nested containers (a VALARM sits inside), so properties are
  // only collected while depth === 1: a VALARM's own DESCRIPTION/TRIGGER can
  // never leak into the event's title.
  let current: IcsProperty[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const upper = trimmed.toUpperCase();

    if (upper.startsWith("BEGIN:")) {
      depth += 1;
      if (upper === "BEGIN:VEVENT" && !inEvent) {
        inEvent = true;
        depth = 1;
        current = [];
      }
      continue;
    }

    if (upper.startsWith("END:")) {
      if (inEvent && upper === "END:VEVENT" && depth === 1) {
        totalEvents += 1;
        collectEvent(current, date, maxItems, items, allDayTitles);
        inEvent = false;
        current = [];
      }
      depth = Math.max(0, depth - 1);
      if (!inEvent) depth = 0;
      continue;
    }

    if (inEvent && depth !== 1) continue;

    const property = parseProperty(trimmed);
    if (property) {
      if (inEvent) current.push(property);
      // Outside a VEVENT we still keep scanning (for the next BEGIN:VEVENT) but
      // store nothing: VTODO/VJOURNAL/VTIMEZONE content is ignored entirely.
    }
  }

  // Truncated file: BEGIN:VEVENT with no matching END:VEVENT. Our requirements
  // count only complete VEVENTs, so the dangling block is dropped rather than
  // guessed at.

  return { items, allDayTitles, totalEvents };
}

/**
 * Turn one complete VEVENT's properties into a time block or an agenda line.
 * Mutates the two output arrays — `items` when the date matches and a cap of
 * `maxItems` is not yet reached, `allDayTitles` regardless of that cap.
 */
function collectEvent(
  properties: IcsProperty[],
  date: string,
  maxItems: number,
  items: ParsedCalendar["items"],
  allDayTitles: string[]
): void {
  let title: string | null = null;
  let categories = "";
  let status = "";
  let start: EventDate | null = null;
  let end: EventDate | null = null;
  let durationMinutes: number | null = null;
  let startIsAllDay = false;

  for (const property of properties) {
    switch (property.name) {
      case "SUMMARY":
        if (title === null) title = unescapeIcsText(property.value);
        break;
      case "CATEGORIES":
        categories = categories
          ? `${categories},${unescapeIcsText(property.value)}`
          : unescapeIcsText(property.value);
        break;
      case "STATUS":
        status = property.value.trim().toUpperCase();
        break;
      case "DTSTART": {
        const isAllDay = (property.params.VALUE || "").toUpperCase() === "DATE";
        const parsed = parseIcsDateValue(property.value, !isAllDay);
        if (parsed) {
          start = parsed;
          startIsAllDay = isAllDay;
        }
        break;
      }
      case "DTEND": {
        const isDate = (property.params.VALUE || "").toUpperCase() === "DATE";
        const parsed = parseIcsDateValue(property.value, !isDate);
        if (parsed) end = parsed;
        break;
      }
      case "DURATION":
        durationMinutes = parseDurationMinutes(property.value);
        break;
      default:
        break;
    }
  }

  // A VEVENT with no DTSTART cannot be placed on a calendar day.
  if (!start) return;
  if (status === "CANCELLED") return;
  // A blank title is skipped rather than invented: an unnamed "(Untitled)"
  // block would silently pollute the plan with something the user never
  // wrote. `title` stays null only when SUMMARY is absent or purely whitespace.
  if (title === null || title.trim() === "") return;

  const cleanTitle = title.trim();

  if (startIsAllDay) {
    if (!coversDate(start.date, end?.date ?? null, date)) return;
    if (!allDayTitles.includes(cleanTitle)) allDayTitles.push(cleanTitle);
    return;
  }

  if (start.date !== date) return;
  if (items.length >= maxItems) return;

  const startTime = start.time;
  let endTime: string | null = null;

  if (end) {
    // DTEND <= DTSTART (or an end on a later day) means the event crosses
    // midnight: clamp it to the end of the start day rather than emitting a
    // block that ends before it begins.
    const sameDay = end.date === start.date;
    endTime = sameDay && end.time > startTime ? end.time : END_OF_DAY;
  } else if (durationMinutes !== null && durationMinutes > 0) {
    endTime = addMinutes(startTime, durationMinutes);
  } else {
    endTime = addMinutes(startTime, DEFAULT_DURATION_MINUTES);
  }

  if (endTime <= startTime) endTime = END_OF_DAY;

  // Omit the key entirely when the VEVENT declared no CATEGORIES, so a parsed
  // item keeps exactly the shape it had before this field existed for every
  // file that does not use the property.
  items.push(
    categories
      ? { title: cleanTitle, startTime, endTime, categories }
      : { title: cleanTitle, startTime, endTime }
  );
}

/**
 * Does an all-day event cover `date`? RFC 5545 DTEND for an all-day event is
 * EXCLUSIVE, so a one-day event on 20261005 is `DTSTART:20261005` with
 * `DTEND:20261006`; a multi-day event covers every date from DTSTART up to but
 * not including DTEND. Without a DTEND the event covers its start day alone.
 */
function coversDate(startDate: string, endDate: string | null, date: string): boolean {
  const startMs = dayToUtcMs(startDate);
  const targetMs = dayToUtcMs(date);
  if (startMs === null || targetMs === null) return false;

  const endMs = endDate ? dayToUtcMs(endDate) : null;
  if (endMs === null) return startMs === targetMs;

  // Non-positive span is malformed; treat it as a single-day event.
  const spanEnd = endMs > startMs ? endMs : startMs + DAY_MS;
  return targetMs >= startMs && targetMs < spanEnd;
}

/** Keyword groups, first hit wins, matched case-insensitively. */
const CATEGORY_KEYWORDS: Array<{ category: TimeBlockCategory; keywords: string[] }> = [
  {
    category: "rest",
    keywords: [
      "rest",
      "sleep",
      "nap",
      "lunch",
      "dinner",
      "breakfast",
      "break",
      "coffee",
      "kopi",
      "istirahat",
      "makan",
      "tidur",
      "libur",
      "santai"
    ]
  },
  {
    category: "learning",
    keywords: [
      "study",
      "learn",
      "course",
      "lecture",
      "class",
      "read",
      "reading",
      "belajar",
      "kuliah",
      "kelas",
      "baca",
      "kursus",
      "tutorial",
      "training",
      "workshop",
      "webinar"
    ]
  },
  {
    // Sits between learning and shallow on purpose. A title that names its own
    // category ("Deep work: …", "Focus block") must outrank a generic hint,
    // or "Deep work: refactor the sync merge" imports as admin off the word
    // "sync". It stays after learning so "Reading: Deep Work" (a book title)
    // still reads as learning, and after rest so "Lunch break" stays rest.
    //
    // The list is deliberately narrow. This group is the ONLY way an event is
    // called deep work — see the fallback at the bottom of `inferCategory`.
    category: "deep_work",
    keywords: [
      "deep work",
      "deepwork",
      "focus",
      "fokus",
      "coding",
      "ngoding",
      "refactor",
      "implement",
      "debug"
    ]
  },
  {
    // Meetings, admin and coordination — the bulk of a real calendar.
    category: "shallow",
    keywords: [
      "meeting",
      "meet",
      "standup",
      "sync",
      "call",
      "chat",
      "email",
      "admin",
      "rapat",
      "diskusi",
      "ngobrol",
      "review",
      "briefing",
      "interview",
      "wawancara",
      "presentasi",
      "demo",
      "koordinasi",
      "laporan",
      "update",
      "follow up",
      "followup",
      "invoice",
      "pajak",
      "bayar",
      "tagihan",
      "cek"
    ]
  }
];

/**
 * Map a free-text event title + optional CATEGORIES to a TimeBlockCategory.
 *
 * Order matters: the first group with a keyword hit wins. When nothing matches
 * the answer is `personal`, NOT `deep_work`: an unrecognized calendar entry
 * ("Dokter gigi", "Antar anak ke sekolah") is not evidence of depth, and
 * defaulting to deep work labeled whole imported calendars as deep work — a
 * day of errands read as a day of focus. Deep work must be named to be
 * claimed. The user can still re-categorize any block in the planning sheet.
 */
export function inferCategory(title: string, icsCategories?: string): TimeBlockCategory {
  // The file's own CATEGORIES property is an explicit statement by whoever
  // wrote the event: if it names a category Zendo has, believe it. Checked
  // first, because it is a declaration rather than a title guess.
  const declared = (icsCategories || "").toLowerCase();
  if (declared) {
    for (const group of CATEGORY_KEYWORDS) {
      if (group.keywords.some((keyword) => declared.includes(keyword))) return group.category;
    }
  }

  const haystack = `${title || ""}`.toLowerCase();

  // Match whole words, not substrings: `includes` made "breakfast" hit the
  // "break" keyword and, worse, "restaurant" hit "rest" — an imported lunch
  // booking became rest work. Word boundaries keep the keyword list honest.
  const hasWord = (keyword: string) =>
    new RegExp(`(^|[^a-z0-9])${keyword}([^a-z0-9]|$)`).test(haystack);

  for (const group of CATEGORY_KEYWORDS) {
    if (group.keywords.some(hasWord)) return group.category;
  }

  return "personal";
}
