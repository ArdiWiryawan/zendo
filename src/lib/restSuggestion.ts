import type { MonkMVPState } from "../types/app";
import { selectTodayPlan } from "../store/selectors";
import { addDaysToDate, getTodayDateString } from "./date";

const DISMISS_KEY = "zendo_rest_suggestion_v1";
const STREAK_DAYS = 5;

export function isRestSuggestionDismissed(date: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, boolean>;
    return map[date] === true;
  } catch {
    return false;
  }
}

export function dismissRestSuggestion(date: string): void {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, boolean>;
    map[date] = true;
    localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function isGoalDay(plan: { dayType: string; status: string } | undefined): boolean {
  if (!plan) return false;
  if (plan.dayType !== "goal") return false;
  return ["active", "completed", "partial"].includes(plan.status);
}

export function shouldSuggestRest(store: MonkMVPState, today = getTodayDateString()): boolean {
  const todayPlan = selectTodayPlan(store, today);
  if (todayPlan?.dayType === "rest") return false;
  if (todayPlan?.status === "completed") return false;
  const todayEnergy = store.energyLogs.find((log) => log.date === today);
  if (todayEnergy?.level === "low") return true;
  if (!todayPlan) return false;

  // STREAK_DAYS consecutive goal-days PRECEDING today (not today-inclusive), so a
  // missed/today's pending status doesn't kill the signal from 5 held goal-days.
  for (let i = 1; i <= STREAK_DAYS; i++) {
    const date = addDaysToDate(today, -i);
    const plan = store.dayPlans.find((day) => day.date === date);
    if (!isGoalDay(plan)) return false;
  }
  return true;
}
