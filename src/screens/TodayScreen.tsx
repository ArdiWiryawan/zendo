import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, BookOpen, Check, ChevronRight, Sun } from "lucide-react";
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
import { isCloseDaySkipped, skipCloseDay, getDayPart, isReentryDismissed, dismissReentry, isReentryChipHidden, hideReentryChip, shouldOfferReentry } from "../lib/dailyActivity";
import { selectTodayPlan, selectActiveGoals, selectCurrentWeeklyPlan, selectEnergyForDate, selectTodayLearningSessions, selectTotalFocusSecondsForDate } from "../store/selectors";
import {
  Card,
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
      {saved ? <p className="text-xs font-medium text-monk-success">{t("today.closeDay.saved")}</p> : null}
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
              store.createOrUpdateDayPlan(addDaysToDate(today, 1), { dayType: "rest" });
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

function ReEntryBanner() {
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
  const [dismissed, setDismissed] = useState(() => isReentryDismissed(today));
  const [chipHidden, setChipHidden] = useState(() => isReentryChipHidden(today));

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

  return (
    <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-4">
      <p className="text-sm font-semibold">{t("today.reentry.title")}</p>
      <p className="mt-1 text-sm text-monk-muted">{t("today.reentry.body")}</p>
      {whyLine ? (
        <p className="mt-1.5 text-xs leading-5 text-monk-muted/90">{t("today.reentry.why", { why: whyLine })}</p>
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
  const [actionInput, setActionInput] = useState("");
  const [closeDaySkipped, setCloseDaySkipped] = useState(() => isCloseDaySkipped(today));
  const [coachTick, setCoachTick] = useState(0);
  const [undoPlan, setUndoPlan] = useState<null | {
    dayType: "goal" | "rest";
    goalId?: string;
    mainAction?: string;
    energyLevel?: EnergyLevel;
    status?: "active" | "completed" | "planned" | "missed";
  }>(null);

  useEffect(() => {
    if (todayPlan?.mainAction) {
      setActionInput(todayPlan.mainAction);
    }
  }, [todayPlan?.mainAction]);

  useEffect(() => {
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
    : showMorningNudge
    ? "morning"
    : !hasIntention
    ? "intention"
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
        <WhyStrip />
        <ReEntryBanner />
        {coachStep ? (
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
              className={`today-primary-anchor relative overflow-hidden ${
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
                    <p className="text-xs font-bold text-monk-muted uppercase tracking-widest">
                      {isRest ? t("today.restDay") : t("today.todaysFocus")}
                    </p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <h2 className="mt-2 text-2xl font-bold leading-8">
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
                      ? "border-monk-success bg-monk-success text-monk-bg"
                      : "border-monk-border bg-monk-surface hover:border-monk-success text-monk-success"
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

              {checklist.length ? (
                <div
                  className="mt-4 flex flex-wrap gap-1.5"
                  role="list"
                  aria-label={t("today.checklistAria", { done: checklistDone, total: checklist.length })}
                >
                  {checklist.map((item) => (
                    <span
                      key={item.id}
                      role="listitem"
                      aria-label={`${item.label}: ${item.done ? t("today.checklistDone") : t("today.checklistNotDone")}`}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                        item.done
                          ? "border-monk-success/30 bg-monk-success-soft text-monk-success"
                          : "border-monk-border/60 bg-monk-bg text-monk-text-soft"
                      }`}
                    >
                      {item.done ? "✓ " : ""}{item.label}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-monk-border bg-monk-bg p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-monk-text-soft">
                    {isRest ? t("today.restNote") : t("today.oneAction")}
                  </p>
                  {!editingAction && !isRest && !isDone ? (
                    <button
                      type="button"
                      className="text-xs font-bold text-monk-accent hover:underline"
                      onClick={() => {
                        setActionInput(todayPlan.mainAction || goal?.keystoneAction || "");
                        setEditingAction(true);
                      }}
                    >
                      {t("today.edit")}
                    </button>
                  ) : null}
                </div>

                {editingAction ? (
                  <div className="mt-2 space-y-2">
                    {(() => {
                      const parsed = parseIntention(actionInput);
                      return (
                        <>
                          <TextInput
                            label={t("today.when")}
                            value={parsed.when}
                            onChange={(e) => setActionInput(formatIntention(e.target.value, parsed.action))}
                            placeholder={t("today.whenPlaceholder")}
                            autoFocus
                          />
                          <TextInput
                            label={t("today.iWill")}
                            value={parsed.action}
                            onChange={(e) => setActionInput(formatIntention(parsed.when, e.target.value))}
                            placeholder={t("today.actionPlaceholder")}
                          />
                        </>
                      );
                    })()}
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
                          if (actionInput.trim()) {
                            store.createOrUpdateDayPlan(today, {
                              dayType: "goal",
                              goalId: todayPlan.goalId,
                              mainAction: actionInput.trim()
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
                            setActionInput(goal.keystoneAction);
                            setEditingAction(true);
                          }}
                        >
                          Make it today's intention
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div className="mt-1.5 space-y-2">
                      <p className="text-sm text-monk-muted">Name one action for today.</p>
                      <button
                        type="button"
                        className="text-xs font-bold text-monk-accent hover:underline"
                        onClick={() => {
                          setActionInput("");
                          setEditingAction(true);
                        }}
                      >
                        Add intention
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
                    <p className="mt-1 text-sm text-monk-muted">{t("today.dayHeldOptional")}</p>
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
                  <div className="mt-3 space-y-2">
                    <PrimaryButton onClick={() => navigate(`${routes.journal}?tab=morning`)}>
                      {t("today.nudge.morningCta")}
                    </PrimaryButton>
                    <div className="flex justify-center">
                      <GhostButton onClick={() => navigate(routes.focus)}>
                        {t("today.primary.skipToFocus")}
                      </GhostButton>
                    </div>
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
                        if (!actionInput.trim()) {
                          setActionInput(goal?.keystoneAction ?? "");
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
                <Card className="border-monk-border bg-monk-surface p-4">
                  <p className="text-sm font-semibold">{t("focus.title")}</p>
                  <p className="mt-1 text-sm text-monk-muted">{t("today.primary.focusHint")}</p>
                  {energy === "low" ? (
                    <div className="mt-2 rounded-xl border border-monk-danger/20 bg-monk-danger/5 px-3 py-2 text-xs text-monk-danger/80">
                      {t("today.lowEnergy")}
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

              <EnergyCheck
                value={todayPlan.energyLevel}
                onChange={(level) => {
                  store.updateTodayEnergy(level);
                  store.logEnergy(level);
                  toast.show(t("toast.energyLogged"));
                }}
              />
            </div>

            {/* Secondary — collapsed */}
            <details className="group rounded-monk border border-monk-border bg-monk-surface">
              <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-monk-muted hover:text-monk-text marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between">
                  {t("today.moreForToday")}
                  <ChevronRight size={14} className="transition group-open:rotate-90" />
                </span>
              </summary>
              <div className="space-y-3 border-t border-monk-border/50 px-4 pb-4 pt-3">
                <DefenseChips compact />
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-monk-border bg-monk-soft px-3 py-2.5 text-left text-sm"
                  onClick={() => navigate(routes.journal + (hasMorningPages ? "?tab=morning" : "?tab=morning"))}
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
                className="rounded-full border border-monk-danger/25 bg-monk-danger-soft/40 px-2.5 py-1 text-[11px] text-monk-danger/90"
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

/** Compact why reminder — Today. Empty state invites add. */
function WhyStrip() {
  const store = useMonkStore();
  const why = store.activeSeason?.why;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const hasWhy = !!(why?.identity || why?.consequenceOfInaction);

  if (editing) {
    return (
      <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-monk-accent">
          {hasWhy ? "Edit why" : "Add your why"}
        </p>
        <WhyEditor
          initial={why}
          onCancel={() => setEditing(false)}
          onSave={(next) => {
            store.updateSeasonWhy(next);
            setEditing(false);
            setOpen(true);
          }}
        />
      </Card>
    );
  }

  if (!hasWhy) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full rounded-monk border border-dashed border-monk-accent/30 bg-monk-accent-soft/20 px-4 py-3 text-left transition active:scale-[0.99]"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">Why you started</p>
        <p className="mt-1 text-sm text-monk-muted">Add your identity + what you lose if you stop.</p>
      </button>
    );
  }

  const line = why!.identity || why!.consequenceOfInaction;
  return (
    <div className="rounded-monk border border-monk-accent/20 bg-monk-accent-soft/40 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">Why you started</p>
            <p className={`mt-1 text-sm leading-5 text-monk-text ${open ? "" : "line-clamp-2"}`}>{line}</p>
            {open && why!.consequenceOfInaction && why!.identity ? (
              <p className="mt-2 text-xs leading-5 text-monk-muted">
                If you stop: {why!.consequenceOfInaction}
              </p>
            ) : null}
            {open && why!.protectValues?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {why!.protectValues.map((id) => {
                  const v = CORE_VALUES.find((c) => c.id === id);
                  return (
                    <span
                      key={id}
                      className="rounded-full border border-monk-border bg-monk-bg px-2 py-0.5 text-[10px] font-medium text-monk-muted"
                    >
                      {v?.label ?? id}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
          <ChevronRight
            size={14}
            className={`mt-1 shrink-0 text-monk-muted transition ${open ? "rotate-90" : ""}`}
          />
        </div>
      </button>
      {open ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 text-xs font-semibold text-monk-accent transition hover:opacity-80"
        >
          Edit why
        </button>
      ) : null}
    </div>
  );
}

function FlowPickToday({ goals }: { goals: ReturnType<typeof selectActiveGoals> }) {
  const store = useMonkStore();
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const restUsed = store.dayPlans.some(
    (day) => day.weeklyPlanId === weeklyPlan?.id && day.dayType === "rest" && day.status !== "missed"
  );
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
      <p className="font-semibold">Choose what deserves today.</p>
      <p className="mt-2 text-sm leading-6 text-monk-muted">One theme is enough. Prefer the goal still short on days.</p>
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
                    <p className="font-semibold">{goal?.title ?? "Focus goal"}</p>
                    {recommend ? (
                      <span className="rounded-full border border-monk-accent/40 bg-monk-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-monk-accent">
                        Suggested
                      </span>
                    ) : null}
                    {done ? (
                      <span className="rounded-full border border-monk-success/30 bg-monk-success-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-monk-success">
                        Target met
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-monk-muted line-clamp-2">
                    {goal?.keystoneAction?.trim() || `${remaining} day${remaining === 1 ? "" : "s"} left this week`}
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
              <p className="font-semibold">Rest</p>
              <p className="mt-1 text-xs text-monk-muted">One quiet day. Rest is part of the path.</p>
            </div>
          </button>
        ) : null}
      </div>
    </Card>
  );
}

function EnergyCheck({ value, onChange }: { value?: EnergyLevel; onChange: (value: EnergyLevel) => void }) {
  const store = useMonkStore();
  const today = getTodayDateString();
  const past7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - (6 - i));
    return getTodayDateString(d);
  });

  const labels: Record<EnergyLevel, string> = {
    low: "Low",
    medium: "Steady",
    high: "High"
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-sm">Energy</p>
          <p className="mt-0.5 text-xs text-monk-muted">How full is the tank today?</p>
        </div>
        {value ? (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            value === "high"
              ? "border-monk-success/30 bg-monk-success-soft text-monk-success"
              : value === "medium"
              ? "border-monk-accent/30 bg-monk-accent-soft text-monk-accent"
              : "border-monk-danger/30 bg-monk-danger-soft text-monk-danger"
          }`}>
            {labels[value]}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["low", "medium", "high"] as EnergyLevel[]).map((level) => {
          const selected = value === level;
          const tone =
            level === "high"
              ? selected
                ? "border-monk-success bg-monk-success-soft text-monk-success"
                : "border-monk-border text-monk-muted hover:border-monk-success/40"
              : level === "medium"
              ? selected
                ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                : "border-monk-border text-monk-muted hover:border-monk-accent/40"
              : selected
              ? "border-monk-danger bg-monk-danger-soft text-monk-danger"
              : "border-monk-border text-monk-muted hover:border-monk-danger/40";
          return (
            <button
              key={level}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(level)}
              className={`min-h-12 rounded-monk border text-sm font-semibold transition active:scale-95 ${tone}`}
            >
              {labels[level]}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-monk-muted">7-day trend</p>
        <div className="flex items-end gap-1.5" aria-label="Energy trend last 7 days">
          {past7.map((date) => {
            const log = store.energyLogs?.find((l) => l.date === date);
            const isToday = date === today;
            const h = log?.level === "high" ? "h-5" : log?.level === "medium" ? "h-3.5" : log?.level === "low" ? "h-2" : "h-1.5";
            const color = log?.level === "high"
              ? "bg-monk-success"
              : log?.level === "medium"
              ? "bg-monk-accent"
              : log?.level === "low"
              ? "bg-monk-danger"
              : "bg-monk-border/40";
            return (
              <span
                key={date}
                title={`${date}${log ? ` · ${log.level}` : ""}`}
                className={`inline-block w-full rounded-sm ${h} ${color} ${isToday ? "ring-1 ring-monk-accent/50" : ""}`}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}

