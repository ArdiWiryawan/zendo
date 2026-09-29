import type { Season, Goal } from "../types/app";

export type PlanScore = {
  total: number;
  breakdown: {
    keystoneActions: number;
    weeklyTargets: number;
    antiGoals: number;
    duration: number;
  };
};

export function scorePlan(season: Season, goals: Goal[]): PlanScore {
  const breakdown = {
    keystoneActions: scoreKeystoneActions(goals),
    weeklyTargets: scoreWeeklyTargets(goals),
    antiGoals: scoreAntiGoals(season),
    duration: scoreDuration(season, goals)
  };

  return {
    total: Object.values(breakdown).reduce((sum, v) => sum + v, 0),
    breakdown
  };
}

export function planStrengthLabel(total: number): string {
  if (total >= 80) return "Solid";
  if (total >= 55) return "Steady";
  if (total >= 35) return "Thin";
  return "Fragile";
}

/** Rough weekly load vs free-hour capacity. Each focus day ≈ 1.5h deep work. */
export const FOCUS_HOURS_PER_SESSION = 1.5;
export const FOCUS_DAYS_PER_WEEK = 6;
/** Above this share of available hours we call the plan "tight" rather than over. */
export const CAPACITY_TIGHT_RATIO = 0.85;

export type CapacityStatus = "unknown" | "ok" | "tight" | "over";

export type CapacityCheck = {
  ok: boolean;
  /** True when the user never answered the time audit, so capacity is unknowable. */
  unknown: boolean;
  status: CapacityStatus;
  loadHours: number;
  availableHours: number;
  /**
   * Callers are responsible for localizing this. Prefer `status` and read the
   * corresponding i18n key; this field intentionally carries no user-facing prose.
   */
  message?: undefined;
};

/**
 * Compare planned weekly load against free-hour capacity.
 *
 * Returns a status the caller localizes. Deliberately carries no English prose:
 * this used to return baked-in English strings that the caller discarded anyway,
 * which was dead payload in a bilingual app.
 *
 * When `freeHoursPerDay <= 0` the user has not answered the time audit. That is
 * NOT "ok" — capacity is simply unknown, and callers must not claim otherwise.
 */
export function capacityCheck(
  freeHoursPerDay: number,
  weeklyTargetSum: number
): CapacityCheck {
  const loadHours = weeklyTargetSum * FOCUS_HOURS_PER_SESSION;
  const availableHours = Math.max(0, freeHoursPerDay) * FOCUS_DAYS_PER_WEEK;

  if (freeHoursPerDay <= 0) {
    return { ok: true, unknown: true, status: "unknown", loadHours, availableHours };
  }
  if (loadHours > availableHours) {
    return { ok: false, unknown: false, status: "over", loadHours, availableHours };
  }
  if (loadHours > availableHours * CAPACITY_TIGHT_RATIO) {
    return { ok: true, unknown: false, status: "tight", loadHours, availableHours };
  }
  return { ok: true, unknown: false, status: "ok", loadHours, availableHours };
}

function scoreKeystoneActions(goals: Goal[]): number {
  if (goals.length === 0) return 0;
  const filled = goals.filter(g => g.keystoneAction.trim().length > 0).length;
  return Math.round((filled / goals.length) * 30);
}

function scoreWeeklyTargets(goals: Goal[]): number {
  if (goals.length === 0) return 0;
  // Realistic = 2-5 sessions per week per goal
  const realistic = goals.filter(g => g.weeklyTargetCount >= 2 && g.weeklyTargetCount <= 5).length;
  return Math.round((realistic / goals.length) * 30);
}

function scoreAntiGoals(season: Season): number {
  const count = (season.antiGoals || []).filter(ag => ag.trim()).length;
  // 1+ anti-goal = +20
  return count > 0 ? 20 : 0;
}

function scoreDuration(season: Season, goals: Goal[]): number {
  const days = season.durationDays;
  const goalCount = goals.length;

  // Heuristic: 1 goal = 7-30d OK, 2-3 goals = 30-90d ideal
  if (goalCount === 1 && days >= 7 && days <= 30) return 20;
  if (goalCount === 2 && days >= 30 && days <= 90) return 20;
  if (goalCount === 3 && days >= 60 && days <= 90) return 20;
  if (days >= 7 && days <= 90) return 10; // acceptable range
  return 0;
}
