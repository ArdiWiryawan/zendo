import { describe, expect, it } from "vitest";
import type { DayPlan, MonkMVPState, Season, TimelineDay } from "../types/app";
import { datesInRange } from "../lib/date";
import { selectSeasonDayPlanCounts } from "../store/selectors";
import {
  countSeasonDayPlans,
  selectSeasonRhythmAccounting,
} from "../lib/rhythmAccounting";

const SEASON_ID = "season-1";
const START_DATE = "2026-08-01";

function makeSeason(durationDays: number): Season {
  return {
    id: SEASON_ID,
    name: "Test season",
    startDate: START_DATE,
    durationDays,
    status: "active",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  } as Season;
}

function makeTimelineDay(date: string, status: TimelineDay["status"]): TimelineDay {
  return {
    id: `timeline-${date}`,
    seasonId: SEASON_ID,
    date,
    dayType: status === "rest" ? "rest" : "goal",
    status,
    focusMinutes: 0,
    learningMinutes: 0,
    journalCompleted: false,
    relapseCount: 0,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  } as TimelineDay;
}

function makeDayPlan(date: string, dayType: "goal" | "rest", status: DayPlan["status"]): DayPlan {
  return {
    id: `plan-${date}`,
    seasonId: SEASON_ID,
    weeklyPlanId: "week-1",
    date,
    dayType,
    status,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  } as DayPlan;
}

/**
 * A season the user has lived exactly `elapsedDays` of. Days are addressed by
 * index into the elapsed window so each fixture reads as "day 1 was a rest day",
 * not as a date literal.
 */
function makeState(options: {
  durationDays: number;
  goalDays?: number[];
  restDays?: number[];
  missedDays?: number[];
}): MonkMVPState {
  const { durationDays, goalDays = [], restDays = [], missedDays = [] } = options;
  const elapsed = durationDays;

  const timelineDays: TimelineDay[] = [];
  const dayPlans: DayPlan[] = [];

  restDays.forEach((index) => {
    const date = datesInRange(START_DATE, elapsed)[index];
    timelineDays.push(makeTimelineDay(date, "rest"));
    dayPlans.push(makeDayPlan(date, "rest", "rest"));
  });
  goalDays.forEach((index) => {
    const date = datesInRange(START_DATE, elapsed)[index];
    timelineDays.push(makeTimelineDay(date, "completed"));
    dayPlans.push(makeDayPlan(date, "goal", "completed"));
  });
  missedDays.forEach((index) => {
    const date = datesInRange(START_DATE, elapsed)[index];
    timelineDays.push(makeTimelineDay(date, "missed"));
    dayPlans.push(makeDayPlan(date, "goal", "missed"));
  });

  return {
    activeSeason: makeSeason(durationDays),
    seasons: [makeSeason(durationDays)],
    timelineDays,
    dayPlans,
    focusSessions: [],
    learningSessions: [],
    goals: [],
    energyLogs: [],
  } as unknown as MonkMVPState;
}

function elapsedDatesOf(state: MonkMVPState) {
  return datesInRange(state.activeSeason!.startDate, state.activeSeason!.durationDays);
}

