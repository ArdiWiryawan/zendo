import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { routes } from "../constants/routes";
import { getDaysLeft } from "../lib/date";
import { selectSeasonFocusSummary } from "../store/selectors";
import {
  Card,
  GhostButton,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Textarea,
} from "../components/ui";

/** Stable ids, not the translated question text: switching language mid-write
 *  used to re-key every answer and blank the form. */
const QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

export function SeasonEndScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const season = store.activeSeason;
  const daysLeft = season ? getDaysLeft(season.endDate) : 0;

  /* The reflection used to live in component state only, so navigating away
     (or closing the tab) silently discarded everything the user wrote on the
     last screen of their season. Draft is now persisted per season. */
  const draftKey = season ? `zendo_season_reflection_${season.id}` : null;
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (!draftKey) return {};
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!draftKey) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(answers));
    } catch {
      /* storage full or blocked: the form still works, it just will not persist */
    }
  }, [answers, draftKey]);

  const released = store.releasedSeasonGoals
    .map((entry) => ({ entry, goal: store.goals.find((g) => g.id === entry.goalId) }))
    .filter((item) => item.goal);

  const focus = season ? selectSeasonFocusSummary(store, season.id) : { count: 0, totalMinutes: 0, totalSeconds: 0 };
  const goalsDone = season
    ? store.goals.filter((goal) => goal.seasonId === season.id && goal.status === "completed").length
    : 0;
  const daysElapsed = season ? Math.max(1, Math.min(season.durationDays, season.durationDays - daysLeft)) : 0;
  const focusLabel =
    focus.totalMinutes >= 60
      ? `${Math.floor(focus.totalMinutes / 60)}j ${focus.totalMinutes % 60}m`
      : `${focus.totalMinutes}m`;
  const hasAnswers = Object.values(answers).some((value) => value.trim().length > 0);

  const stats = [
    { value: String(daysElapsed), label: t("seasonEnd.recapDays") },
    { value: focusLabel, label: t("seasonEnd.recapFocus") },
    { value: String(focus.count), label: t("seasonEnd.recapSessions") },
  ];

  return (
    <>
      <PageHeader title={t("seasonEnd.title")} subtitle={t("seasonEnd.subtitle")} />

      <div className="space-y-4">
        {/* Lead with what the season produced. The screen used to open on five
            blank textareas, which reads as an exam rather than a look back. */}
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-monk-muted">
            {t("seasonEnd.recapTitle")}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-monk-border bg-monk-soft px-2 py-3 text-center">
                <p className="text-lg font-bold leading-6 tabular-nums text-monk-text">{stat.value}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-monk-muted">{stat.label}</p>
              </div>
            ))}
          </div>
          {goalsDone > 0 ? (
            <p className="mt-3 text-sm text-monk-muted">
              {t("seasonEnd.recapGoals", { n: goalsDone })}
            </p>
          ) : null}
        </Card>

        {released.length ? (
          <Card>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-monk-muted">
              {t("release.sectionTitle")}
            </p>
            <div className="space-y-2">
              {released.map(({ entry, goal }) => (
                <div key={entry.goalId} className="rounded-xl border border-monk-border bg-monk-soft px-3 py-2.5">
                  <p className="text-sm font-semibold">{goal!.title}</p>
                  {entry.note ? (
                    <p className="mt-1 text-xs leading-5 text-monk-muted">{entry.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-monk-text">{t("seasonEnd.reflectionTitle")}</p>
              <p className="mt-1 text-xs leading-5 text-monk-muted">{t("seasonEnd.reflectionHint")}</p>
            </div>
            {hasAnswers ? (
              <span className="shrink-0 pt-0.5 text-[11px] font-semibold text-monk-success">
                {t("seasonEnd.saved")}
              </span>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            {QUESTION_KEYS.map((key) => {
              const id = `season-end-${key}`;
              const question = t(`seasonEnd.${key}`);
              return (
                <div key={key} className="border-t border-monk-border/60 pt-4 first:border-0 first:pt-0">
                  <label htmlFor={id} className="block text-sm font-medium text-monk-text">
                    {question}
                  </label>
                  <Textarea
                    id={id}
                    value={answers[key] ?? ""}
                    onChange={(event) =>
                      setAnswers((value) => ({ ...value, [key]: event.target.value }))
                    }
                    className="mt-2 !min-h-[84px] text-[13px] leading-6"
                  />
                </div>
              );
            })}
          </div>
        </Card>

        {daysLeft > 0 ? (
          <PrimaryButton
            onClick={() => {
              store.resumeSeason();
              navigate(routes.today);
            }}
          >
            {daysLeft === 1 ? t("seasonEnd.resume", { n: daysLeft }) : t("seasonEnd.resumePlural", { n: daysLeft })}
          </PrimaryButton>
        ) : null}
        <PrimaryButton
          onClick={() => {
            store.startNewSeason();
            navigate(routes.onboardingGoals);
          }}
        >
          {t("seasonEnd.startNew")}
        </PrimaryButton>
        <SecondaryButton
          onClick={() => {
            store.archiveSeason();
            navigate(routes.onboardingWelcome);
          }}
        >
          {t("seasonEnd.archive")}
        </SecondaryButton>
        <GhostButton onClick={() => navigate(routes.seasons)}>{t("seasons.view")}</GhostButton>
      </div>
    </>
  );
}
