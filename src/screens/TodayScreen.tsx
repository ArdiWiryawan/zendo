import { useEffect, useState, useMemo } from "react";
import type { RelapseLog } from "../types/app";
import { useNavigate } from "react-router-dom";
import { Moon, BookOpen, Check, ChevronDown, ChevronRight, Sun, Sparkles, ShieldAlert, CircleDashed, Timer, Clock } from "lucide-react";
import { hapticPress } from "../lib/haptics";
import { useMonkStore, goalEvidence } from "../store/useMonkStore";
import { useT } from "../i18n";
import { useCalmToast } from "../components/ui";
import { getTodayDateString, addDaysToDate, getDaysPassed, getDaysLeft } from "../lib/date";
import { CORE_VALUES } from "../constants/whyValues";
import { routes } from "../constants/routes";
import { FOCUS_PRESETS, getPresetLabel } from "../constants/focusPresets";
import { formatIntention, parseIntention, stripIntentionTime } from "../lib/implementationIntention";
import { playCompletionChime, playZenBell, unlockAudio } from "../lib/audio";
import { loadLastFocus, saveLastFocus } from "../lib/storage";
import { getCoachStep, dismissCoachStep } from "../lib/coach";
import { isCloseDaySkipped, skipCloseDay, getDayPart, isReentryDismissed, dismissReentry, isReentryChipHidden, hideReentryChip, shouldOfferReentry, isReentryAnswered, markReentryAnswered, getRelapseForDate, isNmt2Dismissed, dismissNmt2 } from "../lib/dailyActivity";
import { isRestSuggestionDismissed, dismissRestSuggestion, shouldSuggestRest } from "../lib/restSuggestion";
import { shouldWarnMissTwice } from "../lib/focusStreak";
import { selectTodayPlan, selectActiveGoals, selectCurrentWeeklyPlan, selectEnergyForDate, selectTodayLearningSessions, selectTotalFocusSecondsForDate } from "../store/selectors";
import {
  Card,
  ChoiceChip,
  EmptyState,
  GhostButton,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SettingsLink,
  TextInput,
  Textarea,
} from "../components/ui";
import { FocusSessionPanel } from "../screens/FocusSession";
import { CoachHint } from "./OnboardingSteps";
import { WhyEditor } from "../components/SeasonWidgets";
import { EnergyCheck, WhyStrip, GoalTasksCard, derivePrimaryCTA, focusLinkClass, focusLinkMutedClass } from "./TodayScreen.components";
import { GoalBlueprintModal } from "../components/GoalBlueprintModal";
import { PracticesCard } from "../components/PracticesCard";
import { WeeklyReviewModal } from "../components/WeeklyReviewModal";
import { MorningPlanningModal } from "../components/MorningPlanningModal";
import { DayTimeBlockVisualizer } from "../components/DayTimeBlockVisualizer";
import { ZendoProModal } from "../components/ZendoProModal";
import { FeelGoodRestCanvas } from "../components/FeelGoodRestCanvas";
import type { EnergyLevel } from "../types/app";

function CloseDayCard({ onSkip }: { onSkip?: () => void }) {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const toast = useCalmToast();
  const season = store.activeSeason!;
  const today = getTodayDateString();
  const todayPlan = selectTodayPlan(store);
  const todayEntry = store.journalEntries.find(
    (entry) => entry.seasonId === season.id && entry.date === today
  );
  const [text, setText] = useState("");
  const [tomorrow, setTomorrow] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div id="today-close">
    <Card className="space-y-3 p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-monk-muted">{t("today.closeDay.title")}</p>
        <p className="mt-1 text-sm font-semibold">{t("today.closeDay.prompt")}</p>
      </div>
      <Textarea
        className="min-h-[80px]"
        placeholder={t("today.closeDay.placeholder")}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          if (error) setError("");
        }}
      />
      <TextInput
        label={t("today.closeDay.tomorrowLabel")}
        placeholder={t("today.closeDay.tomorrowPlaceholder")}
        value={tomorrow}
        onChange={(event) => setTomorrow(event.target.value)}
      />
      {error ? <p className="text-xs text-monk-danger">{error}</p> : null}
      {saved ? (
        <p className="text-xs font-medium text-monk-success">
          {text.trim() ? t("today.closeDay.echo", { text: text.trim() }) : t("today.closeDay.saved")}
        </p>
      ) : null}
      <PrimaryButton
        onClick={() => {
          if (!text.trim()) {
            setError(t("today.closeDay.needWrite"));
            return;
          }
          const prev = todayEntry?.answers;
          store.saveJournalEntry({
            whatMovedToday: text.trim(),
            whatDistractedMe: prev?.whatDistractedMe ?? "",
            whatDidILearn: prev?.whatDidILearn ?? "",
            whatShouldBeEasierTomorrow: prev?.whatShouldBeEasierTomorrow ?? "",
            whatShouldBeHarderTomorrow: prev?.whatShouldBeHarderTomorrow ?? "",
            morningPages: prev?.morningPages ?? ""
          });
          const tomorrowText = tomorrow.trim();
          if (tomorrowText) {
            const tomorrowDate = addDaysToDate(today, 1);
            const targetGoalId = todayPlan?.goalId || selectActiveGoals(store)[0]?.id;
            store.createOrUpdateDayPlan(tomorrowDate, {
              dayType: "goal",
              goalId: targetGoalId,
              mainAction: tomorrowText,
              highlight: tomorrowText,
              status: "planned",
              planningCompleted: true
            });
          }
          setError("");
          setSaved(true);
          toast.show(t("toast.saved"));
        }}
      >
        {t("today.closeDay.save")}
      </PrimaryButton>
      <GhostButton
        className="w-full"
        onClick={() => {
          skipCloseDay(today);
          onSkip?.();
          toast.show(t("toast.daySkipped"));
        }}
      >
        {t("today.closeDay.skip")}
      </GhostButton>
      <GhostButton className="w-full" onClick={() => navigate(routes.journal)}>
        {t("today.closeDay.full")}
      </GhostButton>
      {toast.Toast()}
    </Card>
    </div>
  );
}

