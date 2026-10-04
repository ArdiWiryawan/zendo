import type { GoalAllocation, MonkMVPState } from "../types/app";
import { getDailyStatusForDate } from "./dailyActivity";

/** Days in a week. Focus allocations + planned rest must sum to this. */
export const WEEK_TOTAL_CAPACITY = 7;

/**
 * The week's rhythm as one honest equation: focus + rest + free = 7.
 *
 * `restPlanned` reads `WeeklyPlan.restDayTarget` — the field the release flow
 * leaves at 1 and nothing used to read, so a released goal silently shrank the
 * week from 6 focus days to 5 with no explanation. `freeDays` is the capacity
 * nobody has claimed yet: releasing a goal raises it, and the three choices in
 * the UI (add to a goal, create a goal, make it rest) are the only ways down.
 */
export function computeWeeklyRhythm(plan: { goalAllocations: GoalAllocation[]; restDayTarget: number }) {
  const totalCapacity = WEEK_TOTAL_CAPACITY;
  const focusAllocated = plan.goalAllocations.reduce((sum, a) => sum + a.targetCount, 0);
  const restPlanned = plan.restDayTarget;
  const freeDays = Math.max(0, totalCapacity - focusAllocated - restPlanned);
  return { focusAllocated, restPlanned, totalCapacity, freeDays };
}

/**
 * How the season's elapsed days actually went, stated as fact.
 *
 * Rest is part of the plan, not a failure to meet it, so planned rest must be
 * neutral: it adds one to both the accounted-for numerator and the elapsed
 * denominator, and the ratio is unchanged. A genuinely missed day adds only to
 * the denominator, so missing still lowers the number — that asymmetry is the
 * whole point.
 */
export function selectSeasonRhythmAccounting(
  store: MonkMVPState,
  passedDates: string[]
) {
  let focusDays = 0;
  let restDays = 0;
  let missedDays = 0;

  passedDates.forEach((date) => {
    const status = getDailyStatusForDate(store, date);
    if (status === "completed") focusDays++;
    else if (status === "rest") restDays++;
    else if (status === "missed" || status === "relapse") missedDays++;
  });

  const elapsedDays = passedDates.length;
  const accountedDays = focusDays + restDays;
  const consistencyRate =
    elapsedDays > 0 ? Math.round((accountedDays / elapsedDays) * 100) : 0;

  return { elapsedDays, focusDays, restDays, missedDays, accountedDays, consistencyRate };
}

/**
 * Day plans for a season, with rest plans counted on both sides.
 *
 * A rest day plan carries `status: "rest"`, so counting only `completed` plans
 * against every plan made planned rest read as a miss. `accounted` pairs it with
 * the focus days actually completed.
 */
export function countSeasonDayPlans(state: MonkMVPState, seasonId: string) {
  const plans = state.dayPlans.filter((plan) => plan.seasonId === seasonId);
  const completed = plans.filter((plan) => plan.status === "completed").length;
  const rest = plans.filter(
    (plan) => plan.status === "rest" || plan.dayType === "rest"
  ).length;
  return { planned: plans.length, completed, rest, accounted: completed + rest };
}
