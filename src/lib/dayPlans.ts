import type { DayPlan } from "../types/app";

/**
 * One DayPlan per (seasonId, date).
 *
 * `dayPlans` is read by (seasonId, date) everywhere — `selectTodayPlan`,
 * `findTodayPlan`, `DayTimeBlockVisualizer` — but it is created and merged by
 * `id`. Two devices that each opened the same day before syncing each minted
 * their own id for that date (`createOrUpdateDayPlan` reuses an id only if the
 * row is already visible locally), and `mergeById` — also id-keyed — kept both.
 * `Array.find` then returned whichever row happened to sit first in that
 * device's array, so the phone resolved a different record than the laptop for
 * the same day: its own `goalId`, its own `timeBlocks`, its own `status`.
 *
 * Collapsing per (seasonId, date) is what makes the two views agree. It is safe
 * to run on the whole array before a write because nothing is addressed by
 * index — `selectTodayPlan` (find by season+date), `TimelineScreen` and
 * `App.tsx` are the only consumers and none of them use positions.
 */
export function isNewerDayPlan(a: DayPlan | undefined, b: DayPlan | undefined): boolean {
  const ta = a?.updatedAt ?? "";
  const tb = b?.updatedAt ?? "";
  // A timestamped record always beats an untimestamped one; otherwise newest
  // wins. Equal timestamps fall back to the lower id so the result does not
  // depend on which device is merging or in what order.
  if (ta !== tb) return ta > tb;
  return String(a?.id ?? "") < String(b?.id ?? "");
}

export function dedupeDayPlans(plans: DayPlan[] | undefined): DayPlan[] | undefined {
  if (!Array.isArray(plans)) return plans;
  const byKey = new Map<string, DayPlan>();
  for (const plan of plans) {
    // A dateless record cannot be keyed by day without colliding with every
    // other dateless one, so index it by id and let it survive untouched.
    const key = plan?.date ? `${plan.seasonId}::${plan.date}` : `id::${plan?.id}`;
    const existing = byKey.get(key);
    if (!existing || isNewerDayPlan(plan, existing)) byKey.set(key, plan);
  }
  return [...byKey.values()];
}
