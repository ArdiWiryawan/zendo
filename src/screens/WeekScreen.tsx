import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Moon, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { getTodayDateString, datesInRange, formatHumanDate } from "../lib/date";
import { routes } from "../constants/routes";
import { DefenseChips } from "./TodayScreen";
import { selectTodayPlan, selectActiveGoals, selectCurrentWeeklyPlan, selectEnergyForDate, selectTotalFocusSecondsForDate } from "../store/selectors";
import { isRetroEligible } from "../lib/dailyActivity";
import { RetroLogModal } from "../components/RetroLogModal";
import {
  Card,
  EmptyState,
  GhostButton,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SettingsLink,
  TextInput,
} from "../components/ui";
import type { EnergyLevel, TimelineStatus } from "../types/app";

export function WeekScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const goals = selectActiveGoals(store);
  const today = getTodayDateString();
  const todayPlan = selectTodayPlan(store);
  const [retroDate, setRetroDate] = useState<string | null>(null);

  useEffect(() => {
    store.getOrCreateCurrentWeeklyPlan();
  }, []);

  const weekDates = useMemo(() => {
    return weeklyPlan ? datesInRange(weeklyPlan.startDate, 7) : [];
  }, [weeklyPlan?.startDate]);

  const stats = useMemo(() => {
    if (!weeklyPlan) return null;
    const plans = weekDates.map((date) => store.dayPlans.find((d) => d.date === date));
    const completed = plans.filter((p) => p?.status === "completed").length;
    const partial = plans.filter((p) => p?.status === "partial").length;
    const rest = plans.filter((p) => p?.dayType === "rest" || p?.status === "rest").length;
    const missed = plans.filter((p) => p?.status === "missed" || p?.status === "relapse").length;
    const unhandled = plans.filter((p, i) => !p && weekDates[i] < today).length;
    const targetFocus = weeklyPlan.goalAllocations.reduce((s, a) => s + a.targetCount, 0) || 6;
    const focusDone = weeklyPlan.goalAllocations.reduce((s, a) => s + a.completedCount, 0);
    const energyCounts = weekDates.reduce((acc, date) => {
      const lvl = selectEnergyForDate(store, date);
      if (lvl) acc[lvl] = (acc[lvl] ?? 0) + 1;
      return acc;
    }, {} as Record<EnergyLevel, number>);
    const energyTotal = Object.values(energyCounts).reduce((a, b) => a + b, 0);
    return { completed, partial, rest, missed, unhandled, targetFocus, focusDone, energyCounts, energyTotal };
  }, [weeklyPlan, weekDates, store.dayPlans, store.energyLogs]);

  const remainingDays = weekDates.filter((d) => d >= today).length;

  const focusMinutes = useMemo(() => {
    if (!weeklyPlan) return 0;
    return Math.round(
      weekDates.reduce((sum, date) => sum + selectTotalFocusSecondsForDate(store, date), 0) / 60
    );
  }, [weeklyPlan, weekDates, store.focusSessions]);

  const hasJournalThisWeek = useMemo(() => {
    if (!weeklyPlan) return false;
    const set = new Set(weekDates);
    return store.journalEntries.some((e) => set.has(e.date));
  }, [weeklyPlan, weekDates, store.journalEntries]);

  const showWeekWrap = !!weeklyPlan && !!stats && (
    stats.focusDone > 0 || stats.rest > 0 || stats.completed > 0 || stats.partial > 0 || hasJournalThisWeek
  );
  const heldDays = stats ? stats.completed + stats.partial + stats.rest : 0;
  const wrapWin = stats
    ? stats.focusDone > 0
      ? t("week.wrap.winFocus")
      : stats.rest > 0
      ? t("week.wrap.winRest")
      : t("week.wrap.winSoft")
    : "";

  return (
    <>
      <PageHeader
        title={weeklyPlan ? t("week.weekN", { n: weeklyPlan.weekNumber }) : t("week.title")}
        subtitle={
          weeklyPlan
            ? `${formatHumanDate(weeklyPlan.startDate)} – ${formatHumanDate(weeklyPlan.endDate)}`
            : t("week.defaultSubtitle")
        }
        rightSlot={<SettingsLink />}
      />
      <div className="space-y-5">
        {!weeklyPlan || !stats ? (
          <EmptyState
            title={t("week.emptyTitle")}
            description={t("week.emptyDesc")}
            actionLabel={t("week.openToday")}
            onAction={() => navigate(routes.today)}
          />
        ) : (
          <>
            <DefenseChips />
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <Card className="relative p-5 sm:p-6 bg-monk-surface/40 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_12px_rgba(0,0,0,0.3)] border-monk-border/40 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-monk-muted/80">{t("week.rhythm")}</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-monk-accent">
                      {stats.focusDone}
                      <span className="text-lg font-semibold text-monk-muted/70">/{stats.targetFocus}</span>
                    </p>
                    <p className="mt-1 text-xs text-monk-muted/90">{t("week.focusComplete")}</p>
                  </div>
                  <div className="text-right text-[11px] text-monk-muted/80 space-y-1">
                    {stats.rest > 0 ? <p className="flex items-center gap-1.5 justify-end"><span className="h-1.5 w-1.5 rounded-full bg-monk-rest/70" />{t("week.restCount", { n: stats.rest })}</p> : null}
                    {stats.partial > 0 ? <p className="flex items-center gap-1.5 justify-end"><span className="h-1.5 w-1.5 rounded-full bg-monk-accent/70" />{t("week.partialCount", { n: stats.partial })}</p> : null}
                    {stats.missed + stats.unhandled > 0 ? <p className="flex items-center gap-1.5 justify-end text-monk-warning"><span className="h-1.5 w-1.5 rounded-full bg-monk-warning/70" />{stats.missed > 0 ? t("week.missedCount", { n: stats.missed }) + " " : ""}{stats.unhandled > 0 ? t("week.openMissed", { n: stats.unhandled }) : ""}</p> : null}
                    <p className="text-monk-muted/60">{remainingDays === 1 ? t("week.daysLeft", { n: remainingDays }) : t("week.daysLeftPlural", { n: remainingDays })}</p>
                  </div>
                </div>

                <div className="mt-5 h-2 rounded-full bg-monk-surface/60 overflow-hidden shadow-inner" aria-hidden="true">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-monk-accent to-monk-accent/80 shadow-[0_0_8px_rgba(164,139,94,0.4)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.round((stats.focusDone / Math.max(1, stats.targetFocus)) * 100))}%` }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </Card>
            </motion.div>
            <Card className="overflow-hidden p-4 sm:p-5">
              {/* Mobile: 7×44px + ring-offset overflows card; shrink + inset ring */}
              <div
                className="flex min-w-0 items-stretch justify-between gap-0.5 sm:gap-1.5 px-0.5"
                role="list"
                aria-label={t("week.daysAria")}
              >
                {weekDates.map((date) => {
                  const dayPlan = store.dayPlans.find((d) => d.date === date);
                  const weekday = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
                  const dayNum = date.slice(8);
                  const isToday = date === today;
                  const isFuture = date > today;
                  const status = dayPlan?.status ?? "not_started";
                  const isCompleted = status === "completed";
                  const isPartial = status === "partial";
                  const isRest = dayPlan?.dayType === "rest" || status === "rest";
                  const isRelapse = status === "relapse";
                  const isMissed = status === "missed";
                  const isEligible = isRetroEligible(date, status as TimelineStatus, today);
                  const energyLevel = selectEnergyForDate(store, date);
                  const energyDot =
                    energyLevel === "high" ? "bg-monk-success" :
                    energyLevel === "medium" ? "bg-monk-accent" :
                    energyLevel === "low" ? "bg-monk-danger" : "bg-transparent";
                  const goalTitle = dayPlan?.goalId
                    ? goals.find((g) => g.id === dayPlan.goalId)?.title
                    : isRest ? t("week.rest") : undefined;
                  const statusWord = isCompleted
                    ? t("week.completed")
                    : isPartial
                    ? t("week.partial")
                    : isRest
                    ? t("week.rest")
                    : isMissed
                    ? t("week.missed")
                    : isRelapse
                    ? t("week.relapse")
                    : isFuture
                    ? t("week.upcoming")
                    : t("week.open");
                  const label = [
                    weekday,
                    dayNum,
                    isToday ? t("week.today") : "",
                    statusWord,
                    goalTitle ?? ""
                  ].filter(Boolean).join(", ");

                  const circleClass = isCompleted
                    ? "bg-monk-success/15 border-monk-success/50 text-monk-success"
                    : isPartial
                    ? "bg-monk-accent/15 border-monk-accent/40 text-monk-accent"
                    : isRest
                    ? "bg-monk-rest/15 border-monk-rest/40 text-monk-rest"
                    : isRelapse
                    ? "bg-monk-danger/10 border-monk-danger/40 text-monk-danger"
                    : isMissed
                    ? isEligible
                      ? "bg-monk-text-soft/5 border-dashed border-monk-accent/60 text-monk-text-soft/50"
                      : "bg-monk-text-soft/5 border-monk-text-soft/25 text-monk-text-soft/50"
                    : isEligible
                    ? "bg-monk-soft border-dashed border-monk-accent/60 text-monk-warning"
                    : isFuture
                    ? "bg-transparent border-monk-border/30 text-monk-text-soft/40"
                    : "bg-monk-soft border-monk-border text-monk-text-soft";

                  const DayInner = (
                    <>
                      <div className={`grid min-h-11 min-w-11 shrink-0 place-items-center ${isToday || isEligible ? "cursor-pointer" : ""}`}>
                        <div
                          className={`grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-full border-2 text-[10px] sm:text-[11px] font-mono font-bold transition-colors ${circleClass} ${
                            isToday ? "ring-2 ring-inset ring-monk-accent/70" : ""
                          }`}
                        >
                          {isCompleted ? (
                            <Check size={14} strokeWidth={2.5} />
                          ) : isRest ? (
                            <Moon size={12} strokeWidth={1.75} />
                          ) : (
                            <span className="flex flex-col items-center leading-none">
                              {dayNum}
                              {isToday || isEligible ? (
                                <Pencil size={7} strokeWidth={2.75} className="mt-0.5 text-monk-accent" aria-hidden="true" />
                              ) : null}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide ${
                        isToday ? "text-monk-accent" : "text-monk-text-soft/60"
                      }`}>
                        {weekday.slice(0, 2)}
                      </span>
                      {isToday ? (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-monk-accent">{t("week.today")}</span>
                      ) : null}
                      <span className={`h-1.5 w-1.5 rounded-full ${energyDot}`} aria-hidden="true" />
                    </>
                  );

                  if (isToday || isEligible) {
                    return (
                      <button
                        key={date}
                        type="button"
                        role="listitem"
                        aria-label={label + (isEligible ? t("timeline.tapToLog") : "")}
                        title={isEligible ? t("timeline.tapToLog") : undefined}
                        onClick={() => (isToday ? navigate(routes.today) : setRetroDate(date))}
                        className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1 transition active:scale-95"
                      >
                        {DayInner}
                      </button>
                    );
                  }

                  return (
                    <div key={date} role="listitem" aria-label={label} className="flex min-w-0 flex-1 flex-col items-center gap-1 py-1">
                      {DayInner}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-monk-text-soft/70">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-monk-success/80" />{t("week.legendDone")}</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-monk-accent/70" />{t("week.legendPartial")}</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-monk-rest/60" />{t("week.legendRest")}</span>
                <span className="flex items-center gap-1.5 text-monk-accent/80">
                  <Pencil size={10} strokeWidth={2.5} />
                  {t("week.tapHint")}
                </span>
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-monk-success" />
                  <span className="h-1.5 w-1.5 rounded-full bg-monk-accent" />
                  <span className="h-1.5 w-1.5 rounded-full bg-monk-danger" />
                  {t("week.legendEnergy")}
                </span>
              </div>
            </Card>

            <WeekReviewCard
              weeklyPlan={weeklyPlan}
              goals={goals}
              showWeekWrap={showWeekWrap}
              remainingDays={remainingDays}
              weekDates={weekDates}
              today={today}
            />

            {showWeekWrap ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card className="relative p-5 bg-monk-surface/30 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_2px_10px_rgba(0,0,0,0.25)] border-monk-border/30 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-monk-accent/[0.02] to-transparent pointer-events-none" />
                  <div className="relative">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-monk-muted/70">{t("week.wrap.title")}</p>
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-semibold text-monk-text/95">{t("week.wrap.focus", { n: focusMinutes })}</p>
                      <p className="text-sm text-monk-muted/90">{t("week.wrap.held", { n: heldDays })}</p>
                    </div>
                    {stats.focusDone === 0 && stats.rest > 0 ? (
                      <p className="mt-2 text-sm text-monk-muted/90">{t("week.softWin.held")}</p>
                    ) : null}
                    <p className="mt-3 text-sm text-monk-accent/90 font-medium">{wrapWin}</p>
                    {stats.partial > 0 || (stats.focusDone === 0 && stats.rest > 0) ? (
                      <p className="mt-1 text-xs text-monk-muted/90">{t("week.softWin.body")}</p>
                    ) : null}
                  </div>
                </Card>
              </motion.div>
            ) : null}

            {!todayPlan ? (
              <Card className="p-4 border-monk-accent/30 bg-monk-accent-soft/40">
                <p className="text-sm font-semibold">{t("week.todayOpenTitle")}</p>
                <p className="mt-1 text-xs text-monk-muted">{t("week.todayOpenBody")}</p>
                <PrimaryButton className="mt-4" onClick={() => navigate(routes.today)}>
                  {t("week.planToday")}
                </PrimaryButton>
              </Card>
            ) : null}

            {stats.energyTotal > 0 ? (
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-monk-muted">{t("week.energyTitle")}</p>
                  <span className="text-xs text-monk-muted">{t("week.energyLogged", { n: stats.energyTotal })}</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-monk-soft">
                  {(["high", "medium", "low"] as EnergyLevel[]).map((lvl) => {
                    const n = stats.energyCounts[lvl] ?? 0;
                    if (!n) return null;
                    const color = lvl === "high" ? "bg-monk-success" : lvl === "medium" ? "bg-monk-accent" : "bg-monk-danger";
                    return (
                      <div
                        key={lvl}
                        className={color}
                        style={{ width: `${(n / stats.energyTotal) * 100}%` }}
                        title={`${n} ${lvl}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-monk-muted">
                  {(["high", "medium", "low"] as EnergyLevel[]).map((lvl) =>
                    stats.energyCounts[lvl] ? (
                      <span key={lvl} className="capitalize">{lvl} {t("week.energyDay", { n: stats.energyCounts[lvl] })}</span>
                    ) : null
                  )}
                </div>
              </Card>
            ) : null}

            <div>
              <SectionHeader title={t("week.goalsTitle")} subtitle={t("week.goalsSubtitle")} />
              <div className="space-y-3">
                {weeklyPlan.goalAllocations.map((allocation, index) => {
                  const goal = goals.find((item) => item.id === allocation.goalId);
                  const progress = allocation.targetCount > 0
                    ? Math.min(100, Math.round((allocation.completedCount / allocation.targetCount) * 100))
                    : 0;
                  const complete = allocation.completedCount >= allocation.targetCount;
                  const remaining = Math.max(0, allocation.targetCount - allocation.completedCount);
                  const behind = !complete && remaining > remainingDays;

                  return (
                    <motion.div key={allocation.goalId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
                    <Card className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{goal?.title ?? t("week.goalFallback")}</p>
                          {goal?.why ? (
                            <p className="mt-1 text-xs text-monk-accent/90 line-clamp-2">{t("week.because", { why: goal.why })}</p>
                          ) : null}
                          {goal?.keystoneAction ? (
                            <p className="mt-1 text-xs text-monk-muted line-clamp-2">{goal.keystoneAction}</p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`font-mono text-sm tabular-nums font-bold ${complete ? "text-monk-success" : behind ? "text-monk-warning" : progress > 0 ? "text-monk-accent" : "text-monk-muted"}`}>
                            {allocation.completedCount}
                            <span className="font-semibold text-monk-muted/70">/{allocation.targetCount}</span>
                          </p>
                          {progress > 0 ? (
                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-monk-muted/80">
                              {complete ? t("week.statusMet") : behind ? t("week.statusBehind") : t("week.statusProgress")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-monk-soft">
                        <div
                          className={`h-full rounded-full transition-all ${
                            complete ? "bg-monk-success" : behind ? "bg-monk-warning" : "bg-monk-accent"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {goal ? <GoalWhyInline goalId={goal.id} why={goal.why} /> : null}
                    </Card>
                    </motion.div>
                  );
                })}

                <Card className="bg-monk-soft/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-monk-surface text-monk-rest">
                      <Moon size={16} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t("week.restDay")}</p>
                      <p className="mt-0.5 text-xs text-monk-muted">
                        {stats.rest > 0 ? t("week.restTaken") : t("week.restOpen")}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <WeeklyReviewCard
              weeklyPlan={weeklyPlan}
              goals={goals}
              stats={stats}
              remainingDays={remainingDays}
              weekDates={weekDates}
              today={today}
            />
          </>
        )}
      </div>
      <RetroLogModal open={!!retroDate} date={retroDate} onClose={() => setRetroDate(null)} />
    </>
  );
}

