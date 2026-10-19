import type { Goal, GoalWhy } from "../types/app";
import { getDayNumber } from "./date";

/** Hard ceiling on reasons per goal. Seven is one per day of a review week. */
export const MAX_GOAL_WHYS = 7;

type WhySource = Pick<Goal, "id" | "why" | "whys" | "createdAt">;

/**
 * All reasons a goal matters, newest last.
 *
 * Reads `whys` first and falls back to the legacy single `why`, so a goal saved
 * before this list existed still shows its reason without a migration step.
 * Blank entries are dropped here rather than at every render site.
 */
export function goalWhys(goal?: WhySource | null): GoalWhy[] {
  if (!goal) return [];
  const list = (goal.whys ?? []).filter((item) => item.text.trim().length > 0);
  if (list.length > 0) return list;
  const legacy = goal.why?.trim();
  if (!legacy) return [];
  return [{ id: `legacy-${goal.id}`, text: legacy, createdAt: goal.createdAt }];
}

/** The reason shown in compact surfaces (week card, hero fallback). */
export function primaryGoalWhy(goal?: WhySource | null): string | undefined {
  return goalWhys(goal)[0]?.text;
}

export function hasGoalWhy(goal?: WhySource | null): boolean {
  return goalWhys(goal).length > 0;
}

/**
 * The reason to show today.
 *
 * Rotation is deterministic by calendar day, not random: the same day always
 * shows the same reason, so reopening the app does not reshuffle the sentence
 * the user just read. A goal with one reason keeps showing it.
 */
export function goalWhyForDate(goal: WhySource | null | undefined, date: string): GoalWhy | undefined {
  const list = goalWhys(goal);
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];
  // Fixed epoch keeps the rotation stable across seasons and timezones.
  const day = Math.abs(getDayNumber(date, "2020-01-01"));
  return list[day % list.length];
}
