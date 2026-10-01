import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check, Sparkles, Moon } from "lucide-react";
import { useMonkStore, goalEvidence } from "../store/useMonkStore";
import { useT } from "../i18n";
import { selectActiveGoals, selectCurrentWeeklyPlan } from "../store/selectors";
import { getTodayDateString } from "../lib/date";
import { hapticPress } from "../lib/haptics";
import { useCalmToast, PrimaryButton, GhostButton, TextInput, Textarea, useModalA11y } from "./ui";
import { REST_ACTIVITIES, REST_CATEGORIES, RestActivityCategory, RestActivityDef } from "../constants/restActivities";
import { RestGlyph } from "./RestGlyph";
import type { WeeklyReviewDecision, WeeklyReflectionAnswers, RestActivityItem } from "../types/app";

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyPlanId?: string;
}

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
      restActivity: finalRestActivity
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
        className="relative flex flex-col w-full max-w-xl max-h-[92vh] rounded-monk-lg border border-monk-border/80 bg-monk-surface shadow-2xl overflow-hidden z-10"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-monk-border/50 px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-monk-accent-soft text-monk-accent text-xs font-bold">
              {step}/6
            </span>
            <span className="text-xs font-semibold text-monk-muted">
              {t("weeklyReviewModal.stepOf", { current: step, total: 6 })}
            </span>
          </div>

          {/* Segmented Dots Indicator */}
          <div className="flex items-center gap-1.5" aria-hidden>
            {[1, 2, 3, 4, 5, 6].map((i) => (
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

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-monk-muted hover:bg-monk-soft hover:text-monk-text transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Step Body */}
        <div ref={modalRef} className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
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
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-monk-text">
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

            {/* Step 2: Challenges */}
            {step === 2 && (
              <motion.div
                key="step-2"
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
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-monk-text">
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

            {/* Step 3: Weekly Lesson */}
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
                  <span className="rounded-md bg-monk-cat-rest/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-monk-cat-rest">
                    {t("weeklyReviewModal.badge.prompt3")}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-monk-text">
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

            {/* Step 4: Get Organised */}
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
                  <span className="rounded-md bg-monk-cat-shallow/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-monk-cat-shallow">
                    {t("weeklyReviewModal.badge.prompt4")}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-monk-text">
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
                              <TextInput
                                label={t("week.review.actionLabel")}
                                value={currentDecision.mainAction ?? goal?.keystoneAction ?? ""}
                                onChange={(e) => setGoalMainAction(alloc.goalId, e.target.value)}
                                placeholder={t("week.review.actionPlaceholder")}
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

            {/* Step 5: Set Priorities */}
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
                  <span className="rounded-md bg-monk-warning/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-monk-warning">
                    {t("weeklyReviewModal.badge.prompt5")}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-monk-text">
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

            {/* Step 6: Sharpen the Saw / Choose Rest Activity */}
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
                  <span className="rounded-md bg-monk-rest-soft px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-monk-rest border border-monk-rest/30">
                    {t("weeklyReviewModal.badge.step6")}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-monk-text">
                    {t("weeklyReviewModal.title.step6")}
                  </h3>
                  <p className="mt-1 text-xs text-monk-muted leading-relaxed">
                    {t("weeklyReviewModal.subtitle.step6")}
                  </p>
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
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-monk-border/50 bg-monk-surface/90 px-5 py-3.5 sm:px-6">
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

          {step < 6 ? (
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
        </div>
      </motion.div>
    </div>
  );
}
