import { useEffect, useState } from "react";
import { useT } from "../i18n";
import { selectActiveGoals } from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import { formatHumanDate } from "../lib/date";
import { CalmDialog, useCalmToast } from "./ui";
import { Check, Flame, Moon } from "lucide-react";

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
  const [retroStatus, setRetroStatus] = useState<"completed" | "partial" | "rest">("completed");

  useEffect(() => {
    if (activeGoals.length > 0 && !retroGoalId) {
      setRetroGoalId(activeGoals[0].id);
    }
  }, [activeGoals, retroGoalId]);

  const noGoals = retroStatus !== "rest" && activeGoals.length === 0;

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
          dayType: retroStatus === "rest" ? "rest" : "goal",
          goalId: retroStatus !== "rest" ? retroGoalId : undefined,
          status: retroStatus === "rest" ? "completed" : retroStatus
        });
        toast.show(t("timeline.retro.saved"));
        onClose();
      }}
    >
      <h3 className="text-sm font-bold text-monk-text">
        {date ? t("timeline.retro.heading", { date: formatHumanDate(date) }) : ""}
      </h3>
      <p className="text-xs text-monk-muted">{t("timeline.retro.window")}</p>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition active:scale-[0.98] ${
            retroStatus === "completed"
              ? "border-monk-success ring-1 ring-monk-success/30 bg-monk-success-soft text-monk-success"
              : "border-monk-border bg-monk-soft text-monk-muted hover:border-monk-border-strong"
          }`}
          onClick={() => setRetroStatus("completed")}
        >
          <Check size={16} strokeWidth={2.5} />
          <span className="text-[11px] font-medium">{t("week.legendDone")}</span>
        </button>
        <button
          type="button"
          className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition active:scale-[0.98] ${
            retroStatus === "partial"
              ? "border-monk-accent ring-1 ring-monk-accent/30 bg-monk-accent-soft text-monk-accent"
              : "border-monk-border bg-monk-soft text-monk-muted hover:border-monk-border-strong"
          }`}
          onClick={() => setRetroStatus("partial")}
        >
          <Flame size={16} strokeWidth={2} />
          <span className="text-[11px] font-medium">{t("week.legendPartial")}</span>
        </button>
        <button
          type="button"
          className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition active:scale-[0.98] ${
            retroStatus === "rest"
              ? "border-monk-rest ring-1 ring-monk-rest/30 bg-monk-rest-soft text-monk-rest"
              : "border-monk-border bg-monk-soft text-monk-muted hover:border-monk-border-strong"
          }`}
          onClick={() => setRetroStatus("rest")}
        >
          <Moon size={16} strokeWidth={2} />
          <span className="text-[11px] font-medium">{t("week.legendRest")}</span>
        </button>
      </div>

      {retroStatus !== "rest" ? (
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
