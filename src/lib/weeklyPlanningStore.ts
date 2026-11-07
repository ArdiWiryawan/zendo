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
