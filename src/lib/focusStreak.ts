import type { MonkMVPState, TimelineStatus } from "../types/app";
import { addDaysToDate, getTodayDateString } from "./date";
import { getDailyStatusForDate } from "./dailyActivity";

function findPlan(store: MonkMVPState, seasonId: string, date: string) {
  return store.dayPlans.find((plan) => plan.seasonId === seasonId && plan.date === date);
}

// A rest plan is only rest while no evidence overrode it. The resolver needs
// the whole store, so guard the fields an older/minimal snapshot may omit.
function statusOf(store: MonkMVPState, date: string): TimelineStatus | null {
  if (!store.timelineDays || !store.relapseLogs) return null;
  return getDailyStatusForDate(store, date);
}

// A "held" day mirrors deriveTimelineStatus's notion of progress: a goal day
// that was completed or partially done. Rest days are neither held nor a break
// — they are part of the system.
//
// Read through the shared resolver, not off `plan.dayType`: a day scheduled
// rest that holds a completed focus session resolves "completed", so it counts
// as held (it extends the streak) and never as a rest day.
function isHeldDay(store: MonkMVPState, seasonId: string, date: string): boolean {
  // The resolver already applies "evidence outranks the schedule": a rest day
  // holding real focus resolves "completed"/"partial" and counts as held, while
  // a rest day with no evidence resolves "rest" and, correctly, does not count
  // as held (it neither extends the run nor breaks it). Ask it once, and only
  // fall back to the raw plan when the snapshot is too minimal to answer.
  const resolved = statusOf(store, date);
  if (resolved) {
    if (resolved === "completed" || resolved === "partial") return true;
    if (resolved === "rest" || resolved === "missed" || resolved === "relapse") return false;
    // "not_started" still falls through to the plan: a completed or partial
    // plan with no session to recompute from (e.g. a retro log) is a real day.
  }

  const plan = findPlan(store, seasonId, date);
  if (plan) {
    if (plan.dayType === "rest") return false;
    if (plan.status === "missed") return false;
    if (plan.status === "completed" || plan.status === "partial") return true;
  }
  const day = store.timelineDays?.find((item) => item.date === date && (!seasonId || item.seasonId === seasonId));
  if (day) {
    if (day.status === "completed" || day.status === "partial") return true;
  }
  return false;
}

function isRestDay(store: MonkMVPState, seasonId: string, date: string): boolean {
  const plan = findPlan(store, seasonId, date);
  if (plan && (plan.dayType === "rest" || plan.status === "rest")) {
    // A rest day on paper is only rest if nothing was actually done. When the
    // resolver cannot answer (minimal snapshot), claim the pass-through so the
    // streak degrades gracefully rather than snapping on a rest day.
    return statusOf(store, date) === "rest" || statusOf(store, date) === null;
  }
  const day = store.timelineDays?.find((item) => item.date === date && (!seasonId || item.seasonId === seasonId));
  return day?.status === "rest" || day?.dayType === "rest";
}

export function getFocusStreak(store: MonkMVPState, today = getTodayDateString()): { count: number; best: number } {
  const season = store.activeSeason;
  if (!season) return { count: 0, best: 0 };
  const seasonId = season.id;

  // Longest run this season: scan startDate → today. Rest days pass through;
  // any other non-held day (missed, missing, planned-but-undone) resets.
  let best = 0;
  let run = 0;
  for (let date = season.startDate; date <= today; date = addDaysToDate(date, 1)) {
    if (isHeldDay(store, seasonId, date)) {
      run += 1;
    } else if (!isRestDay(store, seasonId, date)) {
      best = Math.max(best, run);
      run = 0;
    }
  }
  best = Math.max(best, run);

  // Current run: today counts when held; otherwise scan from yesterday so a
  // miss TODAY does not kill the streak. Rest days never interrupt.
  const cursor = isHeldDay(store, seasonId, today) || isRestDay(store, seasonId, today)
    ? today
    : addDaysToDate(today, -1);
  let count = 0;
  for (let date = cursor; date >= season.startDate; date = addDaysToDate(date, -1)) {
    if (isHeldDay(store, seasonId, date)) {
      count += 1;
    } else if (!isRestDay(store, seasonId, date)) {
      break;
    }
  }

  return { count, best };
}

export function shouldWarnMissTwice(store: MonkMVPState, today = getTodayDateString()): boolean {
  const season = store.activeSeason;
  if (!season) return false;
  const seasonId = season.id;
  if (today < season.startDate) return false;

  const todayPlan = findPlan(store, seasonId, today);
  // Rest is intentional — never warn on a planned rest day. But a rest day the
  // user actually worked is not a rest day, so ask the resolver before honouring
  // the plan's word for it: otherwise completing focus on a rest day would also
  // suppress the miss-twice warning the user needs the next day.
  const todayResolved = statusOf(store, today);
  if (todayResolved === "rest") return false;
  if (todayPlan?.dayType === "rest" && (todayResolved === null || todayResolved === "not_started")) {
    return false;
  }
  // Already held today → nothing to warn about.
  if (isHeldDay(store, seasonId, today)) return false;

  const yesterday = addDaysToDate(today, -1);
  if (yesterday < season.startDate) return false;

  // A miss: no goal plan at all, or an explicitly missed goal day.
  const yPlan = findPlan(store, seasonId, yesterday);
  const yMissed = !yPlan || (yPlan.dayType === "goal" && yPlan.status === "missed");
  if (!yMissed) return false;

  // Streak already broken (0) or at one day (1): missing twice is the risk.
  const { count } = getFocusStreak(store, today);
  return count <= 1;
}
