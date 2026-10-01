import { useState } from "react";
import {
  Card,
  ChoiceCard,
  PrimaryButton,
  SecondaryButton,
  Textarea,
} from "./ui";
import { CORE_VALUES } from "../constants/whyValues";
import {
  getDaysLeft,
  getDaysPassed,
  getSeasonProgress,
  getTodayDateString,
  isDatePast,
  isSeasonEnded,
  parseLocalDateKey,
} from "../lib/date";
import { selectActiveGoals } from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import { useT, useLanguage } from "../i18n";
import type { Season, SeasonWhy } from "../types/app";

/**
 * Elapsed days and the calendar day the season closes, in one string. `today` is
 * a parameter so the year boundary can be pinned in tests.
 */
export function formatSeasonWindow(
  season: Pick<Season, "startDate" | "endDate" | "durationDays">,
  locale: string,
  today = getTodayDateString()
) {
  const total = Number.isFinite(season.durationDays) && season.durationDays > 0
    ? season.durationDays
    : 0;
  // `getDaysPassed` floors at 1 (day 1 is the start date itself), so a season
  // whose start is still ahead of us must be floored to 0 by hand.
  const passed = isDatePast(today, season.startDate) ? 0 : getDaysPassed(season.startDate, today);
  const elapsed = Math.min(total, passed);
  const closed = parseLocalDateKey(season.endDate).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
  // A season with no usable duration has no day count to show, only its close date.
  return total > 0 ? `${elapsed}/${total} · ${closed}` : closed;
}

