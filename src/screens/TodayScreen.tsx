import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, BookOpen, Check, ChevronRight, MoreHorizontal, Sun } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { useCalmToast } from "../components/ui";
import { getTodayDateString, addDaysToDate, getSeasonDayLabel, getDaysLeft } from "../lib/date";
import { CORE_VALUES } from "../constants/whyValues";
import { routes } from "../constants/routes";
import { FOCUS_PRESETS } from "../constants/focusPresets";
import { formatIntention, parseIntention } from "../lib/implementationIntention";
import { playZenBell, unlockAudio } from "../lib/audio";
import { loadLastFocus, saveLastFocus } from "../lib/storage";
import { getCoachStep, dismissCoachStep } from "../lib/coach";
import { isCloseDaySkipped, skipCloseDay, getDayPart, isReentryDismissed, dismissReentry, isReentryChipHidden, hideReentryChip, shouldOfferReentry, isReflectionThreadDismissed, dismissReflectionThread } from "../lib/dailyActivity";
import { isRestSuggestionDismissed, dismissRestSuggestion, shouldSuggestRest } from "../lib/restSuggestion";
import { selectTodayPlan, selectActiveGoals, selectCurrentWeeklyPlan, selectEnergyForDate, selectTodayLearningSessions, selectTotalFocusSecondsForDate } from "../store/selectors";
import {
  CalmDialog,
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
import { FocusSessionPanel, FocusSessionStarter } from "../screens/FocusSession";
import { CoachHint, PlanTomorrow, WeeklyStatusIndicators } from "./OnboardingSteps";
import { SeasonProgressCard, WhyEditor } from "../components/SeasonWidgets";
import { EnergyCheck, WhyStrip } from "./TodayScreen.components";
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
            const isRest = todayPlan?.dayType === "rest";
            if (isRest) {
              // Rest-day "tomorrow I will…" is an explicit resume action, so it
              // creates a GOAL day for tomorrow (not another rest day — the week
              // budget is 1 rest day, and a written action means intent to resume).
              const goalId = selectActiveGoals(store)[0]?.id;
              if (goalId) {
                store.createOrUpdateDayPlan(addDaysToDate(today, 1), {
                  dayType: "goal",
                  goalId,
                  mainAction: tomorrowText
                });
              }
              // ponytail: no active goal → skip tomorrow plan write; add freeform
              // tomorrow when the plan model allows text without a goal.
            } else if (todayPlan?.goalId) {
              store.createOrUpdateDayPlan(addDaysToDate(today, 1), {
                dayType: "goal",
                goalId: todayPlan.goalId,
                mainAction: tomorrowText
              });
            }
            // ponytail: no goalId → skip tomorrow plan write; add freeform tomorrow when plan model allows
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
  const [logged, setLogged] = useState(false);
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

  return (
    <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-4">
      <p className="text-sm font-semibold">{t("today.reentry.title")}</p>
      <p className="mt-1 text-sm text-monk-muted">{t("today.reentry.body")}</p>
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
          <p className="text-xs font-medium text-monk-success">{t("today.reentry.logged")}</p>
        ) : (
          <>
            <p className="text-xs text-monk-muted">{t("today.reentry.whatPulled")}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {reentryTriggers.map((value) => (
                <ChoiceChip
                  key={value}
                  label={t(`relapse.trigger.${value}`)}
                  selected={false}
                  onClick={() => {
                    store.saveRelapseLog({ trigger: value, note: "", recoveryAction: "" });
                    setLogged(true);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function ReflectionThreadHint() {
  const store = useMonkStore();
  const t = useT();
  const navigate = useNavigate();
  const season = store.activeSeason;
  const today = getTodayDateString();
  const yesterday = addDaysToDate(today, -1);
  const [dismissed, setDismissed] = useState(() => isReflectionThreadDismissed(today));
  const todayPlan = selectTodayPlan(store);

  if (!season || dismissed) return null;
  const yesterdayEntry = store.journalEntries.find(
    (entry) => entry.seasonId === season.id && entry.date === yesterday
  );
  const thread = yesterdayEntry?.answers.whatMovedToday?.trim();
  if (!thread || yesterday < season.startDate) return null;
  return (
    <Card className="border-monk-border bg-monk-soft/40 p-4">
      <p className="text-sm leading-5">{t("today.thread.title", { text: thread })}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <GhostButton
          onClick={() => {
            store.createOrUpdateDayPlan(today, {
              dayType: todayPlan?.dayType ?? "goal",
              goalId: todayPlan?.goalId,
              mainAction: todayPlan?.mainAction?.trim() ? todayPlan.mainAction : thread
            });
            setDismissed(true);
          }}
        >
          {t("today.thread.keep")}
        </GhostButton>
        <GhostButton
          onClick={() => {
            dismissReflectionThread(today);
            setDismissed(true);
          }}
        >
          {t("today.thread.dismiss")}
        </GhostButton>
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
  const today = getTodayDateString();
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
  const [restDismissed, setRestDismissed] = useState(() => isRestSuggestionDismissed(today));
  const [coachTick, setCoachTick] = useState(0);
  const [undoPlan, setUndoPlan] = useState<null | {
    dayType: "goal" | "rest";
    goalId?: string;
    mainAction?: string;
    energyLevel?: EnergyLevel;
    status?: "active" | "completed" | "planned" | "missed";
  }>(null);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseNote, setReleaseNote] = useState("");

  useEffect(() => {
    store.getOrCreateCurrentWeeklyPlan();
    store.getOrCreateCurrentWeeklyPlan();
  }, []);

  useEffect(() => {
    setCloseDaySkipped(isCloseDaySkipped(today));
  }, [today]);

  useEffect(() => {
    if (!undoPlan) return;
    const timer = setTimeout(() => setUndoPlan(null), 8000);
    return () => clearTimeout(timer);
  }, [undoPlan]);

  const goal = todayPlan?.goalId ? store.goals.find((item) => item.id === todayPlan.goalId) : undefined;
  const daysLeft = getDaysLeft(season.endDate);
  const isRest = todayPlan?.dayType === "rest";
  const isDone = todayPlan?.status === "completed";
  const hasReflection = !!todayEntry?.answers.whatMovedToday?.trim();
  const dayClosed = hasReflection || closeDaySkipped;
  const energy = selectEnergyForDate(store, today);
  // Reentry banner renders when: season active, plan not completed, no reflection, offerable, and not dismissed.
  const reentryVisible =
    !!season &&
    !!todayPlan &&
    todayPlan.status !== "completed" &&
    !hasReflection &&
    !reentryDismissed &&
    shouldOfferReentry(store, season.startDate, today);
  const dayPart = getDayPart();
  const allocation = todayPlan?.goalId && weeklyPlan
    ? weeklyPlan.goalAllocations.find((a) => a.goalId === todayPlan.goalId)
    : undefined;
  const showMorningNudge =
    dayPart === "morning" && !!todayPlan && !hasMorningPages && !dayClosed;
  const preferCloseDay =
    !!todayPlan &&
    !dayClosed &&
    (isDone || focusMinutes > 0 || (dayPart === "evening" && isRest));

  type TodayPrimaryKind =
    | "pick"
    | "resume"
    | "held"
    | "close"
    | "rest"
    | "morning"
    | "intention"
    | "focus";
  const hasIntention = !!(todayPlan?.mainAction?.trim());
  const primaryKind: TodayPrimaryKind = !todayPlan
    ? "pick"
    : activeSession
    ? "resume"
    : dayClosed && (isDone || isRest)
    ? "held"
    : !dayClosed && preferCloseDay
    ? "close"
    : isRest
    ? "rest"
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
    : "border-monk-border bg-monk-soft text-monk-muted";

  const checklist = todayPlan
    ? [
        { id: "morning", label: t("today.check.morning"), done: hasMorningPages, hide: false },
        { id: "focus", label: isRest ? t("today.check.restHeld") : t("today.check.focusDone"), done: isDone, hide: false },
        { id: "learn", label: t("today.check.learn"), done: hasLearning, hide: isRest },
        { id: "energy", label: t("today.check.energy"), done: !!energy, hide: false },
        { id: "reflect", label: t("today.check.reflect"), done: hasJournal && !!todayEntry?.answers.whatMovedToday?.trim(), hide: false }
      ].filter((item) => !item.hide)
    : [];
  const checklistDone = checklist.filter((c) => c.done).length;

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
    }
  };

  return (
    <>
      <PageHeader
        title={t("today.title")}
        subtitle={`${getSeasonDayLabel(season)} · ${t("today.daysLeft", { n: daysLeft })}`}
        rightSlot={<SettingsLink />}
      />
      <div className="space-y-5">
        <WhyStrip compact={reentryVisible} />
        <ReEntryBanner onDismissedChange={setReentryDismissed} />
        {!restDismissed && shouldSuggestRest(store, today) && !isRest ? (
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
        ) : null}
        {coachStep && !reentryVisible ? (
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
          <>
            <div className="today-primary-anchor space-y-5">
              <SeasonProgressCard />
              <FlowPickToday goals={activeGoals} />
            </div>
            <WeeklyStatusIndicators />
          </>
        ) : (
          <>
            <Card
              important
              id="today-primary"
              className={`today-primary-anchor relative overflow-hidden p-5 ${
                isDone ? "border-monk-success/30" : isRest ? "border-monk-rest/25" : ""
              }`}
            >
              {!isDone && !isRest ? (
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-b from-monk-accent/8 to-transparent"
                  aria-hidden
                />
              ) : null}
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-monk-muted">
                      {isRest ? t("today.restDay") : t("today.todaysFocus")}
                    </p>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
                      {statusLabel}
                    </span>
                    {!isRest && goal ? (
                      <button
                        type="button"
                        aria-label={t("release.triggerLabel")}
                        className="grid h-7 w-7 place-items-center rounded-full text-monk-muted transition hover:bg-monk-soft hover:text-monk-text active:scale-90"
                        onClick={() => {
                          setReleaseNote("");
                          setReleaseOpen(true);
                        }}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    ) : null}
                  </div>
                  <span className="sr-only" aria-live="polite" id="today-status-live">
                    {t("today.statusLive", { status: statusLabel })}
                  </span>
                  <h2 className="mt-2 text-3xl font-bold leading-9 tracking-tight">
                    {isRest ? t("today.quietRecovery") : goal?.title ?? t("today.oneTheme")}
                  </h2>
                  {!isRest && goal?.why ? (
                    <p className="mt-1 text-sm leading-5 text-monk-accent/90 line-clamp-2">
                      {t("today.because", { why: goal.why })}
                    </p>
                  ) : null}
                  {allocation ? (
                    <p className="mt-1 text-xs text-monk-muted">
                      {t("today.daysOnGoal", { done: allocation.completedCount, target: allocation.targetCount })}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-monk-muted">
                      {isRest ? t("today.protectRecovery") : t("today.stayWithOne")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={isDone ? t("today.markIncomplete") : t("today.markComplete")}
                  className={`flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${
                    isDone
                      ? "border-monk-success bg-monk-success text-monk-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_12px_-4px_rgba(100,123,94,0.5)]"
                      : "border-monk-border bg-monk-surface hover:border-monk-success text-monk-success shadow-sm"
                  }`}
                  onClick={() => {
                    unlockAudio();
                    const willBeCompleted = !isDone;
                    if (willBeCompleted) playZenBell();
                    store.toggleTodayCompletion();
                  }}
                >
                  {isDone ? <Check size={18} strokeWidth={2.5} /> : null}
                </button>
              </div>

              {!isRest && !isDone ? <ReflectionThreadHint /> : null}
              <div className="mt-5 rounded-xl border border-monk-border bg-monk-bg p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-monk-text-soft">
                    {isRest ? t("today.restNote") : t("today.oneAction")}
                  </p>
                  {!editingAction && !isRest && !isDone ? (
                    <button
                      type="button"
                      className="text-xs font-bold text-monk-accent hover:underline active:scale-95"
                      onClick={() => {
                        const initial = todayPlan.mainAction || goal?.keystoneAction || "";
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
                  <div className="mt-2 space-y-2">
                    <div>
                      <label htmlFor="today-time-input" className="mb-2 block text-sm font-medium text-monk-muted">
                        {t("today.time")}
                      </label>
                      <input
                        type="time"
                        id="today-time-input"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="w-full rounded-xl border border-monk-border bg-monk-surface px-4 py-3 text-sm text-monk-text transition-colors focus:border-monk-accent focus:outline-none focus:ring-1 focus:ring-monk-accent/40"
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
                        className="text-xs font-semibold text-monk-muted hover:underline"
                        onClick={() => setEditingAction(false)}
                      >
                        {t("today.cancel")}
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-monk-accent hover:underline"
                        onClick={() => {
                          const formatted = formatIntention(editWhen, editAction, editTime);
                          if (formatted.trim()) {
                            store.createOrUpdateDayPlan(today, {
                              dayType: "goal",
                              goalId: todayPlan.goalId,
                              mainAction: formatted.trim()
                            });
                            setEditingAction(false);
                            toast.show(t("toast.intentionSaved"));
                          }
                        }}
                      >
                        {t("today.save")}
                      </button>
                    </div>
                  </div>
                ) : isRest ? (
                  <p className="mt-1.5 text-sm font-semibold leading-5">
                    {t("today.rechargeNote")}
                  </p>
                ) : (() => {
                  const shown = parseIntention(todayPlan.mainAction || "");
                  if (shown.when && shown.action) {
                    return (
                      <div className="mt-1.5 space-y-1">
                        <p className="text-xs text-monk-muted">{t("today.whenShown", { when: shown.when })}</p>
                        <p className="text-sm font-semibold leading-5">{t("today.iWillShown", { action: shown.action })}</p>
                      </div>
                    );
                  }
                  if (todayPlan.mainAction) {
                    return (
                      <p className="mt-1.5 text-sm font-semibold leading-5">{todayPlan.mainAction}</p>
                    );
                  }
                  if (goal?.keystoneAction) {
                    return (
                      <div className="mt-1.5 space-y-2">
                        <p className="text-sm font-semibold leading-5 text-monk-text-soft">{goal.keystoneAction}</p>
                        <button
                          type="button"
                          className="text-xs font-bold text-monk-accent hover:underline"
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
                    <div className="mt-1.5 space-y-2">
                      <p className="text-sm text-monk-muted">{t("today.nameAction")}</p>
                      <button
                        type="button"
                        className="text-xs font-bold text-monk-accent hover:underline"
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
              </div>

              {(focusMinutes > 0 || hasLearning) ? (
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-monk-muted">
                  {focusMinutes > 0 ? (
                    <span className="rounded-full border border-monk-border-strong bg-monk-soft px-2.5 py-1 font-mono">
                      {t("today.focusMinutes", { n: focusMinutes })}
                    </span>
                  ) : null}
                  {hasLearning ? (
                    <span className="rounded-full border border-monk-border-strong bg-monk-soft px-2.5 py-1 font-mono">
                      {t("today.learnCount", { n: learningSessions.length })}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {isDone ? (
                <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-monk-success">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-monk-success" />
                  {t("today.movedQuiet")}
                </p>
              ) : (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-monk-text-soft hover:text-monk-accent hover:underline"
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
                </div>
              )}
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
                isRest ? (
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
                ) : closeDaySkipped && !hasReflection ? (
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
                  {!isDone && !isRest ? (
                    <div className="flex justify-center">
                      <GhostButton onClick={() => navigate(routes.focus)}>
                        {t("today.primary.continueFocus")}
                      </GhostButton>
                    </div>
                  ) : isRest ? (
                    <Card className="border-monk-rest/25 bg-monk-rest-soft/30 p-5">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-monk-surface text-monk-rest">
                          <Moon size={18} strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="font-semibold">{t("today.restPathTitle")}</p>
                          <p className="mt-1 text-sm leading-6 text-monk-muted">
                            {t("today.restPathBody")}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ) : null}
                </>
              ) : null}

              {primaryKind === "rest" ? (
                <>
                  <Card className="border-monk-rest/25 bg-monk-rest-soft/30 p-5">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-monk-surface text-monk-rest">
                        <Moon size={18} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-semibold">{t("today.restPathTitle")}</p>
                        <p className="mt-1 text-sm leading-6 text-monk-muted">
                          {t("today.restPathBody")}
                        </p>
                      </div>
                    </div>
                  </Card>
                  {!dayClosed ? (
                    <CloseDayCard onSkip={() => setCloseDaySkipped(true)} />
                  ) : null}
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
                              {t("focus.beginWith", { label: FOCUS_PRESETS[last.preset].shortLabel })}
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

            {checklist.length ? (
              <div role="list" aria-label={t("today.check.stripAria")} className="space-y-2">
                <div className="grid grid-cols-5 gap-1.5">
                  {checklist.map((item) => (
                    <span
                      key={item.id}
                      role="listitem"
                      title={`${item.label}: ${item.done ? t("today.checklistDone") : t("today.check.tap")}`}
                      aria-label={`${item.label}: ${item.done ? t("today.checklistDone") : t("today.check.tap")}`}
                      className={`block h-1.5 rounded-full ${item.done ? "bg-monk-success" : "bg-monk-border/40"}`}
                    />
                  ))}
                </div>
                <p className="text-[11px] font-medium text-monk-muted">
                  {t("today.checklistAria", { done: checklistDone, total: checklist.length })}
                </p>
              </div>
            ) : null}
            <SeasonProgressCard compact />
            <WeeklyStatusIndicators />
            <PlanTomorrow goals={activeGoals} />
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
      <CalmDialog
        open={releaseOpen}
        title={goal && !isRest ? t("release.title", { goal: goal.title }) : ""}
        description={t("release.body")}
        confirmLabel={t("release.confirm")}
        cancelLabel={t("release.cancel")}
        danger
        onConfirm={() => {
          if (!goal) return;
          store.releaseGoalFromSeason(goal.id, releaseNote);
          setReleaseOpen(false);
          setReleaseNote("");
          toast.show(t("release.done"));
        }}
        onCancel={() => {
          setReleaseOpen(false);
          setReleaseNote("");
        }}
      >
        <TextInput
          label={t("release.noteLabel")}
          placeholder={t("release.note")}
          value={releaseNote}
          onChange={(event) => setReleaseNote(event.target.value)}
        />
      </CalmDialog>
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


function FlowPickToday({ goals }: { goals: ReturnType<typeof selectActiveGoals> }) {
  const store = useMonkStore();
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const restUsed = store.dayPlans.some(
    (day) => day.weeklyPlanId === weeklyPlan?.id && day.dayType === "rest" && day.status !== "missed"
  );
  const t = useT();
  if (!weeklyPlan) {
    return (
      <EmptyState
        title="Shape this week."
        description="Six focus days. One rest day. Your weekly plan appears once a season is active."
      />
    );
  }

  const ranked = weeklyPlan.goalAllocations
    .map((allocation) => {
      const remaining = Math.max(0, allocation.targetCount - allocation.completedCount);
      return { allocation, remaining };
    })
    .sort((a, b) => b.remaining - a.remaining);
  const maxRemaining = ranked[0]?.remaining ?? 0;

  return (
    <Card important>
      <p className="font-semibold">{t("today.pickHeading")}</p>
      <p className="mt-2 text-sm leading-6 text-monk-muted">{t("today.pickBody")}</p>
      <div className="mt-5 space-y-3">
        {ranked.map(({ allocation, remaining }) => {
          const goal = goals.find((item) => item.id === allocation.goalId);
          const progress = allocation.targetCount > 0
            ? Math.min(100, Math.round((allocation.completedCount / allocation.targetCount) * 100))
            : 0;
          const recommend = remaining > 0 && remaining === maxRemaining;
          const done = remaining === 0;
          return (
            <button
              key={allocation.goalId}
              type="button"
              onClick={() => store.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal", goalId: allocation.goalId })}
              className={`w-full rounded-monk border p-4 text-left transition active:scale-[0.99] ${
                recommend
                  ? "border-monk-accent/50 bg-monk-accent-soft/40"
                  : "border-monk-border bg-monk-surface hover:border-monk-border-strong"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{goal?.title ?? t("today.goalFallback")}</p>
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
                </div>
                <span className="shrink-0 font-mono text-xs text-monk-muted tabular-nums">
                  {allocation.completedCount}/{allocation.targetCount}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-monk-soft">
                <div
                  className={`h-full rounded-full ${done ? "bg-monk-success" : "bg-monk-accent"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </button>
          );
        })}
        {!restUsed ? (
          <button
            type="button"
            onClick={() => store.createOrUpdateDayPlan(getTodayDateString(), { dayType: "rest" })}
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


