import { useState } from "react";
import { useMonkStore } from "../store/useMonkStore";
import {
  adjustOccurrence,
  occurrenceDetails,
  undoPlanningChange,
  type Adjustment,
} from "../lib/weeklyPlanning";
import { persistPlanningChange } from "../lib/weeklyPlanningStore";
import type { MonkMVPState, TimeBlock } from "../types/app";
import { TextInput, PrimaryButton, GhostButton } from "./ui";
import { planningField, usePlanningCopy } from "./PlanningControls";

export function ScheduleAdjustments({ date }: { date: string }) {
  const c = usePlanningCopy();
  const store = useMonkStore();
  const blocks =
    store.dayPlans.find(
      (d) => d.seasonId === store.activeSeason?.id && d.date === date,
    )?.timeBlocks ?? [];
  const [selected, setSelected] = useState<TimeBlock | null>(null);
  const [origin, setOrigin] = useState({
    date,
    startTime: "09:00",
    duration: 30,
  });
  const [openedParts, setOpenedParts] = useState("");
  const [previewParts, setPreviewParts] = useState("");
  const [kind, setKind] = useState<Adjustment["kind"]>("reschedule");
  const [target, setTarget] = useState(date);
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [undo, setUndo] = useState<{
    before: MonkMVPState;
    after: MonkMVPState;
  } | null>(null);
  const failure = (e: unknown) =>
    setError(
      e instanceof Error && e.message.startsWith("conflict")
        ? c(
            "Bentrok dengan jadwal Zendo. Ubah waktu lalu coba lagi.",
            "Conflicts with a Zendo block. Edit the time and retry.",
          )
        : c(
            "Perubahan belum disimpan. Jadwal mungkin berubah atau penyimpanan penuh. Cek lalu coba lagi.",
            "Change not saved. Schedule may have changed or storage is full. Check and retry.",
          ),
    );
  function adjustment(): Adjustment {
    return kind === "later" || kind === "skip"
      ? { kind }
      : { kind, date: target, startTime: time, duration };
  }
  return (
    <div className="space-y-3">
      {blocks.map((block) => (
        <div
          key={block.id}
          className="flex items-center justify-between gap-3 border-b border-monk-border py-2"
        >
          <div className="min-w-0 text-sm">
            <p className="break-words font-medium">{block.title}</p>
            <p className="text-monk-muted tabular-nums">
              {block.startTime}–{block.endTime}
            </p>
          </div>
          <GhostButton
            onClick={() => {
              try {
                const details = occurrenceDetails(
                  useMonkStore.getState(),
                  date,
                  block.id,
                );
                setSelected(block);
                setOrigin({
                  date: details.date,
                  startTime: details.block.startTime,
                  duration: details.duration,
                });
                setOpenedParts(JSON.stringify(details.parts));
                setPreviewParts("");
                setTarget(details.date);
                setTime(details.block.startTime);
                setDuration(details.duration);
                setKind("reschedule");
                setPreview(false);
                setError("");
                setStatus("");
              } catch (e) {
                failure(e);
              }
            }}
          >
            {c("Sesuaikan", "Adjust")}
          </GhostButton>
        </div>
      ))}
      {selected && (
        <div className="space-y-4 rounded-xl border border-monk-border p-4">
          <h3 className="font-semibold break-words">
            {c("Sesuaikan satu blok", "Adjust one block")}: {selected.title}
          </h3>
          <label className="block space-y-2 text-sm">
            <span>{c("Pilihan", "Action")}</span>
            <select
              className={planningField}
              value={kind}
              onChange={(e) => {
                const k = e.target.value as Adjustment["kind"];
                setKind(k);
                if (k === "reduce") {
                  setTarget(origin.date);
                  setTime(origin.startTime);
                }
                setPreview(false);
              }}
            >
              <option value="reschedule">
                {c("Pindahkan waktu", "Reschedule")}
              </option>
              <option value="reduce">{c("Persingkat", "Reduce")}</option>
              <option value="later">
                {c("Simpan untuk nanti", "Keep for later")}
              </option>
              <option value="skip">
                {c("Lewati kali ini", "Skip this time")}
              </option>
            </select>
          </label>
          {(kind === "reschedule" || kind === "reduce") && (
            <div className="space-y-3">
              <TextInput
                label={c("Tanggal baru", "New date")}
                type="date"
                value={target}
                disabled={kind === "reduce"}
                onChange={(e) => {
                  setTarget(e.target.value);
                  setPreview(false);
                }}
              />
              <TextInput
                label={c("Mulai", "Start")}
                type="time"
                value={time}
                disabled={kind === "reduce"}
                onChange={(e) => {
                  setTime(e.target.value);
                  setPreview(false);
                }}
              />
              <TextInput
                label={c("Durasi (menit)", "Duration (minutes)")}
                type="number"
                min={1}
                max={1440}
                value={String(duration)}
                onChange={(e) => {
                  setDuration(Number(e.target.value));
                  setPreview(false);
                }}
              />
            </div>
          )}
          {preview ? (
            <div className="space-y-3 text-sm">
              <p>
                {origin.date} · {origin.startTime} · {origin.duration}{" "}
                {c("menit", "minutes")} →{" "}
                {kind === "later"
                  ? c(
                      "Waktu dilepas; pekerjaan disimpan untuk nanti.",
                      "Time released; work kept for later.",
                    )
                  : kind === "skip"
                    ? c(
                        "Blok kali ini dilewati; dapat dipulihkan.",
                        "This occurrence is skipped; it can be restored.",
                      )
                    : `${target} · ${time} · ${duration} ${c("menit", "minutes")}`}
              </p>
              <p className="text-monk-muted">
                {c(
                  "Tautan Goal/Outcome tetap. Ideal Week dan progres tidak berubah.",
                  "Goal/Outcome links remain. Ideal Week and progress stay unchanged.",
                )}
              </p>
              <PrimaryButton
                onClick={() => {
                  try {
                    let before!: MonkMVPState, after!: MonkMVPState;
                    persistPlanningChange((s) => {
                      if (
                        JSON.stringify(
                          occurrenceDetails(s, date, selected.id).parts,
                        ) !== previewParts
                      )
                        throw new Error("stale");
                      before = s;
                      after = adjustOccurrence(
                        s,
                        date,
                        selected.id,
                        adjustment(),
                      );
                      return after;
                    });
                    setUndo({ before, after });
                    setSelected(null);
                    setError("");
                    setStatus(
                      c(
                        "Perubahan tersimpan di perangkat.",
                        "Change saved on this device.",
                      ),
                    );
                  } catch (e) {
                    failure(e);
                  }
                }}
              >
                {c("Konfirmasi perubahan", "Confirm change")}
              </PrimaryButton>
            </div>
          ) : (
            <PrimaryButton
              onClick={() => {
                try {
                  const current = useMonkStore.getState();
                  const parts = JSON.stringify(
                    occurrenceDetails(current, date, selected.id).parts,
                  );
                  if (parts !== openedParts) throw new Error("stale");
                  adjustOccurrence(current, date, selected.id, adjustment());
                  setPreviewParts(parts);
                  setPreview(true);
                  setError("");
                } catch (e) {
                  failure(e);
                }
              }}
            >
              {c("Pratinjau perubahan", "Preview change")}
            </PrimaryButton>
          )}
          <GhostButton
            onClick={() => {
              setSelected(null);
              setError("");
            }}
          >
            {c("Batal", "Cancel")}
          </GhostButton>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-monk-danger">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="text-sm text-monk-muted">
          {status}
        </p>
      )}
      {undo && (
        <GhostButton
          onClick={() => {
            try {
              persistPlanningChange((s) =>
                undoPlanningChange(undo.before, undo.after, s),
              );
              setUndo(null);
              setStatus(c("Perubahan dibatalkan.", "Change undone."));
              setError("");
            } catch (e) {
              failure(e);
            }
          }}
        >
          {c("Urungkan perubahan", "Undo change")}
        </GhostButton>
      )}
    </div>
  );
}