export function SeasonProgressCard({
  onOpenGoal
}: {
  /**
   * D7: the Season view is where a user reads their goal tracks, but the chips
   * were inert text — the goal's own blueprint was unreachable from here. When
   * a handler is supplied the chips become buttons into the blueprint modal;
   * without one they stay non-interactive rather than dead buttons.
   */
  onOpenGoal?: (goalId: string) => void;
}) {
  const store = useMonkStore();
  const t = useT();
  const lang = useLanguage();
  const { activeSeason } = store;
  if (!activeSeason) return null;
  const today = getTodayDateString();
  const daysLeft = getDaysLeft(activeSeason.endDate, today);
  const rawProgress = getSeasonProgress(activeSeason, today);
  // A season with no duration (or a malformed one) yields NaN — never let it
  // reach `width` or `aria-valuenow`.
  const progress = Number.isFinite(rawProgress) ? Math.min(100, Math.max(0, rawProgress)) : 0;
  // The season's own dates decide its phase, not the store's `status`: an ended
  // season with a non-zero duration would otherwise render `durationDays/0%`.
  // `isDatePast(a, b)` is `b > a`, so the arguments must be swapped here: the
  // season has not started when *today* is before the start date.
  const notStarted = isDatePast(today, activeSeason.startDate);
  const finished = isSeasonEnded(activeSeason, today);
  const daysLeftLabel =
    finished
      ? t("season.closed")
      : notStarted
        ? t("season.opens")
        : daysLeft <= 1
          ? t("season.lastDay")
          : t("season.daysLeft", { n: daysLeft });
  const progressText = finished
    ? t("season.progressComplete")
    : notStarted
      ? t("season.progressNotStarted")
      : t("season.progressValue", { n: Math.round(progress) });
  // A season that has barely begun must not look identical to one that has not
  // begun: clamp a started-but-tiny fill to a visible sliver. Never invent a
  // fill for a season that has not started.
  const fillPercent = notStarted ? 0 : finished ? 100 : Math.max(2, progress);
  const goals = selectActiveGoals(store);
  return (
    <Card className="bg-monk-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold truncate">{activeSeason.name}</h2>
        <p className="shrink-0 font-mono text-xs text-monk-accent">{daysLeftLabel}</p>
      </div>
      <div
        role="progressbar"
        aria-label={t("season.progressLabel")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-valuetext={progressText}
        className="mt-3 flex h-4 items-center gap-2"
      >
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-monk-border">
          <div
            className="h-full rounded-full bg-monk-accent transition-all"
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-monk-muted">
          {progressText}
        </span>
      </div>
      <p className="mt-2 font-mono text-xs tabular-nums text-monk-muted">
        {formatSeasonWindow(activeSeason, lang === "id" ? "id-ID" : "en-US", today)}
      </p>
      {goals.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {goals.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => onOpenGoal?.(goal.id)}
              disabled={!onOpenGoal}
              aria-label={`${t("blueprint.openButton")}: ${goal.track ? `${goal.track} ` : ""}${goal.title}`}
              title={t("blueprint.dialogTitle")}
              className="inline-flex items-center gap-1.5 rounded-full border border-monk-border bg-monk-soft px-3 py-1 text-xs text-monk-text-soft transition enabled:hover:border-monk-accent enabled:hover:text-monk-accent enabled:active:scale-95 disabled:cursor-default"
            >
              {goal.track ? (
                <span className="font-semibold text-monk-accent">{goal.track} ·</span>
              ) : null}
              <span>{goal.title}</span>
            </button>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

/** One-line why for friction moments (focus start, relapse). */
export function FrictionWhy({ className = "" }: { className?: string }) {
  const t = useT();
  const why = useMonkStore((s) => s.activeSeason?.why);
  const intrinsicWhy = why?.why || why?.identity;
  const antiWhy = why?.antiWhy || why?.consequenceOfInaction;
  if (!intrinsicWhy && !antiWhy) return null;
  return (
    <div className={`rounded-xl border border-monk-accent/20 bg-monk-accent-soft/30 px-3.5 py-3 ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-monk-accent animate-pulse" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">{t("season.rememberWhy")}</p>
      </div>
      {intrinsicWhy ? (
        <p className="mt-1 text-sm font-semibold leading-5 text-monk-text line-clamp-2">{intrinsicWhy}</p>
      ) : null}
      {why?.desiredOutcome ? (
        <p className="mt-1 text-xs text-monk-accent line-clamp-1">
          {why.desiredOutcome}
        </p>
      ) : null}
      {antiWhy ? (
        <p className="mt-1 text-xs leading-5 text-monk-muted line-clamp-2">
          {antiWhy}
        </p>
      ) : null}
    </div>
  );
}

export function WhyEditor({
  initial,
  onSave,
  onCancel
}: {
  initial?: Partial<SeasonWhy>;
  onSave: (why: SeasonWhy) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const lang = useLanguage();
  const isId = lang === "id";
  const [whyText, setWhyText] = useState(initial?.why || initial?.identity || "");
  const [desiredOutcome, setDesiredOutcome] = useState(initial?.desiredOutcome || "");
  const [antiWhy, setAntiWhy] = useState(initial?.antiWhy || initial?.consequenceOfInaction || "");
  const [protect, setProtect] = useState<string[]>(initial?.protectValues ?? []);
  
  const canSave =
    whyText.trim().length >= 5 ||
    antiWhy.trim().length >= 5 ||
    desiredOutcome.trim().length >= 5;

  const toggleValue = (id: string) => {
    setProtect((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  return (
    <div className="space-y-4">
      <Textarea
        label={t("why.coreQuestion")}
        value={whyText}
        onChange={(e) => setWhyText(e.target.value)}
        rows={2}
        placeholder={t("why.corePlaceholder")}
      />
      <Textarea
        label={t("why.outcomeQuestion")}
        value={desiredOutcome}
        onChange={(e) => setDesiredOutcome(e.target.value)}
        rows={2}
        placeholder={t("why.outcomePlaceholder")}
      />
      <Textarea
        label={t("why.antiWhyQuestion")}
        value={antiWhy}
        onChange={(e) => setAntiWhy(e.target.value)}
        rows={2}
        placeholder={t("why.antiWhyPlaceholder")}
      />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">{t("why.protectTitle")}</p>
          <span className="text-xs font-bold text-monk-muted">{protect.length}/3</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CORE_VALUES.map((v) => (
            <ChoiceCard
              key={v.id}
              title={(isId ? v.labelId : v.labelEn) || v.label}
              selected={protect.includes(v.id)}
              onClick={() => toggleValue(v.id)}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <SecondaryButton className="flex-1 min-h-11" onClick={onCancel}>
          {isId ? "Batal" : "Cancel"}
        </SecondaryButton>
        <PrimaryButton
          className="flex-1 min-h-11"
          disabled={!canSave}
          onClick={() => {
            const trimmedWhy = whyText.trim();
            const trimmedOutcome = desiredOutcome.trim();
            const trimmedAnti = antiWhy.trim();
            onSave({
              why: trimmedWhy,
              desiredOutcome: trimmedOutcome,
              antiWhy: trimmedAnti,
              identity: trimmedWhy,
              consequenceOfInaction: trimmedAnti,
              protectValues: protect
            });
          }}
        >
          {t("why.saveButton")}
        </PrimaryButton>
      </div>
    </div>
  );
}

/** Full why card — Timeline. Always visible; empty invites add. */
export function WhyCard() {
  const store = useMonkStore();
  const t = useT();
  const lang = useLanguage();
  const isId = lang === "id";
  const why = store.activeSeason?.why;
  const [editing, setEditing] = useState(false);
  const intrinsicWhy = why?.why || why?.identity;
  const outcome = why?.desiredOutcome;
  const antiWhy = why?.antiWhy || why?.consequenceOfInaction;
  const hasWhy = !!(intrinsicWhy || outcome || antiWhy);

  if (editing) {
    return (
      <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-monk-accent">
          {hasWhy ? t("why.editButton") : t("why.sectionTitle")}
        </p>
        <WhyEditor
          initial={why}
          onCancel={() => setEditing(false)}
          onSave={(next) => {
            store.updateSeasonWhy(next);
            setEditing(false);
          }}
        />
      </Card>
    );
  }

  if (!hasWhy) {
    return (
      <Card className="border-dashed border-monk-accent/30 bg-monk-accent-soft/20 p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">{t("why.sectionTitle")}</p>
        <p className="mt-2 text-sm leading-6 text-monk-muted">
          {t("why.emptyDesc")}
        </p>
        <PrimaryButton className="mt-4 min-h-11" onClick={() => setEditing(true)}>
          {t("why.sectionTitle")}
        </PrimaryButton>
      </Card>
    );
  }

  return (
    <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-monk-accent/20 px-2 py-0.5 text-[10px] font-bold text-monk-accent">
            {t("why.badgeWhy")}
          </span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">{t("why.sectionTitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-monk-accent transition hover:opacity-80"
        >
          {t("why.editButton")}
        </button>
      </div>

      {intrinsicWhy ? (
        <p className="text-base font-semibold leading-snug text-monk-text">{intrinsicWhy}</p>
      ) : null}

      {outcome ? (
        <div className="rounded-xl border border-monk-accent/30 bg-monk-bg/60 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-monk-accent">
            <span>{t("why.badgeOutcome")}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-monk-text-soft">{outcome}</p>
        </div>
      ) : null}

      {antiWhy ? (
        <div className="rounded-xl border border-monk-warning/25 bg-monk-warning/5 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-monk-warning">
            <span>{t("why.badgeAntiWhy")}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-monk-text-soft">{antiWhy}</p>
        </div>
      ) : null}

      {why?.protectValues?.length ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {why.protectValues.map((id) => {
            const v = CORE_VALUES.find((c) => c.id === id);
            return (
              <span
                key={id}
                className="rounded-full border border-monk-border bg-monk-soft px-2.5 py-1 text-[11px] text-monk-muted"
              >
                {(isId ? v?.labelId : v?.labelEn) ?? v?.label ?? id}
              </span>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
