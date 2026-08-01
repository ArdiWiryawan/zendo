import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { getTodayDateString, datesInRange, formatHumanDate } from "../lib/date";
import { routes } from "../constants/routes";
import { DefenseChips } from "./TodayScreen";
import { selectTodayPlan, selectActiveGoals, selectCurrentWeeklyPlan, selectEnergyForDate, selectTotalFocusSecondsForDate } from "../store/selectors";
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
  Textarea,
  useCalmToast,
} from "../components/ui";
import { FocusSessionStarter } from "./FocusSession";
import { SeasonProgressCard } from "../components/SeasonWidgets";
import { CircularProgress } from "../components/CircularProgress";
import type { EnergyLevel } from "../types/app";

export function WeekScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const goals = selectActiveGoals(store);
  const today = getTodayDateString();
  const todayPlan = selectTodayPlan(store);

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
    const targetFocus = weeklyPlan.goalAllocations.reduce((s, a) => s + a.targetCount, 0) || 6;
    const focusDone = weeklyPlan.goalAllocations.reduce((s, a) => s + a.completedCount, 0);
    const energyCounts = weekDates.reduce((acc, date) => {
      const lvl = selectEnergyForDate(store, date);
      if (lvl) acc[lvl] = (acc[lvl] ?? 0) + 1;
      return acc;
    }, {} as Record<EnergyLevel, number>);
    const energyTotal = Object.values(energyCounts).reduce((a, b) => a + b, 0);
    return { completed, partial, rest, missed, targetFocus, focusDone, energyCounts, energyTotal };
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
                    {stats.missed > 0 ? <p className="flex items-center gap-1.5 justify-end text-monk-danger/80"><span className="h-1.5 w-1.5 rounded-full bg-monk-danger/70" />{t("week.missedCount", { n: stats.missed })}</p> : null}
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
                    ? "bg-monk-text-soft/5 border-monk-text-soft/25 text-monk-text-soft/50"
                    : isFuture
                    ? "bg-transparent border-monk-border/30 text-monk-text-soft/40"
                    : "bg-monk-soft border-monk-border text-monk-text-soft";

                  const DayInner = (
                    <>
                      <div
                        className={`grid h-9 w-9 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full border-2 text-[10px] sm:text-[11px] font-mono font-bold transition-colors ${circleClass} ${
                          isToday ? "ring-2 ring-inset ring-monk-accent/70" : ""
                        }`}
                      >
                        {isCompleted ? <Check size={14} strokeWidth={2.5} /> : isRest ? <Moon size={12} strokeWidth={1.75} /> : dayNum}
                      </div>
                      <span className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide ${
                        isToday ? "text-monk-accent" : "text-monk-text-soft/60"
                      }`}>
                        {weekday.slice(0, 2)}
                      </span>
                      <span className={`h-1.5 w-1.5 rounded-full ${energyDot}`} aria-hidden="true" />
                    </>
                  );

                  if (isToday) {
                    return (
                      <button
                        key={date}
                        type="button"
                        role="listitem"
                        aria-label={label}
                        onClick={() => navigate(routes.today)}
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
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-monk-success" />
                  <span className="h-1.5 w-1.5 rounded-full bg-monk-accent" />
                  <span className="h-1.5 w-1.5 rounded-full bg-monk-danger" />
                  {t("week.legendEnergy")}
                </span>
              </div>
            </Card>

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
                      {stats.rest > 0 ? <p className="text-sm text-monk-muted/90">{t("week.wrap.rest", { n: stats.rest })}</p> : null}
                    </div>
                    <p className="mt-3 text-sm text-monk-accent/90 font-medium">{wrapWin}</p>
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
                  const statusLabel = complete
                    ? t("week.statusMet")
                    : behind
                    ? t("week.statusBehind")
                    : allocation.completedCount > 0
                    ? t("week.statusProgress")
                    : t("week.statusNotStarted");
                  const statusClass = complete
                    ? "text-monk-success border-monk-success/30 bg-monk-success-soft"
                    : behind
                    ? "text-monk-warning border-monk-warning/30 bg-monk-warning-soft"
                    : allocation.completedCount > 0
                    ? "text-monk-accent border-monk-accent/30 bg-monk-accent-soft"
                    : "text-monk-muted border-monk-border bg-monk-soft";

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
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-monk-soft">
                          <div
                            className={`h-full rounded-full transition-all ${
                              complete ? "bg-monk-success" : behind ? "bg-monk-warning" : "bg-monk-accent"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs font-mono tabular-nums text-monk-muted">
                          {allocation.completedCount}/{allocation.targetCount}
                        </span>
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
    </>
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


