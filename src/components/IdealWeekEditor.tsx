import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Plus, X } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import type { IdealBlock, TimeBlockCategory } from "../types/app";
import { getTodayDateString, parseLocalDateKey } from "../lib/date";
import { saveIdealWeek } from "../lib/weeklyPlanningStore";
import {
  calendarSegments,
  timeDuration,
  timeLabel,
  timeMinutes,
  WEEKDAYS,
} from "../lib/idealWeekCalendar";
import { TextInput, PrimaryButton, GhostButton } from "./ui";
import { usePlanningCopy } from "./PlanningControls";

const HOUR = 48;
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0];
const EMPTY_BLOCKS: IdealBlock[] = [];
const STYLES: Record<TimeBlockCategory, string> = {
  deep_work: "border-monk-cat-deep bg-monk-surface-raised text-monk-cat-deep",
  shallow:
    "border-monk-cat-shallow bg-monk-surface-raised text-monk-cat-shallow",
  learning:
    "border-monk-cat-learning bg-monk-surface-raised text-monk-cat-learning",
  rest: "border-monk-cat-rest bg-monk-surface-raised text-monk-cat-rest",
  personal:
    "border-monk-cat-personal bg-monk-surface-raised text-monk-cat-personal",
};
const control =
  "min-h-11 rounded-xl border px-3 text-sm transition active:scale-[0.98] motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent";

