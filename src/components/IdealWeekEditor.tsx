import { useEffect, useRef, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import type { IdealBlock, TimeBlockCategory } from "../types/app";
import { getTodayDateString, parseLocalDateKey } from "../lib/date";
import { saveIdealWeek } from "../lib/weeklyPlanningStore";
import { TextInput, PrimaryButton, GhostButton } from "./ui";
import { planningField, usePlanningCopy } from "./PlanningControls";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const CALENDAR_START = 6;
const CALENDAR_END = 24;
const HOUR_HEIGHT = 32;
const CALENDAR_HEIGHT = (CALENDAR_END - CALENDAR_START) * HOUR_HEIGHT;

const EVENT_STYLES: Record<TimeBlockCategory, string> = {
  deep_work: "border-monk-cat-deep/40 bg-monk-cat-deep/15 text-monk-cat-deep",
  shallow: "border-monk-cat-shallow/40 bg-monk-cat-shallow/15 text-monk-cat-shallow",
  learning: "border-monk-cat-learning/40 bg-monk-cat-learning/15 text-monk-cat-learning",
  rest: "border-monk-cat-rest/40 bg-monk-cat-rest/15 text-monk-cat-rest",
  personal: "border-monk-cat-personal/40 bg-monk-cat-personal/15 text-monk-cat-personal",
};

function endTime(block: IdealBlock) {
  const [hours, minutes] = block.startTime.split(":").map(Number);
  const end = Math.min(24 * 60, hours * 60 + minutes + block.duration);
  return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
}

export function IdealWeekEditor() {
  const c = usePlanningCopy();
  const store = useMonkStore();
  const refs = store.appSettings.idealWeek ?? [];
  const [editing, setEditing] = useState<IdealBlock | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDialogElement>(null);
  const days = [
    c("Min", "Sun"),
    c("Sen", "Mon"),
    c("Sel", "Tue"),
    c("Rab", "Wed"),
    c("Kam", "Thu"),
    c("Jum", "Fri"),
    c("Sab", "Sat"),
  ];
  const todayIndex = parseLocalDateKey(getTodayDateString()).getDay();
  const previewRefs = editing
    ? [...refs.filter((ref) => ref.id !== editing.id), ...(editing.title.trim() ? [editing] : [])]
    : refs;

  useEffect(() => {
    const dialog = calendarRef.current;
    if (!dialog) return;
    if (calendarOpen && !dialog.open) dialog.showModal();
    if (!calendarOpen && dialog.open) dialog.close();
  }, [calendarOpen]);

  function save(next: IdealBlock[]) {
    try {
      saveIdealWeek(next);
      setError("");
      setEditing(null);
      setStatus(c("Ideal Week tersimpan.", "Ideal Week saved."));
    } catch {
      setError(
        c(
          "Belum tersimpan. Cek aktivitas, hari, waktu, dan durasi, lalu coba lagi.",
          "Not saved. Check activity, days, time and duration, then retry.",
        ),
      );
    }
  }

  function startNew() {
    setEditing({
      id: crypto.randomUUID(),
      title: "",
      days: [todayIndex, (todayIndex + 1) % 7],
      startTime: "09:00",
      duration: 60,
      category: "deep_work",
      flexible: true,
    });
    setError("");
    setStatus("");
  }

  return (
    <details className="space-y-4" id="ideal-week-editor">
      <summary className="cursor-pointer py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent">
        {c("Ideal Week", "Ideal Week")}
      </summary>
      <p className="text-sm text-monk-muted">
        {c(
          "Template mingguan fleksibel. Hari yang dipilih otomatis muncul sebagai saran di Agenda.",
          "A flexible weekly template. Selected days appear as suggestions in Agenda.",
        )}
      </p>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-monk-border bg-monk-surface px-3 text-sm font-medium text-monk-text transition hover:bg-monk-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent"
        >
          <CalendarDays size={16} />
          {c("Preview kalender", "Calendar preview")}
        </button>
        {!editing && (
          <button
            type="button"
            onClick={startNew}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-monk-accent text-xl font-medium text-monk-bg transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent focus-visible:outline-offset-2"
            aria-label={c("Tambah aktivitas", "Add activity")}
            title={c("Tambah aktivitas", "Add activity")}
          >
            +
          </button>
        )}
      </div>

      <div className="space-y-2">
        {WEEK_ORDER.map((dayIndex) => {
          const dayBlocks = previewRefs
            .filter((block) => block.days.includes(dayIndex))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <section key={dayIndex} aria-label={days[dayIndex]} className="border-b border-monk-border/70 pb-2 last:border-0">
              <h3 className="mb-1 text-sm font-semibold">{days[dayIndex]}</h3>
              {dayBlocks.length ? (
                <ul className="space-y-1">
                  {dayBlocks.map((block) => (
                    <li key={block.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-monk-soft/40">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium">{block.title}</p>
                        <p className="text-xs text-monk-muted">
                          {block.startTime} · {block.duration} {c("menit", "min")}
                          {block.flexible ? ` · ${c("fleksibel", "flexible")}` : ""}
                        </p>
                      </div>
                      <GhostButton
                        aria-label={`${c("Edit", "Edit")} ${block.title}`}
                        onClick={() => { setEditing({ ...block }); setError(""); setStatus(""); }}
                      >
                        {c("Edit", "Edit")}
                      </GhostButton>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 py-1 text-xs text-monk-muted">—</p>
              )}
            </section>
          );
        })}
      </div>

      <dialog
        ref={calendarRef}
        aria-labelledby="ideal-week-calendar-title"
        onCancel={(event) => { event.preventDefault(); setCalendarOpen(false); }}
        onClose={() => setCalendarOpen(false)}
        className="m-auto max-h-[88dvh] w-[min(96vw,72rem)] max-w-none overflow-hidden rounded-2xl border border-monk-border bg-monk-surface p-0 text-monk-text shadow-xl backdrop:bg-black/70"
      >
        <div className="flex items-center justify-between gap-4 border-b border-monk-border px-4 py-3 sm:px-6">
          <div>
            <h2 id="ideal-week-calendar-title" className="text-base font-semibold">{c("Preview kalender", "Calendar preview")}</h2>
            <p className="text-xs text-monk-muted">{c("Mingguan · Senin sampai Minggu", "Weekly · Monday through Sunday")}</p>
          </div>
          <button
            type="button"
            onClick={() => setCalendarOpen(false)}
            aria-label={c("Tutup preview kalender", "Close calendar preview")}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-monk-muted transition hover:bg-monk-soft hover:text-monk-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(88dvh-4.5rem)] overflow-auto overscroll-contain p-3 sm:p-5" role="region" aria-label={c("Jadwal Ideal Week", "Ideal Week schedule")} tabIndex={0}>
          <div className="min-w-[48rem] overflow-hidden rounded-xl border border-monk-border bg-monk-surface">
            <div className="sticky top-0 z-10 grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] border-b border-monk-border bg-monk-surface-raised text-center text-xs font-semibold">
              <span className="py-3" aria-hidden />
              {WEEK_ORDER.map((dayIndex) => (
                <span key={dayIndex} className="py-3 text-monk-muted">{days[dayIndex]}</span>
              ))}
            </div>
            <div className="relative grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]" style={{ height: CALENDAR_HEIGHT }}>
              {Array.from({ length: CALENDAR_END - CALENDAR_START + 1 }, (_, index) => {
                const hour = CALENDAR_START + index;
                const top = index * HOUR_HEIGHT;
                return (
                  <div key={hour} className="pointer-events-none absolute inset-x-0 z-0 flex items-start" style={{ top }}>
                    <span className="w-[3.25rem] -translate-y-1/2 pr-2 text-right font-mono text-[11px] tabular-nums text-monk-muted">
                      {String(hour).padStart(2, "0")}:00
                    </span>
                    <span className="flex-1 border-t border-monk-border/60" />
                  </div>
                );
              })}
              {WEEK_ORDER.map((dayIndex) => {
                const blocks = previewRefs
                  .filter((block) => block.days.includes(dayIndex))
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                return (
                  <div key={dayIndex} className="relative col-span-1 border-l border-monk-border/50 first:border-l-0" style={{ gridColumn: WEEK_ORDER.indexOf(dayIndex) + 2 }}>
                    {blocks.map((block) => {
                      const [hours, minute] = block.startTime.split(":").map(Number);
                      const start = hours * 60 + minute;
                      const end = start + block.duration;
                      const top = Math.max(0, (start - CALENDAR_START * 60) * HOUR_HEIGHT / 60);
                      const bottom = Math.min(CALENDAR_END * 60, end);
                      const height = Math.max(24, (bottom - Math.max(start, CALENDAR_START * 60)) * HOUR_HEIGHT / 60 - 2);
                      return (
                        <button
                          key={block.id}
                          type="button"
                          title={`${block.title} · ${block.startTime}–${endTime(block)}`}
                          aria-label={`${block.title}, ${days[dayIndex]}, ${block.startTime}–${endTime(block)}`}
                          onClick={() => { setEditing({ ...block }); setError(""); setStatus(""); setCalendarOpen(false); }}
                          className={`absolute inset-x-1 z-[1] overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-[11px] leading-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent ${EVENT_STYLES[block.category]}`}
                          style={{ top, height }}
                        >
                          <span className="block font-semibold">{block.startTime}</span>
                          <span className="line-clamp-2 block">{block.title}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              {previewRefs.length === 0 && (
                <p className="absolute inset-0 z-[2] grid place-items-center px-6 text-center text-sm text-monk-muted">
                  {c("Tambah aktivitas untuk melihat preview minggu.", "Add an activity to preview your week.")}
                </p>
              )}
            </div>
          </div>
        </div>
      </dialog>

      {editing && (
        <form
          className="space-y-4 rounded-xl border border-monk-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!editing.days.length) {
              setError(c("Pilih minimal satu hari.", "Choose at least one day."));
              return;
            }
            save([...refs.filter((ref) => ref.id !== editing.id), editing]);
          }}
        >
          <TextInput
            required
            label={c("Aktivitas", "Activity")}
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
          />
          <fieldset>
            <legend className="mb-2 text-sm">{c("Ulangi di", "Repeat on")}</legend>
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                { label: c("Hari ini", "Today"), value: [todayIndex] },
                { label: c("Hari ini + besok", "Today + tomorrow"), value: [todayIndex, (todayIndex + 1) % 7] },
                { label: c("Hari kerja", "Weekdays"), value: [1, 2, 3, 4, 5] },
              ].map((preset) => {
                const selected = preset.value.length === editing.days.length && preset.value.every((day) => editing.days.includes(day));
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setEditing({ ...editing, days: preset.value })}
                    className={`min-h-10 rounded-full border px-3 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent ${selected ? "border-monk-accent bg-monk-accent/15 text-monk-accent" : "border-monk-border text-monk-muted hover:text-monk-text"}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {days.map((day, index) => (
                <label key={day} className="flex min-h-11 items-center gap-2 rounded-xl border border-monk-border px-3 text-sm has-[:checked]:border-monk-accent has-[:checked]:bg-monk-accent/10">
                  <input
                    type="checkbox"
                    checked={editing.days.includes(index)}
                    onChange={(e) => setEditing({
                      ...editing,
                      days: e.target.checked
                        ? [...editing.days, index].sort((a, b) => a - b)
                        : editing.days.filter((value) => value !== index),
                    })}
                  />
                  {day}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-monk-muted">
              {c("Muncul otomatis di Agenda pada hari terpilih.", "Appears in Agenda on selected days.")}
            </p>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              required
              type="time"
              label={c("Mulai", "Start")}
              value={editing.startTime}
              onChange={(e) => setEditing({ ...editing, startTime: e.target.value })}
            />
            <TextInput
              required
              type="number"
              min={1}
              max={1440}
              label={c("Durasi (menit)", "Duration (min)")}
              value={String(editing.duration)}
              onChange={(e) => setEditing({ ...editing, duration: Number(e.target.value) })}
            />
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer py-2 text-monk-muted">{c("Opsi tambahan", "More options")}</summary>
            <div className="space-y-3 pt-3">
              <label className="block space-y-2">
                <span>{c("Goal (opsional)", "Goal (optional)")}</span>
                <select
                  className={planningField}
                  value={editing.goalId ?? ""}
                  onChange={(e) => setEditing({ ...editing, goalId: e.target.value || undefined })}
                >
                  <option value="">{c("Tanpa tautan", "No link")}</option>
                  {store.goals.filter((goal) => goal.status === "active" && goal.seasonId === store.activeSeason?.id).map((goal) => (
                    <option key={goal.id} value={goal.id}>{goal.title}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span>{c("Practice (opsional)", "Practice (optional)")}</span>
                <select
                  className={planningField}
                  value={editing.practiceId ?? ""}
                  onChange={(e) => setEditing({ ...editing, practiceId: e.target.value || undefined })}
                >
                  <option value="">{c("Tanpa tautan", "No link")}</option>
                  {store.practices.filter((practice) => practice.status === "active").map((practice) => (
                    <option key={practice.id} value={practice.id}>{practice.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={editing.flexible}
                  onChange={(e) => setEditing({ ...editing, flexible: e.target.checked })}
                />
                {c("Waktu fleksibel", "Flexible time")}
              </label>
            </div>
          </details>
          <p className="text-xs text-monk-muted">
            {c("Template hanya memberi saran. Jadwal aktual berubah setelah kamu menambahkannya dari Agenda.", "Template only suggests blocks. Actual schedule changes when you add one from Agenda.")}
          </p>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton type="submit">{c("Simpan", "Save")}</PrimaryButton>
            <GhostButton onClick={() => { setEditing(null); setError(""); }}>
              {c("Batal", "Cancel")}
            </GhostButton>
            {refs.some((ref) => ref.id === editing.id) && (
              <GhostButton
                onClick={() => {
                  if (window.confirm(c("Hapus aktivitas berulang ini? Jadwal aktual tetap.", "Remove this repeating activity? Actual schedule stays."))) {
                    save(refs.filter((ref) => ref.id !== editing.id));
                  }
                }}
              >
                {c("Hapus", "Remove")}
              </GhostButton>
            )}
          </div>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-monk-danger">{error}</p>}
      {status && <p role="status" className="text-sm text-monk-muted">{status}</p>}
    </details>
  );
}
