import type { Practice, PracticeLog, Season } from "../types/app";
import { addDaysToDate, datesInRange, getDaysPassed, getTodayDateString, parseLocalDateKey } from "./date";

/**
 * §40 — the three scales answer three *different* questions, so they are three
 * functions rather than one dashboard rendered three times:
 *
 *  - `practiceWeekView`   — "What did I do?"      — which days, this week.
 *  - `practiceMonthView`  — "What pattern is emerging?" — how many, and when.
 *  - `practiceSeasonView` — "Did my system support what mattered?" — totals.
 *
 * Pure: no store access, no `Date.now()`. Every function that needs "now" takes
 * an explicit reference date, which is also what makes them testable.
 *
 * Tone (§24): these are counts, never streaks and never scores. A missed day
 * simply is not counted — nothing here can return a negative or a grade.
 */

/** Monday-first weekday index, matching `types/app.ts` and `date.ts` weeks. */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type PracticeDay = {
  /** yyyy-MM-dd */
  date: string;
  done: boolean;
};

export type PracticeWeekView = {
  startDate: string;
  endDate: string;
  days: PracticeDay[];
  /** Days marked done in the window. */
  done: number;
  /** The practice's own weekly intent. */
  target: number;
};

export type PracticeMonthView = {
  startDate: string;
  endDate: string;
  done: number;
  /**
   * Sessions the month would hold if every week met the target, scaled by how
   * much of a 7-day week is covered. For a full month that is exactly
   * `weeklyTargetCount * weeks`.
   */
  target: number;
  /** Completed sessions per weekday, Monday-first. `byWeekday[0]` is Monday. */
  byWeekday: number[];
  /** Sum of `byWeekday`, i.e. exactly `done`. Kept explicit for the histogram. */
  byWeekdayTotal: number;
  /**
   * Weekday with the most sessions, or `null` when the data is too thin to
   * claim a pattern. The caller should stay silent on `null` rather than
   * inventing one — an emerging pattern needs several weeks, not two ticks.
   */
  modalWeekday: WeekdayIndex | null;
  /** Sessions on `modalWeekday`. Meaningful only when `modalWeekday` is set. */
  modalWeekdayCount: number;
};

export type PracticeSeasonView = {
  startDate: string;
  endDate: string;
  /**
   * Sessions logged inside the season window. Logs carry `seasonId`, but the
   * date window is authoritative so a stray log cannot inflate the total.
   */
  done: number;
  /** `weeklyTargetCount` scaled to the season's actual number of days. */
  target: number;
  /** Whole weeks the season spans, so the scaling is legible in the UI. */
  weeks: number;
};

/**
 * A pattern claim needs more evidence than a month's worth of sporadic ticks.
 * Below this many sessions `modalWeekday` stays `null` and the month view says
 * nothing about a pattern.
 */
const MIN_SESSIONS_FOR_PATTERN = 5;

/** The log dates for one practice, as a Set for O(1) membership. */
function logDateSet(logs: PracticeLog[], practiceId: string): Set<string> {
  const dates = new Set<string>();
  for (const log of logs) {
    if (log.practiceId === practiceId) dates.add(log.date);
  }
  return dates;
}

function countInRange(logs: PracticeLog[], practiceId: string, startDate: string, endDate: string): number {
  return logs.filter(
    (log) => log.practiceId === practiceId && log.date >= startDate && log.date <= endDate
  ).length;
}

/** Monday-first weekday index for a `yyyy-MM-dd` string. */
function weekdayIndex(date: string): WeekdayIndex {
  return (((parseLocalDateKey(date).getDay() + 6) % 7) as WeekdayIndex);
}

/** Inclusive day count between two `yyyy-MM-dd` strings. */
function daysInclusive(startDate: string, endDate: string): number {
  return Math.max(0, getDaysPassed(startDate, endDate));
}

/**
 * Weeks covered by an N-day window, rounded up — the same convention
 * `getCurrentWeekNumber` already uses for the season itself. A 30-day month is
 * 5 weeks, a 90-day season is 13.
 */
function weeksCovering(days: number): number {
  return Math.max(1, Math.ceil(days / 7));
}

