import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n";
import { getTodayDateString } from "../lib/date";
import { STORAGE_KEY } from "../lib/storage";
import { routes } from "../constants/routes";
import { useMonkStore } from "../store/useMonkStore";
import {
  Card,
  GhostButton,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  TextInput,
} from "./ui";

/** A deliberately bounded entry: daily intention and a standalone timer need no Season. */
export function GuestToday() {
  const lang = useLanguage();
  const id = lang === "id";
  const copy = (indonesian: string, english: string) =>
    id ? indonesian : english;
  const today = getTodayDateString();
  const saved = useMonkStore((state) => state.appSettings.guestToday);
  const initial =
    saved?.date === today
      ? saved
      : { date: today, highlight: "", mainAction: "" };
  const [highlight, setHighlight] = useState(initial.highlight);
  const [mainAction, setMainAction] = useState(initial.mainAction);
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) {
        setDeadline(null);
        setFinished(true);
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [deadline]);

  const save = () => {
    const guestToday = {
      date: today,
      highlight: highlight.trim(),
      mainAction: mainAction.trim(),
    };
    try {
      useMonkStore.getState().updateSettings({ guestToday });
      // The legacy adapter swallows quota errors. Verify durable data before announcing success.
      const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      const actual = persisted?.appSettings?.guestToday;
      if (
        !actual ||
        actual.date !== today ||
        actual.highlight !== guestToday.highlight ||
        actual.mainAction !== guestToday.mainAction
      ) {
        setSaveStatus("error");
        return;
      }
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };
  const running = deadline !== null;
  const validDuration =
    Number.isInteger(duration) && duration >= 1 && duration <= 240;
  const edited = () => setSaveStatus("idle");

  return (
    <>
      <PageHeader
        title={copy("Hari ini", "Today")}
        subtitle={copy(
          "Mulai dari satu hal. Weekly Planning boleh menyusul.",
          "Start with one thing. Weekly Planning can wait.",
        )}
      />
      <div className="space-y-6">
        <Card className="space-y-4 p-5">
          <h2 className="text-xl font-semibold text-monk-text">
            {copy("Apa yang penting hari ini?", "What matters today?")}
          </h2>
          <p className="text-sm leading-relaxed text-monk-muted">
            {copy(
              "Pilih Highlight dan Main Action tanpa membuat Season atau rencana mingguan.",
              "Choose a Highlight and Main Action without creating a Season or weekly plan.",
            )}
          </p>
          <TextInput
            label="Highlight"
            value={highlight}
            maxLength={500}
            onChange={(event) => {
              setHighlight(event.target.value);
              edited();
            }}
          />
          <TextInput
            label="Main Action"
            value={mainAction}
            maxLength={500}
            onChange={(event) => {
              setMainAction(event.target.value);
              edited();
            }}
          />
          <p className="text-sm leading-relaxed text-monk-muted">
            {copy(
              "Highlight adalah prioritas bermakna. Main Action adalah langkah konkret berikutnya.",
              "Highlight is your meaningful priority. Main Action is your concrete next step.",
            )}
          </p>
          <PrimaryButton onClick={save}>
            {copy("Simpan untuk hari ini", "Save for today")}
          </PrimaryButton>
          <div
            role="status"
            aria-live="polite"
            className="text-sm leading-relaxed text-monk-muted"
          >
            {saveStatus === "saved"
              ? copy("Tersimpan di perangkat ini.", "Saved on this device.")
              : null}
          </div>
          {saveStatus === "error" ? (
            <p role="alert" className="text-sm leading-relaxed text-monk-text">
              {copy(
                "Belum tersimpan di perangkat. Teks tetap terbuka; coba Simpan lagi atau salin sebelum keluar.",
                "Not saved on this device. Your text remains here; try Save again or copy it before leaving.",
              )}
            </p>
          ) : null}
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-xl font-semibold text-monk-text">Focus</h2>
          <p className="text-sm leading-relaxed text-monk-muted">
            {copy(
              "Timer ringan untuk langkah pilihanmu. Selesainya Focus tidak menandai Main Action selesai.",
              "A simple timer for your chosen step. Completing Focus does not complete Main Action.",
            )}
          </p>
          <TextInput
            label={copy("Durasi (menit)", "Duration (minutes)")}
            type="number"
            min={1}
            max={240}
            step={1}
            value={String(duration)}
            disabled={running || (remaining !== duration * 60 && !finished)}
            onChange={(event) => {
              const value = Number(event.target.value);
              setDuration(value);
              setRemaining(value * 60);
              setFinished(false);
            }}
          />
          {!validDuration ? (
            <p className="text-sm text-monk-muted">
              {copy("Pilih 1–240 menit.", "Choose 1–240 minutes.")}
            </p>
          ) : null}
          <p
            className="text-4xl font-semibold tabular-nums text-monk-text"
            role="timer"
            aria-label={copy("Sisa waktu Focus", "Focus time remaining")}
          >
            {validDuration
              ? `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`
              : "—"}
          </p>
          <div className="flex flex-wrap gap-3">
            {running ? (
              <SecondaryButton
                className="!w-auto"
                onClick={() => {
                  setRemaining(
                    Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
                  );
                  setDeadline(null);
                }}
              >
                {copy("Jeda", "Pause")}
              </SecondaryButton>
            ) : (
              <PrimaryButton
                className="!w-auto"
                disabled={!validDuration || !mainAction.trim()}
                onClick={() => {
                  const seconds = remaining > 0 ? remaining : duration * 60;
                  setRemaining(seconds);
                  setDeadline(Date.now() + seconds * 1000);
                  setFinished(false);
                }}
              >
                {remaining !== duration * 60 && remaining > 0
                  ? copy("Lanjut Focus", "Resume Focus")
                  : copy("Mulai Focus", "Start Focus")}
              </PrimaryButton>
            )}
            <GhostButton
              onClick={() => {
                setDeadline(null);
                setRemaining(validDuration ? duration * 60 : 0);
                setFinished(false);
              }}
            >
              {copy("Reset timer", "Reset timer")}
            </GhostButton>
          </div>
          {!mainAction.trim() ? (
            <p className="text-sm text-monk-muted">
              {copy(
                "Tulis Main Action sebelum mulai Focus.",
                "Enter a Main Action before starting Focus.",
              )}
            </p>
          ) : null}
          <p role="status" className="text-sm text-monk-muted">
            {finished
              ? copy(
                  "Focus selesai. Pilih sendiri apakah Main Action sudah selesai.",
                  "Focus finished. Decide separately whether your Main Action is complete.",
                )
              : null}
          </p>
          <p className="text-sm leading-relaxed text-monk-muted">
            {copy(
              "Timer ini hanya aktif di halaman ini dan tidak masuk riwayat Season.",
              "This timer runs only on this page and is not added to Season history.",
            )}
          </p>
        </Card>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-monk-text">
            {copy("Siap memilih arah?", "Ready to choose a direction?")}
          </h2>
          <p className="text-sm leading-relaxed text-monk-muted">
            {copy(
              "Buat Season saat kamu siap. Tujuan dan pola mingguan tetap opsional untuk hari ini.",
              "Create a Season when you are ready. Goals and a weekly rhythm can wait today.",
            )}
          </p>
          <Link
            to={routes.onboardingWelcome}
            className="inline-flex min-h-12 items-center rounded-monk border border-monk-border bg-monk-soft px-5 text-sm font-semibold text-monk-text hover:border-monk-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monk-accent focus-visible:ring-offset-2 focus-visible:ring-offset-monk-bg"
          >
            {copy(
              "Siapkan Season / pulihkan data",
              "Set up Season / restore data",
            )}
          </Link>
        </div>
      </div>
    </>
  );
}
