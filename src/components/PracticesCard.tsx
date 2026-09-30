import { useState } from "react";
import { Check, Plus, Repeat, X } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { hapticPress } from "../lib/haptics";
import { getTodayDateString } from "../lib/date";

/**
 * §23-24: the positive-practice layer.
 *
 * Deliberately NOT a streak board. The evidence (§24, and `focusStreak.ts`
 * before it) is that streak counters turn a missed day into a reason to quit —
 * the miss-twice rule lives in the streak logic for exactly that reason. So this
 * shows "done N times this week" against the target, and a missed day simply
 * isn't counted. Nothing turns red, nothing resets to zero.
 */
export function PracticesCard() {
  const t = useT();
  const store = useMonkStore();
  const today = getTodayDateString();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [targetDays, setTargetDays] = useState(7);

  const season = store.activeSeason;
  const practices = store.practices.filter(
    (p) => p.status !== "archived" && (!season || p.seasonId === season.id)
  );

  if (!season) return null;

  // Week window (Mon–Sun) containing today, for the "N of target" readout.
  const weekStart = (() => {
    const d = new Date(`${today}T00:00:00`);
    const day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day);
    return getTodayDateString(d);
  })();
  const weekEnd = (() => {
    const d = new Date(`${weekStart}T00:00:00`);
    d.setDate(d.getDate() + 6);
    return getTodayDateString(d);
  })();

  const doneThisWeek = (practiceId: string) =>
    store.practiceLogs.filter(
      (l) => l.practiceId === practiceId && l.date >= weekStart && l.date <= weekEnd
    ).length;

  const isDoneToday = (practiceId: string) =>
    store.practiceLogs.some((l) => l.practiceId === practiceId && l.date === today);

  const handleAdd = () => {
    const created = store.addPractice({ name, weeklyTargetCount: targetDays });
    if (created) {
      hapticPress("light");
      setName("");
      setTargetDays(7);
      setAdding(false);
    }
  };

  return (
    <details className="group rounded-monk border border-monk-border bg-monk-surface transition-all duration-200 ease-monk hover:border-monk-border-strong open:border-monk-border-strong">
      <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold text-monk-muted hover:text-monk-text marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Repeat size={15} className="text-monk-accent" />
          <span>{t("practice.heading")}</span>
          {practices.length > 0 ? (
            <span className="rounded-full bg-monk-soft px-2 py-0.5 font-mono text-[11px] text-monk-accent">
              {practices.length}
            </span>
          ) : null}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-monk-muted">{t("practice.subtitle")}</span>
          <span className="text-monk-muted transition-transform duration-200 group-open:rotate-90">›</span>
        </span>
      </summary>

      <div className="space-y-3 border-t border-monk-border p-4 pt-3">
        {practices.length === 0 && !adding ? (
          <p className="text-xs leading-relaxed text-monk-muted">{t("practice.empty")}</p>
        ) : null}

        {practices.map((practice) => {
          const done = isDoneToday(practice.id);
          const count = doneThisWeek(practice.id);
          const met = count >= practice.weeklyTargetCount;
          return (
            <div
              key={practice.id}
              className="flex items-center gap-3 rounded-2xl border border-monk-border bg-monk-soft/40 p-3"
            >
              <button
                type="button"
                aria-pressed={done}
                aria-label={done ? t("practice.markUndone") : t("practice.markDone")}
                onClick={() => {
                  hapticPress(done ? "light" : "success");
                  store.togglePracticeLog(practice.id, today);
                }}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition active:scale-90 ${
                  done
                    ? "border-monk-success bg-monk-success text-monk-bg"
                    : "border-monk-border/90 bg-monk-surface text-monk-muted hover:border-monk-accent hover:text-monk-accent"
                }`}
              >
                {done ? <Check size={15} strokeWidth={2.6} /> : null}
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-monk-text">{practice.name}</p>
                {/* A count, never a streak — a missed day subtracts nothing. */}
                <p className="mt-0.5 text-[11px] font-medium text-monk-muted">
                  {met
                    ? t("practice.targetMet", { target: practice.weeklyTargetCount })
                    : t("practice.progress", { count, target: practice.weeklyTargetCount })}
                </p>
              </div>

              <button
                type="button"
                aria-label={t("practice.remove")}
                onClick={() => {
                  hapticPress("medium");
                  store.removePractice(practice.id);
                }}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-monk-muted/60 transition hover:bg-monk-soft hover:text-monk-danger"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}

        {adding ? (
          <div className="space-y-2.5 rounded-2xl border border-monk-accent/30 bg-monk-accent/[0.04] p-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder={t("practice.namePlaceholder")}
              className="w-full rounded-xl border border-monk-border bg-monk-surface px-3 py-2 text-sm text-monk-text placeholder:text-monk-muted/60 focus:border-monk-accent focus:outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[11px] font-medium text-monk-muted">
                {t("practice.daysPerWeek")}
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={targetDays}
                  onChange={(e) => setTargetDays(Number(e.target.value))}
                  className="h-1 w-24 accent-monk-accent"
                />
                <span className="font-mono text-monk-text-soft">{targetDays}</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-monk-muted transition hover:text-monk-text"
                >
                  {t("dialog.cancel")}
                </button>
                <button
                  type="button"
                  disabled={!name.trim()}
                  onClick={handleAdd}
                  className="rounded-lg bg-monk-accent px-3 py-1.5 text-xs font-semibold text-monk-bg transition enabled:active:scale-95 disabled:opacity-40"
                >
                  {t("practice.add")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-monk-border text-xs font-semibold text-monk-muted transition hover:border-monk-accent hover:text-monk-accent"
          >
            <Plus size={13} />
            <span>{t("practice.addNew")}</span>
          </button>
        )}
      </div>
    </details>
  );
}
