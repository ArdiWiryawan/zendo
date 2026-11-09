import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { IdealBlock } from "../types/app";
import { isIdealWeekColor, timeLabel, timeMinutes, WEEKDAYS } from "../lib/idealWeekCalendar";
import { usePlanningCopy } from "./PlanningControls";

const action = "min-h-11 rounded-lg px-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent";

export function IdealWeekDeleteControl({ block, onDelete }: {
  block: IdealBlock;
  onDelete: () => void;
}) {
  const c = usePlanningCopy();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  return confirming ? (
    <div className="w-full space-y-2 rounded-xl border border-monk-danger/40 bg-monk-bg p-3" role="group" aria-label={c("Konfirmasi hapus", "Confirm deletion")}>
      <p className="break-words text-sm text-monk-text">
        {c(`Hapus “${block.title}” dari ${block.days.length} hari?`, `Delete “${block.title}” from ${block.days.length} days?`)}
      </p>
      <p className="text-xs text-monk-muted">{c("Jadwal aktual di Agenda tetap tersimpan.", "Actual Agenda events stay saved.")}</p>
      {error && <p role="alert" className="text-sm text-monk-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${action} bg-monk-danger text-monk-bg hover:opacity-90`} onClick={() => {
          try { onDelete(); setConfirming(false); }
          catch { setError(c("Belum terhapus. Coba lagi.", "Not deleted. Try again.")); }
        }}>{c("Ya, hapus aktivitas", "Yes, delete activity")}</button>
        <button type="button" className={`${action} text-monk-muted hover:bg-monk-soft`} onClick={() => { setConfirming(false); setError(""); }}>{c("Batal hapus", "Cancel deletion")}</button>
      </div>
    </div>
  ) : (
    <button type="button" aria-label={c(`Hapus ${block.title}`, `Delete ${block.title}`)} className={`${action} inline-flex shrink-0 items-center justify-center gap-2 text-monk-danger hover:bg-monk-danger/10`} onClick={() => setConfirming(true)}>
      <Trash2 size={16} aria-hidden />{c("Hapus", "Delete")}
    </button>
  );
}

export function IdealWeekActivities({ blocks, days, onEdit, onDelete }: {
  blocks: IdealBlock[];
  days: string[];
  onEdit: (block: IdealBlock) => void;
  onDelete: (block: IdealBlock) => void;
}) {
  const c = usePlanningCopy();
  return (
    <section aria-labelledby="ideal-activities-title">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 id="ideal-activities-title" className="text-lg font-semibold">{c("Aktivitasmu", "Your activities")}</h3>
        <span className="text-sm tabular-nums text-monk-muted">{blocks.length}</span>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-monk-muted">{c("Edit jam atau kurangi hari pengulangan. Hapus rutinitas yang tidak dipakai.", "Edit times or reduce repeat days. Delete routines you no longer need.")}</p>
      <ul className="divide-y divide-monk-border">
        {[...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((block) => (
          <li key={block.id} data-activity-id={block.id} className="flex flex-wrap items-center gap-x-2 gap-y-3 py-3">
            <button type="button" aria-label={c(`Edit ${block.title}`, `Edit ${block.title}`)} onClick={() => onEdit(block)} className="group min-h-11 min-w-0 flex-1 rounded-lg py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent">
              <span className="flex items-center gap-2 text-sm font-semibold text-monk-text group-hover:text-monk-accent"><span aria-hidden className="h-3 w-3 shrink-0 rounded-full border border-monk-border bg-monk-accent" style={isIdealWeekColor(block.color) ? { backgroundColor: block.color } : undefined} /><span className="min-w-0 break-words">{block.title}</span><Pencil size={14} className="shrink-0 text-monk-muted" aria-hidden /></span>
              <span className="mt-1 block text-sm tabular-nums text-monk-muted">{block.startTime}–{timeLabel(timeMinutes(block.startTime) + block.duration)}</span>
              <span className="mt-1 block text-xs leading-relaxed text-monk-muted">{WEEKDAYS.filter(day => block.days.includes(day)).map(day => days[day]).join(" · ")}</span>
            </button>
            <IdealWeekDeleteControl block={block} onDelete={() => onDelete(block)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
