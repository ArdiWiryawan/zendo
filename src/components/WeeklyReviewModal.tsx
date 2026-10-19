import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check, Sparkles, Moon, CalendarDays, Pencil, BatteryMedium } from "lucide-react";
import { useMonkStore, goalEvidence } from "../store/useMonkStore";
import { useT } from "../i18n";
import { selectActiveGoals, selectCurrentWeeklyPlan, selectEnergyForDate } from "../store/selectors";
import { getTodayDateString, formatHumanDate } from "../lib/date";
import { hapticPress } from "../lib/haptics";
import { buildJournalRecap } from "../lib/journalRecap";
import { useCalmToast, PrimaryButton, GhostButton, TextInput, Textarea, useModalA11y } from "./ui";
import { REST_ACTIVITIES, REST_CATEGORIES, RestActivityCategory, RestActivityDef } from "../constants/restActivities";
import { RestGlyph } from "./RestGlyph";
import type { WeeklyReview, WeeklyReviewDecision, WeeklyReflectionAnswers, RestActivityItem, EnergyLevel, JournalEntry } from "../types/app";
import type { MessageKey } from "../i18n";

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyPlanId?: string;
}

/**
 * Whether a saved review should be shown as a finished summary rather than the
 * wizard. A skipped week is deliberately NOT "complete": it has no answers to
 * summarise, so it gets its own honest state instead of an empty report.
 */
export function reviewIsComplete(review?: WeeklyReview | null): boolean {
  return !!review && review.skipped !== true;
}

/** Prompt slots rendered in the completed summary, in the order they were asked. */
const REFLECTION_SECTIONS: { key: keyof WeeklyReflectionAnswers; labelKey: MessageKey }[] = [
  { key: "wins", labelKey: "weeklyReviewModal.winsLabel" },
  { key: "challenges", labelKey: "weeklyReviewModal.challengesLabel" },
  { key: "lesson", labelKey: "weeklyReviewModal.lessonLabel" },
  { key: "organise", labelKey: "weeklyReviewModal.organiseLabel" },
  { key: "priorities", labelKey: "weeklyReviewModal.prioritiesLabel" }
];

/**
 * The journal recap is a step, not a detour: it sits right after "wins" so the
 * user reads their own week before answering what worked. Step count is derived
 * from this constant everywhere, because a hardcoded `/6` in the header and the
 * dots was exactly the kind of drift that makes a wizard look broken.
 */
const TOTAL_STEPS = 7;

const MOOD_EMOJI: Record<NonNullable<JournalEntry["mood"]>, string> = {
  calm: "😌",
  clear: "🧠",
  tired: "😴",
  restless: "🌀",
  focused: "🎯"
};

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 32 : -32,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -32 : 32,
    opacity: 0
  })
};

