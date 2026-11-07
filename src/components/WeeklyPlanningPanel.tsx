import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMonkStore } from "../store/useMonkStore";
import type { WeeklyDraft, WeeklyPlan, WeekProposal } from "../types/app";
import {
  confirmWeek,
  emptyRitual,
  referenceProposals,
  proposalParts,
} from "../lib/weeklyPlanning";
import {
  saveWeekDraft,
  persistPlanningChange,
} from "../lib/weeklyPlanningStore";
import { datesInRange, formatShortDate } from "../lib/date";
import { useLanguage } from "../i18n";
import { Card, PrimaryButton, GhostButton, TextInput } from "./ui";
import { planningField, usePlanningCopy } from "./PlanningControls";
import { IdealWeekEditor } from "./IdealWeekEditor";
import { ScheduleAdjustments } from "./ScheduleAdjustments";

export function WeeklyPlanningPanel({ week }: { week: WeeklyPlan }) {
  const c = usePlanningCopy();
  const lang = useLanguage();
  const store = useMonkStore();
  const ritual = week.ritual ?? emptyRitual();
  const initial = () =>
    ritual.draft ?? {
      outcomes: ritual.outcomes,
      proposals: [],
      reflection: ritual.reflection,
    };
  const [draft, setDraft] = useState<WeeklyDraft>(initial);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewRevision, setPreviewRevision] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    setDraft(initial());
    setPreview(false);
    setOpen(false);
    setError("");
  }, [week.id]);
  const dates = datesInRange(week.startDate, 7);
  const actual = store.dayPlans.filter(
    (d) => d.seasonId === week.seasonId && dates.includes(d.date),
  );
  const refs = referenceProposals(store.appSettings.idealWeek ?? [], week);
  const previous = store.weeklyPlans
    .filter((w) => w.seasonId === week.seasonId && w.endDate < week.startDate)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  const unfinished = (previous?.ritual?.outcomes ?? []).filter(
    (o) => o.status === "open",
  );
  const knownCount = actual.reduce(
    (n, d) => n + (d.timeBlocks?.length ?? 0),
    0,
  );
  function change(next: WeeklyDraft) {
    setDraft(next);
    setPreview(false);
    setStatus("");
    try {
      saveWeekDraft(week.id, next);
      setError("");
    } catch {
      setError(
        c(
          "Draft belum tersimpan. Tetap di halaman ini dan coba simpan lagi.",
          "Draft not saved. Stay on this page and retry saving.",
        ),
      );
    }
  }
  function patchProposal(id: string, patch: Partial<WeekProposal>) {
    change({
      ...draft,
      proposals: draft.proposals.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    });
  }
  function toggleOutcome(id: string) {
    try {
      persistPlanningChange((s) => ({
        ...s,
        weeklyPlans: s.weeklyPlans.map((w) => {
          if (w.id !== week.id) return w;
          const current = w.ritual ?? emptyRitual();
          const outcome = current.outcomes.find((o) => o.id === id);
          if (!outcome) throw new Error("stale");
          const status =
            outcome.status === "done" ? ("open" as const) : ("done" as const);
          return {
            ...w,
            updatedAt: new Date().toISOString(),
            ritual: {
              ...current,
              outcomes: current.outcomes.map((o) =>
                o.id === id ? { ...o, status } : o,
              ),
              draft: current.draft
                ? {
                    ...current.draft,
                    outcomes: current.draft.outcomes.map((o) =>
                      o.id === id ? { ...o, status } : o,
                    ),
                  }
                : undefined,
            },
          };
        }),
      }));
      setDraft((current) => ({
        ...current,
        outcomes: current.outcomes.map((o) =>
          o.id === id
            ? { ...o, status: o.status === "done" ? "open" : "done" }
            : o,
        ),
      }));
      setStatus(c("Status Outcome tersimpan.", "Outcome status saved."));
      setError("");
    } catch {
      setError(
        c("Status belum tersimpan. Coba lagi.", "Status not saved. Retry."),
      );
    }
  }
  let previewError = "";
  try {
    confirmWeek(store, week.id, draft);
  } catch (e) {
    previewError =
      e instanceof Error && e.message.startsWith("conflict")
        ? c(
            "Bentrok dengan jadwal Zendo. Edit waktu atau batalkan pilihan.",
            "Conflicts with a Zendo block. Edit time or unselect.",
          ) + ` (${(e as Error).message.slice(10)})`
        : c(
            "Cek judul, tanggal dalam minggu/Season, dan durasi 1–1440 menit.",
            "Check titles, dates within this week/Season, and duration of 1–1440 minutes.",
          );
  }
  const duplicateCount = draft.proposals.filter(
    (p) => p.occurrenceKey && ritual.appliedKeys.includes(p.occurrenceKey),
  ).length;
  return (
    <Card className="mb-5 space-y-5 p-5 sm:p-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-monk-accent">
          {c("ARAH MINGGU INI", "THIS WEEK’S DIRECTION")}
        </p>
        <h2 className="text-xl font-semibold">
          {c("Beri ruang untuk yang penting.", "Make room for what matters.")}
        </h2>
        <p className="text-sm leading-relaxed text-monk-muted">
          {c(
            "Weekly Planning opsional. Mulai dari satu hasil, atau langsung jalani hari ini.",
            "Weekly Planning is optional. Start with one outcome, or go straight to Today.",
          )}
        </p>
      </div>
      {!open && (
        <>
          {ritual.outcomes.length ? (
            <ul className="space-y-3">
              {ritual.outcomes.map((outcome) => (
                <li
                  key={outcome.id}
                  className="border-b border-monk-border pb-3"
                >
                  <p className="break-words text-sm font-medium">
                    {outcome.status === "done"
                      ? c("Selesai", "Done")
                      : c("Terbuka", "Open")}{" "}
                    · {outcome.title}
                  </p>
                  {outcome.doneWhen && (
                    <p className="mt-1 text-sm text-monk-muted">
                      {c("Selesai ketika: ", "Done when: ")}
                      {outcome.doneWhen}
                    </p>
                  )}
                  <GhostButton onClick={() => toggleOutcome(outcome.id)}>
                    {outcome.status === "done"
                      ? c("Buka kembali", "Reopen")
                      : c("Tandai selesai", "Mark done")}
                  </GhostButton>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-monk-muted">
              {c(
                "Belum ada Weekly Outcome. Hasil mingguan berbeda dari Goal dan blok waktu.",
                "No Weekly Outcomes yet. Weekly results differ from Goals and time blocks.",
              )}
            </p>
          )}
          <p className="text-sm text-monk-muted">
            {knownCount}{" "}
            {c("blok aktual dikenal Zendo", "actual blocks known to Zendo")} ·{" "}
            {(store.appSettings.idealWeek ?? []).length}{" "}
            {c("referensi Ideal Week", "Ideal Week references")}
          </p>
          <PrimaryButton
            onClick={() => {
              setDraft(initial());
              setOpen(true);
              setPreview(false);
              setStatus("");
            }}
          >
            {ritual.draft
              ? c("Lanjutkan draft", "Resume draft")
              : ritual.confirmedAt
                ? c("Tinjau minggu ini", "Review this week")
                : c("Rencanakan minggu ini", "Plan this week")}
          </PrimaryButton>
        </>
      )}
      <Link
        to="/today"
        className="inline-flex min-h-11 items-center text-sm font-medium text-monk-accent underline underline-offset-4"
      >
        {c("Langsung ke Today", "Go to Today")}
      </Link>
      {open && !preview && (
        <div className="space-y-6">
          <section className="space-y-4" aria-label="Weekly Outcomes">
            <h3 className="font-semibold">Weekly Outcomes</h3>
            <p className="text-sm text-monk-muted">
              {c(
                "Apa yang berarti saat minggu ini berakhir? Mulai dari 1–3 hasil; boleh lebih, boleh kosong.",
                "What will matter by the end of this week? Start with 1–3 outcomes; more or none is fine.",
              )}
            </p>
            {draft.outcomes.map((outcome, i) => (
              <fieldset
                key={outcome.id}
                className="space-y-3 border-b border-monk-border pb-4"
              >
                <legend className="mb-3 text-sm text-monk-muted">
                  Outcome {i + 1}
                </legend>
                <TextInput
                  label={c("Hasil yang diinginkan", "Desired result")}
                  value={outcome.title}
                  onChange={(e) =>
                    change({
                      ...draft,
                      outcomes: draft.outcomes.map((o) =>
                        o.id === outcome.id
                          ? { ...o, title: e.target.value }
                          : o,
                      ),
                    })
                  }
                />
                <TextInput
                  label={c("Selesai ketika (opsional)", "Done when (optional)")}
                  value={outcome.doneWhen ?? ""}
                  onChange={(e) =>
                    change({
                      ...draft,
                      outcomes: draft.outcomes.map((o) =>
                        o.id === outcome.id
                          ? { ...o, doneWhen: e.target.value }
                          : o,
                      ),
                    })
                  }
                />
                <label className="block space-y-2 text-sm">
                  <span>{c("Goal (opsional)", "Goal (optional)")}</span>
                  <select
                    className={planningField}
                    value={outcome.goalId ?? ""}
                    onChange={(e) =>
                      change({
                        ...draft,
                        outcomes: draft.outcomes.map((o) =>
                          o.id === outcome.id
                            ? { ...o, goalId: e.target.value || undefined }
                            : o,
                        ),
                      })
                    }
                  >
                    <option value="">{c("Tanpa tautan", "No link")}</option>
                    {store.goals
                      .filter(
                        (g) =>
                          g.status === "active" && g.seasonId === week.seasonId,
                      )
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                  </select>
                </label>
                <GhostButton
                  onClick={() =>
                    change({
                      ...draft,
                      outcomes: draft.outcomes.filter(
                        (o) => o.id !== outcome.id,
                      ),
                    })
                  }
                >
                  {c("Hapus dari draft", "Remove from draft")}
                </GhostButton>
              </fieldset>
            ))}
            <GhostButton
              onClick={() =>
                change({
                  ...draft,
                  outcomes: [
                    ...draft.outcomes,
                    { id: crypto.randomUUID(), title: "", status: "open" },
                  ],
                })
              }
            >
              {c("Tambah Outcome", "Add Outcome")}
            </GhostButton>
          </section>
          <details className="space-y-3">
            <summary className="cursor-pointer py-3 text-sm font-semibold">
              {c(
                "Refleksi & minggu sebelumnya (opsional)",
                "Reflection & last week (optional)",
              )}
            </summary>
            <p className="text-sm text-monk-muted">
              {c(
                "Waktu mana yang paling mendukungmu? Apa yang ingin kamu ubah?",
                "Which time supported you most? What would you like to change?",
              )}
            </p>
            <TextInput
              label={c("Catatan refleksi", "Reflection note")}
              value={draft.reflection}
              onChange={(e) => change({ ...draft, reflection: e.target.value })}
            />
            {(previous?.ritual?.outcomes ?? [])
              .filter((o) => o.status === "done")
              .map((o) => (
                <p key={o.id} className="break-words text-sm">
                  {c("Selesai minggu lalu: ", "Completed last week: ")}
                  {o.title}
                </p>
              ))}
            {!unfinished.length && (
              <p className="text-sm text-monk-muted">
                {c(
                  "Tidak ada Outcome terbuka dari minggu sebelumnya.",
                  "No open Outcomes from last week.",
                )}
              </p>
            )}
            {unfinished.map((o) => (
              <div
                key={o.id}
                className="border-b border-monk-border py-3 text-sm"
              >
                <p className="break-words">{o.title}</p>
                <p className="text-monk-muted">
                  {c(
                    "Tidak dipindahkan otomatis.",
                    "Never carried forward automatically.",
                  )}
                </p>
                <GhostButton
                  disabled={draft.outcomes.some((d) => d.sourceId === o.id)}
                  onClick={() =>
                    change({
                      ...draft,
                      outcomes: [
                        ...draft.outcomes,
                        {
                          ...o,
                          id: crypto.randomUUID(),
                          sourceId: o.id,
                          status: "open",
                        },
                      ],
                    })
                  }
                >
                  {c("Bawa / revisi di draft", "Carry / revise in draft")}
                </GhostButton>
                <GhostButton
                  onClick={() => {
                    change({
                      ...draft,
                      outcomes: draft.outcomes.filter(
                        (d) => d.sourceId !== o.id,
                      ),
                    });
                    setStatus(
                      c(
                        "Ditinggalkan untuk minggu ini. Riwayat tetap.",
                        "Left behind for this week. History retained.",
                      ),
                    );
                  }}
                >
                  {c("Tinggalkan", "Leave behind")}
                </GhostButton>
              </div>
            ))}
            <GhostButton
              onClick={() => {
                document
                  .getElementById("ideal-week-editor")
                  ?.setAttribute("open", "");
                document.getElementById("ideal-week-editor")?.scrollIntoView();
              }}
            >
              {c("Usulkan perubahan referensi", "Suggest a reference change")}
            </GhostButton>
          </details>
          <section className="space-y-3">
            <h3 className="font-semibold">
              {c("Bentuk minggu ini", "Shape this week")}
            </h3>
            <p className="text-sm text-monk-muted">
              {c(
                "Referensi belum terjadwal. Pilih hanya yang ingin diterapkan. Nol pilihan juga boleh.",
                "References are not scheduled. Select only what you want to apply. Zero selections is fine.",
              )}
            </p>
            {!refs.length && (
              <p className="text-sm">
                {c(
                  "Tanpa Ideal Week? Tambah blok manual, atau lanjut tanpa jadwal.",
                  "No Ideal Week? Add a manual block, or continue without a schedule.",
                )}
              </p>
            )}
            {refs.map((ref) => {
              const applied = ritual.appliedKeys.includes(ref.occurrenceKey!);
              return (
                <label
                  key={ref.id}
                  className="flex min-h-12 items-start gap-3 rounded-xl border border-dashed border-monk-border p-3 text-sm"
                >
                  <input
                    className="mt-1"
                    type="checkbox"
                    disabled={applied}
                    checked={draft.proposals.some((p) => p.id === ref.id)}
                    onChange={(e) =>
                      change({
                        ...draft,
                        proposals: e.target.checked
                          ? [...draft.proposals, ref]
                          : draft.proposals.filter((p) => p.id !== ref.id),
                      })
                    }
                  />
                  <span className="min-w-0 break-words">
                    <strong>{ref.title}</strong>
                    <span className="block text-monk-muted">
                      {formatShortDate(ref.date, lang)} · {ref.startTime} ·{" "}
                      {ref.duration} {c("menit", "min")}
                    </span>
                    <span className="block text-monk-muted">
                      {applied
                        ? c("Sudah diterapkan", "Already applied")
                        : c(
                            "Referensi · belum terjadwal",
                            "Reference · not scheduled",
                          )}
                    </span>
                  </span>
                </label>
              );
            })}
            <GhostButton
              onClick={() =>
                change({
                  ...draft,
                  proposals: [
                    ...draft.proposals,
                    {
                      id: crypto.randomUUID(),
                      date: week.startDate,
                      title: "",
                      startTime: "09:00",
                      duration: 60,
                      category: "deep_work",
                    },
                  ],
                })
              }
            >
              {c("Tambah blok manual", "Add manual block")}
            </GhostButton>
            {draft.proposals.map((p) => (
              <fieldset
                key={p.id}
                className="space-y-3 border-l-2 border-monk-accent pl-3"
              >
                <legend className="mb-3 text-sm font-medium">
                  {c(
                    "Usulan · belum disimpan sebagai jadwal",
                    "Proposal · not saved as schedule",
                  )}
                </legend>
                <TextInput
                  label={c("Aktivitas", "Activity")}
                  value={p.title}
                  onChange={(e) =>
                    patchProposal(p.id, { title: e.target.value })
                  }
                />
                <TextInput
                  type="date"
                  min={week.startDate}
                  max={week.endDate}
                  label={c("Tanggal", "Date")}
                  value={p.date}
                  onChange={(e) =>
                    patchProposal(p.id, { date: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextInput
                    type="time"
                    label={c("Mulai", "Start")}
                    value={p.startTime}
                    onChange={(e) =>
                      patchProposal(p.id, { startTime: e.target.value })
                    }
                  />
                  <TextInput
                    type="number"
                    min={1}
                    max={1440}
                    label={c("Durasi (menit)", "Duration (min)")}
                    value={String(p.duration)}
                    onChange={(e) =>
                      patchProposal(p.id, { duration: Number(e.target.value) })
                    }
                  />
                </div>
                <label className="block space-y-2 text-sm">
                  <span>
                    {c(
                      "Weekly Outcome (opsional)",
                      "Weekly Outcome (optional)",
                    )}
                  </span>
                  <select
                    className={planningField}
                    value={p.outcomeId ?? ""}
                    onChange={(e) => {
                      const o = draft.outcomes.find(
                        (o) => o.id === e.target.value,
                      );
                      patchProposal(p.id, {
                        outcomeId: o?.id,
                        goalId: o?.goalId ?? p.goalId,
                      });
                    }}
                  >
                    <option value="">{c("Tanpa tautan", "No link")}</option>
                    {draft.outcomes.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title ||
                          c("Outcome tanpa judul", "Untitled Outcome")}
                      </option>
                    ))}
                  </select>
                </label>
                <GhostButton
                  onClick={() =>
                    change({
                      ...draft,
                      proposals: draft.proposals.filter((x) => x.id !== p.id),
                    })
                  }
                >
                  {c("Batalkan pilihan", "Unselect")}
                </GhostButton>
              </fieldset>
            ))}
          </section>
          <PrimaryButton
            onClick={() => {
              const current = useMonkStore
                .getState()
                .weeklyPlans.find((w) => w.id === week.id);
              setPreviewRevision(current?.updatedAt ?? "");
              setPreview(true);
              setStatus("");
            }}
          >
            {c("Pratinjau minggu ini", "Preview this week")}
          </PrimaryButton>
          <GhostButton
            onClick={() => {
              try {
                saveWeekDraft(week.id, draft);
                setOpen(false);
                setError("");
                setStatus(
                  c(
                    "Draft disimpan; jadwal aktual belum berubah.",
                    "Draft kept; actual schedule unchanged.",
                  ),
                );
              } catch {
                setError(
                  c(
                    "Draft belum tersimpan. Tetap di halaman ini dan coba simpan lagi.",
                    "Draft not saved. Stay on this page and retry saving.",
                  ),
                );
              }
            }}
          >
            {c("Simpan draft & tutup", "Keep draft & close")}
          </GhostButton>
        </div>
      )}
      {open && preview && (
        <section
          className="space-y-4"
          aria-label={c("Pratinjau konfirmasi", "Confirmation preview")}
        >
          <h3 className="font-semibold">
            {c("Tinjau sebelum menyimpan", "Review before saving")}
          </h3>
          <p className="text-sm">
            {draft.outcomes.length} Weekly Outcomes ·{" "}
            {draft.proposals.length - duplicateCount}{" "}
            {c("usulan baru", "new proposals")} · {duplicateCount}{" "}
            {c("duplikat dilewati", "duplicates skipped")} · 0{" "}
            {c("blok lama diubah", "existing blocks edited")}
          </p>
          {draft.outcomes.map((o) => (
            <p key={o.id} className="break-words text-sm">
              Outcome: {o.title} {o.doneWhen ? `— ${o.doneWhen}` : ""}
            </p>
          ))}
          {draft.proposals.map((p) => (
            <div
              key={p.id}
              className="border-l-2 border-monk-accent pl-3 text-sm"
            >
              <p className="break-words font-medium">
                {p.title || c("Tanpa judul", "Untitled")} ·{" "}
                {p.occurrenceKey && ritual.appliedKeys.includes(p.occurrenceKey)
                  ? c("Duplikat: dilewati", "Duplicate: skipped")
                  : c("Blok baru", "New block")}
              </p>
              {(() => {
                try {
                  return proposalParts(p).map((part) => (
                    <p key={part.date} className="text-monk-muted">
                      {formatShortDate(part.date, lang)} ·{" "}
                      {part.block.startTime}–{part.block.endTime}
                    </p>
                  ));
                } catch {
                  return <p>{c("Waktu tidak valid", "Invalid time")}</p>;
                }
              })()}
            </div>
          ))}
          <p className="text-sm text-monk-muted">
            {c(
              "Blok lama, Ideal Week, Highlight, Main Action, dan progres tetap. Tidak ada jadwal yang dipindahkan otomatis.",
              "Existing blocks, Ideal Week, Highlight, Main Action and progress remain. Nothing is rescheduled automatically.",
            )}
          </p>
          {previewError ? (
            <p role="alert" className="text-sm text-monk-danger">
              {previewError}
            </p>
          ) : (
            <p className="text-sm text-monk-muted">
              {c(
                "Tidak ada bentrok yang dikenal di Zendo. Kalender eksternal belum diperiksa.",
                "No known conflict in Zendo. External calendars have not been checked.",
              )}
            </p>
          )}
          <PrimaryButton
            disabled={!!previewError}
            onClick={() => {
              try {
                persistPlanningChange((s) => {
                  if (
                    s.weeklyPlans.find((w) => w.id === week.id)?.updatedAt !==
                    previewRevision
                  )
                    throw new Error("stale");
                  const next = confirmWeek(s, week.id, draft);
                  return {
                    ...next,
                    weeklyPlans: next.weeklyPlans.map((w) =>
                      w.id === week.id && w.ritual
                        ? {
                            ...w,
                            ritual: {
                              ...w.ritual,
                              held: w.ritual.held.filter(
                                (h) =>
                                  !draft.proposals.some(
                                    (p) => p.id === `recover:${h.id}`,
                                  ),
                              ),
                            },
                          }
                        : w,
                    ),
                  };
                });
                setOpen(false);
                setPreview(false);
                setStatus(
                  c(
                    "Minggu tersimpan di perangkat. Pilih Main Action di Today saat siap.",
                    "Week saved on this device. Choose your Main Action in Today when ready.",
                  ),
                );
                setError("");
              } catch {
                setError(
                  c(
                    "Belum tersimpan. Jadwal mungkin berubah atau penyimpanan penuh. Draft tetap tersedia; kembali mengedit lalu buat pratinjau baru.",
                    "Not saved. Schedule may have changed or storage is full. Draft remains available; go back to edit and create a new preview.",
                  ),
                );
              }
            }}
          >
            {c("Konfirmasi & simpan minggu", "Confirm & save week")}
          </PrimaryButton>
          <GhostButton onClick={() => setPreview(false)}>
            {c("Kembali mengedit", "Back to edit")}
          </GhostButton>
          <GhostButton
            onClick={() => {
              setOpen(false);
              setPreview(false);
            }}
          >
            {c("Tutup; pertahankan draft", "Close; keep draft")}
          </GhostButton>
        </section>
      )}
      <details className="space-y-3">
        <summary className="cursor-pointer py-3 text-sm font-semibold">
          {c(
            "Actual Week · jadwal yang dikenal",
            "Actual Week · known schedule",
          )}{" "}
          ({knownCount})
        </summary>
        <p className="text-sm text-monk-muted">
          {c(
            "Hanya komitmen di Zendo. Waktu lain belum tentu kosong.",
            "Only commitments in Zendo. Other time is not necessarily free.",
          )}
        </p>
        {!knownCount && (
          <p className="text-sm">
            {c("Belum ada blok aktual.", "No actual blocks yet.")}
          </p>
        )}
        {actual
          .filter(
            (d) =>
              (d.timeBlocks?.length ?? 0) > 0 ||
              ritual.held.some((h) => h.date === d.date),
          )
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((d) => (
            <section key={d.id}>
              <h4 className="text-sm font-medium">
                {formatShortDate(d.date, lang)} · {c("Aktual", "Actual")}
              </h4>
              <ScheduleAdjustments date={d.date} />
            </section>
          ))}
      </details>
      {ritual.held.length > 0 && (
        <details className="space-y-3">
          <summary className="cursor-pointer py-3 text-sm font-semibold">
            {c("Untuk nanti / dilewati", "For later / skipped")} (
            {ritual.held.length})
          </summary>
          {ritual.held.map((h) => (
            <div
              key={h.id}
              className="border-b border-monk-border py-3 text-sm"
            >
              <p className="break-words">
                {h.block.title} ·{" "}
                {h.status === "later"
                  ? c("Untuk nanti", "For later")
                  : c("Dilewati", "Skipped")}
              </p>
              <GhostButton
                disabled={draft.proposals.some(
                  (p) => p.id === `recover:${h.id}`,
                )}
                onClick={() => {
                  change({
                    ...draft,
                    proposals: [
                      ...draft.proposals,
                      {
                        id: `recover:${h.id}`,
                        title: h.block.title,
                        date: week.startDate,
                        startTime: h.block.startTime,
                        duration:
                          h.duration ??
                          Math.max(
                            1,
                            Number(h.block.endTime.slice(0, 2)) * 60 +
                              Number(h.block.endTime.slice(3)) -
                              Number(h.block.startTime.slice(0, 2)) * 60 -
                              Number(h.block.startTime.slice(3)),
                          ),
                        category: h.block.category,
                        goalId: h.block.goalId,
                        practiceId: h.block.practiceId,
                        outcomeId: h.block.outcomeId,
                      },
                    ],
                  });
                  setOpen(true);
                }}
              >
                {c("Pulihkan lewat draft", "Restore through draft")}
              </GhostButton>
            </div>
          ))}
        </details>
      )}
      <IdealWeekEditor />
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
    </Card>
  );
}