function ReEntryBanner({ onDismissedChange }: { onDismissedChange?: (dismissed: boolean) => void }) {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const season = store.activeSeason;
  const today = getTodayDateString();
  const todayPlan = selectTodayPlan(store);
  const isDone = todayPlan?.status === "completed";
  const todayEntry = store.journalEntries.find(
    (entry) => entry.seasonId === season?.id && entry.date === today
  );
  const hasReflection = !!todayEntry?.answers.whatMovedToday?.trim();
  const [dismissed, setDismissedState] = useState(() => isReentryDismissed(today));
  const [chipHidden, setChipHidden] = useState(() => isReentryChipHidden(today));
  const [logged, setLogged] = useState(() => isReentryAnswered(today));
  const [reentryNote, setReentryNote] = useState("");
  const setDismissed = (value: boolean) => {
    setDismissedState(value);
    onDismissedChange?.(value);
  };

  if (!season || isDone || hasReflection) return null;
  if (!shouldOfferReentry(store, season.startDate, today)) return null;

  const startMinutes = (minutes: number) => {
    store.startFocusSession("custom", minutes);
    navigate(routes.focus);
  };

  // After full banner dismiss: soft chip stays (unless user hides chip too)
  if (dismissed) {
    if (chipHidden) return null;
    return (
      <div className="flex items-center gap-2 rounded-full border border-monk-accent/25 bg-monk-accent-soft/30 px-3 py-2">
        <button
          type="button"
          className="min-h-11 flex-1 text-left text-sm font-semibold text-monk-accent"
          onClick={() => startMinutes(10)}
        >
          {t("today.reentry.chip")}
        </button>
        <GhostButton
          className="shrink-0 px-2 text-xs"
          onClick={() => {
            hideReentryChip(today);
            setChipHidden(true);
          }}
        >
          {t("today.reentry.chipDismiss")}
        </GhostButton>
      </div>
    );
  }

  const whyRaw = season.why?.identity || season.why?.consequenceOfInaction || "";
  const whyLine = whyRaw.length > 120 ? `${whyRaw.slice(0, 120)}…` : whyRaw;
  const planGoal = todayPlan?.goalId ? store.goals.find((g) => g.id === todayPlan.goalId) : undefined;
  const mitigation = planGoal?.obstacleMitigation?.trim() ?? "";
  const planB = mitigation ? parseIntention(mitigation) : null;
  const planBText =
    planB && planB.when && planB.action
      ? `${formatIntention(planB.when, planB.action)}.`
      : mitigation;
  const reentryTriggers = [
    "boredom",
    "stress",
    "fatigue",
    "loneliness",
    "trigger_app",
    "no_clear_plan",
    "other",
  ] as const;

  // Replay yesterday's own words so the diagnostic stays concrete, not shaming.
  const prevLog = logged ? undefined : getRelapseForDate(store, addDaysToDate(today, -1));
  const prevWords =
    prevLog && (prevLog.trigger || prevLog.note)
      ? [prevLog.trigger && t(`relapse.trigger.${prevLog.trigger}`), prevLog.note?.trim()]
          .filter(Boolean)
          .join(" — ")
      : null;

  // Log against YESTERDAY's plan so today stays "open" — answering a diagnostic is not a relapse.
  const saveLog = (trigger: RelapseLog["trigger"]) => {
    store.saveRelapseLog({ trigger, note: reentryNote.trim(), recoveryAction: "", date: addDaysToDate(today, -1) });
    markReentryAnswered(today);
    setLogged(true);
  };

  return (
    <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-4">
      <p className="text-sm font-semibold">{t("today.reentry.title")}</p>
      <p className="mt-1 text-sm text-monk-muted">{t("today.reentry.body")}</p>
      {prevWords ? (
        <p className="mt-1.5 text-xs leading-5 text-monk-muted/90">
          {t("today.reentry.previous", { trigger: prevWords })}
        </p>
      ) : null}
      {whyLine ? (
        <p className="mt-1.5 text-xs leading-5 text-monk-muted/90">{t("today.reentry.why", { why: whyLine })}</p>
      ) : null}
      {planBText ? (
        <p className="mt-1.5 text-xs leading-5 text-monk-muted/90">
          {t("today.reentry.planB", { text: planBText })}
        </p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SecondaryButton onClick={() => startMinutes(10)}>{t("today.reentry.ten")}</SecondaryButton>
        <SecondaryButton onClick={() => startMinutes(25)}>{t("today.reentry.twentyFive")}</SecondaryButton>
        <SecondaryButton
          onClick={() => {
            store.createOrUpdateDayPlan(today, { dayType: "rest" });
            navigate(routes.today);
          }}
        >
          {t("today.reentry.rest")}
        </SecondaryButton>
        <GhostButton
          onClick={() => {
            dismissReentry(today);
            setDismissed(true);
          }}
        >
          {t("today.reentry.dismiss")}
        </GhostButton>
      </div>
      <div className="mt-3">
        {logged ? (
          <p className="text-xs font-medium text-monk-success">{t("today.reentry.answered")}</p>
        ) : (
          <>
            <p className="text-xs text-monk-muted">{t("today.reentry.whatPulled")}</p>
            <Textarea
              className="mt-1.5 min-h-[64px]"
              placeholder={t("today.reentry.notePlaceholder")}
              value={reentryNote}
              onChange={(event) => setReentryNote(event.target.value)}
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {reentryTriggers.map((value) => (
                <ChoiceChip
                  key={value}
                  label={t(`relapse.trigger.${value}`)}
                  selected={false}
                  onClick={() => saveLog(value)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function Nmt2Banner({
  onOpenIntention,
  onDismissedChange
}: {
  onOpenIntention: () => void;
  onDismissedChange?: (dismissed: boolean) => void;
}) {
  const store = useMonkStore();
  const t = useT();
  const today = getTodayDateString();
  const [dismissed, setDismissed] = useState(() => isNmt2Dismissed(today));

  if (dismissed || !shouldWarnMissTwice(store, today)) return null;

  const dismiss = () => {
    dismissNmt2(today);
    setDismissed(true);
    onDismissedChange?.(true);
  };

  return (
    <Card className="border-monk-warning/25 bg-monk-warning-soft/30 p-4">
      <p className="text-sm font-semibold">{t("nmt2.title")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <PrimaryButton
          className="min-h-11 w-auto flex-1 rounded-full px-4 text-sm"
          onClick={() => {
            dismiss();
            onOpenIntention();
          }}
        >
          {t("nmt2.cta")}
        </PrimaryButton>
        <GhostButton onClick={dismiss}>{t("nmt2.dismiss")}</GhostButton>
      </div>
    </Card>
  );
}

export function TodayScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const toast = useCalmToast();
  const season = store.activeSeason!;
  const [today, setToday] = useState(() => getTodayDateString());

  useEffect(() => {
    const checkMidnight = () => {
      const fresh = getTodayDateString();
      if (fresh !== today) {
        setToday(fresh);
      }
    };
    const timer = setInterval(checkMidnight, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkMidnight();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [today]);

  const todayPlan = selectTodayPlan(store);
  const activeGoals = selectActiveGoals(store);
  const weeklyPlan = selectCurrentWeeklyPlan(store);

  const activeSession = store.focusSessions.find(
    (session) => session.dayPlanId === todayPlan?.id && ["running", "paused"].includes(session.status)
  );

  const todayEntry = store.journalEntries.find(
    (entry) => entry.seasonId === season.id && entry.date === today
  );
  const hasJournal = !!todayEntry;
  const hasMorningPages = !!todayEntry?.answers.morningPages?.trim();
  const learningSessions = selectTodayLearningSessions(store, today);
  const hasLearning = learningSessions.length > 0;
  const focusSeconds = selectTotalFocusSecondsForDate(store, today);
  const focusMinutes = Math.round(focusSeconds / 60);

  const [editingAction, setEditingAction] = useState(false);
  const [editTime, setEditTime] = useState("");
  const [editWhen, setEditWhen] = useState("");
  const [editAction, setEditAction] = useState("");
  const [closeDaySkipped, setCloseDaySkipped] = useState(() => isCloseDaySkipped(today));
  const [reentryDismissed, setReentryDismissed] = useState(() => isReentryDismissed(today));
  const [nmt2Dismissed, setNmt2Dismissed] = useState(() => isNmt2Dismissed(today));
  const nmt2Visible = !nmt2Dismissed && shouldWarnMissTwice(store, today);
  const [restDismissed, setRestDismissed] = useState(() => isRestSuggestionDismissed(today));
  const [coachTick, setCoachTick] = useState(0);
  const [undoPlan, setUndoPlan] = useState<null | {
    dayType: "goal" | "rest";
    goalId?: string;
    mainAction?: string;
    energyLevel?: EnergyLevel;
    status?: "active" | "completed" | "planned" | "missed";
  }>(null);
  const [blueprintGoalId, setBlueprintGoalId] = useState<string | null>(null);
  const [clarifyBannerDismissed, setClarifyBannerDismissed] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [weeklyReviewModalOpen, setWeeklyReviewModalOpen] = useState(false);
  const [planningModalOpen, setPlanningModalOpen] = useState(false);
  const [sixDaysBannerDismissed, setSixDaysBannerDismissed] = useState(false);
  /** Disclosure state for the focus card. Deliberately NOT persisted: a remembered
   *  open state would greet the user with the long card they collapsed yesterday,
   *  which is exactly the height this redesign removes. */
  const [cardDetailsOpen, setCardDetailsOpen] = useState(false);

  const savedReview = weeklyPlan ? store.weeklyReviews?.[weeklyPlan.id] : undefined;

  // Integrity fallback: if the weekly plan lost its allocations (legacy/orphan
  // data) but goals exist, render the goals directly so the user can always pick.
  //
  // `completedCount` is RECOMPUTED here from the session records rather than read
  // off the stored allocation. The stored field is only refreshed by the store
  // actions that mutate sessions, so it goes stale the moment state arrives by any
  // other path — hydration from localStorage, or a cross-device pull. Reading it
  // directly is how two finished deep work sessions still showed "0/2": the number
  // was a counter that nobody had incremented, not evidence. Deriving at render
  // makes the displayed progress and the underlying sessions impossible to
  // disagree, which is the whole point of the evidence model.
  //
  // Declared before its first reader (`sixDaysCompleted` below) — a `const` used
  // above its declaration would be a temporal dead zone error at render.
  const allocations = useMemo(() => {
    const base = weeklyPlan && weeklyPlan.goalAllocations.length > 0
      ? weeklyPlan.goalAllocations
      : activeGoals.map((goal) => ({ goalId: goal.id, targetCount: 1, completedCount: 0 }));
    if (!weeklyPlan) return base;
    const since = `${weeklyPlan.startDate}T00:00:00.000Z`;
    const until = `${weeklyPlan.endDate}T23:59:59.999Z`;
    return base.map((allocation) => ({
      ...allocation,
      completedCount: goalEvidence(store, allocation.goalId, { since, until }).length
    }));
  }, [weeklyPlan, activeGoals, store.focusSessions]);
  const sixDaysCompleted = useMemo(() => {
    if (!weeklyPlan) return false;
    const focusDone = allocations.reduce((s, a) => s + a.completedCount, 0);
    const targetFocus = allocations.reduce((s, a) => s + a.targetCount, 0) || 6;
    return focusDone >= targetFocus && targetFocus > 0;
  }, [weeklyPlan, allocations]);

  useEffect(() => {
    store.getOrCreateCurrentWeeklyPlan();
  }, []);

  useEffect(() => {
    // Daily intentional planning prompt on first open of the day
    const sessionKey = `zendo_planning_prompted_${today}`;
    if (todayPlan && todayPlan.dayType !== "rest" && !todayPlan.planningCompleted && !sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "true");
      setPlanningModalOpen(true);
    }
  }, [todayPlan, today]);

  useEffect(() => {
    setCloseDaySkipped(isCloseDaySkipped(today));
  }, [today]);

  useEffect(() => {
    if (!undoPlan) return;
    const timer = setTimeout(() => setUndoPlan(null), 8000);
    return () => clearTimeout(timer);
  }, [undoPlan]);

  const goal = todayPlan?.goalId ? store.goals.find((item) => item.id === todayPlan.goalId) : undefined;
  const unclarifiedGoal = activeGoals.find((g) => !g.why || !g.obstacle);
  const daysLeft = getDaysLeft(season.endDate);
  const isRest = todayPlan?.dayType === "rest";
  const isDone = todayPlan?.status === "completed";
  const hasReflection = !!todayEntry?.answers.whatMovedToday?.trim();
  const dayClosed = hasReflection || closeDaySkipped;
  // derivePrimaryCTA only distinguishes running/paused; narrow here so the wider
  // FocusSessionStatus union ("ended_early" | "abandoned") doesn't leak into it.
  const focusCTAStatus: "running" | "paused" | undefined =
    activeSession?.status === "running" || activeSession?.status === "paused"
      ? activeSession.status
      : undefined;
  const energy = selectEnergyForDate(store, today);
  // Reentry banner renders when: season active, plan not completed, no reflection, offerable, and not dismissed.
  const reentryVisible =
    !!season &&
    !!todayPlan &&
    todayPlan.status !== "completed" &&
    !hasReflection &&
    !reentryDismissed &&
    !isReentryAnswered(today) &&
    shouldOfferReentry(store, season.startDate, today);
  const dayPart = getDayPart();
  const showMorningNudge =
    !isRest &&
    !todayPlan?.mainAction &&
    (dayPart === "morning" || dayPart === "afternoon");
  const preferCloseDay =
    !!todayPlan &&
    !dayClosed &&
    (isDone || focusMinutes > 0);

  type TodayPrimaryKind =
    | "pick"
    | "resume"
    | "rest"
    | "held"
    | "close"
    | "morning"
    | "intention"
    | "focus";
  const hasIntention = !!(todayPlan?.mainAction?.trim());
  const primaryKind: TodayPrimaryKind = !todayPlan
    ? "pick"
    : activeSession
    ? "resume"
    : isRest
    ? "rest"
    : dayClosed && isDone
    ? "held"
    : !dayClosed && preferCloseDay
    ? "close"
    : !hasIntention
    ? "intention"
    : showMorningNudge
    ? "morning"
    : "focus";

  const statusLabel = !todayPlan
    ? t("today.status.open")
    : isDone
    ? t("today.status.done")
    : activeSession
    ? t("today.status.inSession")
    : isRest
    ? t("today.status.rest")
    : todayPlan.status === "partial"
    ? t("today.status.partial")
    : t("today.status.focus");

  const statusClass = isDone
    ? "border-monk-success/30 bg-monk-success-soft text-monk-success"
    : activeSession
    ? "border-monk-accent/40 bg-monk-accent-soft text-monk-accent"
    : isRest
    ? "border-monk-rest/30 bg-monk-rest-soft text-monk-rest"
    : todayPlan?.status === "partial"
    ? "border-monk-rest/40 bg-monk-rest-soft text-monk-rest"
    : "border-monk-border bg-monk-soft text-monk-muted";

  const coachStep = getCoachStep({
    seasonStartDate: season.startDate,
    seasonStatus: season.status,
    today,
    hasPlan: !!todayPlan,
    hasIntention: isRest || hasIntention,
    hasFocus: isRest || focusMinutes > 0 || isDone,
    dayClosed
  });
  void coachTick;

  type ActiveBannerKind = "nmt2" | "reentry" | "sixDays" | "restSuggestion" | "unclarifiedGoal" | "coach" | null;

  const activeBanner: ActiveBannerKind = useMemo(() => {
    if (nmt2Visible) return "nmt2";
    if (reentryVisible) return "reentry";
    if (sixDaysCompleted && !savedReview && !sixDaysBannerDismissed && !isRest) return "sixDays";
    if (!restDismissed && shouldSuggestRest(store, today) && !isRest) return "restSuggestion";
    if (unclarifiedGoal && !clarifyBannerDismissed) return "unclarifiedGoal";
    if (coachStep) return "coach";
    return null;
  }, [
    nmt2Visible,
    reentryVisible,
    sixDaysCompleted,
    savedReview,
    sixDaysBannerDismissed,
    isRest,
    restDismissed,
    store,
    today,
    unclarifiedGoal,
    clarifyBannerDismissed,
    coachStep,
  ]);

  const coachCta = () => {
    if (!coachStep) return;
    if (coachStep === "pickTheme") {
      document.querySelector(".today-primary-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (coachStep === "intention") {
      setEditingAction(true);
      document.querySelector(".today-primary-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (coachStep === "focus") {
      navigate(routes.focus);
      return;
    }
    if (coachStep === "close") {
      document.getElementById("today-close")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // Concept steps point at the thing the concept names, inside today's plan.
    if (coachStep === "highlight") {
      document.querySelector(".today-primary-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (coachStep === "mainAction") {
      setEditingAction(true);
      document.querySelector(".today-primary-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (coachStep === "agenda") {
      setPlanningModalOpen(true);
    }
  };

  return (
    <>
      <PageHeader
        title={t("today.title")}
        subtitle={`${t("today.seasonDay", { day: Math.min(season.durationDays, getDaysPassed(season.startDate, today)), total: season.durationDays })} · ${t("today.daysLeft", { n: daysLeft })}`}
        rightSlot={<SettingsLink onOpenPro={() => setProModalOpen(true)} />}
      />
      <div className="space-y-5">
        <WhyStrip compact={activeBanner !== null} />
        {activeBanner === "nmt2" ? (
          <Nmt2Banner
            onDismissedChange={setNmt2Dismissed}
            onOpenIntention={() => {
              setEditingAction(true);
              document.querySelector(".today-primary-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        ) : activeBanner === "reentry" ? (
          <ReEntryBanner onDismissedChange={setReentryDismissed} />
        ) : activeBanner === "sixDays" ? (
          <Card className="border-monk-accent/30 bg-monk-accent-soft/30 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-monk-accent/15 text-monk-accent">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-monk-text">{t("today.sixDaysCompleted.title")}</p>
                <p className="mt-1 text-xs text-monk-muted leading-relaxed">
                  {t("today.sixDaysCompleted.body")}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      store.createOrUpdateDayPlan(today, { dayType: "rest" });
                      setWeeklyReviewModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-monk-accent px-3.5 py-1.5 text-xs font-semibold text-monk-bg shadow-sm transition active:scale-95 hover:bg-monk-accent/90"
                  >
                    <Moon size={13} />
                    <span>{t("today.sixDaysCompleted.cta")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSixDaysBannerDismissed(true)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-monk-muted transition hover:text-monk-text"
                  >
                    {t("today.reentry.dismiss")}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ) : activeBanner === "restSuggestion" ? (
          <Card className="border-monk-rest/25 bg-monk-rest-soft/30 p-4">
            <p className="text-sm font-semibold">{t("today.restSuggestion.title")}</p>
            <p className="mt-1 text-sm text-monk-muted">{t("today.restSuggestion.body")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SecondaryButton
                onClick={() => {
                  store.createOrUpdateDayPlan(today, { dayType: "rest" });
                  setRestDismissed(true);
                }}
              >
                {t("today.restSuggestion.accept")}
              </SecondaryButton>
              <GhostButton
                onClick={() => {
                  dismissRestSuggestion(today);
                  setRestDismissed(true);
                }}
              >
                {t("today.restSuggestion.dismiss")}
              </GhostButton>
            </div>
          </Card>
        ) : activeBanner === "unclarifiedGoal" && unclarifiedGoal ? (
          <Card className="border-monk-accent/30 bg-monk-accent-soft/30 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-monk-accent/15 text-monk-accent">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-monk-text">{t("blueprint.clarifyPromptTitle")}</p>
                  <span className="rounded-md border border-monk-accent/30 bg-monk-surface/90 px-2 py-0.5 text-[10px] font-semibold text-monk-accent">
                    {unclarifiedGoal.title}
                  </span>
                </div>
                <p className="mt-1 text-xs text-monk-muted leading-relaxed">
                  {t("blueprint.clarifyPromptDesc")}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBlueprintGoalId(unclarifiedGoal.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-monk-accent px-3.5 py-1.5 text-xs font-semibold text-monk-bg shadow-sm transition active:scale-95 hover:bg-monk-accent/90"
                  >
                    <Sparkles size={13} />
                    <span>{t("blueprint.clarifyPromptCta")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClarifyBannerDismissed(true)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-monk-muted transition hover:text-monk-text"
                  >
                    {t("today.reentry.dismiss")}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ) : activeBanner === "coach" && coachStep ? (
          <CoachHint
            step={coachStep}
            onDismiss={() => {
              dismissCoachStep(coachStep);
              setCoachTick((n) => n + 1);
            }}
            onCta={coachCta}
          />
        ) : null}
        {!todayPlan ? (
          <div className="today-primary-anchor min-w-0 space-y-4">
            <FlowPickToday
              goals={activeGoals}
              onOpenBlueprint={(id) => setBlueprintGoalId(id)}
              onPickRest={() => setWeeklyReviewModalOpen(true)}
            />
          </div>
        ) : (
          <>
            <div className="space-y-5">
            <div className="min-w-0 space-y-5">
            <Card
              important
              id="today-primary"
              className={`today-primary-anchor relative overflow-hidden p-5 sm:p-6 transition-all duration-200 shadow-[inset_0_1px_0_rgb(var(--color-accent)/0.12)] ${
                isDone
                  ? "border-monk-success/35 bg-gradient-to-b from-monk-success-soft/25 via-monk-surface to-monk-surface"
                  : isRest
                    ? "border-monk-rest/25 bg-monk-surface"
                    : "border-monk-border/80 bg-gradient-to-b from-monk-surface via-monk-surface to-monk-raised/40"
              }`}
            >
              {!isDone && !isRest ? (
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-b from-monk-accent/[0.07] to-transparent"
                  aria-hidden
                />
              ) : null}

              {/* Top Navigation & Status */}
              <div className="relative flex items-center gap-2">
                <p className="min-w-0 truncate text-xs font-bold uppercase tracking-widest text-monk-muted">
                  {isRest ? t("today.restDay") : t("today.todaysFocus")}
                </p>
                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${statusClass}`}>
                  {isDone ? (
                    <Check size={12} strokeWidth={2.5} />
                  ) : activeSession ? (
                    <Timer size={12} strokeWidth={2} />
                  ) : isRest ? (
                    <Moon size={12} strokeWidth={2} />
                  ) : todayPlan?.status === "partial" ? (
                    <CircleDashed size={12} strokeWidth={2} />
                  ) : null}
                  <span>{statusLabel}</span>
                </span>
              </div>

              <span className="sr-only" aria-live="polite" id="today-status-live">
                {t("today.statusLive", { status: statusLabel })}
              </span>

              <div className="relative mt-3 min-w-0">
                {/* Goal Title — the card's headline. Larger and tighter than the
                    section labels below so the eye lands here first. */}
                <h2 className="text-xl font-semibold leading-tight tracking-[-0.015em] text-monk-text">
                  {isRest ? t("today.quietRecovery") : goal?.title ?? t("today.oneTheme")}
                </h2>

                {/* Identity Anchor (James Clear). The WHY is the deepest part of the
                    product, so it must never be *silently* cut: `truncate` used to
                    end it in an ellipsis and hide the reason the day exists. It now
                    clamps at two lines — long enough to read the sentence, short
                    enough that the hero still doesn't wrap three times. */}
                {!isRest && goal?.why ? (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed font-medium italic text-monk-accent/90">
                    {t("today.identityBecoming", { why: goal.why })}
                  </p>
                ) : null}
              </div>

              {/* Daily Highlight — the one thing the day was chosen for. It is a
                  separate field from the Main Action (DayPlan.highlight vs
                  DayPlan.mainAction) and is edited in Morning Planning, so it gets
                  its own labelled block here instead of being folded into the
                  action. Hidden while the action form is open to keep the edit
                  surface quiet. */}
              {!isRest && todayPlan.highlight?.trim() && !editingAction ? (
                <section aria-label={t("today.highlightLabel")} className="relative mt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-monk-muted">
                    {t("today.highlightLabel")}
                  </p>
                  <p className="mt-1 text-base font-semibold leading-relaxed text-monk-text">
                    {todayPlan.highlight}
                  </p>
                </section>
              ) : null}

              {/* Action Anchor Section — one flat block, not a card inside a card.
                  Hierarchy comes from type scale and a hairline rule, not from
                  another rounded border. */}
              <div className="relative mt-5 border-t border-monk-border/50 pt-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-monk-muted">
                      {isRest ? t("today.restNote") : t("today.actionHeading")}
                    </p>
                    {Boolean(
                      goal?.obstacleMitigation &&
                      todayPlan?.mainAction &&
                      todayPlan.mainAction.trim() === goal.obstacleMitigation.trim()
                    ) ? (
                      <span className="rounded-full border border-monk-warning/40 bg-monk-warning/15 px-2 py-0.5 text-xs font-bold text-monk-warning">
                        {t("today.planBActiveBadge")}
                      </span>
                    ) : null}
                  </div>
                  {!editingAction && !isRest ? (
                    <button
                      type="button"
                      className={focusLinkClass}
                      onClick={() => {
                        hapticPress("light");
                        // Prefill from the DAY's own action only (§22). Seeding the
                        // edit form with the goal's keystone meant opening "edit" on
                        // an empty day and saving committed the goal's default as
                        // though the user had written it themselves.
                        const initial = todayPlan.mainAction || "";
                        const parsed = parseIntention(initial);
                        setEditTime(parsed.time || "");
                        setEditWhen(parsed.when || "");
                        setEditAction(parsed.action || "");
                        setEditingAction(true);
                      }}
                    >
                      {t("today.edit")}
                    </button>
                  ) : null}
                </div>

                {editingAction ? (
                  <div className="mt-2 space-y-3 rounded-xl border border-monk-border bg-monk-surface/70 p-3.5">
                    <div>
                      <label htmlFor="today-time-input" className="mb-1.5 block text-xs font-semibold text-monk-text-soft">
                        {t("today.time")}
                      </label>
                      <input
                        type="time"
                        id="today-time-input"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="w-full rounded-xl border border-monk-border bg-monk-surface px-3 py-2 text-sm text-monk-text transition-colors focus:border-monk-accent focus:outline-none focus:ring-1 focus:ring-monk-accent/40"
                      />
                    </div>
                    <TextInput
                      label={t("today.when")}
                      value={editWhen}
                      onChange={(e) => setEditWhen(e.target.value)}
                      placeholder={t("today.whenPlaceholder")}
                    />
                    <p className="text-xs text-monk-muted">{t("today.whenHint")}</p>
                    <TextInput
                      label={t("today.iWill")}
                      value={editAction}
                      onChange={(e) => setEditAction(e.target.value)}
                      placeholder={t("today.actionPlaceholder")}
                    />
                    <div className="flex justify-end gap-3 pt-1">
                      <button
                        type="button"
                        className={focusLinkMutedClass}
                        onClick={() => setEditingAction(false)}
                      >
                        {t("today.cancel")}
                      </button>
                      <button
                        type="button"
                        className={focusLinkClass}
                        onClick={() => {
                          const formatted = formatIntention(editWhen, editAction, editTime).trim();
                          hapticPress("medium");
                          // This form edits ONLY the day's Main Action. It used to
                          // also write setTodayHighlight(editAction...), which
                          // silently overwrote the user's Daily Highlight with the
                          // action text. Highlight is a separate field, edited in
                          // Morning Planning.
                          store.setDayMainAction(today, formatted);
                          setEditingAction(false);
                          toast.show(t("toast.intentionSaved"));
                        }}
                      >
                        {t("today.save")}
                      </button>
                    </div>
                  </div>
                ) : isRest ? (
                  todayPlan.highlight ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-monk-muted">{t("today.restRenewal.chosenRest")}</p>
                      <p className="text-base font-bold leading-relaxed text-monk-text">
                        {todayPlan.highlight}
                      </p>
                    </div>
                  ) : (
                    <p className="text-base text-monk-muted leading-relaxed">
                      {t("today.rechargeNote")}
                    </p>
                  )
                ) : (() => {
                  // The Main Action renders as plain text: the scheduled clock
                  // time is deliberately NOT shown here. The action is the day's
                  // one commitment; a time pill next to it read as a deadline and
                  // pulled attention off the action itself. stripIntentionTime
                  // drops any leading "at HH:MM" / time marker so only the words
                  // the user wrote survive.
                  const shown = stripIntentionTime(todayPlan.mainAction || "").trim();
                  if (shown) {
                    return (
                      <p className="text-lg font-bold leading-relaxed text-monk-text tracking-[-0.01em]">
                        {shown}
                      </p>
                    );
                  }
                  if (goal?.keystoneAction) {
                    return (
                      <div className="space-y-2">
                        {/* Shown as a labelled SUGGESTION, not as the day's action
                            (§22). Rendering it in the same bold text as a real Main
                            Action made the goal's default indistinguishable from
                            something the user chose — and now that clearing the day
                            no longer writes the keystone, this is what an unset day
                            actually shows. The label keeps the provenance visible. */}
                        <div className="text-xs uppercase tracking-widest text-monk-text-soft font-mono">
                          {t("today.suggested")}
                        </div>
                        <p className="text-base text-monk-muted leading-relaxed">
                          {goal.keystoneAction}
                        </p>
                        <button
                          type="button"
                          className={focusLinkClass}
                          onClick={() => {
                            const parsed = parseIntention(goal.keystoneAction);
                            setEditTime(parsed.time || "");
                            setEditWhen(parsed.when || "");
                            setEditAction(parsed.action || "");
                            setEditingAction(true);
                          }}
                        >
                          {t("today.makeIntention")}
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      <p className="text-base text-monk-muted">{t("today.nameAction")}</p>
                      <button
                        type="button"
                        className={focusLinkClass}
                        onClick={() => {
                          setEditTime("");
                          setEditWhen("");
                          setEditAction("");
                          setEditingAction(true);
                        }}
                      >
                        {t("today.addIntention")}
                      </button>
                    </div>
                  );
                })()}

                {/* The one control that matters, full width so it reads as the
                    strongest thing on the card. Its label tracks the real state via
                    derivePrimaryCTA so it can never disagree with what the tap
                    does: on a running/paused session it says so, and once the day
                    is complete it stops inviting another. */}
                {!editingAction && !isRest ? (
                  (() => {
                    const primaryCTA = derivePrimaryCTA(focusCTAStatus, isDone);
                    const primaryLabel =
                      primaryCTA === "return"
                        ? t("today.primary.returnToFocus")
                        : primaryCTA === "resume"
                          ? t("today.primary.resumeFocus")
                          : primaryCTA === "completed"
                            ? t("today.primary.completed")
                            : t("today.completeCta");
                    return (
                      <button
                        type="button"
                        aria-label={isDone ? t("today.markIncomplete") : t("today.markComplete")}
                        aria-pressed={isDone}
                        className={`mt-2.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-monk border text-base font-bold transition-all duration-200 ease-monk active:scale-[0.975] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent focus-visible:ring-offset-2 focus-visible:ring-offset-monk-bg ${
                          isDone
                            ? "border-monk-success/40 bg-monk-success-soft text-monk-success"
                            : "monk-btn-primary border-transparent bg-monk-accent text-monk-bg"
                        }`}
                        onClick={() => {
                          unlockAudio();
                          const willBeCompleted = !isDone;
                          if (willBeCompleted) {
                            hapticPress("success");
                            playCompletionChime();
                            if (todayPlan?.highlight?.trim()) toast.show(t("today.highlightDone"));
                            else toast.show(t("today.mainActionDone"));
                          } else {
                            hapticPress("light");
                          }
                          store.toggleTodayCompletion();
                        }}
                      >
                        <Check size={18} strokeWidth={2.6} />
                        <span>{primaryLabel}</span>
                      </button>
                    );
                  })()
                ) : null}

                {/* Five-minute quick start. Lowering the activation cost is the
                    whole point: the research foundation's "just begin" principle —
                    a smaller first step gets the session started, and starting is
                    what the day actually needs. Deliberately a quiet secondary
                    control so the primary CTA stays the only dominant one. */}
                {!editingAction && !isRest && derivePrimaryCTA(focusCTAStatus, isDone) === "start" ? (
                  <button
                    type="button"
                    onClick={() => {
                      hapticPress("light");
                      store.startFocusSession("custom", 5);
                      navigate(routes.focus);
                    }}
                    className="mt-2.5 flex min-h-11 w-full flex-col items-start justify-center rounded-xl border border-monk-border px-3 py-1.5 text-left transition duration-150 ease-monk hover:bg-monk-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent/60"
                  >
                    <p className="text-sm font-semibold text-monk-text">{t("today.quickStart5")}</p>
                    <p className="text-xs text-monk-muted">{t("today.quickStartSub")}</p>
                  </button>
                ) : null}
              </div>

              {/* Everything below the fold of the day's one action. Always in the
                  DOM (so aria-controls resolves) but hidden until asked for. */}
              <div id="today-card-details" hidden={!cardDetailsOpen} className="mt-4">
                {goal ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-monk-text-soft transition duration-150 ease-monk hover:bg-monk-soft hover:text-monk-accent"
                      onClick={() => {
                        hapticPress("light");
                        setBlueprintGoalId(goal.id);
                      }}
                    >
                      <Sparkles size={14} className="shrink-0 text-monk-accent" />
                      <span>{t("blueprint.openButton")}</span>
                    </button>
                  </div>
                ) : null}
                {!isRest && goal?.desiredOutcome ? (
                  <p className="mb-3 line-clamp-2 text-sm text-monk-muted">
                    {t("today.outcomeLine", { outcome: goal.desiredOutcome })}
                  </p>
                ) : null}

                {/* Next-action prompt (§24). Shown once the day's Main Action is
                    completed, so the screen never goes quiet on a next step. It is
                    an invitation only: it creates nothing, and tapping it opens the
                    same edit form, prefilled from the day's own action (§22). */}
                {isDone && !isRest && !editingAction ? (
                  <div className="border-t border-monk-border/40 pt-3">
                    <p className="text-sm font-semibold leading-relaxed text-monk-text">
                      {t("today.nextActionPrompt")}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-monk-muted">
                      {t("today.primary.intentionBody")}
                    </p>
                    <button
                      type="button"
                      className={`mt-2 ${focusLinkClass}`}
                      onClick={() => {
                        hapticPress("light");
                        const initial = parseIntention(todayPlan.mainAction || "");
                        setEditTime(initial.time ?? "");
                        setEditWhen(initial.when);
                        setEditAction(initial.action);
                        setEditingAction(true);
                      }}
                    >
                      {t("today.addIntention")}
                    </button>
                  </div>
                ) : null}

                {/* 2-Minute Plan B Fallback Switcher (WOOP) */}
                {!isDone && !isRest && goal?.obstacleMitigation ? (() => {
                  const isPlanBActive = Boolean(
                    goal?.obstacleMitigation &&
                    todayPlan?.mainAction &&
                    todayPlan.mainAction.trim() === goal.obstacleMitigation.trim()
                  );
                  return (
                    <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-monk-warning/30 bg-monk-warning/10 px-3.5 py-2.5 transition">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-monk-text-soft">
                        <ShieldAlert size={14} className="shrink-0 text-monk-warning" />
                        <span aria-live="polite">
                          {t("today.planBLabel")}
                        </span>
                      </span>
                      {isPlanBActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            hapticPress("light");
                            store.createOrUpdateDayPlan(today, {
                              dayType: "goal",
                              goalId: todayPlan.goalId,
                              mainAction: goal.keystoneAction || ""
                            });
                          }}
                          className={focusLinkClass}
                        >
                          {t("today.planBSwitchBack")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            hapticPress("medium");
                            store.createOrUpdateDayPlan(today, {
                              dayType: "goal",
                              goalId: todayPlan.goalId,
                              mainAction: goal.obstacleMitigation || ""
                            });
                            toast.show(t("today.planBToast"));
                          }}
                          className="rounded-md text-sm font-semibold text-monk-warning transition hover:underline active:scale-95"
                        >
                          {t("today.planBActivate")}
                        </button>
                      )}
                    </div>
                  );
                })() : null}

                {/* Subtask checklist with 1-tap promotion to today's action.
                    Stays available on a completed day: finishing the Main Action
                    is not a reason to hide the rest of the work. */}
                {!isRest && goal ? (
                  <div className="mt-3">
                    <GoalTasksCard goal={goal} todayMainAction={todayPlan.mainAction} />
                  </div>
                ) : null}

                {!isDone ? (
                  <button
                    type="button"
                    className="mt-3 text-xs font-semibold text-monk-muted transition hover:text-monk-accent hover:underline"
                    onClick={() => {
                      if (!todayPlan) return;
                      const restoreStatus =
                        todayPlan.status === "completed" || todayPlan.status === "planned" || todayPlan.status === "missed"
                          ? todayPlan.status
                          : "active";
                      setUndoPlan({
                        dayType: todayPlan.dayType,
                        goalId: todayPlan.goalId,
                        mainAction: todayPlan.mainAction,
                        energyLevel: todayPlan.energyLevel,
                        status: restoreStatus,
                      });
                      store.clearDayPlan(today);
                    }}
                  >
                    {t("today.changeTheme")}
                  </button>
                ) : null}
              </div>

              {/* Bottom Meta & Progress Bar */}
              <div className="mt-4 border-t border-monk-border/40 pt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs leading-4 text-monk-muted">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span>{isRest ? t("today.protectRecovery") : t("today.stayWithOne")}</span>
                  {focusMinutes > 0 ? (
                    <span className="rounded-full border border-monk-border bg-monk-soft px-2 py-0.5 font-mono text-xs tabular-nums">
                      {t("today.focusMinutes", { n: focusMinutes })}
                    </span>
                  ) : null}
                  {hasLearning ? (
                    <span className="rounded-full border border-monk-border bg-monk-soft px-2 py-0.5 font-mono text-xs tabular-nums">
                      {t("today.learnCount", { n: learningSessions.length })}
                    </span>
                  ) : null}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {isDone ? (
                    <p className="flex items-center gap-1.5 font-semibold text-monk-success">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-monk-success" aria-hidden />
                      {t("today.movedQuiet")}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    aria-expanded={cardDetailsOpen}
                    aria-controls="today-card-details"
                    className="-mr-1 flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-bold uppercase tracking-wider text-monk-muted transition duration-150 ease-monk hover:bg-monk-soft hover:text-monk-accent"
                    onClick={() => {
                      hapticPress("light");
                      setCardDetailsOpen((open) => !open);
                    }}
                  >
                    <span>{t("today.detailsToggle")}</span>
                    <ChevronDown
                      size={14}
                      strokeWidth={2.4}
                      className={`transition-transform duration-200 ${cardDetailsOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </Card>

            {/* Primary zone — one CTA by day-part / state */}
            <div className="space-y-3">
              {primaryKind === "resume" && activeSession ? (
                <FocusSessionPanel
                  session={activeSession}
                  mainAction={todayPlan.mainAction}
                  compact
                  onOpenFocus={() => navigate(routes.focus)}
                />
              ) : null}

              {primaryKind === "held" ? (
                closeDaySkipped && !hasReflection ? (
                  <Card className="border-monk-border bg-monk-soft/50 p-5 text-center">
                    <p className="font-semibold text-monk-text">{t("today.closeDay.skippedTitle")}</p>
                    <p className="mt-1 text-sm text-monk-muted">{t("today.closeDay.skippedBody")}</p>
                  </Card>
                ) : (
                  <Card className="border-monk-success/30 bg-monk-success-soft/40 p-5 text-center">
                    <p className="font-semibold text-monk-success">{t("today.dayHeld")}</p>
                    {todayEntry?.answers?.whatMovedToday?.trim() ? (
                      <p className="mt-1 text-sm text-monk-muted">
                        {t("today.dayHeldEcho", { text: todayEntry.answers.whatMovedToday.trim() })}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-monk-muted">{t("today.dayHeldOptional")}</p>
                    )}
                  </Card>
                )
              ) : null}

              {primaryKind === "close" ? (
                <>
                  <CloseDayCard onSkip={() => setCloseDaySkipped(true)} />
                  {!isDone ? (
                    <div className="flex justify-center">
                      <GhostButton onClick={() => navigate(routes.focus)}>
                        {t("today.primary.continueFocus")}
                      </GhostButton>
                    </div>
                  ) : null}
                </>
              ) : null}

              {primaryKind === "rest" ? (
                <>
                  <FeelGoodRestCanvas onOpenWeeklyReview={() => setWeeklyReviewModalOpen(true)} />
                  {dayClosed ? (
                    closeDaySkipped && !hasReflection ? (
                      <Card className="border-monk-border bg-monk-soft/50 p-5 text-center">
                        <p className="font-semibold text-monk-text">{t("today.closeDay.skippedTitle")}</p>
                        <p className="mt-1 text-sm text-monk-muted">{t("today.closeDay.skippedBody")}</p>
                      </Card>
                    ) : (
                      <div className="rounded-2xl border border-monk-success bg-monk-success-soft px-4 py-2.5 text-center text-xs font-medium text-monk-success">
                        {t("today.restHeldLogged")}
                      </div>
                    )
                  ) : (
                    <CloseDayCard onSkip={() => setCloseDaySkipped(true)} />
                  )}
                </>
              ) : null}


              {primaryKind === "morning" ? (
                <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-4">
                  <p className="text-sm font-semibold">{t("today.nudge.morningTitle")}</p>
                  <p className="mt-1 text-sm text-monk-muted">{t("today.nudge.morningBody")}</p>
                  <div className="mt-3">
                    <PrimaryButton onClick={() => navigate(`${routes.journal}?tab=morning`)}>
                      {t("today.nudge.morningCta")}
                    </PrimaryButton>
                  </div>
                </Card>
              ) : null}

              {primaryKind === "intention" ? (
                <Card className="border-monk-accent/25 bg-monk-accent-soft/20 p-4">
                  <p className="text-sm font-semibold">{t("today.primary.intentionTitle")}</p>
                  <p className="mt-1 text-sm text-monk-muted">{t("today.primary.intentionBody")}</p>
                  <div className="mt-3">
                    <PrimaryButton
                      onClick={() => {
                        if (!editAction.trim()) {
                          const parsed = parseIntention(goal?.keystoneAction ?? "");
                          setEditTime(parsed.time || "");
                          setEditWhen(parsed.when || "");
                          setEditAction(parsed.action || "");
                        }
                        setEditingAction(true);
                      }}
                    >
                      {t("today.primary.intentionCta")}
                    </PrimaryButton>
                  </div>
                </Card>
              ) : null}

              {primaryKind === "focus" ? (
                <Card className="border-monk-border bg-monk-surface p-5">
                  <p className="text-sm font-semibold">{t("focus.title")}</p>
                  <p className="mt-1 text-sm text-monk-muted">{t("today.primary.focusHint")}</p>
                  {energy === "low" ? (
                    <div className="mt-2 rounded-xl border border-monk-danger/20 bg-monk-danger/5 px-3 py-3">
                      <p className="text-xs text-monk-danger">{t("today.lowEnergy")}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <PrimaryButton
                          onClick={() => {
                            unlockAudio();
                            saveLastFocus("custom", 10);
                            store.startFocusSession("custom", 10);
                            navigate(routes.focus);
                          }}
                        >
                          {t("today.energy.smallStep")}
                        </PrimaryButton>
                        <GhostButton
                          onClick={() => {
                            store.createOrUpdateDayPlan(today, { dayType: "rest" });
                            setCloseDaySkipped(false);
                          }}
                        >
                          {t("today.energy.restInstead")}
                        </GhostButton>
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-3 space-y-2">
                    {(() => {
                      const last = loadLastFocus();
                      if (last) {
                        return (
                          <>
                            <PrimaryButton
                              onClick={() => {
                                unlockAudio();
                                saveLastFocus(last.preset, last.customMinutes);
                                store.startFocusSession(last.preset, last.customMinutes);
                                navigate(routes.focus);
                              }}
                            >
                              {t("focus.beginWith", { label: getPresetLabel(last.preset, store.appSettings.language) })}
                            </PrimaryButton>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <GhostButton onClick={() => navigate(routes.focus)}>
                                {t("today.primary.chooseLength")}
                              </GhostButton>
                              <GhostButton
                                onClick={() => {
                                  unlockAudio();
                                  saveLastFocus("custom", 10);
                                  store.startFocusSession("custom", 10);
                                  navigate(routes.focus);
                                }}
                              >
                                {t("today.primary.quickTen")}
                              </GhostButton>
                            </div>
                          </>
                        );
                      }
                      return (
                        <>
                          <PrimaryButton onClick={() => navigate(routes.focus)}>
                            {t("today.primary.startFocus")}
                          </PrimaryButton>
                          <div className="flex justify-center">
                            <GhostButton
                              onClick={() => {
                                unlockAudio();
                                saveLastFocus("custom", 10);
                                store.startFocusSession("custom", 10);
                                navigate(routes.focus);
                              }}
                            >
                              {t("today.primary.quickTen")}
                            </GhostButton>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </Card>
              ) : null}

              {primaryKind === "focus" && showMorningNudge ? (
                <div className="flex justify-center">
                  <GhostButton className="gap-1.5" onClick={() => navigate(`${routes.journal}?tab=morning`)}>
                    <Sun size={14} className="text-monk-accent" />
                    {t("today.nudge.morningChip")}
                  </GhostButton>
                </div>
              ) : null}

              {energy && (primaryKind === "focus" || primaryKind === "intention") ? (
                <EnergyCheck
                  value={todayPlan.energyLevel}
                  onChange={(level) => {
                    store.updateTodayEnergy(level);
                    store.logEnergy(level);
                    toast.show(t("toast.energyLogged"));
                  }}
                  compact
                />
              ) : (
                <details className="group rounded-monk border border-monk-border bg-monk-surface transition-all duration-200 ease-monk hover:border-monk-border-strong open:border-monk-border-strong">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-monk-muted hover:text-monk-text marker:content-none [&::-webkit-details-marker]:hidden">
                    <span>{t("today.energyCheckTitle")}</span>
                    <ChevronRight size={16} className="shrink-0 transition-transform duration-200 group-open:rotate-90" />
                  </summary>
                  <EnergyCheck
                    value={todayPlan.energyLevel}
                    onChange={(level) => {
                      store.updateTodayEnergy(level);
                      store.logEnergy(level);
                      toast.show(t("toast.energyLogged"));
                    }}
                  />
                </details>
              )}
            </div>
            </div>
            <div className="min-w-0 space-y-5">
            {/* Secondary — collapsed */}
            <details className="group mt-5 rounded-monk border border-monk-border bg-monk-surface transition-all duration-200 ease-monk hover:border-monk-border-strong open:border-monk-border-strong">
              <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold text-monk-muted hover:text-monk-text marker:content-none [&::-webkit-details-marker]:hidden">
                <span>{t("today.moreForToday")}</span>
                <ChevronRight size={16} className="transition-transform duration-200 group-open:rotate-90" />
              </summary>
              <div className="space-y-3 border-t border-monk-border px-4 pb-4 pt-3">
                <DefenseChips compact />
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-monk-border bg-monk-soft px-3 py-2.5 text-left text-sm"
                  onClick={() => navigate(`${routes.journal}?tab=morning`)}
                >
                  <span className="flex items-center gap-2">
                    <Sun size={14} className="text-monk-accent" />
                    {t("today.check.morning")}
                  </span>
                  <span className="text-[11px] text-monk-muted">{hasMorningPages ? t("today.edit") : t("today.write")}</span>
                </button>
                {!isRest ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-monk-border bg-monk-soft px-3 py-2.5 text-left text-sm"
                    onClick={() => navigate(routes.learn)}
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen size={14} className="text-monk-accent" />
                      {t("today.check.learn")}
                    </span>
                    <span className="text-[11px] text-monk-muted">
                      {hasLearning ? t("today.logged", { n: learningSessions.length }) : t("today.add")}
                    </span>
                  </button>
                ) : null}
                {hasJournal && isDone ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-monk-border bg-monk-soft px-3 py-2.5 text-left text-sm"
                    onClick={() => navigate(routes.journal)}
                  >
                    <span>{t("today.editReflection")}</span>
                    <span className="text-[11px] text-monk-muted">{t("today.open")}</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-monk-border bg-monk-soft px-3 py-2.5 text-left text-sm text-monk-muted"
                  onClick={() => navigate(routes.relapse)}
                >
                  <span>{t("today.logDrift")}</span>
                  <span className="text-[11px]">→</span>
                </button>
              </div>
            </details>

            <PracticesCard />

            {!isRest ? (
              <details className="group rounded-monk border border-monk-border bg-monk-surface transition-all duration-200 ease-monk hover:border-monk-border-strong open:border-monk-border-strong">
                <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold text-monk-muted hover:text-monk-text marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <Clock size={15} className="text-monk-accent" />
                    <span>{t("today.agendaHeading")}</span>
                    {todayPlan.timeBlocks && todayPlan.timeBlocks.length > 0 ? (
                      <span className="rounded-full bg-monk-soft px-2 py-0.5 font-mono text-[11px] text-monk-accent">
                        {todayPlan.timeBlocks.length}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight size={16} className="transition-transform duration-200 group-open:rotate-90 text-monk-muted" />
                </summary>
                <div className="space-y-3 border-t border-monk-border p-4 pt-3">
                  <DayTimeBlockVisualizer
                    compact
                    date={today}
                    onOpenPlanning={() => setPlanningModalOpen(true)}
                  />
                </div>
              </details>
            ) : null}
            </div>
            </div>
          </>
        )}
      </div>
      {undoPlan ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-[60] flex justify-center px-6">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-monk-border-strong bg-monk-surface/95 px-4 py-2.5 text-sm font-medium text-monk-text shadow-calm backdrop-blur-md">
            <span>{t("toast.planCleared")}</span>
            <button
              type="button"
              className="font-bold text-monk-accent hover:underline"
              onClick={() => {
                store.createOrUpdateDayPlan(today, {
                  dayType: undoPlan.dayType,
                  goalId: undoPlan.goalId,
                  mainAction: undoPlan.mainAction,
                  energyLevel: undoPlan.energyLevel,
                  status: undoPlan.status,
                });
                setUndoPlan(null);
              }}
            >
              {t("toast.undo")}
            </button>
          </div>
        </div>
      ) : null}
      <GoalBlueprintModal
        goalId={blueprintGoalId}
        isOpen={!!blueprintGoalId}
        onClose={() => setBlueprintGoalId(null)}
      />
      <WeeklyReviewModal
        isOpen={weeklyReviewModalOpen}
        onClose={() => setWeeklyReviewModalOpen(false)}
        weeklyPlanId={weeklyPlan?.id}
      />
      <MorningPlanningModal
        isOpen={planningModalOpen}
        onClose={() => setPlanningModalOpen(false)}
        date={today}
      />
      <ZendoProModal isOpen={proModalOpen} onClose={() => setProModalOpen(false)} />
      {toast.Toast()}
    </>
  );
}

/** Anti-goals + obstacles from season — soft defenses. */
export function DefenseChips({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const season = useMonkStore((s) => s.activeSeason);
  const anti = (season?.antiGoals ?? []).filter(Boolean).slice(0, compact ? 2 : 4);
  const obs = (season?.obstacles ?? []).filter(Boolean).slice(0, compact ? 2 : 4);
  if (!anti.length && !obs.length) return null;
  return (
    <Card className="p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">
        {compact ? t("today.guardrails") : t("today.avoidWatch")}
      </p>
      {anti.length ? (
        <div className="mt-2">
          <p className="text-[11px] font-semibold text-monk-text-soft">{t("today.avoid")}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {anti.map((item) => (
              <span
                key={item}
                className="rounded-full border border-monk-danger/25 bg-monk-danger-soft/40 px-2.5 py-1 text-[11px] text-monk-danger"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {obs.length ? (
        <div className={anti.length ? "mt-3" : "mt-2"}>
          <p className="text-[11px] font-semibold text-monk-text-soft">{t("today.watchFor")}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {obs.map((item) => (
              <span
                key={item}
                className="rounded-full border border-monk-warning/30 bg-monk-warning-soft/40 px-2.5 py-1 text-[11px] text-monk-warning"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}


function FlowPickToday({
  goals,
  onOpenBlueprint,
  onPickRest
}: {
  goals: ReturnType<typeof selectActiveGoals>;
  onOpenBlueprint?: (goalId: string) => void;
  onPickRest?: () => void;
}) {
  const store = useMonkStore();
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const restUsed = store.dayPlans.some(
    (day) => day.weeklyPlanId === weeklyPlan?.id && day.dayType === "rest" && day.status !== "missed"
  );
  const t = useT();

  // Hooks must run unconditionally, before any early return — see the
  // `!weeklyPlan` bail-out below. Moving these past it changes the hook count
  // between renders and throws React error #310.
  const [selectedTrack, setSelectedTrack] = useState<string | "all">("all");
  const tracks = useMemo(() => {
    return Array.from(new Set(goals.map((g) => g.track).filter(Boolean))) as string[];
  }, [goals]);

  // Same evidence-derived progress as TodayScreen above: `completedCount` comes
  // from the completed sessions in this plan's window, never from the stored
  // allocation, so the goal cards cannot report a stale zero after hydration.
  const allocations = useMemo(() => {
    const base = weeklyPlan && weeklyPlan.goalAllocations.length > 0
      ? weeklyPlan.goalAllocations
      : goals.map((goal) => ({ goalId: goal.id, targetCount: 1, completedCount: 0 }));
    if (!weeklyPlan) return base;
    const since = `${weeklyPlan.startDate}T00:00:00.000Z`;
    const until = `${weeklyPlan.endDate}T23:59:59.999Z`;
    return base.map((allocation) => ({
      ...allocation,
      completedCount: goalEvidence(store, allocation.goalId, { since, until }).length
    }));
  }, [weeklyPlan, goals, store.focusSessions]);

  const ranked = useMemo(
    () =>
      allocations
        .map((allocation) => {
          const remaining = Math.max(0, allocation.targetCount - allocation.completedCount);
          return { allocation, remaining };
        })
        .sort((a, b) => b.remaining - a.remaining),
    [allocations]
  );

  const filteredRanked = useMemo(() => {
    if (selectedTrack === "all") return ranked;
    return ranked.filter(({ allocation }) => {
      const g = goals.find((item) => item.id === allocation.goalId);
      return g?.track === selectedTrack;
    });
  }, [ranked, goals, selectedTrack]);

  if (!weeklyPlan) {
    return (
      <EmptyState
        title={t("today.emptyTitle")}
        description={t("today.emptyBody")}
      />
    );
  }

  const maxRemaining = ranked[0]?.remaining ?? 0;

  return (
    <Card important>
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{t("today.pickHeading")}</p>
        {tracks.length > 0 ? (
          <span className="text-[10px] font-medium text-monk-muted">
            {t("today.trackCount", { n: tracks.length })}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm leading-6 text-monk-muted">{t("today.pickBody")}</p>

      {/* Goal Tracks Switcher */}
      {tracks.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setSelectedTrack("all")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 border ${
              selectedTrack === "all"
                ? "border-monk-accent bg-monk-accent/15 text-monk-accent"
                : "border-monk-border/60 bg-monk-soft/40 text-monk-muted hover:text-monk-text"
            }`}
          >
            {t("today.trackAll")}
          </button>
          {tracks.map((trk) => (
            <button
              key={trk}
              type="button"
              onClick={() => setSelectedTrack(trk)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 border ${
                selectedTrack === trk
                  ? "border-monk-accent bg-monk-accent/15 text-monk-accent"
                  : "border-monk-border/60 bg-monk-soft/40 text-monk-muted hover:text-monk-text"
              }`}
            >
              {trk}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {filteredRanked.map(({ allocation, remaining }) => {
          const goal = goals.find((item) => item.id === allocation.goalId);
          const progress = allocation.targetCount > 0
            ? Math.min(100, Math.round((allocation.completedCount / allocation.targetCount) * 100))
            : 0;
          const recommend = remaining > 0 && remaining === maxRemaining;
          const done = remaining === 0;
          const completedSubtasks = goal?.tasks ? goal.tasks.filter((t) => t.completed).length : 0;
          const totalSubtasks = goal?.tasks ? goal.tasks.length : 0;

          return (
            <div
              key={allocation.goalId}
              role="button"
              tabIndex={0}
              onClick={() => store.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal", goalId: allocation.goalId })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  store.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal", goalId: allocation.goalId });
                }
              }}
              className={`w-full cursor-pointer rounded-monk border p-4 text-left transition active:scale-[0.99] focus-visible:border-monk-accent ${
                recommend
                  ? "border-monk-accent/50 bg-monk-accent-soft/40"
                  : "border-monk-border bg-monk-surface hover:border-monk-border-strong"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{goal?.title ?? t("today.goalFallback")}</p>
                    {goal?.track ? (
                      <span className="rounded-md border border-monk-border/60 bg-monk-soft px-1.5 py-0.5 text-[9px] font-bold text-monk-muted">
                        {goal.track}
                      </span>
                    ) : null}
                    {recommend ? (
                      <span className="rounded-full border border-monk-accent/40 bg-monk-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-monk-accent">
                        {t("today.suggested")}
                      </span>
                    ) : null}
                    {done ? (
                      <span className="rounded-full border border-monk-success/30 bg-monk-success-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-monk-success">
                        {t("today.targetMet")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-monk-muted line-clamp-2">
                    {goal?.keystoneAction?.trim() || (remaining === 1 ? t("today.daysLeftWeek", { n: remaining }) : t("today.daysLeftWeekPlural", { n: remaining }))}
                  </p>
                  {totalSubtasks > 0 ? (
                    <p className="mt-1 text-[10px] font-medium text-monk-accent/80 flex items-center gap-1">
                      <span>{completedSubtasks}/{totalSubtasks} langkah selesai</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    title={t("blueprint.dialogTitle")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBlueprint?.(allocation.goalId);
                    }}
                    className="flex items-center gap-1 rounded-md border border-monk-border bg-monk-soft px-2 py-1 text-[10px] font-semibold text-monk-muted transition hover:border-monk-accent hover:text-monk-accent active:scale-95"
                  >
                    <Sparkles size={11} className="text-monk-accent" />
                    <span>{t("blueprint.openButton")}</span>
                  </button>
                  <span className="font-mono text-xs text-monk-muted tabular-nums">
                    {allocation.completedCount}/{allocation.targetCount}
                  </span>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-monk-soft">
                <div
                  className={`h-full rounded-full ${done ? "bg-monk-success" : "bg-monk-accent"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
        {!restUsed ? (
          <button
            type="button"
            onClick={() => {
              store.createOrUpdateDayPlan(getTodayDateString(), { dayType: "rest" });
              onPickRest?.();
            }}
            className="flex w-full items-start gap-3 rounded-monk border border-monk-border bg-monk-soft/60 p-4 text-left transition hover:border-monk-rest/40 active:scale-[0.99]"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-monk-surface text-monk-rest">
              <Moon size={16} strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold">{t("week.rest")}</p>
              <p className="mt-1 text-xs text-monk-muted">{t("today.restPickBody")}</p>
            </div>
          </button>
        ) : null}
      </div>
    </Card>
  );
}


