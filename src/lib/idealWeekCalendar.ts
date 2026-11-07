import type { IdealBlock } from "../types/app";

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
export const timeMinutes = (time: string) => {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export const timeLabel = (minutes: number) => {
  const value = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
};
export function timeDuration(start: string, end: string) {
  const a = timeMinutes(start),
    b = timeMinutes(end);
  return !Number.isFinite(a + b) || a === b ? 0 : (b - a + 1440) % 1440;
}

export type CalendarSegment = {
  block: IdealBlock;
  start: number;
  end: number;
  continuation: boolean;
  lane: number;
  lanes: number;
};

/** Include yesterday's overnight tail, including Sunday -> Monday. */
export function calendarSegments(
  blocks: IdealBlock[],
  day: number,
): CalendarSegment[] {
  const parts: CalendarSegment[] = [];
  for (const block of blocks) {
    const start = timeMinutes(block.startTime);
    const end = start + block.duration;
    if (!Number.isFinite(end) || block.duration <= 0) continue;
    if (block.days.includes(day))
      parts.push({
        block,
        start,
        end: Math.min(end, 1440),
        continuation: false,
        lane: 0,
        lanes: 1,
      });
    if (end > 1440 && block.days.includes((day + 6) % 7))
      parts.push({
        block,
        start: 0,
        end: end - 1440,
        continuation: true,
        lane: 0,
        lanes: 1,
      });
  }
  parts.sort((a, b) => a.start - b.start || a.end - b.end);
  let group: CalendarSegment[] = [],
    groupEnd = -1;
  function flush() {
    const laneEnds: number[] = [];
    for (const part of group) {
      let lane = laneEnds.findIndex((end) => end <= part.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = part.end;
      part.lane = lane;
    }
    group.forEach((part) => {
      part.lanes = laneEnds.length;
    });
    group = [];
  }
  for (const part of parts) {
    if (part.start >= groupEnd) {
      flush();
      groupEnd = -1;
    }
    group.push(part);
    groupEnd = Math.max(groupEnd, part.end);
  }
  flush();
  return parts;
}