type WeekReviewDecision = {
  action: "continue" | "adjust" | "release";
  mainAction?: string;
};

function WeekReviewCard({
  weeklyPlan,
  goals,
  showWeekWrap,
  remainingDays,
  weekDates,
  today
}: {
  weeklyPlan: NonNullable<ReturnType<typeof selectCurrentWeeklyPlan>>;
  goals: ReturnType<typeof selectActiveGoals>;
  showWeekWrap: boolean;
  remainingDays: number;
  weekDates: string[];
  today: string;
}) {
  const t = useT();
  const reviewWeek = useMonkStore((s) => s.reviewWeek);
  const skipWeekReview = useMonkStore((s) => s.skipWeekReview);
  const savedReview = useMonkStore((s) => s.weeklyReviews?.[weeklyPlan.id]);
  const [decisions, setDecisions] = useState<Record<string, WeekReviewDecision>>({});

  const weekEnded = remainingDays === 0 || weekDates[weekDates.length - 1] < today;
  const shouldShow = showWeekWrap || weekEnded;
  if (!shouldShow) return null;

  const setAction = (goalId: string, action: WeekReviewDecision["action"]) => {
    setDecisions((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], action, mainAction: prev[goalId]?.mainAction }
    }));
  };
  const setMainAction = (goalId: string, mainAction: string) => {
    setDecisions((prev) => ({
      ...prev,
      [goalId]: { action: "adjust", mainAction }
    }));
  };

  const submit = () => {
    reviewWeek(weeklyPlan.id, decisions);
  };

  const counts = {
    cont: Object.values(decisions).filter((d) => d.action === "continue").length,
    adj: Object.values(decisions).filter((d) => d.action === "adjust").length,
    rel: Object.values(decisions).filter((d) => d.action === "release").length
  };

  if (savedReview) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-monk-muted/80">{t("week.review.title")}</p>
          {savedReview.skipped ? (
            <p className="mt-2 text-sm text-monk-muted">{t("week.review.skip")}</p>
          ) : (
            <p className="mt-2 text-sm text-monk-accent/90 font-medium">
              {t("week.review.summary", {
                cont: savedReview.decisions ? Object.values(savedReview.decisions).filter((d) => d.action === "continue").length : 0,
                adj: savedReview.decisions ? Object.values(savedReview.decisions).filter((d) => d.action === "adjust").length : 0,
                rel: savedReview.decisions ? Object.values(savedReview.decisions).filter((d) => d.action === "release").length : 0
              })}
            </p>
          )}
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
      <Card className="relative p-5 bg-monk-surface/30 border-monk-accent/20">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-monk-accent">{t("week.review.title")}</p>
        <p className="mt-2 text-sm font-semibold text-monk-text">{t("week.review.decideTitle")}</p>
        <p className="mt-1 text-xs text-monk-muted">{t("week.review.decideBody")}</p>

        <div className="mt-4 space-y-3">
          {weeklyPlan.goalAllocations.map((allocation) => {
            const goal = goals.find((g) => g.id === allocation.goalId);
            const decision = decisions[allocation.goalId] ?? { action: "continue" as const };
            const adjusting = decision.action === "adjust";
            return (
              <div key={allocation.goalId} className="rounded-xl border border-monk-border/50 bg-monk-bg/40 p-3">
                <p className="text-sm font-semibold">{goal?.title ?? t("week.goalFallback")}</p>
                {decision.action === "release" ? (
                  <p className="mt-1 text-xs text-monk-muted">{t("week.review.releaseNote")}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <ChoiceButton
                    active={decision.action === "continue"}
                    tone="success"
                    onClick={() => setAction(allocation.goalId, "continue")}
                    label={t("week.review.continue")}
                  />
                  <ChoiceButton
                    active={decision.action === "adjust"}
                    tone="accent"
                    onClick={() => setAction(allocation.goalId, "adjust")}
                    label={t("week.review.adjust")}
                  />
                  <ChoiceButton
                    active={decision.action === "release"}
                    tone="muted"
                    onClick={() => setAction(allocation.goalId, "release")}
                    label={t("week.review.release")}
                  />
                </div>
                {adjusting ? (
                  <div className="mt-3 space-y-2 border-t border-monk-border/40 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-monk-muted">{t("week.review.adjustHint")}</p>
                    <TextInput
                      label={t("week.review.actionLabel")}
                      value={decision.mainAction ?? goal?.keystoneAction ?? ""}
                      onChange={(e) => setMainAction(allocation.goalId, e.target.value)}
                      placeholder={t("week.review.actionPlaceholder")}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-monk-muted">
          {t("week.review.summary", { cont: counts.cont, adj: counts.adj, rel: counts.rel })}
        </p>
        <div className="mt-3 flex gap-2">
          <GhostButton className="flex-1 min-h-9 text-xs" onClick={() => skipWeekReview(weeklyPlan.id)}>
            {t("week.review.skip")}
          </GhostButton>
          <PrimaryButton className="flex-1 min-h-9 text-xs" onClick={submit}>
            {t("week.review.done")}
          </PrimaryButton>
        </div>
      </Card>
    </motion.div>
  );
}

function ChoiceButton({
  active,
  tone,
  onClick,
  label
}: {
  active: boolean;
  tone: "success" | "accent" | "muted";
  onClick: () => void;
  label: string;
}) {
  const activeClass =
    tone === "success"
      ? "bg-monk-success/15 border-monk-success/50 text-monk-success"
      : tone === "accent"
      ? "bg-monk-accent/15 border-monk-accent/50 text-monk-accent"
      : "bg-monk-soft/60 border-monk-border/60 text-monk-text-soft/80";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
        active ? activeClass : "border-monk-border/40 text-monk-muted hover:border-monk-border"
      }`}
    >
      {label}
    </button>
  );
}

function GoalWhyInline({ goalId, why }: { goalId: string; why?: string }) {
  const updateGoalWhy = useMonkStore((s) => s.updateGoalWhy);
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(why ?? "");

  if (editing) {
    return (
      <div className="mt-3 space-y-2 border-t border-monk-border/40 pt-3">
        <TextInput
          label={t("week.whyLabel")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("week.whyPlaceholder")}
        />
        <div className="flex gap-2">
          <GhostButton className="flex-1 min-h-9 text-xs" onClick={() => setEditing(false)}>
            {t("week.cancel")}
          </GhostButton>
          <PrimaryButton
            className="flex-1 min-h-9 text-xs"
            onClick={() => {
              updateGoalWhy(goalId, draft);
              setEditing(false);
            }}
          >
            {t("week.save")}
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(why ?? "");
        setEditing(true);
      }}
      className="mt-2 text-[11px] font-semibold text-monk-accent hover:underline"
    >
      {why ? t("week.editGoalWhy") : t("week.addGoalWhy")}
    </button>
  );
}

function WeeklyReviewCard({
  weeklyPlan,
  goals,
  stats,
  remainingDays,
  weekDates,
  today
}: {
  weeklyPlan: NonNullable<ReturnType<typeof selectCurrentWeeklyPlan>>;
  goals: ReturnType<typeof selectActiveGoals>;
  stats: {
    completed: number;
    partial: number;
    rest: number;
    missed: number;
    unhandled: number;
    targetFocus: number;
    focusDone: number;
  };
  remainingDays: number;
  weekDates: string[];
  today: string;
}) {
  const navigate = useNavigate();
  const t = useT();
  const why = useMonkStore((s) => s.activeSeason?.why);
  const weekEnded = remainingDays === 0 || weekDates[weekDates.length - 1] < today;
  const lateWeek = remainingDays <= 1 || weekEnded;

  if (!lateWeek) return null;

  const starved = weeklyPlan.goalAllocations
    .map((a) => {
      const goal = goals.find((g) => g.id === a.goalId);
      return { goal, remaining: Math.max(0, a.targetCount - a.completedCount), done: a.completedCount, target: a.targetCount };
    })
    .filter((x) => x.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  const hitRate = stats.targetFocus > 0 ? Math.round((stats.focusDone / stats.targetFocus) * 100) : 0;

  return (
    <Card className="border-monk-accent/25 bg-monk-accent-soft/20 p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">
        {weekEnded ? t("week.review.title") : t("week.review.almost")}
      </p>
      <p className="mt-2 text-sm font-semibold text-monk-text">
        {t("week.review.focusDays", { done: stats.focusDone, target: stats.targetFocus, hit: hitRate })}
      </p>
      {stats.missed > 0 ? (
        <p className="mt-1 text-xs text-monk-muted">{t("week.review.missed", { n: stats.missed })}</p>
      ) : (
        <p className="mt-1 text-xs text-monk-muted">{t("week.review.steady")}</p>
      )}

      {starved.length ? (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-monk-muted">{t("week.review.needs")}</p>
          <ul className="mt-2 space-y-1.5">
            {starved.slice(0, 3).map(({ goal, remaining, done, target }) => (
              <li key={goal?.id ?? target} className="text-sm text-monk-text">
                <span className="font-semibold">{goal?.title ?? t("week.goalFallback")}</span>
                <span className="text-monk-muted"> · {done}/{target} · {t("week.review.short", { remaining })}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-monk-success">{t("week.review.allTouched")}</p>
      )}

      {why?.identity || why?.consequenceOfInaction ? (
        <div className="mt-4 rounded-xl border border-monk-border/70 bg-monk-bg/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-monk-muted">{t("week.review.stillTrue")}</p>
          <p className="mt-1 text-sm leading-5 text-monk-text line-clamp-3">
            {why.identity || why.consequenceOfInaction}
          </p>
          <button
            type="button"
            className="mt-2 text-[11px] font-semibold text-monk-accent hover:underline"
            onClick={() => navigate(routes.timeline)}
          >
            {t("week.review.revisitWhy")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="mt-4 text-xs font-semibold text-monk-accent hover:underline"
          onClick={() => navigate(routes.timeline)}
        >
          {t("week.review.setWhy")}
        </button>
      )}

      <p className="mt-4 text-xs leading-5 text-monk-muted">
        {t("week.review.nextWeek")}
      </p>
      <SecondaryButton className="mt-3" onClick={() => navigate(routes.today)}>
        {t("week.review.planTomorrow")}
      </SecondaryButton>
    </Card>
  );
}


