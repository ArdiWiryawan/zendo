import { useMemo, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Flag,
  Flame,
  Lightbulb,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Card,
  EmptyState,
  PageHeader,
  SectionHeader,
  SettingsLink,
} from "../components/ui";
import { RetroLogModal } from "../components/RetroLogModal";
import { SeasonProgressCard, WhyCard } from "../components/SeasonWidgets";
import { DAILY_STATUS_LABELS } from "../constants/dailyActivityStatus";
import { FOCUS_PRESETS } from "../constants/focusPresets";
import {
  formatFocusSessionTimelineDescription,
  getFocusSessionPreset,
  normalizeFocusSessionRecord,
  resolveFocusSessionStatus,
} from "../constants/focusSessionStatus";
import { routes } from "../constants/routes";
import {
  addDaysToDate,
  datesInRange,
  formatHumanDate,
  getDayNumber,
  getDaysPassed,
  getTodayDateString,
} from "../lib/date";
import {
  getCoreDailyStatusForDate,
  getDailyHelperForDate,
  getDailyStatusForDate,
  isRetroEligible,
} from "../lib/dailyActivity";
import { selectTodayPlan, selectSeasonFocusSummary } from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import type { AppLanguage, TimelineEvent, TimelineEventType } from "../types/app";
import { getJournalAnswerItems } from "../i18n/prompts";
import { useT, useLanguage } from "../i18n";

