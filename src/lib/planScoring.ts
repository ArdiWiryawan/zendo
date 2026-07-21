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
export function capacityCheck(
  freeHoursPerDay: number,
  weeklyTargetSum: number
): { ok: boolean; loadHours: number; availableHours: number; message?: string } {
  const loadHours = weeklyTargetSum * 1.5;
  const availableHours = Math.max(0, freeHoursPerDay) * 6; // 6 focus days
  if (freeHoursPerDay <= 0) {
    return { ok: true, loadHours, availableHours, message: undefined };
  }
  if (loadHours > availableHours) {
    return {
      ok: false,
      loadHours,
      availableHours,
      message: `Plan asks ~${loadHours.toFixed(0)}h focus / week. You logged ~${availableHours.toFixed(0)}h free across 6 days. Trim a day or two.`
    };
  }
  if (loadHours > availableHours * 0.85) {
    return {
      ok: true,
      loadHours,
      availableHours,
      message: `Tight fit: ~${loadHours.toFixed(0)}h planned vs ~${availableHours.toFixed(0)}h free. Leave buffer if energy dips.`
    };
  }
  return { ok: true, loadHours, availableHours };
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
