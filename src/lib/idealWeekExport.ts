import type { IdealBlock } from "../types/app";
import { addDaysToDate, parseLocalDateKey } from "./date";
import { calendarSegments, timeLabel } from "./idealWeekCalendar";
import { generateIcsContent } from "./ical";
import { validDate } from "./weeklyPlanning";

/** Export the visible calendar pattern, including customized and overnight portions. */
export function generateIdealWeekIcs(blocks: IdealBlock[], start: string, end: string): string {
  if (!validDate(start) || !validDate(end) || start > end) throw new Error("range");
  const events: string[] = [];
  let date = start;
  for (let count = 0; date <= end && count < 366; count++, date = addDaysToDate(date, 1)) {
    const dayBlocks = calendarSegments(blocks, parseLocalDateKey(date).getDay()).map(part => ({
      id: `ideal-${part.block.id}-${part.continuation ? "morning" : "evening"}`,
      title: part.block.title,
      startTime: timeLabel(part.start),
      endTime: part.end === 1440 ? "24:00" : timeLabel(part.end),
      category: part.block.category,
    }));
    events.push(...(generateIcsContent(date, dayBlocks).match(/BEGIN:VEVENT\r\n[\s\S]*?\r\nEND:VEVENT/g) ?? []));
  }
  if (date <= end) throw new Error("range");
  return generateIcsContent(start, [], "Zendo Ideal Week").replace("END:VCALENDAR", [...events, "END:VCALENDAR"].join("\r\n"));
}
