import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Timer } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import {
  selectSeasonDayPlanCounts,
  selectSeasonFocusSummary,
  selectSeasonGoals,
  selectSeasonLearningSummary,
} from "../store/selectors";
import { formatHumanDate } from "../lib/date";
import { routes } from "../constants/routes";
import { Card, EmptyState, GhostButton, PageHeader } from "../components/ui";
import type { TimelineEvent } from "../types/app";

export function SeasonArchiveList() {
  const store = useMonkStore();
  const t = useT();
  const navigate = useNavigate();

  const seasons = useMemo(
    () => [...store.pastSeasons].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [store.pastSeasons]
  );

  if (seasons.length === 0) {
    return (
      <>
        <PageHeader title={t("seasons.title")} subtitle={t("seasons.subtitle")} />
        <EmptyState title={t("seasons.empty.title")} description={t("seasons.empty.desc")} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("seasons.title")} subtitle={t("seasons.subtitle")} />
      <div className="space-y-3">
        {seasons.map((season) => {
          const focus = selectSeasonFocusSummary(store, season.id);
          return (
            <Card
              key={season.id}
              className="p-4"
              important={false}
            >
              <button
                type="button"
                onClick={() => navigate(routes.seasonDetail.replace(":seasonId", season.id))}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-monk-text">{season.name}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-monk-muted">
                      <Calendar size={12} strokeWidth={1.5} />
                      {formatHumanDate(season.startDate)} – {formatHumanDate(season.endDate)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-monk-border bg-monk-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-monk-muted">
                    {t("seasons.durationDays", { n: season.durationDays })}
                  </span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-monk-muted">
                  <Timer size={12} strokeWidth={1.5} />
                  {t("timeline.stats.focus")}: {focus.totalMinutes}m · {focus.count} {t("timeline.stats.sessions", { n: focus.count })}
                </p>
              </button>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <p className="text-xs font-bold uppercase tracking-widest text-monk-muted mb-2">{children}</p>;
}

export function SeasonArchiveDetail() {
  const store = useMonkStore();
  const t = useT();
  const navigate = useNavigate();
  const { seasonId } = useParams<{ seasonId: string }>();

  const season = useMemo(() => {
    if (!seasonId) return undefined;
    const inPast = store.pastSeasons.find((s) => s.id === seasonId);
    if (inPast) return inPast;
    return store.activeSeason?.id === seasonId ? store.activeSeason : undefined;
  }, [seasonId, store.pastSeasons, store.activeSeason]);

  const focus = useMemo(
    () => (season ? selectSeasonFocusSummary(store, season.id) : null),
    [season, store]
  );
  const learning = useMemo(
    () => (season ? selectSeasonLearningSummary(store, season.id) : null),
    [season, store]
  );
  const dayCounts = useMemo(
    () => (season ? selectSeasonDayPlanCounts(store, season.id) : null),
    [season, store]
  );
  const goals = useMemo(
    () => (season ? selectSeasonGoals(store, season.id) : []),
    [season, store]
  );

  const activity = useMemo(() => {
    if (!season) return [];
    const groups: Record<string, TimelineEvent[]> = {};
    store.timelineEvents
      .filter((e) => e.seasonId === season.id)
      .forEach((event) => {
        const date = event.occurredAt.slice(0, 10);
        (groups[date] ??= []).push(event);
      });
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        events: groups[date].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
      }));
  }, [season, store.timelineEvents]);

  if (!season) {
    return (
      <>
        <PageHeader
          title={t("seasons.detail.title")}
          subtitle={t("seasons.subtitle")}
          rightSlot={
            <GhostButton onClick={() => navigate(routes.seasons)}>
              <ArrowLeft size={14} strokeWidth={1.5} />
              {t("seasons.back")}
            </GhostButton>
          }
        />
        <EmptyState title={t("seasons.empty.title")} description={t("seasons.empty.desc")} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={season.name}
        subtitle={`${formatHumanDate(season.startDate)} – ${formatHumanDate(season.endDate)}`}
        rightSlot={
          <GhostButton onClick={() => navigate(routes.seasons)}>
            <ArrowLeft size={14} strokeWidth={1.5} />
            {t("seasons.back")}
          </GhostButton>
        }
      />
      <div className="space-y-5">
        {/* Stats grid — reuses season-scoped selectors */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-monk-muted">{t("timeline.stats.focus")}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-monk-accent">
              {focus?.totalMinutes ?? 0}
              <span className="ml-1 text-sm font-semibold text-monk-muted">{t("timeline.stats.minutes")}</span>
            </p>
            <p className="mt-1 text-xs text-monk-muted">{focus?.count ?? 0} {t("timeline.stats.sessions", { n: focus?.count ?? 0 })}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-monk-muted">{t("timeline.stats.learning")}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-monk-text">
              {learning?.totalMinutes ?? 0}
              <span className="ml-1 text-sm font-semibold text-monk-muted">{t("timeline.stats.minutes")}</span>
            </p>
            <p className="mt-1 text-xs text-monk-muted">{learning?.count ?? 0} {t("timeline.stats.learningSessions", { n: learning?.count ?? 0 })}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-monk-muted">{t("seasons.detail.days")}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-monk-text">
              {dayCounts?.completed ?? 0}
              <span className="ml-1 text-sm font-semibold text-monk-muted">/ {dayCounts?.planned ?? 0}</span>
            </p>
            <p className="mt-1 text-xs text-monk-muted">{t("seasons.detail.completedDays")}</p>
          </Card>
        </div>

        {goals.length > 0 ? (
          <div>
            <SectionTitle>{t("seasons.detail.goals")}</SectionTitle>
            <div className="space-y-2">
              {goals.map((goal) => (
                <Card key={goal.id} className="px-4 py-3">
                  <p className="text-sm font-semibold text-monk-text">{goal.title}</p>
                  <p className="mt-0.5 text-xs text-monk-muted">{goal.keystoneAction}</p>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <SectionTitle>{t("seasons.detail.activity")}</SectionTitle>
          {activity.length === 0 ? (
            <Card className="p-4">
              <p className="text-sm text-monk-muted">{t("seasons.detail.noActivity")}</p>
            </Card>
          ) : (
            <div className="space-y-5">
              {activity.map((group) => (
                <div key={group.date} className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-monk-border/30 pb-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-monk-accent">{formatHumanDate(group.date)}</p>
                    <span className="rounded-full border border-monk-border/30 bg-monk-raised/60 px-1.5 py-0.5 text-[10px] font-bold text-monk-muted">
                      {group.events.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.events.map((event) => (
                      <p key={event.id} className="text-sm leading-5 text-monk-text-soft">
                        {event.title}
                        {event.description ? (
                          <span className="block text-xs text-monk-muted">{event.description}</span>
                        ) : null}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function ArchiveScreen() {
  const navigate = useNavigate();
  const { seasonId } = useParams<{ seasonId: string }>();
  const isDetail = Boolean(seasonId);
  const t = useT();

  // Route dispatcher: /seasons lists, /seasons/:id shows detail.
  return (
    <div className="space-y-5">
      {isDetail ? <SeasonArchiveDetail /> : <SeasonArchiveList />}
      {!isDetail ? (
        <div className="pt-2">
          <GhostButton onClick={() => navigate(routes.today)}>
            <ArrowLeft size={14} strokeWidth={1.5} />
            {t("seasons.backToday")}
          </GhostButton>
        </div>
      ) : null}
    </div>
  );
}
