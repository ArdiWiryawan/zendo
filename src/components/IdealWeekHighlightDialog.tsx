import { useEffect, useRef, useState } from "react";
import { Star, X } from "lucide-react";
import type { IdealBlock } from "../types/app";
import { useMonkStore } from "../store/useMonkStore";
import { setIdealWeekHighlight } from "../lib/idealWeekHighlight";
import { usePlanningCopy } from "./PlanningControls";
import { PrimaryButton, TextInput } from "./ui";

export function IdealWeekHighlightDialog({ block, initialDate, onClose, onSaved }: {
  block: IdealBlock;
  initialDate: string;
  onClose: () => void;
  onSaved: (title: string, date: string) => void;
}) {
  const c = usePlanningCopy();
  const dialog = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState(initialDate);
  const [error, setError] = useState("");
  const season = useMonkStore(s => s.activeSeason);
  const existing = useMonkStore(s => s.dayPlans.find(plan => plan.date === date && plan.seasonId === season?.id)?.highlight);
  const replacing = !!existing?.trim() && existing.trim() !== block.title.trim();
  useEffect(() => {
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={dialog} aria-labelledby="ideal-highlight-title" onCancel={event=>{event.preventDefault();event.stopPropagation();onClose();}} onKeyDown={event=>{if(event.key==="Escape")event.stopPropagation();}} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-monk-border bg-monk-surface p-5 text-monk-text shadow-xl backdrop:bg-black/70">
    <div className="mb-5 flex items-start justify-between gap-3">
      <div><h3 id="ideal-highlight-title" className="flex items-center gap-2 text-lg font-semibold"><Star size={18} className="text-monk-accent" aria-hidden />{c("Highlight dari Ideal Week", "Highlight from Ideal Week")}</h3><p className="mt-2 break-words text-sm leading-relaxed text-monk-muted">{block.title}</p></div>
      <button type="button" aria-label={c("Tutup pilihan Highlight", "Close Highlight selection")} onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-monk-muted hover:bg-monk-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent"><X size={18} aria-hidden /></button>
    </div>
    <form className="space-y-4" onSubmit={event=>{
      event.preventDefault();
      try { const title=setIdealWeekHighlight(block.id,date,replacing);onSaved(title,date); }
      catch(cause){setError(cause instanceof Error && cause.message==="day" ? c("Pilih tanggal pada hari aktivitas ini dijadwalkan di Ideal Week.","Choose a date on a weekday scheduled for this activity in Ideal Week.") : cause instanceof Error && cause.message==="highlight-exists" ? c("Tanggal ini sudah punya Highlight. Periksa nilainya, lalu pilih lagi untuk menggantinya.","This date already has a Highlight. Review it before choosing to replace it.") : c("Belum tersimpan. Pilih tanggal dalam musim aktif dan coba lagi.","Not saved. Choose a date in the active season and try again."));}
    }}>
      <TextInput type="date" required label={c("Tanggal Highlight", "Highlight date")} value={date} min={season?.startDate} max={season?.endDate} onChange={event=>{setDate(event.target.value);setError("");}} />
      <p className="text-sm leading-relaxed text-monk-muted">{c("Aktivitas menjadi prioritas pada tanggal pilihanmu. Pola Ideal Week tetap tersimpan.", "This activity becomes the priority on your selected date. Your Ideal Week pattern stays saved.")}</p>
      {existing?.trim() && <p className="break-words rounded-lg border border-monk-border bg-monk-bg p-3 text-sm leading-relaxed text-monk-muted">{c("Highlight saat ini: ","Current Highlight: ")}<span className="font-medium text-monk-text">{existing}</span>{replacing && <span className="mt-1 block text-monk-warning">{c("Highlight ini akan diganti saat kamu menyimpan.","This Highlight will be replaced when you save.")}</span>}</p>}
      {error && <p role="alert" className="text-sm text-monk-danger">{error}</p>}
      <PrimaryButton type="submit">{replacing ? c("Ganti Highlight", "Replace Highlight") : c("Jadikan Highlight", "Set as Highlight")}</PrimaryButton>
    </form>
  </dialog>;
}