/**
 * WEEK — "What did I do?" One row of Mon–Sun with a tick or a gap, plus the
 * `done / target` readout. Purely descriptive of the week containing
 * `weekStartDate`; `weeks` long seasons are not this function's concern.
 */
export function practiceWeekView(
  logs: PracticeLog[],
  practice: Practice,
  weekStartDate: string
): PracticeWeekView {
  const doneDates = logDateSet(logs, practice.id);
  const endDate = addDaysToDate(weekStartDate, 6);

  const days: PracticeDay[] = datesInRange(weekStartDate, 7).map((date) => ({
    date,
    done: doneDates.has(date)
  }));

  return {
    startDate: weekStartDate,
    endDate,
    days,
    done: days.filter((day) => day.done).length,
    target: practice.weeklyTargetCount
  };
}

/**
 * MONTH — "What pattern is emerging?" How many sessions the month held against
 * a scaled target, plus the weekday histogram the pattern is read from.
 *
 * `referenceDate` (any day inside the intended month) picks both the month
 * *and* the last day counted: the window ends at the reference date, so a
 * half-finished month is not measured against a whole month's target. Callers
 * pass today for the live month, or an earlier day to look back.
 */
export function practiceMonthView(
  logs: PracticeLog[],
  practice: Practice,
  referenceDate: string
): PracticeMonthView {
  const reference = parseLocalDateKey(referenceDate);
  // `getTodayDateString` is just date-fns `format(..., "yyyy-MM-dd")`; passing a
  // constructed Date keeps this pure — no clock is read here.
  const startDate = getTodayDateString(new Date(reference.getFullYear(), reference.getMonth(), 1));
  const monthEnd = getTodayDateString(new Date(reference.getFullYear(), reference.getMonth() + 1, 0));
  const endDate = monthEnd < referenceDate ? monthEnd : referenceDate;

  if (startDate > endDate) {
    return {
      startDate,
      endDate,
      done: 0,
      target: 0,
      byWeekday: [0, 0, 0, 0, 0, 0, 0],
      byWeekdayTotal: 0,
      modalWeekday: null,
      modalWeekdayCount: 0
    };
  }

  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  let done = 0;
  for (const log of logs) {
    if (log.practiceId !== practice.id) continue;
    if (log.date < startDate || log.date > endDate) continue;
    byWeekday[weekdayIndex(log.date)] += 1;
    done += 1;
  }

  // A month is ~4.35 weeks, and a partial month counts only the share that
  // has elapsed — the target has to shrink with the window or every mid-month
  // glance reads as a shortfall.
  const elapsedDays = daysInclusive(startDate, endDate);
  const target = Math.max(0, Math.round((practice.weeklyTargetCount * elapsedDays) / 7));

  // Modal weekday, but only when there is enough to call it a pattern. Ties
  // resolve to the earlier weekday — an arbitrary but stable choice beats
  // whichever day happened to be visited first.
  let modalWeekday: WeekdayIndex | null = null;
  let modalWeekdayCount = 0;
  if (done >= MIN_SESSIONS_FOR_PATTERN) {
    for (let index = 0; index < byWeekday.length; index += 1) {
      if (byWeekday[index] > modalWeekdayCount) {
        modalWeekdayCount = byWeekday[index];
        modalWeekday = index as WeekdayIndex;
      }
    }
  }

  return {
    startDate,
    endDate,
    done,
    target,
    byWeekday,
    byWeekdayTotal: byWeekday.reduce((sum, count) => sum + count, 0),
    modalWeekday,
    modalWeekdayCount
  };
}

/**
 * SEASON — "Did my system support what mattered?" Totals across the whole
 * season, clamped to the season's own window so a log from either side of it
 * cannot pad the number.
 */
export function practiceSeasonView(
  logs: PracticeLog[],
  practice: Practice,
  season: Season
): PracticeSeasonView {
  const days = daysInclusive(season.startDate, season.endDate);
  const weeks = weeksCovering(days);
  return {
    startDate: season.startDate,
    endDate: season.endDate,
    done: countInRange(logs, practice.id, season.startDate, season.endDate),
    target: practice.weeklyTargetCount * weeks,
    weeks
  };
}