export function WeeklyReviewModal({ isOpen, onClose, weeklyPlanId }: WeeklyReviewModalProps) {
  const t = useT();
  const toast = useCalmToast();
  const store = useMonkStore();
  const lang = (store.appSettings.language ?? "id") === "en" ? "en" : "id";
  const today = getTodayDateString();

  const currentWeeklyPlan = selectCurrentWeeklyPlan(store);
  const targetWeeklyPlan = weeklyPlanId
    ? store.weeklyPlans.find((p) => p.id === weeklyPlanId) ?? currentWeeklyPlan
    : currentWeeklyPlan;

  const goals = selectActiveGoals(store);
  const existingReview = targetWeeklyPlan ? store.weeklyReviews?.[targetWeeklyPlan.id] : undefined;

  const [step, setStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1);
  // A finished review opens as a summary, not as the wizard: auto-starting the
  // form made a completed week look unanswered and re-ran the Finish side
  // effects. Editing is now an explicit choice.
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Energy recorded with the review. Seeded from today's energy log so the
  // review borrows the reading the rest of the app already uses.
  const [energy, setEnergy] = useState<EnergyLevel | undefined>(undefined);

  // Reflection prompt state
  const [reflection, setReflection] = useState<WeeklyReflectionAnswers>({
    wins: "",
    challenges: "",
    lesson: "",
    organise: "",
    priorities: ""
  });

  // Goal decisions
  const [decisions, setDecisions] = useState<Record<string, WeeklyReviewDecision>>({});

  // Rest activity state
  const [selectedCategory, setSelectedCategory] = useState<RestActivityCategory | "all">("all");
  const [selectedActivity, setSelectedActivity] = useState<RestActivityItem | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize from saved review or defaults
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setDirection(1);
    setIsEditing(false);
    setEnergy(existingReview?.energy ?? selectEnergyForDate(store, today));

    if (existingReview) {
      if (existingReview.reflection) {
        setReflection({
          wins: existingReview.reflection.wins || "",
          challenges: existingReview.reflection.challenges || "",
          lesson: existingReview.reflection.lesson || "",
          organise: existingReview.reflection.organise || "",
          priorities: existingReview.reflection.priorities || ""
        });
      }
      if (existingReview.decisions) {
        setDecisions(existingReview.decisions);
      }
      if (existingReview.restActivity) {
        setSelectedActivity(existingReview.restActivity);
        if (existingReview.restActivity.category === "custom") {
          setIsCustomMode(true);
          setCustomTitle(existingReview.restActivity.title);
        }
      }
    } else {
      // Default continue decision for all goals
      const initialDecisions: Record<string, WeeklyReviewDecision> = {};
      if (targetWeeklyPlan) {
        targetWeeklyPlan.goalAllocations.forEach((alloc) => {
          initialDecisions[alloc.goalId] = { action: "continue" };
        });
      }
      setDecisions(initialDecisions);
    }
  }, [isOpen, targetWeeklyPlan?.id]);

  // Escape closes, Tab stays inside, focus returns to the opener on unmount.
  const cardRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open: isOpen, ref: cardRef, onClose });

  // `GoalAllocation.completedCount` is a stored field refreshed only by focus-
  // session mutations, so it goes stale on hydration/cross-device pull. Derive
  // it from the session records at render time, same as TodayScreen/WeekScreen.
  const allocations = useMemo(() => {
    if (!targetWeeklyPlan) return [];
    const since = `${targetWeeklyPlan.startDate}T00:00:00.000Z`;
    const until = `${targetWeeklyPlan.endDate}T23:59:59.999Z`;
    return targetWeeklyPlan.goalAllocations.map((allocation) => ({
      ...allocation,
      completedCount: goalEvidence(store, allocation.goalId, { since, until }).length
    }));
  }, [targetWeeklyPlan, store.focusSessions]);

  // The week's journal, read-only. Hooks stay above the early return so the
  // modal's hook order never changes between "closed" and "open".
  const journalRecap = useMemo(
    () =>
      targetWeeklyPlan
        ? buildJournalRecap(
            store.journalEntries,
            targetWeeklyPlan.startDate,
            targetWeeklyPlan.endDate,
            lang,
            targetWeeklyPlan.seasonId
          )
        : buildJournalRecap([], "0000-01-01", "0000-01-01", lang),
    [store.journalEntries, targetWeeklyPlan, lang]
  );

  if (!isOpen || !targetWeeklyPlan) return null;

  const goToStep = (newStep: number) => {
    hapticPress("light");
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
    modalRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setGoalAction = (goalId: string, action: WeeklyReviewDecision["action"]) => {
    hapticPress("light");
    setDecisions((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], action, mainAction: prev[goalId]?.mainAction }
    }));
  };

  const setGoalMainAction = (goalId: string, mainAction: string) => {
    setDecisions((prev) => ({
      ...prev,
      [goalId]: { action: "adjust", mainAction }
    }));
  };

  const handleSelectActivity = (act: RestActivityDef) => {
    hapticPress("light");
    setIsCustomMode(false);
    setSelectedActivity({
      id: act.id,
      title: act.title[lang],
      category: act.category,
      icon: act.icon
    });
  };

  const handleCustomSelect = () => {
    hapticPress("light");
    setIsCustomMode(true);
    setSelectedActivity({
      id: "custom",
      title: customTitle.trim() || t("weeklyReviewModal.customOption"),
      category: "custom",
      icon: "PenLine"
    });
  };

  const handleComplete = () => {
    hapticPress("success");
    const finalRestActivity = isCustomMode
      ? {
          id: "custom",
          title: customTitle.trim() || t("weeklyReviewModal.customOption"),
          category: "custom" as const,
          icon: "PenLine"
        }
      : selectedActivity ?? undefined;

    store.reviewWeek(targetWeeklyPlan.id, decisions, {
      reflection,
      restActivity: finalRestActivity,
      energy
    });

    // Mark today as rest day completed
    const currentTodayPlan = store.dayPlans.find((d) => d.date === today && d.seasonId === targetWeeklyPlan.seasonId);
    if (currentTodayPlan?.dayType === "rest" || !currentTodayPlan) {
      store.createOrUpdateDayPlan(today, {
        dayType: "rest",
        status: "completed"
      });
    }

    toast.show(t("weeklyReviewModal.savedToast"));
    onClose();
  };

  const filteredActivities = selectedCategory === "all"
    ? REST_ACTIVITIES
    : REST_ACTIVITIES.filter((a) => a.category === selectedCategory);

  const showCompleted = reviewIsComplete(existingReview) && !isEditing;
  const showSkipped = !!existingReview?.skipped && !isEditing;
  const isSummary = showCompleted || showSkipped;

  const decisionCounts = Object.values(existingReview?.decisions ?? {}).reduce(
    (acc, decision) => {
      acc[decision.action] += 1;
      return acc;
    },
    { continue: 0, adjust: 0, release: 0 } as Record<WeeklyReviewDecision["action"], number>
  );

  const energyLabels: Record<EnergyLevel, string> = {
    low: t("rest.energy.low"),
    medium: t("rest.energy.medium"),
    high: t("rest.energy.high")
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-monk-bg/85 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal Dialog Card */}
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-review-modal-title"
        className="relative flex flex-col w-full max-w-xl max-h-[92vh] rounded-monk-lg border border-monk-border/80 bg-monk-surface shadow-2xl overflow-hidden z-10"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-monk-border/50 px-5 py-3.5 sm:px-6">
          {isSummary ? (
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-monk-success-soft text-monk-success">
                {showCompleted ? <Check size={15} /> : <Moon size={15} />}
              </span>
              <span className="text-xs font-semibold text-monk-muted">
                {t(showCompleted ? "week.reviewDoneBadge" : "reviews.skippedLabel")}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-monk-accent-soft text-monk-accent text-xs font-bold">
                {step}/{TOTAL_STEPS}
              </span>
              <span className="text-xs font-semibold text-monk-muted">
                {t("weeklyReviewModal.stepOf", { current: step, total: TOTAL_STEPS })}
              </span>
            </div>
          )}

          {/* Segmented Dots Indicator */}
          {!isSummary && (
            <div className="flex items-center gap-1.5" aria-hidden>
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? "w-6 bg-monk-accent"
                      : i < step
                      ? "w-2 bg-monk-accent/50"
                      : "w-2 bg-monk-border"
                  }`}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label={t("weeklyReviewModal.close")}
            className="grid h-8 w-8 place-items-center rounded-full text-monk-muted hover:bg-monk-soft hover:text-monk-text transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Step Body */}
        <div ref={modalRef} className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {isSummary && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                    showCompleted
                      ? "bg-monk-success-soft text-monk-success"
                      : "bg-monk-soft text-monk-muted"
                  }`}
                >
                  {showCompleted ? <Check size={22} /> : <Moon size={20} />}
                </span>
                <div>
                  <h3 id="weekly-review-modal-title" className="text-xl font-bold tracking-tight text-monk-text">
                    {t(
                      showCompleted
                        ? "weeklyReviewModal.completedTitle"
                        : "weeklyReviewModal.skippedTitle"
                    )}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-monk-muted">
                    {t(
                      showCompleted
                        ? "weeklyReviewModal.completedBody"
                        : "weeklyReviewModal.skippedBody"
                    )}
                  </p>
                  {existingReview?.date && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-monk-muted">
                      <CalendarDays size={13} />
                      {t("weeklyReviewModal.completedOn", {
                        date: formatHumanDate(existingReview.date.slice(0, 10))
                      })}
                    </p>
                  )}
                </div>
              </div>

              {showCompleted && (
                <>
                  <div className="rounded-2xl border border-monk-border/60 bg-monk-soft/25 p-4">
                    <p className="text-sm font-semibold text-monk-text">
                      {t("week.review.summary", {
                        cont: decisionCounts.continue,
                        adj: decisionCounts.adjust,
                        rel: decisionCounts.release
                      })}
                    </p>
                  </div>

                  {REFLECTION_SECTIONS.map(({ key, labelKey }) => {
                    const answer = existingReview?.reflection?.[key];
                    if (!answer || !answer.trim()) return null;
                    return (
                      <div
                        key={key}
                        className="rounded-2xl border border-monk-border/60 bg-monk-soft/25 p-3.5"
                      >
                        <h4 className="text-xs font-bold uppercase tracking-wider text-monk-accent">
                          {t(labelKey)}
                        </h4>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-monk-text">
                          {answer}
                        </p>
                      </div>
                    );
                  })}

                  {journalRecap.entryCount > 0 ? (
                    <div className="rounded-2xl border border-monk-border/60 bg-monk-soft/25 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-monk-accent">
                          {t("weeklyReviewModal.summaryJournal")}
                        </h4>
                        <span className="text-[10px] font-semibold text-monk-muted">
                          {t("weeklyReviewModal.journalCount", {
                            n: journalRecap.entryCount,
                            total: journalRecap.dayCount
                          })}
                        </span>
                      </div>
                      <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                        {journalRecap.entries.map((entry) => (
                          <div key={entry.id} className="rounded-xl bg-monk-surface/70 p-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-monk-muted">
                              {formatHumanDate(entry.date)}
                              {entry.mood ? ` · ${MOOD_EMOJI[entry.mood]}` : ""}
                            </p>
                            {entry.answers.map((answer) => (
                              <p
                                key={answer.id}
                                className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-monk-text"
                              >
                                {answer.answer}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {existingReview?.restActivity && (
                    <div className="rounded-2xl border border-monk-border/60 bg-monk-soft/25 p-3.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-monk-accent">
                        {t("weeklyReviewModal.chosenRest")}
                      </h4>
                      <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-monk-text">
                        {existingReview.restActivity.icon && (
                          <RestGlyph
                            name={existingReview.restActivity.icon}
                            size={15}
                            className="text-monk-success"
                          />
                        )}
                        {existingReview.restActivity.title}
                      </p>
                    </div>
                  )}

                  {existingReview?.energy && (
                    <div className="rounded-2xl border border-monk-border/60 bg-monk-soft/25 p-3.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-monk-accent">
                        {t("weeklyReviewModal.energyLabel")}
                      </h4>
                      <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-monk-text">
                        <BatteryMedium size={15} className="text-monk-success" />
                        {energyLabels[existingReview.energy]}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!isSummary && (
          <AnimatePresence mode="wait" custom={direction}>
            {/* Step 1: Weekly Wins */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-monk-cat-learning/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-monk-cat-learning">
                    {t("weeklyReviewModal.badge.prompt1")}
                  </span>
                </div>
                <h3 id="weekly-review-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-monk-text">
                  {t("weeklyReviewModal.title.prompt1")}
                </h3>
                <div className="rounded-2xl border border-monk-border/60 bg-monk-soft/30 p-4 space-y-2">
                  <p className="text-sm font-semibold text-monk-text">
                    • {t("weeklyReviewModal.q1.prompt1")}
                  </p>
                  <p className="text-sm font-semibold text-monk-text">
                    • {t("weeklyReviewModal.q2.prompt1")}
                  </p>
                </div>
                <Textarea
                  value={reflection.wins || ""}
                  onChange={(e) => setReflection((prev) => ({ ...prev, wins: e.target.value }))}
                  placeholder={t("weeklyReviewModal.placeholder.prompt1")}
                  rows={5}
                  className="w-full text-sm leading-relaxed"
                />
              </motion.div>
            )}

            {/* Step 2: Journal recap — the week in the user's own words.
                Read-only on purpose: this is evidence, not another prompt. */}
            {step === 2 && (
              <motion.div
                key="step-2-journal"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-monk-cat-personal/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-monk-cat-personal">
                    {t("weeklyReviewModal.badge.journal")}
                  </span>
                </div>
                <h3 id="weekly-review-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-monk-text">
                  {t("weeklyReviewModal.title.journal")}
                </h3>
                <p className="text-sm leading-relaxed text-monk-muted">
                  {t("weeklyReviewModal.subtitle.journal")}
                </p>

                {journalRecap.entryCount === 0 ? (
                  <div className="rounded-2xl border border-dashed border-monk-border/70 bg-monk-soft/20 p-4">
                    <p className="text-sm font-semibold text-monk-text">
                      {t("weeklyReviewModal.journalEmptyTitle")}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-monk-muted">
                      {t("weeklyReviewModal.journalEmptyBody")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-monk-border/60 bg-monk-soft/40 px-2.5 py-1 text-[11px] font-semibold text-monk-text-soft">
                        {t("weeklyReviewModal.journalCount", {
                          n: journalRecap.entryCount,
                          total: journalRecap.dayCount
                        })}
                      </span>
                      {(Object.keys(journalRecap.moodCounts) as NonNullable<JournalEntry["mood"]>[]).map(
                        (mood) => (
                          <span
                            key={mood}
                            className="rounded-full border border-monk-border/60 bg-monk-surface px-2 py-0.5 text-[11px] text-monk-muted"
                          >
                            {MOOD_EMOJI[mood]} {journalRecap.moodCounts[mood]}
                          </span>
                        )
                      )}
                    </div>

                    <div className="max-h-[46vh] space-y-2.5 overflow-y-auto pr-1">
                      {journalRecap.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-monk-border/60 bg-monk-soft/20 p-3.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-monk-muted">
                              {formatHumanDate(entry.date)}
                            </p>
                            {entry.mood ? (
                              <span aria-hidden className="text-sm">
                                {MOOD_EMOJI[entry.mood]}
                              </span>
                            ) : null}
                          </div>
                          {entry.answers.map((answer) => (
                            <div key={answer.id} className="mt-2 first:mt-1.5">
                              <p className="text-[11px] font-semibold leading-relaxed text-monk-accent">
                                {answer.question}
                              </p>
                              <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-monk-text">
                                {answer.answer}
                              </p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] leading-relaxed text-monk-muted">
                      {t("weeklyReviewModal.journalFootnote")}
                    </p>
                  </>
                )}
              </motion.div>
            )}

            {/* Step 3: Challenges */}
            {step === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-monk-warning/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-monk-warning">
                    {t("weeklyReviewModal.badge.prompt2")}
                  </span>
                </div>
                <h3 id="weekly-review-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-monk-text">
                  {t("weeklyReviewModal.title.prompt2")}
                </h3>
                <div className="rounded-2xl border border-monk-border/60 bg-monk-soft/30 p-4 space-y-2">
                  <p className="text-sm font-semibold text-monk-text">
                    • {t("weeklyReviewModal.q1.prompt2")}
                  </p>
                  <p className="text-sm font-semibold text-monk-text">
                    • {t("weeklyReviewModal.q2.prompt2")}
                  </p>
                </div>
                <Textarea
                  value={reflection.challenges || ""}
                  onChange={(e) => setReflection((prev) => ({ ...prev, challenges: e.target.value }))}
                  placeholder={t("weeklyReviewModal.placeholder.prompt2")}
                  rows={5}
                  className="w-full text-sm leading-relaxed"
                />
              </motion.div>
            )}

            {/* Step 4: Weekly Lesson */}
            {step === 4 && (
              <motion.div
                key="step-4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-monk-cat-rest/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-monk-cat-rest">
                    {t("weeklyReviewModal.badge.prompt3")}
                  </span>
                </div>
                <h3 id="weekly-review-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-monk-text">
                  {t("weeklyReviewModal.title.prompt3")}
                </h3>
                <div className="rounded-2xl border border-monk-border/60 bg-monk-soft/30 p-4 space-y-2">
                  <p className="text-sm font-semibold text-monk-text">
                    • {t("weeklyReviewModal.q1.prompt3")}
                  </p>
                  <p className="text-sm font-semibold text-monk-text">
                    • {t("weeklyReviewModal.q2.prompt3")}
                  </p>
                </div>
                <Textarea
                  value={reflection.lesson || ""}
                  onChange={(e) => setReflection((prev) => ({ ...prev, lesson: e.target.value }))}
                  placeholder={t("weeklyReviewModal.placeholder.prompt3")}
                  rows={5}
                  className="w-full text-sm leading-relaxed"
                />
              </motion.div>
            )}

            {/* Step 5: Get Organised */}
            {step === 5 && (
              <motion.div
                key="step-5"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-monk-cat-shallow/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-monk-cat-shallow">
                    {t("weeklyReviewModal.badge.prompt4")}
                  </span>
                </div>
                <h3 id="weekly-review-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-monk-text">
                  {t("weeklyReviewModal.title.prompt4")}
                </h3>
                <div className="rounded-2xl border border-monk-border/60 bg-monk-soft/30 p-4 space-y-2">
                  <p className="text-sm font-semibold text-monk-text">
                    • {t("weeklyReviewModal.q1.prompt4")}
                  </p>
                  <p className="text-sm font-semibold text-monk-text">
                    • {t("weeklyReviewModal.q2.prompt4")}
                  </p>
                </div>
                <Textarea
                  value={reflection.organise || ""}
                  onChange={(e) => setReflection((prev) => ({ ...prev, organise: e.target.value }))}
                  placeholder={t("weeklyReviewModal.placeholder.prompt4")}
                  rows={3}
                  className="w-full text-sm leading-relaxed"
                />

                {/* Integrated Goal Decisions */}
                <div className="pt-2 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-monk-accent">
                      {t("weeklyReviewModal.redecideTitle")}
                    </h4>
                    <p className="mt-0.5 text-xs text-monk-muted">
                      {t("weeklyReviewModal.redecideSubtitle")}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {targetWeeklyPlan.goalAllocations.map((alloc) => {
                      const goal = goals.find((g) => g.id === alloc.goalId);
                      const currentDecision = decisions[alloc.goalId] ?? { action: "continue" };
                      const isAdjusting = currentDecision.action === "adjust";

                      return (
                        <div
                          key={alloc.goalId}
                          className="rounded-2xl border border-monk-border/60 bg-monk-soft/20 p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-monk-text truncate">
                              {goal?.title ?? t("today.goalFallback")}
                            </p>
                            <span className="text-[11px] font-mono font-medium text-monk-muted">
                              {alloc.completedCount}/{alloc.targetCount} {t("week.completed")}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setGoalAction(alloc.goalId, "continue")}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                                currentDecision.action === "continue"
                                  ? "bg-monk-success-soft text-monk-success border border-monk-success/50"
                                  : "bg-monk-surface text-monk-muted border border-monk-border hover:border-monk-border-strong"
                              }`}
                            >
                              {t("week.review.continue")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setGoalAction(alloc.goalId, "adjust")}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                                currentDecision.action === "adjust"
                                  ? "bg-monk-accent-soft text-monk-accent border border-monk-accent/50"
                                  : "bg-monk-surface text-monk-muted border border-monk-border hover:border-monk-border-strong"
                              }`}
                            >
                              {t("week.review.adjust")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setGoalAction(alloc.goalId, "release")}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                                currentDecision.action === "release"
                                  ? "bg-monk-soft text-monk-text-soft border border-monk-border-strong"
                                  : "bg-monk-surface text-monk-muted border border-monk-border hover:border-monk-border-strong"
                              }`}
                            >
                              {t("week.review.release")}
                            </button>
                          </div>

                          {isAdjusting && (
                            <div className="mt-2 pt-2 border-t border-monk-border/40">
                              {/* The keystone is offered as a PLACEHOLDER, not as the
                                  field's value (§22). Prefilling the input made the
                                  goal's default look like a decision already taken,
                                  so an untouched field silently became the week's
                                  action. As a hint it stays a suggestion until the
                                  user actually types. */}
                              <TextInput
                                label={t("week.review.actionLabel")}
                                value={currentDecision.mainAction ?? ""}
                                onChange={(e) => setGoalMainAction(alloc.goalId, e.target.value)}
                                placeholder={goal?.keystoneAction?.trim() || t("week.review.actionPlaceholder")}
                                className="text-xs"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 6: Set Priorities */}
            {step === 6 && (
              <motion.div
                key="step-6"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-monk-warning/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-monk-warning">
                    {t("weeklyReviewModal.badge.prompt5")}
                  </span>
                </div>
                <h3 id="weekly-review-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-monk-text">
                  {t("weeklyReviewModal.title.prompt5")}
                </h3>
                <div className="rounded-2xl border border-monk-border/60 bg-monk-soft/30 p-4 space-y-2">
                  <p className="text-sm font-semibold text-monk-text">
                    • {t("weeklyReviewModal.q1.prompt5")}
                  </p>
                  <p className="text-sm font-semibold text-monk-text">
                    • {t("weeklyReviewModal.q2.prompt5")}
                  </p>
                </div>
                <Textarea
                  value={reflection.priorities || ""}
                  onChange={(e) => setReflection((prev) => ({ ...prev, priorities: e.target.value }))}
                  placeholder={t("weeklyReviewModal.placeholder.prompt5")}
                  rows={5}
                  className="w-full text-sm leading-relaxed"
                />
              </motion.div>
            )}

            {/* Step 7: Sharpen the Saw / Choose Rest Activity */}
            {step === 7 && (
              <motion.div
                key="step-7"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-monk-rest-soft px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-monk-rest border border-monk-rest/30">
                    {t("weeklyReviewModal.badge.step6")}
                  </span>
                </div>
                <div>
                  <h3 id="weekly-review-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-monk-text">
                    {t("weeklyReviewModal.title.step6")}
                  </h3>
                  <p className="mt-1 text-xs text-monk-muted leading-relaxed">
                    {t("weeklyReviewModal.subtitle.step6")}
                  </p>
                </div>

                {/* Energy recorded with the review — reuses the app's energy levels */}
                <div className="rounded-2xl border border-monk-border/60 bg-monk-soft/25 p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-monk-accent">
                    {t("rest.energyLabel")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["low", "medium", "high"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          hapticPress("light");
                          setEnergy(level);
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                          energy === level
                            ? "bg-monk-success-soft text-monk-success border border-monk-success/50"
                            : "bg-monk-soft text-monk-muted border border-monk-border/60 hover:text-monk-text"
                        }`}
                      >
                        {t(`rest.energy.${level}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      hapticPress("light");
                      setSelectedCategory("all");
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition active:scale-95 ${
                      selectedCategory === "all"
                        ? "bg-monk-accent text-monk-bg"
                        : "bg-monk-soft text-monk-muted hover:text-monk-text"
                    }`}
                  >
                    {t("weeklyReviewModal.allCategories")}
                  </button>
                  {REST_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        hapticPress("light");
                        setSelectedCategory(cat.id);
                      }}
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition active:scale-95 ${
                        selectedCategory === cat.id
                          ? "bg-monk-accent text-monk-bg"
                          : "bg-monk-soft text-monk-muted hover:text-monk-text"
                      }`}
                    >
                      <RestGlyph name={cat.icon} size={13} strokeWidth={2} />
                      <span>{cat.name[lang]}</span>
                    </button>
                  ))}
                </div>

                {/* Rest Activity Cards Grid */}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {filteredActivities.map((act) => {
                    const isSelected = !isCustomMode && selectedActivity?.id === act.id;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => handleSelectActivity(act)}
                        className={`group relative flex flex-col items-start gap-1.5 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98] ${
                          isSelected
                            ? "border-monk-accent ring-1 ring-monk-accent/50 bg-monk-accent-soft/30 shadow-sm"
                            : "border-monk-border/70 bg-monk-surface hover:border-monk-border-strong hover:bg-monk-soft/30"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <RestGlyph name={act.icon} size={18} className="text-monk-rest" />
                          {isSelected ? (
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-monk-accent text-monk-bg">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-monk-muted">
                              ~{act.durationMin}m
                            </span>
                          )}
                        </div>
                        <p className={`text-xs font-bold ${isSelected ? "text-monk-accent" : "text-monk-text"}`}>
                          {act.title[lang]}
                        </p>
                        <p className="text-[11px] text-monk-muted leading-relaxed line-clamp-2">
                          {act.description[lang]}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Rest Input Option */}
                <div className={`mt-3 rounded-2xl border p-3.5 transition-all ${
                  isCustomMode
                    ? "border-monk-accent ring-1 ring-monk-accent/40 bg-monk-accent-soft/20"
                    : "border-monk-border/60 bg-monk-soft/20"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={handleCustomSelect}
                      className="flex items-center gap-1.5 text-xs font-bold text-monk-text hover:text-monk-accent transition"
                    >
                      <RestGlyph name="PenLine" size={13} strokeWidth={2} />
                      <span>{t("weeklyReviewModal.customOption")}</span>
                    </button>
                    {isCustomMode && (
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-monk-accent text-monk-bg">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <TextInput
                    value={customTitle}
                    onChange={(e) => {
                      setCustomTitle(e.target.value);
                      if (!isCustomMode) setIsCustomMode(true);
                      setSelectedActivity({
                        id: "custom",
                        title: e.target.value.trim() || t("weeklyReviewModal.customOption"),
                        category: "custom",
                        icon: "PenLine"
                      });
                    }}
                    placeholder={t("weeklyReviewModal.customPlaceholder")}
                    className="text-xs"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-monk-border/50 bg-monk-surface/90 px-5 py-3.5 sm:px-6">
          {isSummary ? (
            <>
              <GhostButton
                onClick={onClose}
                className="text-xs font-semibold px-3 py-1.5 text-monk-muted"
              >
                {t("weeklyReviewModal.close")}
              </GhostButton>
              <PrimaryButton
                onClick={() => {
                  hapticPress("light");
                  setIsEditing(true);
                  setStep(1);
                  modalRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center gap-1.5 text-xs font-semibold px-5 py-2"
              >
                <Pencil size={14} />
                <span>{t("weeklyReviewModal.edit")}</span>
              </PrimaryButton>
            </>
          ) : (
            <>
              {step > 1 ? (
            <GhostButton
              onClick={() => goToStep(step - 1)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5"
            >
              <ChevronLeft size={16} />
              <span>{t("weeklyReviewModal.back")}</span>
            </GhostButton>
          ) : (
            <GhostButton
              onClick={onClose}
              className="text-xs font-semibold px-3 py-1.5 text-monk-muted"
            >
              {t("weeklyReviewModal.skip")}
            </GhostButton>
          )}

          {step < TOTAL_STEPS ? (
            <PrimaryButton
              onClick={() => goToStep(step + 1)}
              className="flex items-center gap-1.5 text-xs font-semibold px-5 py-2"
            >
              <span>{t("weeklyReviewModal.next")}</span>
              <ChevronRight size={16} />
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={handleComplete}
              className="flex items-center gap-1.5 text-xs font-semibold px-5 py-2 bg-monk-success text-monk-bg hover:bg-monk-success/90"
            >
              <Moon size={15} />
              <span>{t("weeklyReviewModal.finish")}</span>
            </PrimaryButton>
          )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
