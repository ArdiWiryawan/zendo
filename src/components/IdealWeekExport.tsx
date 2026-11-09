import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import type { IdealBlock } from "../types/app";
import { addDaysToDate, getTodayDateString } from "../lib/date";
import { generateIdealWeekIcs } from "../lib/idealWeekExport";
import { downloadIcsText } from "../lib/ical";
import { usePlanningCopy } from "./PlanningControls";
import { PrimaryButton, TextInput } from "./ui";

export function IdealWeekExport({ blocks, onClose }: { blocks: IdealBlock[]; onClose: () => void }) {
  const c = usePlanningCopy();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { panel.current?.focus(); }, []);
  const [start, setStart] = useState(getTodayDateString);
  const [end, setEnd] = useState(() => addDaysToDate(getTodayDateString(), 27));
  const [downloaded, setDownloaded] = useState(false);
  const [failure, setFailure] = useState(false);
  const result = useMemo(() => {
    try {
      const content = generateIdealWeekIcs(blocks, start, end);
      return { content, count: (content.match(/BEGIN:VEVENT/g) ?? []).length };
    } catch { return null; }
  }, [blocks, start, end]);
  return <div ref={panel} tabIndex={-1} aria-label={c("Ekspor Ideal Week", "Export Ideal Week")} className="space-y-5 outline-none lg:h-full lg:overflow-y-auto lg:pr-1">
    <button type="button" onClick={onClose} className="flex min-h-11 items-center gap-2 rounded-lg text-sm text-monk-muted hover:text-monk-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent"><ArrowLeft size={16} aria-hidden />{c("Daftar aktivitas", "Activity list")}</button>
    <div><h3 className="text-lg font-semibold">{c("Ekspor ke Google Calendar", "Export to Google Calendar")}</h3><p className="mt-2 text-sm leading-relaxed text-monk-muted">{c("Unduh pola Ideal Week yang sudah disimpan sebagai file .ics. Pilih tanggal yang ingin dimasukkan.", "Download your saved Ideal Week pattern as an .ics file. Choose the dates to include.")}</p></div>
    <div className="grid grid-cols-2 gap-3">
      <TextInput type="date" label={c("Tanggal mulai", "Start date")} value={start} onChange={e=>{setStart(e.target.value);setDownloaded(false);}} />
      <TextInput type="date" label={c("Tanggal selesai", "End date")} min={start} value={end} onChange={e=>{setEnd(e.target.value);setDownloaded(false);}} />
    </div>
    <div className="flex flex-wrap gap-2">{[1,4,12].map(weeks=><button key={weeks} type="button" disabled={!start} onClick={()=>{try {setEnd(addDaysToDate(start,weeks*7-1));setDownloaded(false);} catch {setFailure(true);}}} className="min-h-11 rounded-lg border border-monk-border px-3 text-sm text-monk-text hover:bg-monk-soft disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent">{weeks} {c("minggu", "weeks")}</button>)}</div>
    {!result ? <p role="alert" className="text-sm text-monk-danger">{c("Pilih rentang tanggal valid, maksimal 366 hari.", "Choose a valid date range, up to 366 days.")}</p> : <p className="text-sm text-monk-muted">{result.count} {c("blok kalender", "calendar events")} · {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>}
    {result?.count === 0 && <p className="text-sm text-monk-muted">{c("Tidak ada aktivitas pada rentang ini. Tambahkan aktivitas atau pilih tanggal lain.", "No activities in this range. Add an activity or choose different dates.")}</p>}
    <PrimaryButton disabled={!result?.count} className="inline-flex items-center justify-center gap-2 disabled:opacity-40" onClick={()=>{
      if (!result?.count) return;
      try {downloadIcsText(`zendo-ideal-week-${start}-${end}.ics`,result.content);setDownloaded(true);setFailure(false);} catch {setFailure(true);}
    }}><Download size={18} aria-hidden />{c("Unduh file .ics", "Download .ics file")}</PrimaryButton>
    {downloaded && <p role="status" className="text-sm text-monk-success">{c("File siap diunduh. Lanjutkan impor di Google Calendar.", "File ready to download. Continue importing in Google Calendar.")}</p>}
    {failure && <p role="alert" className="text-sm text-monk-danger">{c("Unduhan belum berhasil. Periksa tanggal dan coba lagi.", "Download failed. Check the dates and try again.")}</p>}
    <div className="space-y-3 border-t border-monk-border pt-4">
      <h4 className="text-sm font-semibold">{c("Cara impor di komputer", "Import on a computer")}</h4>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-monk-muted">
        <li>{c("Buka Google Calendar, lalu Pengaturan → Impor & ekspor.", "Open Google Calendar, then Settings → Import & export.")}</li>
        <li>{c("Pilih file .ics yang diunduh dan kalender tujuan.", "Choose the downloaded .ics file and destination calendar.")}</li>
        <li>{c("Klik Impor. Aktivitas muncul sesuai tanggal pilihanmu.", "Click Import. Events appear on your selected dates.")}</li>
      </ol>
      <a href="https://calendar.google.com/calendar/u/0/r/settings/export" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-monk-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent">{c("Buka impor Google Calendar", "Open Google Calendar import")}<ExternalLink size={14} aria-hidden /></a>
      <p className="text-xs leading-relaxed text-monk-muted">{c("File berisi salinan jadwal pada rentang ini, bukan sinkronisasi otomatis. Warna kustom mungkin tidak dipertahankan saat impor. Aktivitas lintas tengah malam dibagi sesuai tampilan Ideal Week.", "This file is a snapshot for this date range, not automatic sync. Custom colors may not be preserved on import. Overnight activities are split to match Ideal Week.")}</p>
      <a href="https://support.google.com/calendar/answer/37118" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-xs text-monk-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent">{c("Panduan resmi Google", "Official Google guide")}</a>
    </div>
  </div>;
}
