import { useState } from "react";
import { Target } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import type { Goal } from "../types/app";
import { CalmDialog, ChoiceCard, useCalmToast } from "./ui";

/**
 * The three honest answers to "a goal was released, one day is free".
 *
 * The system must not assume spare capacity should become more work, so making
 * it rest is a first-class choice, not a consolation. The freed capacity is the
 * same one the release dialog offered; reaching it here too means a reload or a
 * dismissed dialog never loses the decision. The store refuses any choice that
 * would break the week's focus+rest=7 invariant.
 */
export function FreeDayDialog({
  open,
  freeDays,
  goals,
  onClose
}: {
  open: boolean;
  freeDays: number;
  goals: Goal[];
  onClose: () => void;
}) {
  const store = useMonkStore();
  const t = useT();
  const toast = useCalmToast();
  const [choice, setChoice] = useState<"addToGoal" | "toRest" | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);

  const close = () => {
    setChoice(null);
    setGoalId(null);
    onClose();
  };

  const confirm = () => {
    if (choice === "addToGoal") {
      if (!goalId) return;
      const result = store.reallocateFreeDays({ kind: "addToGoal", goalId });
      if (!result.valid) {
        toast.show(t("rhythm.failed"));
        return;
      }
      toast.show(t("rhythm.done.added"));
      close();
      return;
    }
    if (choice === "toRest") {
      const result = store.reallocateFreeDays({ kind: "toRest" });
      if (!result.valid) {
        toast.show(t("rhythm.failed"));
        return;
      }
      toast.show(t("rhythm.done.rest"));
      close();
    }
  };

  const canConfirm = choice === "toRest" || (choice === "addToGoal" && !!goalId);

  return (
    <>
      <CalmDialog
        open={open}
        title={t("rhythm.title")}
        description={t("rhythm.body", { n: freeDays })}
        confirmLabel={t("rhythm.confirm")}
        cancelLabel={t("dialog.cancel")}
        confirmDisabled={!canConfirm}
        onConfirm={confirm}
        onCancel={close}
      >
        {goals.length > 0 ? (
          <>
            <ChoiceCard
              title={t("rhythm.addToGoal")}
              description={t("rhythm.addToGoalDesc")}
              selected={choice === "addToGoal"}
              onClick={() => setChoice("addToGoal")}
            />
            {choice === "addToGoal" ? (
              <div className="space-y-2 rounded-lg border border-monk-border/70 p-3">
                <p className="text-xs font-semibold text-monk-muted">{t("rhythm.chooseGoal")}</p>
                {goals.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    aria-pressed={goalId === goal.id}
                    onClick={() => setGoalId(goal.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      goalId === goal.id
                        ? "border-monk-accent bg-monk-accent-soft font-semibold text-monk-accent"
                        : "border-monk-border text-monk-text hover:border-monk-border-strong"
                    }`}
                  >
                    <Target size={14} strokeWidth={1.5} />
                    <span className="truncate">{goal.title}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        <ChoiceCard
          title={t("rhythm.newGoal")}
          description={t("rhythm.newGoalUnavailable")}
          selected={false}
          disabled
          onClick={() => {}}
        />

        <ChoiceCard
          title={t("rhythm.toRest")}
          description={t("rhythm.toRestDesc")}
          selected={choice === "toRest"}
          onClick={() => setChoice("toRest")}
        />
      </CalmDialog>
      {toast.Toast()}
    </>
  );
}