import type { MonkMVPState } from "../types/app";
import { addDaysToDate, getTodayDateString } from "./date";

function findPlan(store: MonkMVPState, seasonId: string, date: string) {
  return store.dayPlans.find((plan) => plan.seasonId === seasonId && plan.date === date);
}

// A "held" day mirrors deriveTimelineStatus's notion of progress: a goal day
// that was completed or partially done. Rest days are neither held nor a break
// — they are part of the system.
function isHeldDay(store: MonkMVPState, seasonId: string, date: string): boolean {
  const plan = findPlan(store, seasonId, date);
  return !!plan && plan.dayType === "goal" && (plan.status === "completed" || plan.status === "partial");
}

function isRestDay(store: MonkMVPState, seasonId: string, date: string): boolean {
  const plan = findPlan(store, seasonId, date);
  return !!plan && plan.dayType === "rest";
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
  // Rest is intentional — never warn on a planned rest day.
  if (todayPlan?.dayType === "rest") return false;
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
