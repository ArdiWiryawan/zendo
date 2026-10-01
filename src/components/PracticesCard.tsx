import { useState } from "react";
import { CalendarDays, CalendarRange, Check, ChevronDown, Plus, Repeat, X } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useLanguage, useT } from "../i18n";
import { hapticPress } from "../lib/haptics";
import { getTodayDateString } from "../lib/date";
import { practiceMonthView, practiceSeasonView, practiceWeekView } from "../lib/practiceHistory";

/**
 * §23-24: the positive-practice layer.
 *
 * Deliberately NOT a streak board. The evidence (§24, and `focusStreak.ts`
 * before it) is that streak counters turn a missed day into a reason to quit —
 * the miss-twice rule lives in the streak logic for exactly that reason. So this
 * shows "done N times this week" against the target, and a missed day simply
 * isn't counted. Nothing turns red, nothing resets to zero.
 *
 * §52: progressive disclosure. The card opens on exactly that one weekly count.
 * The Week / Month / Season switcher is something the user reaches for on
 * purpose — §40's three scales answer three different questions (what did I do,
 * what pattern is emerging, did the system support what mattered), so they are
 * opt-in rather than three dashboards stacked at once.
 */
export function PracticesCard() {
  const t = useT();
  const lang = useLanguage();
  const store = useMonkStore();
  const today = getTodayDateString();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [targetDays, setTargetDays] = useState(7);
  /** `null` is the default concise weekly count; a scale is opened deliberately. */
  const [scale, setScale] = useState<"week" | "month" | "season" | null>(null);

  const season = store.activeSeason;
  const practices = store.practices.filter(
    (p) => p.status !== "archived" && (!season || p.seasonId === season.id)
  );

  if (!season) return null;

  const WEEKDAY_NAMES =
    lang === "en"
      ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
      : ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

  const SCALES = [
    { id: "week" as const, label: lang === "en" ? "Week" : "Minggu", Icon: CalendarDays },
    { id: "month" as const, label: lang === "en" ? "Month" : "Bulan", Icon: CalendarRange },
    { id: "season" as const, label: lang === "en" ? "Season" : "Musim", Icon: CalendarRange }
  ];

  const weekStart = (() => {
    const d = new Date(`${today}T00:00:00`);
    const day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day);
    return getTodayDateString(d);
  })();

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

        {practices.length > 0 ? (
          <div className="space-y-2">
            {/* §52: a low-key control, not a call to action. Closed by default,
                so the card is still just the weekly count until asked. */}
            <button
              type="button"
              onClick={() => {
                hapticPress("light");
                setScale(scale ? null : "week");
              }}
              aria-expanded={scale !== null}
              className="flex items-center gap-1.5 text-[11px] font-medium text-monk-muted transition hover:text-monk-accent"
            >
              <CalendarRange size={13} />
              <span>{scale ? (lang === "en" ? "Hide history" : "Sembunyikan riwayat") : lang === "en" ? "See history" : "Lihat riwayat"}</span>
              <ChevronDown
                size={13}
                className={`transition-transform ${scale ? "rotate-180" : ""}`}
              />
            </button>

            {scale ? (
              <>
                <div
                  role="group"
                  aria-label={lang === "en" ? "History scale" : "Skala riwayat"}
                  className="flex items-center gap-1 rounded-xl border border-monk-border bg-monk-soft/40 p-1"
                >
                  {SCALES.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        hapticPress("light");
                        setScale(id);
                      }}
                      aria-pressed={scale === id}
                      className={`flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold transition ${
                        scale === id
                          ? "bg-monk-surface text-monk-text shadow-sm"
                          : "text-monk-muted hover:text-monk-text"
                      }`}
                    >
                      <Icon size={12} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                {/* §40: each scale states the question it answers, so the three
                    read as different lenses rather than one dashboard tripled. */}
                <p className="px-0.5 text-[11px] leading-relaxed text-monk-muted">
                  {scale === "week"
                    ? lang === "en"
                      ? "What did I do, day by day."
                      : "Apa yang kulakukan, hari demi hari."
                    : scale === "month"
                      ? lang === "en"
                        ? "What pattern is emerging."
                        : "Pola apa yang mulai terlihat."
                      : lang === "en"
                        ? "Did the system support what mattered."
                        : "Apakah sistem mendukung hal yang penting."}
                </p>
              </>
            ) : null}
          </div>
        ) : null}

        {practices.length > 0 && scale ? (
          <div className="space-y-2 rounded-2xl border border-monk-border bg-monk-soft/30 p-3">
            {practices.map((practice) => {
              if (scale === "week") {
                const view = practiceWeekView(store.practiceLogs, practice, weekStart);
                const labels =
                  lang === "en"
                    ? ["M", "T", "W", "T", "F", "S", "S"]
                    : ["S", "S", "R", "K", "J", "S", "M"];
                return (
                  <div key={practice.id} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-monk-text">{practice.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-monk-muted">
                        {view.done} / {view.target}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {view.days.map((day, index) => (
                        <span
                          key={day.date}
                          title={day.date}
                          aria-label={`${day.date}${day.done ? "" : lang === "en" ? " not done" : " belum"}`}
                          className={`grid h-6 flex-1 place-items-center rounded-md border font-mono text-[10px] ${
                            day.done
                              ? "border-monk-success/40 bg-monk-success/15 text-monk-success"
                              : "border-monk-border/60 bg-monk-surface text-monk-muted/40"
                          }`}
                        >
                          {day.done ? <Check size={11} strokeWidth={3} /> : labels[index]}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }

              if (scale === "month") {
                const view = practiceMonthView(store.practiceLogs, practice, today);
                const peak = Math.max(view.modalWeekdayCount, 1);
                const sessionLabel = lang === "en" ? "sessions" : "sesi";
                return (
                  <div key={practice.id} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-monk-text">{practice.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-monk-muted">
                        {view.done} / {view.target} {sessionLabel}
                      </span>
                    </div>
                    {/* The histogram is a count per weekday, never a rate. */}
                    <div className="flex items-end gap-1" aria-hidden="true">
                      {view.byWeekday.map((count, index) => (
                        <span key={index} className="flex flex-1 flex-col items-center gap-1">
                          <span className="flex h-6 w-full items-end">
                            <span
                              className="w-full rounded-sm bg-monk-accent/35"
                              style={{ height: `${count === 0 ? 2 : Math.max(4, (count / peak) * 24)}px` }}
                            />
                          </span>
                          <span className="font-mono text-[9px] text-monk-muted/70">
                            {WEEKDAY_NAMES[index].slice(0, 2)}
                          </span>
                        </span>
                      ))}
                    </div>
                    {/* Only claimed when there is enough data to mean it. */}
                    {view.modalWeekday !== null ? (
                      <p className="text-[11px] leading-relaxed text-monk-muted">
                        {lang === "en"
                          ? `You usually show up on ${WEEKDAY_NAMES[view.modalWeekday]}.`
                          : `Kamu biasanya hadir hari ${WEEKDAY_NAMES[view.modalWeekday]}.`}
                      </p>
                    ) : (
                      <p className="text-[11px] leading-relaxed text-monk-muted/70">
                        {lang === "en"
                          ? "Not enough yet to see a pattern — that is fine."
                          : "Belum cukup untuk melihat pola — tidak masalah."}
                      </p>
                    )}
                  </div>
                );
              }

              const view = practiceSeasonView(store.practiceLogs, practice, season);
              return (
                <div key={practice.id} className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-monk-text">{practice.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-monk-muted">
                    {view.done} / {view.target}{" "}
                    {lang === "en" ? `over ${view.weeks} weeks` : `dalam ${view.weeks} minggu`}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {practices.map((practice) => {
          const done = isDoneToday(practice.id);
          const count = practiceWeekView(store.practiceLogs, practice, weekStart).done;
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
