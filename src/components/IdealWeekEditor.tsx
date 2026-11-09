import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, CalendarDays, Plus, X } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import type { IdealBlock, TimeBlockCategory } from "../types/app";
import { getTodayDateString, parseLocalDateKey } from "../lib/date";
import { deleteIdealWeek, upsertIdealWeek } from "../lib/weeklyPlanningStore";
import {
  calendarSegments,
  idealWeekColorStyle,
  timeDuration,
  timeLabel,
  timeMinutes,
  WEEKDAYS,
} from "../lib/idealWeekCalendar";
import { TextInput, PrimaryButton, GhostButton } from "./ui";
import { usePlanningCopy } from "./PlanningControls";
import { IdealWeekActivities, IdealWeekDeleteControl } from "./IdealWeekActivities";
import { IdealWeekColorPicker } from "./IdealWeekColorPicker";

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
  const detailRef = useRef<HTMLDivElement>(null);
  const [inspected, setInspected] = useState<{ id: string; day: number; continuation: boolean } | null>(null);
  const [editing, setEditing] = useState<IdealBlock | null>(null);
  const [splitId, setSplitId] = useState("");
  const [baseline, setBaseline] = useState("");
  const [finish, setFinish] = useState("10:00");
  const [weekend, setWeekend] = useState(false);
  const [weekendStart, setWeekendStart] = useState("23:00");
  const [weekendEnd, setWeekendEnd] = useState("08:00");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false);
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
        : Math.max(0, Math.min(6 * 60, ...WEEKDAYS.flatMap(day =>
            calendarSegments(refs, day).map(part => part.start),
          )) / 60 * HOUR - HOUR);
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
    setInspected(null);
    setMobileCalendarOpen(false);
    const next: IdealBlock = block
      ? { ...block, days: day === undefined ? [...block.days] : [day] }
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
    setSplitId(crypto.randomUUID());
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
  const original = refs.find(block => block.id === editing?.id);
  const untouchedDays = original?.days.filter(day => !editing?.days.includes(day)) ?? [];
  const candidateId = untouchedDays.length ? splitId : editing?.id;
  const candidates: IdealBlock[] =
    editing && duration > 0 && editing.title.trim()
      ? [
          {
            ...editing,
            id: candidateId!,
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
                  id: `${candidateId}:weekend`,
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
        ...(original && untouchedDays.length ? [{ ...original, days: untouchedDays }] : []),
        ...candidates,
      ]
    : refs;
  const previewIds = new Set(candidates.map((b) => b.id));
  const visibleDays = view === "week" ? WEEKDAYS : [selectedDay];
  const segments = visibleDays.map(day => ({ day, parts: calendarSegments(preview, day) }));
  // Each overlap lane keeps enough space for a title instead of wrapping every word.
  const gridColumns = `3rem ${segments.map(({ parts }) =>
    `minmax(${Math.max(view === "week" ? 120 : 0, ...parts.map(part => part.lanes * 96))}px,1fr)`,
  ).join(" ")}`;
  const hasOverlaps = segments.some(({ parts }) => parts.some(part => part.lanes > 1));
  const inspectedPart = inspected ? calendarSegments(preview, inspected.day).find(part =>
    part.block.id === inspected.id && part.continuation === inspected.continuation,
  ) : undefined;

  function editCalendarBlock(block: IdealBlock, day?: number) {
    if (previewIds.has(block.id)) {
      if (day !== undefined) setEditing(current => current ? { ...current, days: [day] } : current);
      formRef.current?.querySelector("input")?.focus();
      return;
    }
    start(block, day);
  }

  function cancelEdit() {
    if (!discard()) return;
    setEditing(null);
    setError("");
  }
  function remove(block: IdealBlock) {
    deleteIdealWeek(block.id, block.days);
    if (editing?.id === block.id) setEditing(null);
    setError("");
    setStatus(c(`“${block.title}” dihapus.`, `“${block.title}” deleted.`));
  }

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
      upsertIdealWeek(editing.id, candidates, original ? editing.days : undefined);
      setEditing(null);
      setError("");
      setStatus(
        c(
          "Aktivitas tersimpan. Tambahkan rutinitas berikutnya saat siap.",
          "Activity saved. Add another routine when ready.",
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message === "duplicate" ? c(
          "Aktivitas dengan nama dan jam yang sama sudah ada pada hari pilihanmu. Kembali ke daftar untuk mengedit aktivitas tersebut.",
          "An activity with this name and time already exists on the selected days. Return to the list to edit it.",
        ) : c(
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
      onKeyDown={event => {
        if (event.key === "Escape" && inspected) {
          event.preventDefault();
          event.stopPropagation();
          setInspected(null);
        }
      }}
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
          {editing && (
            <button type="button" aria-expanded={mobileCalendarOpen} aria-controls="ideal-week-calendar" onClick={() => setMobileCalendarOpen(open => !open)} className="flex min-h-11 w-full items-center justify-center gap-2 border-b border-monk-border text-sm text-monk-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent lg:hidden">
              <CalendarDays size={16} aria-hidden />
              {mobileCalendarOpen ? c("Sembunyikan kalender", "Hide calendar") : c("Tampilkan kalender", "Show calendar")}
            </button>
          )}
          <section
            id="ideal-week-calendar"
            className={`${editing && !mobileCalendarOpen ? "hidden lg:flex" : ""} border-b border-monk-border bg-monk-bg lg:flex lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r`}
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
                {c("Tambah aktivitas", "Add activity")}
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
                    "Pilih blok untuk detail atau edit. Pilih jam kosong untuk menambah. Geser untuk melihat hari lain.",
                    "Choose a block for details or editing. Choose an empty hour to add. Scroll to see other days.",
                  )
                : c(
                    "Pilih jam kosong untuk menambah aktivitas.",
                    "Choose an empty hour to add an activity.",
                  )}
            </p>
            {hasOverlaps && (
              <p className="px-4 pb-2 text-xs text-monk-warning">
                {c("Ada aktivitas bersamaan. Edit jam atau hapus melalui daftar aktivitas.", "Some activities overlap. Edit their times or delete them from the activity list.")}
              </p>
            )}
            <div
              ref={scroll}
              className="h-[35dvh] overflow-auto overscroll-contain lg:h-auto lg:min-h-0 lg:flex-1"
              tabIndex={0}
              aria-label={c(
                "Jam dan aktivitas kalender",
                "Calendar hours and activities",
              )}
            >
              <div className="min-w-full w-max">
                <div
                  className="sticky top-0 z-20 grid border-y border-monk-border bg-monk-surface text-center text-sm"
                  style={{
                    gridTemplateColumns: gridColumns,
                  }}
                >
                  <span aria-hidden />
                  {visibleDays.map((day) => (
                    <span key={day} className="py-2 font-medium">
                      {days[day]}
                    </span>
                  ))}
                </div>
                <div
                  className="grid py-2"
                  style={{
                    gridTemplateColumns: gridColumns,
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
                  {segments.map(({ day, parts }) => (
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
                      {parts.map((part) => (
                        <button
                          key={`${part.block.id}:${part.continuation}`}
                          type="button"
                          onMouseEnter={() => setInspected({ id: part.block.id, day, continuation: part.continuation })}
                          onFocus={() => setInspected({ id: part.block.id, day, continuation: part.continuation })}
                          onClick={() => {
                            setSelectedDay(day);
                            if (part.end - part.start < 60) {
                              setInspected({ id: part.block.id, day, continuation: part.continuation });
                              requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: "nearest" }));
                              return;
                            }
                            editCalendarBlock(part.block, day);
                          }}
                          aria-label={`${part.block.title}, ${days[day]}, ${timeLabel(part.start)}–${part.end === 1440 ? "24:00" : timeLabel(part.end)}${previewIds.has(part.block.id) ? c(", pratinjau", ", preview") : ""}`}
                          title={`${part.block.title} · ${timeLabel(part.start)}–${part.end === 1440 ? "24:00" : timeLabel(part.end)} · ${part.end - part.start < 60 ? c("Ketuk untuk detail", "Tap for details") : c("Klik untuk edit", "Click to edit")}`}
                          aria-describedby={inspected?.id === part.block.id && inspected.day === day && inspected.continuation === part.continuation ? "ideal-week-detail-text" : undefined}
                          className={`absolute z-10 flex flex-col items-start overflow-hidden rounded-lg border-l-2 px-2 ${part.end - part.start < 60 ? "justify-center py-0" : "justify-start py-2"} text-left text-xs leading-tight transition-colors hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent ${idealWeekColorStyle(part.block.color) ? "bg-monk-surface-raised text-monk-text" : STYLES[part.block.category]} ${previewIds.has(part.block.id) ? "border-y border-r border-dashed" : "border-y border-r border-monk-border"}`}
                          style={{
                            ...idealWeekColorStyle(part.block.color),
                            top: (part.start / 60) * HOUR,
                            height: Math.max(
                              24,
                              ((part.end - part.start) / 60) * HOUR,
                            ),
                            left: `calc(${(part.lane / part.lanes) * 100}% + 2px)`,
                            width: `calc(${100 / part.lanes}% - 4px)`,
                          }}
                        >
                          <span className="block w-full shrink-0 truncate font-semibold">
                            {part.block.title}
                          </span>
                          {part.end - part.start >= 60 && <span className="mt-1 block w-full shrink-0 truncate tabular-nums">
                            {timeLabel(part.start)}–
                            {part.end === 1440 ? "24:00" : timeLabel(part.end)}
                          </span>}
                          {previewIds.has(part.block.id) && part.end - part.start >= 90 && (
                            <span className="mt-2 text-xs font-medium">{c("Pratinjau", "Preview")}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div ref={detailRef} className="flex h-24 shrink-0 items-center gap-3 border-t border-monk-border bg-monk-surface px-4 py-3" aria-label={c("Detail aktivitas kalender", "Calendar activity details")}>
              {inspectedPart && inspected ? (
                <>
                  <div id="ideal-week-detail-text" tabIndex={0} className="max-h-full min-w-0 flex-1 overflow-y-auto rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent">
                    <p className="break-words text-sm font-semibold text-monk-text">{inspectedPart.block.title}</p>
                    <p className="mt-1 text-xs tabular-nums text-monk-muted">{days[inspected.day]} · {timeLabel(inspectedPart.start)}–{inspectedPart.end === 1440 ? "24:00" : timeLabel(inspectedPart.end)} · {inspectedPart.end - inspectedPart.start} {c("menit", "min")}</p>
                  </div>
                  <button type="button" className={`${control} shrink-0 border-monk-border text-monk-accent hover:bg-monk-soft`} onClick={() => editCalendarBlock(inspectedPart.block, inspected.day)}>{c("Edit", "Edit")}</button>
                  <button type="button" aria-label={c("Tutup detail aktivitas", "Close activity details")} className={`${control} shrink-0 border-transparent px-2 text-monk-muted hover:bg-monk-soft`} onClick={() => setInspected(null)}><X size={16} aria-hidden /></button>
                </>
              ) : <p className="text-sm text-monk-muted">{c("Sorot, fokuskan, atau ketuk blok kecil untuk melihat nama dan waktu lengkap.", "Hover, focus, or tap a small block to see its full name and time.")}</p>}
            </div>
          </section>

          <aside
            className="min-w-0 bg-monk-surface p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:min-h-0 lg:overflow-hidden lg:p-5"
            aria-label={c("Form aktivitas", "Activity form")}
          >
            {editing ? (
              <form
                ref={formRef}
                className="flex flex-col lg:h-full lg:min-h-0"
                aria-describedby={error ? "ideal-week-error" : undefined}
                onSubmit={(e) => {
                  e.preventDefault();
                  save();
                }}
              >
                <div className="min-h-0 space-y-4 lg:flex-1 lg:overflow-y-auto lg:pr-1">
                  <button type="button" onClick={cancelEdit} className="flex min-h-11 items-center gap-2 rounded-lg text-sm text-monk-muted hover:text-monk-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent">
                    <ArrowLeft size={16} aria-hidden />{c("Daftar aktivitas", "Activity list")}
                  </button>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {refs.some((b) => b.id === editing.id)
                        ? c("Edit aktivitas", "Edit activity")
                        : c("Tambah aktivitas", "Add activity")}
                    </h3>
                    <p className="mt-1 text-sm text-monk-muted">
                      {c(
                        "Sesuaikan nama, jam, dan warna untuk hari pilihanmu. Hari lain tetap seperti semula.",
                        "Customize the name, time, and color for selected days. Other days stay as they are.",
                      )}
                    </p>
                  </div>
                  {original && (
                    <fieldset className="space-y-3 rounded-xl border border-monk-border bg-monk-bg p-3">
                      <legend className="px-1 text-sm font-medium text-monk-text">{c("Terapkan perubahan ke", "Apply changes to")}</legend>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: c(`${days[selectedDay]} saja`, `${days[selectedDay]} only`), days: [selectedDay] },
                          { name: c("Hari kerja", "Weekdays"), days: [1, 2, 3, 4, 5] },
                          { name: c("Akhir pekan", "Weekends"), days: [6, 0] },
                          { name: c("Semua hari", "All days"), days: original.days },
                        ].map(scope => {
                          const target = scope.days.filter(day => original.days.includes(day));
                          const active = target.length === editing.days.length && target.every(day => editing.days.includes(day));
                          return <button key={scope.name} type="button" disabled={!target.length} aria-pressed={active} onClick={() => setEditing({ ...editing, days: target })} className={`${control} disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-monk-accent bg-monk-accent/10 text-monk-accent" : "border-monk-border text-monk-muted hover:bg-monk-soft"}`}>{scope.name}</button>;
                        })}
                      </div>
                      <p className="text-xs leading-relaxed text-monk-muted">{c("Nama, jam, dan warna hanya berubah pada hari yang dipilih.", "Name, time, and color change only on the selected days.")}</p>
                    </fieldset>
                  )}
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
                  <IdealWeekColorPicker color={editing.color} onChange={color => setEditing({ ...editing, color })} />
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
                      {original ? c("Hari yang diubah", "Days to change") : c("Ulangi", "Repeat")}
                    </legend>
                    {finish < editing.startTime && duration > 0 && (
                      <p className="text-xs text-monk-muted">
                        {c(
                          "Bagian dini hari dan malam tampil pada hari yang dipilih.",
                          "Early-morning and evening portions appear on the selected days.",
                        )}
                      </p>
                    )}
                    {!original && <div className="flex flex-wrap gap-2">
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
                    </div>}
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
                </div>
                <div className="sticky bottom-0 z-20 -mx-4 mt-4 shrink-0 space-y-3 border-t border-monk-border bg-monk-surface px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:px-0 lg:pb-0">
                {error && (
                  <p id="ideal-week-error" role="alert" className="text-sm text-monk-danger">
                    {error}
                  </p>
                )}
                <PrimaryButton type="submit">
                    {original ? c(`Simpan untuk ${editing.days.length} hari`, `Save for ${editing.days.length} days`) : c(
                    `Simpan ke ${editing.days.length} hari`,
                    `Save to ${editing.days.length} days`,
                  )}
                </PrimaryButton>
                <div className="flex flex-wrap justify-between gap-2">
                  <GhostButton
                    onClick={cancelEdit}
                  >
                    {c("Batal", "Cancel")}
                  </GhostButton>
                  {refs.some((b) => b.id === editing.id) && (
                    <IdealWeekDeleteControl key={editing.id} block={editing} onDelete={() => remove(editing)} />
                  )}
                </div>
                </div>
              </form>
            ) : (
              <div className="space-y-5 lg:h-full lg:overflow-y-auto lg:pr-1">
                {status && <p role="status" className="text-sm text-monk-success">{status}</p>}
                {refs.length > 0 && <IdealWeekActivities blocks={refs} days={days} onEdit={block => start(block)} onDelete={remove} />}
                <PrimaryButton onClick={() => start()} className="inline-flex items-center justify-center gap-2">
                  <Plus size={18} aria-hidden />{c("Tambah aktivitas", "Add activity")}
                </PrimaryButton>
                <details open={refs.length === 0} className="border-t border-monk-border pt-4">
                <summary className="cursor-pointer rounded-lg py-2 text-sm font-medium text-monk-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent">{c("Mulai dari template", "Start from a template")}</summary>
                <div className="mt-3 space-y-4">
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
                      onClick={() => {
                        const existing = refs.find(block => block.title.trim().toLocaleLowerCase() === preset.title.toLocaleLowerCase());
                        start(existing ?? {
                          id: crypto.randomUUID(),
                          title: preset.title,
                          days: [...ALL_DAYS],
                          startTime: preset.start,
                          duration: preset.duration,
                          category: preset.category as TimeBlockCategory,
                          flexible: true,
                        });
                      }}
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
                </div>
                </details>
                <p className="text-xs leading-relaxed text-monk-muted">
                  {c(
                    "Kalender ini pola mingguan. Bloknya muncul sebagai saran di Agenda; tambahkan ke jadwal saat cocok.",
                    "This calendar is a weekly pattern. Blocks appear as Agenda suggestions; add them when they fit.",
                  )}
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
