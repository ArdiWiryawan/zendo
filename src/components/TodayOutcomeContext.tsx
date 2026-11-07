import { Link } from "react-router-dom";
import { useMonkStore } from "../store/useMonkStore";
import { selectCurrentWeeklyPlan, selectTodayPlan } from "../store/selectors";
import { usePlanningCopy } from "./PlanningControls";

export function TodayOutcomeContext() {
  const store = useMonkStore();
  const c = usePlanningCopy();
  const week = selectCurrentWeeklyPlan(store);
  const day = selectTodayPlan(store);
  const outcomes =
    week?.ritual?.outcomes.filter((o) => o.status === "open") ?? [];
  if (!outcomes.length) return null;
  const linked = outcomes.filter(
    (o) =>
      o.goalId === day?.goalId ||
      day?.timeBlocks?.some((b) => b.outcomeId === o.id),
  );
  return (
    <section
      aria-label="Weekly Outcomes"
      className="space-y-2 border-l-2 border-monk-accent pl-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-monk-accent">
        Weekly Outcomes
      </p>
      <ul className="space-y-2 text-sm">
        {(linked.length ? linked : outcomes).map((o) => (
          <li key={o.id} className="break-words">
            {o.title}
          </li>
        ))}
      </ul>
      <p className="text-sm text-monk-muted">
        {c(
          "Pilih Main Action sendiri. Focus tidak menandai Outcome selesai.",
          "Choose your own Main Action. Focus does not complete an Outcome.",
        )}
      </p>
      <Link
        to="/week"
        className="inline-flex min-h-11 items-center text-sm text-monk-accent underline underline-offset-4"
      >
        {c("Tinjau minggu ini", "Review this week")}
      </Link>
    </section>
  );
}