function TimelineStats() {
  const store = useMonkStore();
  const t = useT();
  const season = store.activeSeason!;

  // Season-scoped — without seasonId the previous season's sessions would
  // inflate the current season's totals. selectSeasonFocusSummary already
  // filters seasonId + [completed, ended_early].
  const focusSummary = selectSeasonFocusSummary(store, season.id);
  const totalFocusMinutes = focusSummary.totalMinutes;
  const totalFocusSessions = focusSummary.count;

  const completedDaysCount = store.dayPlans.filter(
    (day) => day.seasonId === season.id && day.status === "completed"
  ).length;

  const totalPassedDays = Math.min(
    season.durationDays,
    getDaysPassed(season.startDate)
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
      <div className="rounded-xl border border-monk-accent/25 bg-gradient-to-br from-monk-surface to-monk-surface/60 p-5 relative overflow-hidden transition hover:border-monk-accent/40 monk-depth">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-monk-muted">{t("timeline.stats.focus")}</p>
            <p className="text-4xl font-bold mt-1 text-monk-accent tabular-nums leading-none">{totalFocusMinutes}<span className="text-base font-semibold text-monk-muted/50 ml-1">{t("timeline.stats.minutes")}</span></p>
            <p className="text-xs text-monk-muted mt-1">{t("timeline.stats.sessions", { n: totalFocusSessions })}</p>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-monk-accent/20 to-monk-accent/5 border border-monk-accent/10 shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]">
            <Timer size={16} strokeWidth={2} className="text-monk-accent" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-monk-border/50 pt-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-monk-muted">{t("timeline.stats.consistency")}</p>
            <p className="text-xl font-bold mt-0.5 text-monk-muted tabular-nums leading-none">{t("timeline.stats.days", { n: completedDaysCount, total: totalPassedDays })}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const store = useMonkStore();
  const t = useT();
  const lang = useLanguage();
  const locale = lang === "id" ? "id-ID" : "en-US";
  const focusRecord = event.type === "focus_session"
    ? event.focusSession ?? store.focusSessions.find((session) => session.id === event.sourceId)
    : undefined;
  const normalizedFocusRecord = focusRecord ? normalizeFocusSessionRecord(focusRecord) : undefined;
  const focusCompleted = normalizedFocusRecord ? resolveFocusSessionStatus(normalizedFocusRecord) === "completed" : false;
  const focusPreset = normalizedFocusRecord ? getFocusSessionPreset(normalizedFocusRecord) : undefined;
  const focusTitle = focusPreset
    ? `${FOCUS_PRESETS[focusPreset].shortLabel} ${focusCompleted ? t("timeline.focusCompleted") : t("timeline.focusEndedEarly")}`
    : event.title;
  const displayTitle = event.type === "focus_session" && normalizedFocusRecord ? focusTitle : event.title;
  const journalRecord = event.type === "journal_entry"
    ? store.journalEntries.find((entry) => entry.id === event.sourceId)
    : undefined;
  const journalLang = (store.appSettings.language ?? "id") as AppLanguage;
  const journalItems = journalRecord ? getJournalAnswerItems(journalLang, journalRecord.answers, journalRecord.date) : [];
  const displayDescription = event.type === "focus_session" && normalizedFocusRecord
    ? formatFocusSessionTimelineDescription(normalizedFocusRecord, focusCompleted ? undefined : "saved")
    : event.type === "journal_entry" && journalItems.length > 0
      ? undefined
    : event.description;
  const icons: Record<TimelineEventType, JSX.Element> = {
    season_started: <Flag size={12} strokeWidth={1.5} className="text-monk-accent" />,
    season_completed: <Trophy size={12} strokeWidth={1.5} className="text-monk-success" />,
    goal_created: <Target size={12} strokeWidth={1.5} className="text-monk-accent" />,
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? <Flame size={12} strokeWidth={1.5} className="text-monk-warning" />
      : <Timer size={12} strokeWidth={1.5} className="text-monk-success" />,
    learning_session: <Lightbulb size={12} strokeWidth={1.5} className="text-monk-accent" />,
    journal_entry: <FileText size={12} strokeWidth={1.5} className="text-monk-muted" />
  };

  const bgClasses: Record<TimelineEventType, string> = {
    season_started: "bg-monk-accent/5 border-monk-accent/15",
    season_completed: "bg-monk-success/5 border-monk-success/15",
    goal_created: "bg-monk-accent/5 border-monk-accent/15",
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? "bg-monk-warning/5 border-monk-warning/15"
      : "bg-monk-success/5 border-monk-success/15",
    learning_session: "bg-monk-accent/5 border-monk-accent/15",
    journal_entry: "bg-monk-surface border-monk-border/20"
  };

  const typeColors: Record<TimelineEventType, string> = {
    season_started: "from-monk-accent to-transparent",
    season_completed: "from-monk-success to-transparent",
    goal_created: "from-monk-accent to-transparent",
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? "from-monk-warning to-transparent"
      : "from-monk-success to-transparent",
    learning_session: "from-monk-accent to-transparent",
    journal_entry: "from-monk-muted to-transparent"
  };

  const leftAccent: Record<TimelineEventType, string> = {
    season_started: "border-monk-accent",
    season_completed: "border-monk-success",
    goal_created: "border-monk-accent",
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? "border-monk-warning"
      : "border-monk-success",
    learning_session: "border-monk-accent",
    journal_entry: "border-monk-muted"
  };

  const timeLabel = new Date(event.occurredAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`grid h-9 w-9 place-items-center rounded-full border shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] ${bgClasses[event.type]}`}>
          {icons[event.type]}
        </div>
        <div className={`w-[2px] flex-1 bg-gradient-to-b ${typeColors[event.type]} opacity-60 rounded-b-full min-h-[20px]`} />
      </div>
      <div className="flex-1 pb-5">
        <p className="mb-1 font-mono text-[11px] text-monk-muted/80 tabular-nums">{timeLabel}</p>
        <Card className={`p-4 bg-monk-soft/80 hover:bg-monk-raised/60 shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-150 border-l-4 ${leftAccent[event.type]} border-t border-r border-b border-monk-border/20`}>
          <h4 className="text-sm font-bold text-monk-text leading-tight tracking-wide">{displayTitle}</h4>
          {displayDescription && (
            <p className="mt-2 text-sm text-monk-muted leading-relaxed whitespace-pre-line">{displayDescription}</p>
          )}
          {journalItems.length > 0 ? (
            <div className="mt-3 space-y-3 border-t border-monk-border/20 pt-3">
              {journalItems.map((item) => (
                <div key={item.id}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-monk-text-soft">{item.question}</p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-monk-text border-l-2 border-monk-accent/30 pl-2">{item.answer}</p>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

export default function TimelineScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const season = store.activeSeason!;

  const [retroDate, setRetroDate] = useState<string | null>(null);

  const dates = useMemo(() => {
    return datesInRange(season.startDate, season.durationDays);
  }, [season.id, season.startDate, season.durationDays]);

  const chunks = useMemo(() => {
    const result: string[][] = [];
    for (let i = 0; i < dates.length; i += 7) {
      result.push(dates.slice(i, i + 7));
    }
    return result;
  }, [dates]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    // Only the active season's events — old-season events would otherwise
    // surface in the new season's timeline feed.
    store.timelineEvents
      .filter((event) => event.seasonId === season.id)
      .forEach((event) => {
        const date = event.occurredAt.slice(0, 10);
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(event);
      });
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        events: groups[date].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      }));
  }, [store.timelineEvents]);

  return (
    <>
      <PageHeader title={t("timeline.title")} subtitle={t("timeline.subtitle")} rightSlot={<SettingsLink />} />
      <div className="space-y-5">
        <WhyCard />
        <SeasonProgressCard />
        <TimelineStats />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}>
        <Card className="p-5 space-y-4">
          {(() => {
            const today = getTodayDateString();
            const todayDayNum = getDayNumber(today, season.startDate);
            const todayPlan = selectTodayPlan(store);
            const todayCompleted = todayPlan?.status === "completed";
            const DOW = ["M", "T", "W", "T", "F", "S", "S"];

            function dotStyle(date: string) {
              const status = getDailyStatusForDate(store, date);
              const isToday = date === today;
              const isCompleted = status === "completed" || (isToday && todayCompleted);
              const isPartial = status === "partial";
              const isRelapse = status === "relapse";
              const isRest = status === "rest";
              const isMissed = status === "missed";

              if (isToday) {
                if (isCompleted) return "bg-monk-success shadow-[0_0_10px_rgba(100,123,94,0.6)] ring-2 ring-monk-success/40";
                if (isPartial) return "bg-monk-accent/80 ring-2 ring-monk-accent/40";
                if (isRelapse) return "bg-monk-danger/80 ring-2 ring-monk-danger/40";
                if (isRest) return "bg-monk-rest/60 ring-2 ring-monk-rest/40";
                return "bg-monk-border-strong animate-pulse ring-2 ring-monk-accent/40";
              }
              if (isCompleted) return "bg-monk-success/75";
              if (isPartial) return "bg-monk-accent/60";
              if (isRelapse) return "bg-monk-danger/55";
              if (isRest) return "bg-monk-rest/45";
              if (isMissed) return "bg-monk-text-soft/20";
              return "bg-monk-border/40";
            }

            return (
              <div className="space-y-3">
                {/* Today status row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0" role="img" aria-label={t("timeline.dayProgress", { n: todayDayNum, total: season.durationDays })}>
                      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-monk-border" />
                        <circle
                          cx="18" cy="18" r="15.5" fill="none" strokeWidth="3"
                          strokeLinecap="round"
                          className="stroke-monk-accent transition-[stroke-dashoffset] duration-500 ease-monk"
                          strokeDasharray={`${(todayDayNum / season.durationDays) * 100} 100`}
                          style={{ strokeDashoffset: `${(todayDayNum / season.durationDays) * 100}` }}
                        />
                      </svg>
                      <span className="absolute inset-0 grid place-items-center font-mono text-[11px] font-bold text-monk-accent tabular-nums">{todayDayNum}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">{t("timeline.dayProgress", { n: todayDayNum, total: season.durationDays })}</p>
                      <p className="mt-0.5 text-sm font-semibold text-monk-text">{getDailyHelperForDate(store, today)}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    todayCompleted ? "bg-monk-success/20 text-monk-success border border-monk-success/30" :
                    getDailyStatusForDate(store, today) === "partial" ? "bg-monk-accent/20 text-monk-accent border border-monk-accent/30" :
                    getDailyStatusForDate(store, today) === "relapse" ? "bg-monk-danger/20 text-monk-danger border border-monk-danger/30" :
                    "bg-monk-surface text-monk-muted border border-monk-border"
                  }`}>
                    {DAILY_STATUS_LABELS[getCoreDailyStatusForDate(store, today)]}
                  </span>
                </div>
                {/* Heatmap: circles when early in season, grid when enough days */}
                {todayDayNum <= 13 ? (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {dates.filter((date) => date <= today).map((date) => {
                      const isToday = date === today;
                      const status = getDailyStatusForDate(store, date);
                      const dayNum = getDayNumber(date, season.startDate);
                      const isEligible = isRetroEligible(date, status, today);

                      return (
                        <div
                          key={date}
                          role={isEligible ? "button" : undefined}
                          tabIndex={isEligible ? 0 : undefined}
                          title={t("timeline.dayTitle", { n: dayNum, status }) + (isEligible ? t("timeline.tapToLog") : "")}
                          aria-label={t("timeline.dayTitle", { n: dayNum, status }) + (isEligible ? t("timeline.tapToLog") : "")}
                          onClick={isEligible ? () => setRetroDate(date) : undefined}
                          onKeyDown={isEligible ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRetroDate(date); }} : undefined}
                          className={`h-6 w-6 rounded-full transition-all duration-300 ${dotStyle(date)} ${isToday ? "scale-110 ring-2 ring-monk-accent/40" : ""} ${isEligible ? "cursor-pointer hover:scale-110 hover:ring-2 hover:ring-monk-accent/40" : ""} flex items-center justify-center text-[8px] font-bold text-monk-text/60`}
                        >
                          {isToday ? dayNum : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {/* Day-of-week header */}
                    <div className="grid grid-cols-7 gap-1.5 px-0.5">
                      {DOW.map((d, i) => (
                        <span key={i} className="text-center text-[10px] font-bold uppercase tracking-wider text-monk-muted/50 tabular-nums">{d}</span>
                      ))}
                    </div>
                    {/* Heatmap rows */}
                    <div className="space-y-1.5">
                      {chunks.map((week, wi) => {
                        const allFuture = week.every((d) => d > today);
                        if (allFuture) return null;
                        return (
                          <div key={wi} className="grid grid-cols-7 gap-1.5">
                            {week.map((date) => {
                              const isFuture = date > today;
                              const isToday = date === today;
                              const status = getDailyStatusForDate(store, date);
                              const dayNum = getDayNumber(date, season.startDate);
                              const isEligible = isRetroEligible(date, status, today);

                              return (
                                <div
                                  key={date}
                                  role={isEligible ? "button" : undefined}
                                  tabIndex={isEligible ? 0 : undefined}
                                  title={t("timeline.dayTitle", { n: dayNum, status }) + (isEligible ? t("timeline.tapToLog") : "")}
                                  aria-label={t("timeline.dayTitle", { n: dayNum, status }) + (isEligible ? t("timeline.tapToLog") : "")}
                                  onClick={isEligible ? () => setRetroDate(date) : undefined}
                                  onKeyDown={isEligible ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRetroDate(date); }} : undefined}
                                  className={`w-full aspect-square rounded-lg transition-all duration-300 ${
                                    isFuture ? "bg-monk-border/10" : dotStyle(date)
                                  } ${isToday ? "ring-2 ring-monk-accent shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]" : ""} ${isEligible ? "cursor-pointer hover:scale-105 hover:ring-2 hover:ring-monk-accent" : ""}`}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {/* Legend */}
                <div className="flex items-center gap-x-4 gap-y-1 pt-1 flex-wrap">
                  {([
                    ["bg-monk-success/75", t("timeline.legend.done")],
                    ["bg-monk-accent/60", t("timeline.legend.partial")],
                    ["bg-monk-rest/45", t("timeline.legend.rest")],
                    ["bg-monk-danger/55", t("timeline.legend.relapse")],
                    ["bg-monk-text-soft/20", t("timeline.legend.missed")]
                  ] as const).map(([cls, label]) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <span className={`inline-block h-2.5 w-2.5 rounded-[3px] ${cls}`} aria-hidden />
                      <span className="text-[11px] text-monk-muted/70">{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </Card>
        </motion.div>
        
        {/* Timeline Log Section */}
        <div className="space-y-4 pt-2">
          <SectionHeader title={t("timeline.activity")} subtitle={t("timeline.activitySubtitle")} />
          {groupedEvents.length === 0 ? (
            <EmptyState
              title={t("timeline.emptyTitle")}
              description={t("timeline.emptyDesc")}
              actionLabel={t("timeline.emptyAction")}
              onAction={() => navigate(routes.today)}
            />
          ) : (
            <div className="space-y-5">
              {groupedEvents.map((group) => {
                const isToday = group.date === getTodayDateString();
                const isYesterday = group.date === addDaysToDate(getTodayDateString(), -1);
                const groupTitle = isToday ? t("timeline.today") : (isYesterday ? t("timeline.yesterday") : formatHumanDate(group.date));

                return (
                  <div key={group.date} className="space-y-3">
                    <div className="sticky top-0 z-10 bg-monk-bg/90 backdrop-blur pt-1.5 pb-1.5 -mx-1 px-1 flex items-center gap-2 border-b border-monk-border/30">
                      <p className="text-xs font-bold text-monk-accent uppercase tracking-wider">{groupTitle}</p>
                      <span className="text-[10px] font-bold text-monk-muted bg-monk-raised/60 border border-monk-border/30 px-1.5 py-0.5 rounded-full">
                        {group.events.length}
                      </span>
                    </div>
                    <div className="space-y-0">
                      {group.events.map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          <TimelineEventRow event={event} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <RetroLogModal open={!!retroDate} date={retroDate} onClose={() => setRetroDate(null)} />
    </>
  );
}

