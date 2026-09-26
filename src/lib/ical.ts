import type { TimeBlock } from "../types/app";

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
 * Generate standard RFC 5545 iCalendar file content from TimeBlock[]
 */
export function generateIcsContent(
  date: string,
  timeBlocks: TimeBlock[],
  seasonTitle = "Zendo Focus"
): string {
  const now = new Date();
  const dtstamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const icsDate = toIcsDate(date);

  const events = timeBlocks.map((block) => {
    const dtstart = `${icsDate}T${toIcsTime(block.startTime)}`;
    const dtend = `${icsDate}T${toIcsTime(block.endTime)}`;
    const uid = `${block.id || Math.random().toString(36).slice(2)}-${icsDate}@zendo.app`;
    const summary = escapeIcsText(block.title);
    const category = escapeIcsText(block.customCategory || block.category.replace("_", " ").toUpperCase());
    const description = escapeIcsText(
      `[Zendo Plan] ${block.title}\nKategori: ${block.customCategory || block.category}\nTanggal: ${date}`
    );

    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `CATEGORIES:${category}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT"
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zendo//Focus Timeblocking//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(seasonTitle)} - ${date}`,
    ...events,
    "END:VCALENDAR"
  ].join("\r\n");
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
