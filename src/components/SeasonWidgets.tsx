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
  parseLocalDateKey,
  getDaysLeft,
  getDaysPassed,
  getSeasonProgress,
} from "../lib/date";
import { selectActiveGoals } from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import { useT, useLanguage } from "../i18n";
import type { SeasonWhy } from "../types/app";

export function SeasonProgressCard({
  compact = false,
  onOpenGoal
}: {
  compact?: boolean;
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
  const daysPassed = getDaysPassed(activeSeason.startDate);
  const daysLeft = getDaysLeft(activeSeason.endDate);
  const progress = getSeasonProgress(activeSeason);
  const goals = selectActiveGoals(store);
  return (
    <Card className="bg-monk-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold truncate">{activeSeason.name}</p>
        <p className="shrink-0 font-mono text-xs text-monk-accent">{t("season.daysLeft", { n: daysLeft })}</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-monk-border">
        <div className="h-full rounded-full bg-monk-accent transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-sm text-monk-muted">
        {compact
          ? `${t("season.dayNumber", { n: daysPassed })} · ${t("season.daysLeft", { n: daysLeft })}`
          : `${t("season.dayOf", { day: daysPassed, total: activeSeason.durationDays })} · ${t("season.ends", { date: parseLocalDateKey(activeSeason.endDate).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { month: "short", day: "numeric" }) })}`}
      </p>
      {!compact && goals.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {goals.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => onOpenGoal?.(goal.id)}
              disabled={!onOpenGoal}
              aria-label={t("blueprint.openButton")}
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
