import { useMonkStore } from "../store/useMonkStore";
import { parseLocalDateKey } from "./date";
import { validDate } from "./weeklyPlanning";

/** Promote a saved routine to the selected day's existing Highlight field. */
export function setIdealWeekHighlight(id: string, date: string, replace = false): string {
  const state = useMonkStore.getState();
  const season = state.activeSeason;
  const block = state.appSettings.idealWeek?.find(block => block.id === id);
  if (!block?.title.trim() || !season || !validDate(date) || date < season.startDate || date > season.endDate) throw new Error("date");
  if (!block.days.includes(parseLocalDateKey(date).getDay())) throw new Error("day");
  const plan = state.dayPlans.find(plan => plan.date === date && plan.seasonId === season.id);
  const title = block.title.trim();
  if (plan?.highlight?.trim() && plan.highlight.trim() !== title && !replace) throw new Error("highlight-exists");
  state.saveDayTimeBlocks(date, plan?.timeBlocks ?? [], plan?.planningCompleted ?? false, title);
  if (useMonkStore.getState().dayPlans.find(plan => plan.date === date && plan.seasonId === season.id)?.highlight !== title) throw new Error("save");
  return title;
}
