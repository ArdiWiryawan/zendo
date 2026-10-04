import type { GoalAllocation, GoalDraft, ValidationResult } from "../types/app";
import { WEEK_TOTAL_CAPACITY } from "./rhythmAccounting";

/**
 * Intentional constraint: a Season holds at most this many Goal Tracks.
 * Exceeding it is what makes a season unrealistic, so the limit is enforced in
 * onboarding, in the store guard, and surfaced to the user rather than silently
 * dropping the click.
 */
export const MAX_SEASON_GOALS = 3;

/**
 * Intentional constraint: at most this many ACTIVE Goal Tracks per season.
 * Tracks are the focus-area layer above goals, so the same reasoning as
 * MAX_SEASON_GOALS applies one level up: a fifth live track means attention is
 * split too thin to move any of them. Pausing a track frees a slot — the limit
 * is on attention, not on how many tracks a season may remember.
 */
export const MAX_ACTIVE_GOAL_TRACKS = 3;

export function valid(message?: string): ValidationResult {
  return { valid: true, message };
}

export function invalid(message: string): ValidationResult {
  return { valid: false, message };
}

export function validatePatternAudit(selectedCount: number) {
  return selectedCount >= 1 ? valid() : invalid("Choose at least one pattern.");
}

export function validateGoalBrainDump(goals: GoalDraft[]) {
  const titles = goals.map((goal) => goal.title.trim()).filter(Boolean);
  const unique = new Set(titles.map((title) => title.toLowerCase()));
  if (titles.length < 3) return invalid("Add at least 3 goal ideas before narrowing.");
  if (titles.length > 10) return invalid("10 ideas is the maximum. Time to narrow.");
  if (unique.size !== titles.length) return invalid("This goal already exists.");
  return valid();
}

export function validateNarrowGoals(selectedCount: number) {
  if (selectedCount < 1) return invalid("Choose at least 1 goal to continue.");
  if (selectedCount > MAX_SEASON_GOALS) return invalid("Keep only 1–3 goals for this season.");
  return valid();
}

export function validateSeasonDuration(duration: number) {
  return Number.isFinite(duration) && duration >= 7 && duration <= 365
    ? valid()
    : invalid("Enter a valid number of days to continue.");
}

export function validateKeystoneActions(goalIds: string[], actions: Record<string, string>) {
  return goalIds.every((id) => actions[id]?.trim())
    ? valid()
    : invalid("Add one main action for each goal.");
}

export function validateWeeklyAllocation(allocations: GoalAllocation[], restDayTarget: number) {
  const total = allocations.reduce((sum, allocation) => sum + allocation.targetCount, 0);
  if (allocations.some((allocation) => allocation.targetCount < 1)) {
    return invalid("Every goal needs at least one day this week.");
  }
  if (!Number.isInteger(restDayTarget) || restDayTarget < 1) {
    return invalid("Keep at least one day for rest.");
  }
  // The real invariant: a week has seven days, so focus days and planned rest
  // must claim all of them. Previously this hardcoded 6 + exactly 1, which both
  // forbade an honest 6-day rest budget and let a 7-day sum pass unchecked.
  if (total + restDayTarget !== WEEK_TOTAL_CAPACITY) {
    return invalid(`Focus days and rest days must add up to ${WEEK_TOTAL_CAPACITY}.`);
  }
  return valid();
}

export function validateJournalEntry(values: Record<string, string | undefined>) {
  return Object.values(values).some((value) => value?.trim())
    ? valid()
    : invalid("Write at least one reflection before saving.");
}
