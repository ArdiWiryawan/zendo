import { useEffect, useState } from "react";
import { useT } from "../i18n";
import { selectActiveGoals } from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import { formatHumanDate } from "../lib/date";
import { CalmDialog, useCalmToast } from "./ui";

export function RetroLogModal({
  open,
  date,
  onClose
}: {
  open: boolean;
  date: string | null;
  onClose: () => void;
}) {
  const store = useMonkStore();
  const t = useT();
  const toast = useCalmToast();
  const activeGoals = selectActiveGoals(store);
  const [retroGoalId, setRetroGoalId] = useState<string>("");
  const [retroDayType, setRetroDayType] = useState<"goal" | "rest">("goal");

  useEffect(() => {
    if (activeGoals.length > 0 && !retroGoalId) {
      setRetroGoalId(activeGoals[0].id);
    }
  }, [activeGoals, retroGoalId]);

  const noGoals = retroDayType === "goal" && activeGoals.length === 0;

  return (
    <>
    <CalmDialog
      open={open}
      title={t("timeline.retro.title")}
      description={t("timeline.retro.body")}
      confirmLabel={t("timeline.retro.saveLog")}
      cancelLabel={t("timeline.retro.cancel")}
      confirmDisabled={noGoals}
      onCancel={onClose}
      onConfirm={() => {
        if (!date) return;
        store.createOrUpdateDayPlan(date, {
          dayType: retroDayType,
          goalId: retroDayType === "goal" ? retroGoalId : undefined,
          status: "completed"
        });
        toast.show(t("timeline.retro.saved"));
        onClose();
      }}
    >
      <h3 className="text-sm font-bold text-monk-text">
        {date ? t("timeline.retro.heading", { date: formatHumanDate(date) }) : ""}
      </h3>
      <p className="text-xs text-monk-muted">{t("timeline.retro.window")}</p>
      <div className="flex gap-2.5">
        <button
          type="button"
          className={`flex-1 min-h-10 rounded-xl border text-xs font-semibold transition active:scale-[0.98] ${
            retroDayType === "goal"
              ? "border-monk-accent ring-1 ring-monk-accent/30 bg-monk-accent-soft text-monk-accent"
              : "border-monk-border bg-monk-soft text-monk-muted hover:border-monk-border-strong"
          }`}
          onClick={() => setRetroDayType("goal")}
        >
          {t("timeline.retro.focusGoal")}
        </button>
        <button
          type="button"
          className={`flex-1 min-h-10 rounded-xl border text-xs font-semibold transition active:scale-[0.98] ${
            retroDayType === "rest"
              ? "border-monk-accent ring-1 ring-monk-accent/30 bg-monk-accent-soft text-monk-accent"
              : "border-monk-border bg-monk-soft text-monk-muted hover:border-monk-border-strong"
          }`}
          onClick={() => setRetroDayType("rest")}
        >
          {t("timeline.retro.restDay")}
        </button>
      </div>

      {retroDayType === "goal" ? (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-monk-muted uppercase tracking-wider">{t("timeline.retro.chooseTheme")}</label>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {activeGoals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                className={`w-full rounded-xl border p-3 text-left text-xs font-semibold transition active:scale-[0.98] ${
                  retroGoalId === goal.id
                    ? "border-monk-accent ring-1 ring-monk-accent/30 bg-monk-accent-soft text-monk-accent"
                    : "border-monk-border bg-monk-surface text-monk-text hover:border-monk-border-strong"
                }`}
                onClick={() => setRetroGoalId(goal.id)}
              >
                {goal.title}
              </button>
            ))}
          </div>
          {noGoals ? (
            <p className="text-xs text-monk-warning">{t("timeline.retro.noGoals")}</p>
          ) : null}
        </div>
      ) : null}
    </CalmDialog>
    {toast.Toast()}
    </>
  );
}