export function IdealWeekEditor({
  initiallyOpen = true,
  onClose,
}: {
  initiallyOpen?: boolean;
  onClose?: () => void;
}) {
  const c = usePlanningCopy();
  const refs = useMonkStore((s) => s.appSettings.idealWeek ?? EMPTY_BLOCKS);
  const dialog = useRef<HTMLDialogElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<IdealBlock | null>(null);
  const [baseline, setBaseline] = useState("");
  const [finish, setFinish] = useState("10:00");
  const [weekend, setWeekend] = useState(false);
  const [weekendStart, setWeekendStart] = useState("23:00");
  const [weekendEnd, setWeekendEnd] = useState("08:00");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [selectedDay, setSelectedDay] = useState(() =>
    parseLocalDateKey(getTodayDateString()).getDay(),
  );
  const [view, setView] = useState<"week" | "day">(() =>
    window.matchMedia("(min-width: 768px)").matches ? "week" : "day",
  );
  const days = [
    c("Min", "Sun"),
    c("Sen", "Mon"),
    c("Sel", "Tue"),
    c("Rab", "Wed"),
    c("Kam", "Thu"),
    c("Jum", "Fri"),
    c("Sab", "Sat"),
  ];
  const draftKey = JSON.stringify({
    editing,
    finish,
    weekend,
    weekendStart,
    weekendEnd,
  });
  const dirty = editing !== null && draftKey !== baseline;
  const duration = editing ? timeDuration(editing.startTime, finish) : 0;
  const canVaryWeekend =
    !!editing?.days.some((d) => d >= 1 && d <= 5) &&
    !!editing?.days.some((d) => d === 0 || d === 6);

  useEffect(() => {
    if (initiallyOpen && !dialog.current?.open) dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [initiallyOpen]);
  useEffect(() => {
    if (scroll.current)
      scroll.current.scrollTop = editing
        ? Math.max(0, (timeMinutes(editing.startTime) / 60) * HOUR - HOUR)
        : 6 * HOUR;
  }, [view, editing?.startTime]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function discard() {
    return (
      !dirty ||
      window.confirm(
        c(
          "Buang perubahan aktivitas yang belum disimpan?",
          "Discard unsaved activity changes?",
        ),
      )
    );
  }
  function close() {
    if (!discard()) return;
    dialog.current?.close();
    onClose?.();
  }
  function start(block?: IdealBlock, day?: number, hour = 9) {
    if (!discard()) return;
    const next: IdealBlock = block
      ? { ...block, days: [...block.days] }
      : {
          id: crypto.randomUUID(),
          title: "",
          days: day === undefined ? [...ALL_DAYS] : [day],
          startTime: timeLabel(hour * 60),
          duration: 60,
          category: "personal",
          flexible: true,
        };
    const end = timeLabel(timeMinutes(next.startTime) + next.duration);
    setEditing(next);
    setFinish(end);
    setWeekend(false);
    setWeekendStart("23:00");
    setWeekendEnd("08:00");
    setBaseline(
      JSON.stringify({
        editing: refs.some((block) => block.id === next.id)
          ? next
          : { ...next, title: "" },
        finish: end,
        weekend: false,
        weekendStart: "23:00",
        weekendEnd: "08:00",
      }),
    );
    setError("");
    setStatus("");
    requestAnimationFrame(() => {
      formRef.current?.querySelector("input")?.focus({ preventScroll: true });
      if (scroll.current)
        scroll.current.scrollTop = Math.max(
          0,
          (timeMinutes(next.startTime) / 60) * HOUR - HOUR,
        );
    });
  }
  const candidates: IdealBlock[] =
    editing && duration > 0 && editing.title.trim()
      ? [
          {
            ...editing,
            title: editing.title.trim(),
            duration,
            days:
              weekend && canVaryWeekend
                ? editing.days.filter((d) => d !== 0 && d !== 6)
                : editing.days,
          },
          ...(weekend &&
          canVaryWeekend &&
          timeDuration(weekendStart, weekendEnd) > 0
            ? [
                {
                  ...editing,
                  id: `${editing.id}:weekend`,
                  title: editing.title.trim(),
                  days: editing.days.filter((d) => d === 0 || d === 6),
                  startTime: weekendStart,
                  duration: timeDuration(weekendStart, weekendEnd),
                },
              ]
            : []),
        ]
      : [];
  const preview = editing
    ? [
        ...refs.filter(
          (b) =>
            b.id !== editing.id &&
            !candidates.some((candidate) => candidate.id === b.id),
        ),
        ...candidates,
      ]
    : refs;
  const previewIds = new Set(candidates.map((b) => b.id));

  function save() {
    if (!editing) return;
    if (
      !editing.title.trim() ||
      !editing.days.length ||
      !duration ||
      (weekend && canVaryWeekend && !timeDuration(weekendStart, weekendEnd))
    ) {
      setError(
        c(
          "Isi nama aktivitas, pilih minimal satu hari, dan gunakan jam mulai serta selesai yang berbeda.",
          "Enter an activity, choose at least one day, and use different start and end times.",
        ),
      );
      return;
    }
    try {
      const latest = useMonkStore.getState().appSettings.idealWeek ?? [];
      saveIdealWeek([
        ...latest.filter(
          (b) =>
            b.id !== editing.id &&
            !candidates.some((candidate) => candidate.id === b.id),
        ),
        ...candidates,
      ]);
      setEditing(null);
      setError("");
      setStatus(
        c(
          "Aktivitas tersimpan. Tambahkan rutinitas berikutnya saat siap.",
          "Activity saved. Add another routine when ready.",
        ),
      );
    } catch {
      setError(
        c(
          "Belum tersimpan. Periksa waktunya dan coba simpan lagi; isianmu tetap di sini.",
          "Not saved. Check the times and retry; your entries are still here.",
        ),
      );
    }
  }

  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby="ideal-week-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-hidden border-0 bg-monk-bg p-0 text-monk-text backdrop:bg-black/70"
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-monk-border px-4 py-3 sm:px-6">
          <div>
            <h2
              id="ideal-week-title"
              className="flex items-center gap-2 text-xl font-semibold"
            >
              <CalendarDays size={20} className="text-monk-accent" />
              Ideal Week
            </h2>
            <p className="mt-1 text-sm text-monk-muted">
              {c(
                "Susun rutinitas untuk minggu biasa.",
                "Build a rhythm for an ordinary week.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={c("Tutup Ideal Week", "Close Ideal Week")}
            className={`${control} border-monk-border hover:bg-monk-soft`}
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-hidden">
          <section
            className="sticky top-0 z-10 border-b border-monk-border bg-monk-bg lg:static lg:flex lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r"
            aria-label={c(
              "Preview kalender mingguan",
              "Weekly calendar preview",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-5">
              <div
                className="flex rounded-xl border border-monk-border p-1"
                aria-label={c("Tampilan kalender", "Calendar view")}
              >
                {(["week", "day"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={view === mode}
                    onClick={() => setView(mode)}
                    className={`min-h-9 rounded-lg px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent ${view === mode ? "bg-monk-soft text-monk-text" : "text-monk-muted"}`}
                  >
                    {mode === "week"
                      ? c("Seminggu", "Week")
                      : c("Sehari", "Day")}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => start()}
                className={`${control} flex items-center gap-1 border-monk-accent text-monk-accent hover:bg-monk-accent/10`}
              >
                <Plus size={16} />
                {c("Aktivitas", "Activity")}
              </button>
            </div>
            {view === "day" && (
              <div className="grid grid-cols-7 gap-1 px-3 pb-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selectedDay === day}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-11 rounded-lg text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent ${selectedDay === day ? "bg-monk-accent text-monk-bg" : "text-monk-muted hover:bg-monk-soft"}`}
                  >
                    {days[day]}
                  </button>
                ))}
              </div>
            )}
            <p className="px-4 pb-2 text-xs text-monk-muted">
              {view === "week"
                ? c(
                    "Pilih jam kosong. Geser kalender untuk melihat hari lainnya.",
                    "Choose an empty hour. Scroll to see other days.",
                  )
                : c(
                    "Pilih jam kosong untuk menambah aktivitas.",
                    "Choose an empty hour to add an activity.",
                  )}
            </p>
            <div
              ref={scroll}
              className="h-[35dvh] overflow-auto overscroll-contain lg:h-auto lg:min-h-0 lg:flex-1"
              tabIndex={0}
              aria-label={c(
                "Jam dan aktivitas kalender",
                "Calendar hours and activities",
              )}
            >
              <div className={view === "week" ? "min-w-[48rem]" : "min-w-0"}>
                <div
                  className="sticky top-0 z-20 grid border-y border-monk-border bg-monk-surface text-center text-sm"
                  style={{
                    gridTemplateColumns: `3rem repeat(${view === "week" ? 7 : 1}, minmax(0,1fr))`,
                  }}
                >
                  <span aria-hidden />
                  {(view === "week" ? WEEKDAYS : [selectedDay]).map((day) => (
                    <span key={day} className="py-2 font-medium">
                      {days[day]}
                    </span>
                  ))}
                </div>
                <div
                  className="grid py-2"
                  style={{
                    gridTemplateColumns: `3rem repeat(${view === "week" ? 7 : 1}, minmax(0,1fr))`,
                  }}
                >
                  <div aria-hidden className="relative">
                    {Array.from({ length: 25 }, (_, hour) => (
                      <span
                        key={hour}
                        className="absolute inset-x-0 -translate-y-1/2 pr-1 text-right font-mono text-xs tabular-nums text-monk-muted"
                        style={{ top: hour * HOUR }}
                      >
                        {hour === 24 ? "24:00" : timeLabel(hour * 60)}
                      </span>
                    ))}
                  </div>
                  {(view === "week" ? WEEKDAYS : [selectedDay]).map((day) => (
                    <div
                      key={day}
                      className="relative border-l border-monk-border after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:border-t after:border-monk-border/60"
                      style={{ height: 24 * HOUR }}
                    >
                      {Array.from({ length: 24 }, (_, hour) => (
                        <button
                          key={hour}
                          type="button"
                          data-slot={`${day}:${hour}`}
                          tabIndex={day === selectedDay && hour === 9 ? 0 : -1}
                          onKeyDown={(event) => {
                            const index = WEEKDAYS.indexOf(day);
                            const moves: Record<string, [number, number]> = {
                              ArrowUp: [day, Math.max(0, hour - 1)],
                              ArrowDown: [day, Math.min(23, hour + 1)],
                              ArrowLeft: [
                                WEEKDAYS[Math.max(0, index - 1)],
                                hour,
                              ],
                              ArrowRight: [
                                WEEKDAYS[Math.min(6, index + 1)],
                                hour,
                              ],
                            };
                            const target = moves[event.key];
                            if (!target) return;
                            event.preventDefault();
                            dialog.current
                              ?.querySelector<HTMLButtonElement>(
                                `[data-slot="${target[0]}:${target[1]}"]`,
                              )
                              ?.focus();
                          }}
                          aria-label={`${c("Tambah aktivitas", "Add activity")}, ${days[day]}, ${timeLabel(hour * 60)}`}
                          onClick={() => {
                            setSelectedDay(day);
                            start(undefined, day, hour);
                          }}
                          className="block w-full border-t border-monk-border/60 hover:bg-monk-accent/10 focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent"
                          style={{ height: HOUR }}
                        />
                      ))}
                      {calendarSegments(preview, day).map((part) => (
                        <button
                          key={`${part.block.id}:${part.continuation}`}
                          type="button"
                          onClick={() => {
                            if (previewIds.has(part.block.id)) {
                              formRef.current?.querySelector("input")?.focus();
                              return;
                            }
                            start(part.block);
                          }}
                          aria-label={`${part.block.title}, ${days[day]}, ${timeLabel(part.start)}–${part.end === 1440 ? "24:00" : timeLabel(part.end)}${previewIds.has(part.block.id) ? c(", pratinjau", ", preview") : ""}`}
                          className={`absolute z-10 overflow-hidden rounded-lg border-l-4 px-1.5 py-1 text-left text-xs leading-tight shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent ${STYLES[part.block.category]} ${previewIds.has(part.block.id) ? "border-y border-r border-dashed" : "border-y border-r border-monk-border"}`}
                          style={{
                            top: (part.start / 60) * HOUR,
                            height: Math.max(
                              24,
                              ((part.end - part.start) / 60) * HOUR,
                            ),
                            left: `calc(${(part.lane / part.lanes) * 100}% + 2px)`,
                            width: `calc(${100 / part.lanes}% - 4px)`,
                          }}
                        >
                          <span className="block font-semibold">
                            {previewIds.has(part.block.id) &&
                              `${c("Pratinjau", "Preview")} · `}
                            {part.block.title}
                          </span>
                          <span>
                            {timeLabel(part.start)}–
                            {part.end === 1440 ? "24:00" : timeLabel(part.end)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside
            className="bg-monk-surface p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:overflow-y-auto lg:p-5"
            aria-label={c("Form aktivitas", "Activity form")}
          >
            {editing ? (
              <form
                ref={formRef}
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  save();
                }}
              >
                <div>
                  <h3 className="text-lg font-semibold">
                    {refs.some((b) => b.id === editing.id)
                      ? c("Edit aktivitas", "Edit activity")
                      : c("Tambah aktivitas", "Add activity")}
                  </h3>
                  <p className="mt-1 text-sm text-monk-muted">
                    {c(
                      "Preview berubah saat kamu mengisi.",
                      "The preview updates as you fill this in.",
                    )}
                  </p>
                </div>
                <TextInput
                  label={c("Aktivitas", "Activity")}
                  required
                  maxLength={120}
                  placeholder={c("Contoh: Tidur", "For example: Sleep")}
                  value={editing.title}
                  onChange={(e) => {
                    setEditing({ ...editing, title: e.target.value });
                    setError("");
                  }}
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextInput
                    required
                    type="time"
                    label={c("Mulai", "Start")}
                    value={editing.startTime}
                    onChange={(e) =>
                      setEditing({ ...editing, startTime: e.target.value })
                    }
                  />
                  <TextInput
                    required
                    type="time"
                    label={c("Selesai", "End")}
                    value={finish}
                    onChange={(e) => setFinish(e.target.value)}
                  />
                </div>
                <p className="text-sm text-monk-muted">
                  {duration ? (
                    <>
                      {finish < editing.startTime &&
                        `${c("Melewati tengah malam", "Crosses midnight")} · `}
                      {Math.floor(duration / 60) > 0 &&
                        `${Math.floor(duration / 60)} ${c("jam", "hr")} `}
                      {duration % 60 > 0 &&
                        `${duration % 60} ${c("menit", "min")}`}
                    </>
                  ) : (
                    c(
                      "Pilih jam mulai dan selesai yang berbeda.",
                      "Choose different start and end times.",
                    )
                  )}
                </p>
                <fieldset className="space-y-3">
                  <legend className="mb-2 text-sm font-medium">
                    {c("Ulangi", "Repeat")}
                  </legend>
                  {finish < editing.startTime && duration > 0 && (
                    <p className="text-xs text-monk-muted">
                      {c(
                        "Bagian dini hari dan malam tampil pada hari yang dipilih.",
                        "Early-morning and evening portions appear on the selected days.",
                      )}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: c("Setiap hari", "Every day"), days: ALL_DAYS },
                      {
                        name: c("Hari kerja", "Weekdays"),
                        days: [1, 2, 3, 4, 5],
                      },
                      { name: c("Akhir pekan", "Weekends"), days: [6, 0] },
                    ].map((preset) => {
                      const selected =
                        editing.days.length === preset.days.length &&
                        preset.days.every((d) => editing.days.includes(d));
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setEditing({ ...editing, days: [...preset.days] })
                          }
                          className={`${control} ${selected ? "border-monk-accent bg-monk-accent/10 text-monk-accent" : "border-monk-border text-monk-muted"}`}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={editing.days.includes(day)}
                        aria-label={`${c("Ulangi", "Repeat")}: ${days[day]}`}
                        onClick={() =>
                          setEditing({
                            ...editing,
                            days: editing.days.includes(day)
                              ? editing.days.filter((d) => d !== day)
                              : [...editing.days, day],
                          })
                        }
                        className={`min-h-11 rounded-lg text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent ${editing.days.includes(day) ? "bg-monk-accent text-monk-bg" : "bg-monk-soft text-monk-muted"}`}
                      >
                        {days[day]}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {canVaryWeekend && (
                  <div className="space-y-3 border-t border-monk-border pt-4">
                    <label className="flex min-h-11 items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={weekend}
                        onChange={(e) => setWeekend(e.target.checked)}
                      />
                      {c(
                        "Jam berbeda di akhir pekan",
                        "Different weekend hours",
                      )}
                    </label>
                    {weekend && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <TextInput
                            type="time"
                            required
                            label={c("Mulai akhir pekan", "Weekend start")}
                            value={weekendStart}
                            onChange={(e) => setWeekendStart(e.target.value)}
                          />
                          <TextInput
                            type="time"
                            required
                            label={c("Selesai akhir pekan", "Weekend end")}
                            value={weekendEnd}
                            onChange={(e) => setWeekendEnd(e.target.value)}
                          />
                        </div>
                        <p className="text-xs text-monk-muted">
                          {c(
                            "Tersimpan sebagai dua pola waktu yang bisa diedit terpisah.",
                            "Saved as two time patterns you can edit separately.",
                          )}
                        </p>
                      </>
                    )}
                  </div>
                )}
                {error && (
                  <p role="alert" className="text-sm text-monk-danger">
                    {error}
                  </p>
                )}
                <PrimaryButton type="submit">
                  {c(
                    `Simpan ke ${editing.days.length} hari`,
                    `Save to ${editing.days.length} days`,
                  )}
                </PrimaryButton>
                <div className="flex flex-wrap justify-between gap-2">
                  <GhostButton
                    onClick={() => {
                      if (discard()) {
                        setEditing(null);
                        setError("");
                      }
                    }}
                  >
                    {c("Batal", "Cancel")}
                  </GhostButton>
                  {refs.some((b) => b.id === editing.id) && (
                    <GhostButton
                      onClick={() => {
                        if (
                          !window.confirm(
                            c(
                              "Hapus aktivitas berulang ini?",
                              "Delete this repeating activity?",
                            ),
                          )
                        )
                          return;
                        try {
                          saveIdealWeek(
                            (
                              useMonkStore.getState().appSettings.idealWeek ??
                              []
                            ).filter((b) => b.id !== editing.id),
                          );
                          setEditing(null);
                          setStatus(
                            c("Aktivitas dihapus.", "Activity deleted."),
                          );
                          setError("");
                        } catch {
                          setError(
                            c(
                              "Belum terhapus. Coba lagi.",
                              "Not deleted. Try again.",
                            ),
                          );
                        }
                      }}
                    >
                      {c("Hapus aktivitas", "Delete activity")}
                    </GhostButton>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold">
                    {c(
                      "Mulai dari rutinitas yang pasti.",
                      "Start with a familiar routine.",
                    )}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-monk-muted">
                    {c(
                      "Pilih aktivitas, tentukan jamnya, lalu ulangi pada hari pilihanmu.",
                      "Choose an activity, set its hours, then repeat it on selected days.",
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      title: c("Tidur", "Sleep"),
                      start: "22:00",
                      duration: 480,
                      category: "rest",
                    },
                    {
                      title: c("Kerja / kuliah", "Work / study"),
                      start: "08:00",
                      duration: 540,
                      category: "deep_work",
                    },
                    {
                      title: c("Makan", "Meal"),
                      start: "12:00",
                      duration: 60,
                      category: "personal",
                    },
                    {
                      title: c("Olahraga", "Exercise"),
                      start: "17:30",
                      duration: 60,
                      category: "personal",
                    },
                  ].map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      className={`${control} border-monk-border bg-monk-bg text-left hover:border-monk-accent`}
                      onClick={() =>
                        start({
                          id: crypto.randomUUID(),
                          title: preset.title,
                          days: [...ALL_DAYS],
                          startTime: preset.start,
                          duration: preset.duration,
                          category: preset.category as TimeBlockCategory,
                          flexible: true,
                        })
                      }
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
                <PrimaryButton onClick={() => start()}>
                  {c("Aktivitas sendiri", "Custom activity")}
                </PrimaryButton>
                <p className="text-xs leading-relaxed text-monk-muted">
                  {c(
                    "Kalender ini pola mingguan. Bloknya muncul sebagai saran di Agenda; tambahkan ke jadwal saat cocok.",
                    "This calendar is a weekly pattern. Blocks appear as Agenda suggestions; add them when they fit.",
                  )}
                </p>
                {status && (
                  <p role="status" className="text-sm text-monk-success">
                    {status}
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
