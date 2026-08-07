import { useState } from "react";
import { Flame } from "lucide-react";
import {
  Card,
  ChoiceCard,
  PrimaryButton,
  SecondaryButton,
  Textarea,
} from "./ui";
import { CORE_VALUES } from "../constants/whyValues";
import {
  formatHumanDate,
  getDaysLeft,
  getDaysPassed,
  getSeasonProgress,
} from "../lib/date";
import { getFocusStreak } from "../lib/focusStreak";
import { selectActiveGoals } from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";

export function SeasonProgressCard({ compact = false }: { compact?: boolean }) {
  const store = useMonkStore();
  const t = useT();
  const { activeSeason } = store;
  if (!activeSeason) return null;
  const daysPassed = getDaysPassed(activeSeason.startDate);
  const daysLeft = getDaysLeft(activeSeason.endDate);
  const progress = getSeasonProgress(activeSeason);
  const { count, best } = getFocusStreak(store);
  const goals = selectActiveGoals(store);
  return (
    <Card className="bg-monk-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold truncate">{activeSeason.name}</p>
        <p className="shrink-0 font-mono text-xs text-monk-accent">{daysLeft}d left</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-monk-border">
        <div className="h-full rounded-full bg-monk-accent transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-sm text-monk-muted">
        {compact
          ? `Day ${daysPassed} · ${daysLeft}d left`
          : `Day ${daysPassed} of ${activeSeason.durationDays} · ends ${formatHumanDate(activeSeason.endDate)}`}
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-monk-muted">
        <Flame size={13} strokeWidth={1.5} className="text-monk-warning" />
        <span className="font-medium text-monk-text-soft">
          {count === 1 ? t("season.streak", { n: count }) : t("season.streakPlural", { n: count })}
        </span>
        {best > count ? (
          <span className="font-mono text-monk-muted/80">{t("season.bestStreak", { n: best })}</span>
        ) : null}
      </p>
      {!compact && goals.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {goals.map((goal) => (
            <span key={goal.id} className="rounded-full border border-monk-border bg-monk-soft px-3 py-1 text-xs text-monk-muted">
              {goal.title}
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

/** One-line why for friction moments (focus start, relapse). */
export function FrictionWhy({ className = "" }: { className?: string }) {
  const why = useMonkStore((s) => s.activeSeason?.why);
  if (!why?.identity && !why?.consequenceOfInaction) return null;
  return (
    <div className={`rounded-xl border border-monk-accent/20 bg-monk-accent-soft/30 px-3 py-2.5 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">Remember why</p>
      {why.identity ? (
        <p className="mt-1 text-sm font-medium leading-5 text-monk-text line-clamp-2">{why.identity}</p>
      ) : null}
      {why.consequenceOfInaction ? (
        <p className="mt-1 text-xs leading-5 text-monk-muted line-clamp-2">
          If you stop: {why.consequenceOfInaction}
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
  initial?: { identity?: string; consequenceOfInaction?: string; protectValues?: string[] };
  onSave: (why: { identity: string; consequenceOfInaction: string; protectValues: string[] }) => void;
  onCancel: () => void;
}) {
  const [identity, setIdentity] = useState(initial?.identity ?? "");
  const [consequence, setConsequence] = useState(initial?.consequenceOfInaction ?? "");
  const [protect, setProtect] = useState<string[]>(initial?.protectValues ?? []);
  const canSave = identity.trim().length >= 10 || consequence.trim().length >= 10;

  const toggleValue = (id: string) => {
    setProtect((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  return (
    <div className="space-y-4">
      <Textarea
        label="Who are you becoming?"
        value={identity}
        onChange={(e) => setIdentity(e.target.value)}
        rows={3}
        showCharCount
        minLength={10}
        placeholder="e.g. Someone who ships daily and protects deep work"
      />
      <Textarea
        label="If you stop, what happens?"
        value={consequence}
        onChange={(e) => setConsequence(e.target.value)}
        rows={3}
        showCharCount
        minLength={10}
        placeholder="e.g. Another year of the same stuck loop"
      />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Protect (up to 3)</p>
          <span className="text-xs font-bold text-monk-muted">{protect.length}/3</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CORE_VALUES.map((v) => (
            <ChoiceCard
              key={v.id}
              title={v.label}
              selected={protect.includes(v.id)}
              onClick={() => toggleValue(v.id)}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <SecondaryButton className="flex-1" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          className="flex-1"
          disabled={!canSave}
          onClick={() =>
            onSave({
              identity: identity.trim(),
              consequenceOfInaction: consequence.trim(),
              protectValues: protect
            })
          }
        >
          Save why
        </PrimaryButton>
      </div>
    </div>
  );
}

/** Full why card — Timeline. Always visible; empty invites add. */
export function WhyCard() {
  const store = useMonkStore();
  const why = store.activeSeason?.why;
  const [editing, setEditing] = useState(false);
  const hasWhy = !!(why?.identity || why?.consequenceOfInaction);

  if (editing) {
    return (
      <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-monk-accent">
          {hasWhy ? "Edit why" : "Add your why"}
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
        <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">Your why</p>
        <p className="mt-2 text-sm leading-6 text-monk-muted">
          No why yet. Capture identity + cost of stopping so daily work stays meaningful.
        </p>
        <PrimaryButton className="mt-4" onClick={() => setEditing(true)}>
          Add why
        </PrimaryButton>
      </Card>
    );
  }

  return (
    <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">Your why</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-monk-accent transition hover:opacity-80"
        >
          Edit
        </button>
      </div>
      {why!.identity ? (
        <p className="mt-2 text-base font-semibold leading-6 text-monk-text">{why!.identity}</p>
      ) : null}
      {why!.consequenceOfInaction ? (
        <div className="mt-3 rounded-2xl border border-monk-border/70 bg-monk-bg/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-monk-muted">If you stop</p>
          <p className="mt-1 text-sm leading-5 text-monk-text-soft">{why!.consequenceOfInaction}</p>
        </div>
      ) : null}
      {why!.protectValues?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {why!.protectValues.map((id) => {
            const v = CORE_VALUES.find((c) => c.id === id);
            return (
              <span
                key={id}
                className="rounded-full border border-monk-border bg-monk-soft px-2.5 py-1 text-[11px] text-monk-muted"
              >
                {v?.label ?? id}
              </span>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