describe("planned rest is neutral in the rhythm ratio", () => {
  it("reaches 100% when the plan is followed exactly, rest included", () => {
    // 7 elapsed days: 5 focus days completed, 2 planned rest days taken.
    const state = makeState({
      durationDays: 7,
      goalDays: [0, 1, 2, 3, 4],
      restDays: [5, 6],
    });

    const rhythm = selectSeasonRhythmAccounting(state, elapsedDatesOf(state));

    expect(rhythm.focusDays).toBe(5);
    expect(rhythm.restDays).toBe(2);
    expect(rhythm.accountedDays).toBe(7);
    expect(rhythm.elapsedDays).toBe(7);
    expect(rhythm.consistencyRate).toBe(100);
  });

  it("does not lower the ratio when a rest day is added to an otherwise identical state", () => {
    // Same 5 completed focus days against 7 elapsed days, differing only in
    // whether the two remaining days were planned rest or simply not logged.
    const withRest = makeState({
      durationDays: 7,
      goalDays: [0, 1, 2, 3, 4],
      restDays: [5, 6],
    });
    const withoutRest = makeState({
      durationDays: 7,
      goalDays: [0, 1, 2, 3, 4],
    });

    const restRate = selectSeasonRhythmAccounting(withRest, elapsedDatesOf(withRest)).consistencyRate;
    const noRestRate = selectSeasonRhythmAccounting(withoutRest, elapsedDatesOf(withoutRest)).consistencyRate;

    // The regression guard: before the fix the rest days read "not completed"
    // and this dropped to 71.
    expect(restRate).toBeGreaterThanOrEqual(noRestRate);
    expect(restRate).toBe(100);
  });

  it("lowers the ratio when a planned rest day is missed instead", () => {
    const rested = makeState({
      durationDays: 7,
      goalDays: [0, 1, 2, 3, 4],
      restDays: [5, 6],
    });
    const skipped = makeState({
      durationDays: 7,
      goalDays: [0, 1, 2, 3, 4],
      missedDays: [5, 6],
    });

    const restedRate = selectSeasonRhythmAccounting(rested, elapsedDatesOf(rested)).consistencyRate;
    const skippedRate = selectSeasonRhythmAccounting(skipped, elapsedDatesOf(skipped)).consistencyRate;

    expect(skippedRate).toBeLessThan(restedRate);
    expect(skippedRate).toBe(71);
  });

  it("counts a rest day as accounted for even when it is the only unrecorded day", () => {
    const base = makeState({ durationDays: 4, goalDays: [0, 1, 2], missedDays: [3] });
    const withRest = makeState({ durationDays: 4, goalDays: [0, 1, 2], restDays: [3] });

    const baseRate = selectSeasonRhythmAccounting(base, elapsedDatesOf(base)).consistencyRate;
    const restRate = selectSeasonRhythmAccounting(withRest, elapsedDatesOf(withRest)).consistencyRate;

    // Day 4 is the only open day. Left missed it is a real gap (3/4); taken as
    // the planned rest it is accounted for, so the plan was followed exactly.
    expect(baseRate).toBe(75);
    expect(restRate).toBe(100);
  });

  it("reports zero rather than dividing by zero when nothing has elapsed", () => {
    const state = makeState({ durationDays: 5 });
    const rhythm = selectSeasonRhythmAccounting(state, []);

    expect(rhythm.elapsedDays).toBe(0);
    expect(rhythm.consistencyRate).toBe(0);
  });
});

describe("season day plan counts pair rest with completed", () => {
  it("counts a rest plan as accounted for, not as unfinished plan work", () => {
    const state = makeState({
      durationDays: 7,
      goalDays: [0, 1, 2, 3, 4],
      restDays: [5, 6],
    });

    const counts = countSeasonDayPlans(state, SEASON_ID);

    expect(counts.planned).toBe(7);
    expect(counts.completed).toBe(5);
    expect(counts.rest).toBe(2);
    expect(counts.accounted).toBe(7);
  });

  it("is what the season selector returns, so Archive cannot drift from Timeline", () => {
    const state = makeState({
      durationDays: 7,
      goalDays: [0, 1, 2, 3, 4],
      restDays: [5, 6],
    });

    expect(selectSeasonDayPlanCounts(state, SEASON_ID)).toEqual(
      countSeasonDayPlans(state, SEASON_ID)
    );
    expect(selectSeasonDayPlanCounts(state, SEASON_ID).accounted).toBe(7);
  });

  it("leaves a genuinely missed plan day out of the numerator", () => {
    const state = makeState({
      durationDays: 7,
      goalDays: [0, 1, 2, 3, 4],
      missedDays: [5, 6],
    });

    const counts = countSeasonDayPlans(state, SEASON_ID);

    expect(counts.planned).toBe(7);
    expect(counts.accounted).toBe(5);
  });
});
