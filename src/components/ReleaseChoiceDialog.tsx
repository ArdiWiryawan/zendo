import { useState } from "react";
import { Target } from "lucide-react";
import { useCalmToast, CalmDialog, ChoiceCard, TextInput } from "./ui";
import { useT } from "../i18n";
import type { Goal } from "../types/app";

/**
 * Release confirm, plus the decision it creates.
 *
 * Releasing a goal frees focus days, and the old dialog let that happen with no
 * mention of it — the week silently shrank from 6 to 5. Step 2 names the freed
 * day and offers the honest answers before the dialog closes. The note ("what
 * will you do with the freed time?") is asked LAST, because the placement is the
 * answer the system can actually act on.
 */
export function ReleaseChoiceDialog({
  open,
  goal,
  activeGoals,
  freedDays,
  onConfirm,
  onCancel
}: {
  open: boolean;
  goal: Goal;
  /** Other active goals, the ones the freed day could extend. */
  activeGoals: Goal[];
  /** Focus days this release hands back to the week (usually 1). */
  freedDays: number;
  onConfirm: (
    note: string,
    choice: { kind: "none" } | { kind: "addToGoal"; goalId: string } | { kind: "toRest" }
  ) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useCalmToast();
  const [step, setStep] = useState<"note" | "place">("note");
  const [note, setNote] = useState("");
  const [choice, setChoice] = useState<
    { kind: "addToGoal"; goalId: string } | { kind: "toRest" } | null
  >(null);

  const reset = () => {
    setStep("note");
    setNote("");
    setChoice(null);
  };

  const cancel = () => {
    reset();
    onCancel();
  };

  if (!open) return null;

  // Nothing is handed back (over-committed plan): say so instead of showing a
  // placement step for a day that does not exist.
  if (freedDays <= 0) {
    return (
      <CalmDialog
        open
        title={t("release.title", { goal: goal.title })}
        description={t("release.body")}
        confirmLabel={t("release.confirm")}
        cancelLabel={t("release.cancel")}
        danger
        onConfirm={() => {
          onConfirm(note, { kind: "none" });
          reset();
          toast.show(t("release.done"));
        }}
        onCancel={cancel}
      >
        <TextInput
          label={t("release.noteLabel")}
          placeholder={t("release.note")}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </CalmDialog>
    );
  }

  if (step === "place") {
    return (
      <CalmDialog
        open
        title={t("rhythm.title")}
        description={t("rhythm.body", { n: freedDays })}
        confirmLabel={t("rhythm.confirm")}
        cancelLabel={t("release.cancel")}
        confirmDisabled={!choice}
        onConfirm={() => {
          if (!choice) return;
          onConfirm(note, choice);
          reset();
          toast.show(choice.kind === "toRest" ? t("rhythm.done.rest") : t("rhythm.done.added"));
        }}
        onCancel={cancel}
      >
        {activeGoals.length > 0 ? (
          <>
            <ChoiceCard
              title={t("rhythm.addToGoal")}
              description={t("rhythm.addToGoalDesc")}
              selected={choice?.kind === "addToGoal"}
              onClick={() => setChoice({ kind: "addToGoal", goalId: activeGoals[0].id })}
            />
            {choice?.kind === "addToGoal" ? (
              <div className="space-y-2 rounded-lg border border-monk-border/70 p-3">
                <p className="text-xs font-semibold text-monk-muted">{t("rhythm.chooseGoal")}</p>
                {activeGoals.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    aria-pressed={choice.goalId === candidate.id}
                    onClick={() => setChoice({ kind: "addToGoal", goalId: candidate.id })}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      choice.goalId === candidate.id
                        ? "border-monk-accent bg-monk-accent-soft font-semibold text-monk-accent"
                        : "border-monk-border text-monk-text hover:border-monk-border-strong"
                    }`}
                  >
                    <Target size={14} strokeWidth={1.5} />
                    <span className="truncate">{candidate.title}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {/* Mid-season goal creation has no store action. Say that plainly rather
            than offer a button that silently does nothing. */}
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
          selected={choice?.kind === "toRest"}
          onClick={() => setChoice({ kind: "toRest" })}
        />
      </CalmDialog>
    );
  }

  return (
    <CalmDialog
      open
      title={t("release.title", { goal: goal.title })}
      description={t("release.body")}
      confirmLabel={t("release.confirm")}
      cancelLabel={t("release.cancel")}
      danger
      onConfirm={() => setStep("place")}
      onCancel={cancel}
    >
      <TextInput
        label={t("release.noteLabel")}
        placeholder={t("release.note")}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      {/* The freed day is named here, where the user can still change their mind
          — never discovered afterwards in a rhythm card that just got smaller. */}
      <p className="text-xs leading-5 text-monk-muted">
        {t("rhythm.releaseFrees", { n: freedDays })}
      </p>
    </CalmDialog>
  );
}