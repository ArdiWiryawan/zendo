import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import type { MessageKey } from "../i18n";
import { MAX_GOAL_WHYS, goalWhys } from "../lib/goalWhy";
import { hapticPress } from "../lib/haptics";
import { GhostButton, PrimaryButton, TextInput, useCalmToast, useModalA11y } from "./ui";

interface GoalWhySheetProps {
  open: boolean;
  onClose: () => void;
  goalId?: string;
}

/**
 * The reason editor.
 *
 * Why this is a sheet and not a field: the reason a goal matters is not a
 * one-time answer, it is the thing that decays. A list the user can add to in
 * ten seconds — on the day the reason actually occurs to them — keeps the goal
 * from feeling hollow, and gives the daily hero something to rotate through
 * instead of repeating one sentence until it goes numb.
 */
export function GoalWhySheet({ open, onClose, goalId }: GoalWhySheetProps) {
  const t = useT();
  const toast = useCalmToast();
  const goal = useMonkStore((s) => (goalId ? s.goals.find((g) => g.id === goalId) : undefined));
  const addGoalWhy = useMonkStore((s) => s.addGoalWhy);
  const removeGoalWhy = useMonkStore((s) => s.removeGoalWhy);

  const [draft, setDraft] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  useModalA11y({ open, ref: cardRef, onClose });

  useEffect(() => {
    if (open) setDraft("");
  }, [open, goalId]);

  if (!open || !goal) return null;

  const whys = goalWhys(goal);
  const atLimit = whys.length >= MAX_GOAL_WHYS;

  const handleAdd = () => {
    const value = draft.trim();
    if (!value) return;
    if (atLimit) return;
    hapticPress("light");
    addGoalWhy(goal.id, value);
    setDraft("");
    toast.show(t("goalWhy.added"));
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-monk-bg/85 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        ref={cardRef}
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-why-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-monk-lg border border-monk-border/80 bg-monk-surface shadow-2xl sm:max-w-md sm:rounded-monk-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-monk-border/50 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-monk-accent/15 text-monk-accent">
              <Heart size={16} />
            </span>
            <div className="min-w-0">
              <h2 id="goal-why-title" className="truncate text-base font-bold tracking-tight text-monk-text">
                {t("goalWhy.title")}
              </h2>
              <p className="mt-0.5 truncate text-xs text-monk-muted">{goal.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("weeklyReviewModal.close")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-monk-muted transition hover:bg-monk-soft hover:text-monk-text"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-[13px] leading-relaxed text-monk-muted">{t("goalWhy.subtitle")}</p>

          {whys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-monk-border/70 bg-monk-soft/20 p-3.5">
              <p className="text-sm font-semibold text-monk-text">{t("goalWhy.emptyTitle")}</p>
              <p className="mt-1 text-xs leading-relaxed text-monk-muted">{t("goalWhy.emptyBody")}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {whys.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-start gap-2.5 rounded-2xl border border-monk-border/60 bg-monk-soft/20 px-3.5 py-3"
                >
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-monk-accent/15 text-[10px] font-bold text-monk-accent">
                    {index + 1}
                  </span>
                  <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-monk-text">
                    {item.text}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      hapticPress("light");
                      removeGoalWhy(goal.id, item.id);
                    }}
                    aria-label={t("goalWhy.removeAria", { why: item.text })}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-monk-muted transition hover:bg-monk-danger/10 hover:text-monk-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="goal-why-input" className="text-[11px] font-bold uppercase tracking-wider text-monk-muted">
                {t("goalWhy.addLabel")}
              </label>
              <span className="text-[10px] font-semibold text-monk-muted">
                {t("goalWhy.count", { n: whys.length, max: MAX_GOAL_WHYS })}
              </span>
            </div>
            <TextInput
              id="goal-why-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder={t("goalWhy.placeholder")}
              disabled={atLimit}
              className="bg-monk-surface text-sm"
            />
            <div className="flex flex-wrap gap-1.5">
              {(["suggest1", "suggest2", "suggest3"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    hapticPress("light");
                    setDraft(t(`goalWhy.${key}` as MessageKey));
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-monk-border/70 bg-monk-soft/30 px-2.5 py-1 text-[11px] text-monk-muted transition hover:border-monk-accent/50 hover:text-monk-text"
                >
                  <Sparkles size={10} className="text-monk-accent" />
                  {t(`goalWhy.${key}Short` as MessageKey)}
                </button>
              ))}
            </div>
            <PrimaryButton
              type="button"
              onClick={handleAdd}
              disabled={!draft.trim() || atLimit}
              className="w-full"
            >
              <Plus size={15} />
              {atLimit ? t("goalWhy.limitReached") : t("goalWhy.addButton")}
            </PrimaryButton>
          </div>
        </div>

        <div className="border-t border-monk-border/50 px-5 py-3">
          <GhostButton type="button" onClick={onClose} className="w-full">
            {t("weeklyReviewModal.close")}
          </GhostButton>
        </div>
      </motion.div>
    </div>
  );
}
