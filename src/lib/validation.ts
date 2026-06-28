import type { GoalAllocation, GoalDraft, ValidationResult } from "../types/app";

export function valid(message?: string): ValidationResult {
  return { valid: true, message };
}

export function invalid(message: string): ValidationResult {
  return { valid: false, message };
}

export function validateHabitAudit(selectedCount: number) {
  return selectedCount >= 1 ? valid() : invalid("Choose at least one pattern.");
}

export function validateGoalBrainDump(goals: GoalDraft[]) {
  const titles = goals.map((goal) => goal.title.trim()).filter(Boolean);
  const unique = new Set(titles.map((title) => title.toLowerCase()));
  if (titles.length < 5) return invalid("Add at least 5 goal ideas before narrowing.");
  if (titles.length > 10) return invalid("10 ideas is the maximum. Time to narrow.");
  if (unique.size !== titles.length) return invalid("This goal already exists.");
  return valid();
}

export function validateGoalElimination(releasedCount: number) {
  return releasedCount >= 2 ? valid() : invalid("Release at least two goals.");
}

export function validateFocusGoalSelection(selectedCount: number) {
  if (selectedCount < 1) return invalid("Choose at least one focus goal.");
  if (selectedCount > 3) return invalid("Three is the limit for this season.");
  return valid();
}

export function validateNarrowGoals(selectedCount: number) {
  if (selectedCount < 1) return invalid("Choose at least 1 goal to continue.");
  if (selectedCount > 3) return invalid("Keep only 1–3 goals for this season.");
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
  if (total !== 6) return invalid("Six focus days are enough.");
  if (restDayTarget !== 1) return invalid("Keep one day for rest.");
  return valid();
}

export function validateJournalEntry(values: Record<string, string | undefined>) {
  return Object.values(values).some((value) => value?.trim())
    ? valid()
    : invalid("Write at least one reflection before saving.");
}
