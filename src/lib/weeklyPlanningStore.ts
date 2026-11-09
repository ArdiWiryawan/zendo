import { useMonkStore } from "../store/useMonkStore";
import type { IdealBlock, MonkMVPState, WeeklyDraft } from "../types/app";
import { STORAGE_KEY } from "./storage";
import { emptyRitual, validateReference } from "./weeklyPlanning";

/** Publish only after the canonical snapshot is durable. Cloud sync is separate. */
export function persistPlanningChange(
  transform: (state: MonkMVPState) => MonkMVPState,
): void {
  const before = useMonkStore.getState();
  const next = transform(before);
  if (typeof localStorage === "undefined") throw new Error("storage");
  // JSON ignores store actions; the canonical key stores the plain state envelope.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  useMonkStore.setState({
    appSettings: next.appSettings,
    weeklyPlans: next.weeklyPlans,
    dayPlans: next.dayPlans,
  });
}

export function saveWeekDraft(weekId: string, draft: WeeklyDraft): void {
  persistPlanningChange((state) => {
    if (!state.weeklyPlans.some((week) => week.id === weekId))
      throw new Error("stale");
    const updatedAt = new Date().toISOString();
    return {
      ...state,
      weeklyPlans: state.weeklyPlans.map((week) =>
        week.id === weekId
          ? {
              ...week,
              updatedAt,
              ritual: { ...(week.ritual ?? emptyRitual()), draft },
            }
          : week,
      ),
    };
  });
}

export function saveIdealWeek(refs: IdealBlock[]): void {
  refs.forEach(validateReference);
  if (new Set(refs.map((ref) => ref.id)).size !== refs.length)
    throw new Error("invalid");
  persistPlanningChange((state) => ({
    ...state,
    appSettings: {
      ...state.appSettings,
      idealWeek: refs,
      updatedAt: new Date().toISOString(),
    },
  }));
}

/** Replace by identity so editing never appends another copy of a routine. */
export function upsertIdealWeek(id: string, replacements: IdealBlock[], scopeDays?: number[]): void {
  const latest = useMonkStore.getState().appSettings.idealWeek ?? [];
  const remaining = latest.filter((block) =>
    block.id !== id && !replacements.some((next) => next.id === block.id),
  );
  const original = latest.find(block => block.id === id);
  const untouchedDays = original?.days.filter(day => !scopeDays?.includes(day)) ?? [];
  if (scopeDays && original && untouchedDays.length) remaining.push({ ...original, days: untouchedDays });
  for (const next of replacements) {
    if (remaining.some((block) =>
      block.title.trim().toLocaleLowerCase() === next.title.trim().toLocaleLowerCase() &&
      block.startTime === next.startTime && block.duration === next.duration &&
      block.days.some((day) => next.days.includes(day)),
    )) throw new Error("duplicate");
  }
  saveIdealWeek([...remaining, ...replacements]);
}

export function deleteIdealWeek(id: string, scopeDays?: number[]): void {
  saveIdealWeek((useMonkStore.getState().appSettings.idealWeek ?? [])
    .flatMap(block => {
      if (block.id !== id) return [block];
      const days = block.days.filter(day => !scopeDays?.includes(day));
      return scopeDays && days.length ? [{ ...block, days }] : [];
    }));
}
