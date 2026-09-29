import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Volume1, Volume2, VolumeX, Sparkles, Crown, Music, Heart, Play, Pause, Waves, Sliders } from "lucide-react";
import {
  Card,
  EmptyState,
  GhostButton,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "../components/ui";
import { FocusSessionPanel, FocusSessionStarter, FocusSessionSummary } from "../screens/FocusSession";
import { routes } from "../constants/routes";
import { getTodayDateString } from "../lib/date";
import { parseIntention } from "../lib/implementationIntention";
import { isCloseDaySkipped } from "../lib/eveningNudge";
import { unlockAudio } from "../lib/audio";
import { isMusicOn, toggleMusic, startMusic, stopMusic, getActiveSoundscape, getMusicVolume, setMusicVolume, type SoundscapeId } from "../lib/focusMusic";
import { requestWakeLock, releaseWakeLock } from "../lib/wakeLock";
import { selectTodayPlan, selectTotalFocusSecondsForDate } from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import { useT, useLanguage } from "../i18n";
import { ZendoProModal } from "../components/ZendoProModal";
import type { FocusSession } from "../types/app";

const SOUNDSCAPES: {
  id: SoundscapeId;
  icon: string;
  nameId: string;
  nameEn: string;
  descId: string;
  descEn: string;
}[] = [
  {
    id: "day_still",
    icon: "🍃",
    nameId: "Udara Tenang",
    nameEn: "Still Air",
    descId: "Angin sepoi hening & drone harmonis menenangkan",
    descEn: "Gentle breeze & soft harmonic drone",
  },
  {
    id: "dawn_mist",
    icon: "🌫️",
    nameId: "Kabut Pagi",
    nameEn: "Dawn Mist",
    descId: "Embun pagi & getaran akustik fajar yang tenang",
    descEn: "Morning mist & peaceful acoustic shimmer",
  },
  {
    id: "zen_stream",
    icon: "🌊",
    nameId: "Aliran Air Zen",
    nameEn: "Mountain Stream",
    descId: "Gemericik air pegunungan alami yang jernih",
    descEn: "Crystal-clear babbling mountain brook",
  },
  {
    id: "forest_birds",
    icon: "🌲",
    nameId: "Hutan Hening",
    nameEn: "Forest Serenity",
    descId: "Kanopi hutan hijau & kedamaian alam yang dalam",
    descEn: "Deep canopy atmosphere & organic peace",
  },
  {
    id: "binaural_alpha",
    icon: "🧘",
    nameId: "Gelombang 432Hz",
    nameEn: "432Hz Alpha Drone",
    descId: "Frekuensi fokus murni 432Hz untuk deep flow state",
    descEn: "Pure 432Hz harmonic drone for deep flow",
  },
  {
    id: "singing_bowl",
    icon: "🔔",
    nameId: "Mangkuk Tibet",
    nameEn: "Tibetan Bowl",
    descId: "Resonansi mangkuk meditasi & getaran overton hening",
    descEn: "Singing bowl resonance & meditative overtones",
  },
  {
    id: "night_rain",
    icon: "🌧️",
    nameId: "Hujan Lembut",
    nameEn: "Soft Rain",
    descId: "Rintik hujan menenangkan & gemuruh lembut malam",
    descEn: "Soothing rain showers & gentle undertones",
  },
  {
    id: "day_garden",
    icon: "🌸",
    nameId: "Taman Sunyi",
    nameEn: "Quiet Garden",
    descId: "Taman zen yang damai dengan resonansi cerah",
    descEn: "Peaceful zen garden with bright overtones",
  },
  {
    id: "dusk_ember",
    icon: "🪵",
    nameId: "Senja Hangat",
    nameEn: "Dusk Ember",
    descId: "Kehangatan api unggun & dengung senja meditatif",
    descEn: "Warm hearth embers & meditative dusk drone",
  },
  {
    id: "night_deep",
    icon: "🌌",
    nameId: "Malam Dalam",
    nameEn: "Deep Night",
    descId: "Gelombang kosmik hening & sub-bass malam pekat",
    descEn: "Cosmic night waves & deep sub-bass calm",
  },
];

export default function FocusScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const lang = useLanguage();
  const isId = lang === "id";
  const plan = selectTodayPlan(store);
  const goal = plan?.goalId ? store.goals.find((item) => item.id === plan.goalId) : undefined;
  const [musicOn, setMusicOn] = useState(isMusicOn);
  const [selectedSoundscape, setSelectedSoundscape] = useState<SoundscapeId>(getActiveSoundscape() ?? "day_still");
  const [soundscapePickerOpen, setSoundscapePickerOpen] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState<FocusSession | null>(null);
  const prevSessionIdRef = useRef<string | null>(null);
  const today = getTodayDateString();
  const todayEntry = store.journalEntries.find(
    (entry) => entry.seasonId === store.activeSeason?.id && entry.date === today
  );
  const hasReflection = !!todayEntry?.answers.whatMovedToday?.trim();
  const closeDaySkipped = isCloseDaySkipped(today);
  const focusMinutes = Math.round(selectTotalFocusSecondsForDate(store, today) / 60);

  const activeSession = store.focusSessions.find(
    (session) => session.dayPlanId === plan?.id && ["running", "paused"].includes(session.status)
  );
  const activeSessionId = activeSession?.id ?? null;

  useEffect(() => {
    // Keep device screen awake during active focus sessions
    if (activeSession?.status === "running") {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    const handleVisibilityChange = () => {
      // Browsers auto-release the wake lock when the tab is hidden; nothing
      // re-requests it on return. Re-acquire when we come back to a live session.
      if (document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [activeSession?.status]);

  useEffect(() => {
    // Music must survive navigation while a session runs, so it is NOT stopped on
    // unmount. It is stopped only when the session actually ends (completed / ended
    // early / abandoned) — see useMonkStore actions. Keep the header icon in sync.
    setMusicOn(isMusicOn());
    if (getActiveSoundscape()) setSelectedSoundscape(getActiveSoundscape()!);
  }, [activeSessionId]);

  useEffect(() => {
    // Detect the moment a session transitions running/paused -> ended so the
    // completion summary can replace the blank starter.
    const prevId = prevSessionIdRef.current;
    prevSessionIdRef.current = activeSessionId;
    if (!activeSessionId) {
      if (prevId) {
        const ended = store.focusSessions.find(
          (s) => s.id === prevId && ["completed", "ended_early"].includes(s.status)
        );
        if (ended) {
          if (ended.status === "completed") setJustCompleted(ended);
          else setJustCompleted(null);
        }
      }
    } else if (!prevId) {
      // Fresh session started — clear any lingering summary.
      setJustCompleted(null);
    }
  }, [activeSessionId, store.focusSessions]);

  const [volume, setVolumeState] = useState(() => Math.round(getMusicVolume() * 100));

  const handleVolumeChange = (newVal: number) => {
    setVolumeState(newVal);
    setMusicVolume(newVal / 100);
  };

  const toggleMusicHandler = () => {
    unlockAudio();
    const result = toggleMusic({ soundscape: selectedSoundscape, volume: volume / 100 });
    setMusicOn(result.on);
    if (result.soundscape) setSelectedSoundscape(result.soundscape);
  };

  const handleSelectSoundscape = (sound: typeof SOUNDSCAPES[0]) => {
    unlockAudio();
    if (selectedSoundscape === sound.id && musicOn) {
      // Toggle pause/play preview for current soundscape
      stopMusic();
      setMusicOn(false);
      return;
    }
    setSelectedSoundscape(sound.id);
    startMusic({ soundscape: sound.id, volume: volume / 100 });
    setMusicOn(true);
  };

  if (!plan) {
    return (
      <>
        <PageHeader title={t("focus.title")} subtitle={t("focus.chooseFirst")} />
        <EmptyState
          title={t("focus.emptyTitle")}
          description={t("focus.emptyDesc")}
          actionLabel={t("focus.pickToday")}
          onAction={() => navigate(routes.today)}
        />
        <ZendoProModal isOpen={proModalOpen} onClose={() => setProModalOpen(false)} />
      </>
    );
  }

  const intention = parseIntention(plan.mainAction || "");
  const showCloseDayNudge =
    !activeSession &&
    !justCompleted &&
    (plan.status === "completed" || focusMinutes > 0) &&
    !hasReflection &&
    !closeDaySkipped;

  const currentSoundMeta = SOUNDSCAPES.find((s) => s.id === selectedSoundscape) ?? SOUNDSCAPES[0];

  return (
    <>
      <PageHeader
        title={activeSession ? t("focus.inSession") : t("focus.title")}
        subtitle={goal?.title ?? t("today.quietRecovery")}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-monk-warning/40 bg-monk-warning/10 px-3 py-1.5 text-xs font-bold text-monk-warning hover:bg-monk-warning/20 transition active:scale-95 shadow-sm"
              aria-label={t("support.ariaLabel")}
            >
              <Heart size={13} className="text-monk-warning fill-monk-warning/20" />
              <span>{t("support.label")}</span>
            </button>
            <button
              type="button"
              onClick={toggleMusicHandler}
              className={`grid min-h-11 min-w-11 place-items-center rounded-full border transition duration-150 ease-monk active:scale-90 ${
                musicOn
                  ? "border-monk-accent/40 bg-monk-accent-soft text-monk-accent"
                  : "border-monk-border bg-monk-surface text-monk-muted hover:border-monk-accent hover:text-monk-accent"
              }`}
              aria-label={musicOn ? t("focus.musicOff") : t("focus.musicOn")}
            >
              {musicOn ? <Volume2 size={18} strokeWidth={1.5} /> : <VolumeX size={18} strokeWidth={1.5} />}
            </button>
          </div>
        }
      />

      {/* Soundscape Selector Bar with Instant Audio Preview & Volume Blend */}
      <div className="mb-5 rounded-2xl border border-monk-border bg-monk-surface p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">{currentSoundMeta.icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-monk-text truncate">
                  {isId ? currentSoundMeta.nameId : currentSoundMeta.nameEn}
                </span>
                {musicOn && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-monk-accent font-semibold px-2 py-0.5 rounded-full bg-monk-accent-soft border border-monk-accent/30">
                    <span className="flex gap-0.5 items-end h-2.5">
                      <span className="w-0.5 h-2 bg-monk-accent rounded-full animate-pulse" />
                      <span className="w-0.5 h-3 bg-monk-accent rounded-full animate-pulse delay-75" />
                      <span className="w-0.5 h-1.5 bg-monk-accent rounded-full animate-pulse delay-150" />
                    </span>
                    <span>{isId ? "Sedang Diputar" : "Playing"}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-monk-muted truncate">
                {isId ? currentSoundMeta.descId : currentSoundMeta.descEn}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleMusicHandler}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 flex items-center gap-1.5 ${
                musicOn
                  ? "border-monk-accent bg-monk-accent-soft text-monk-accent shadow-xs"
                  : "border-monk-border bg-monk-soft text-monk-muted hover:text-monk-text"
              }`}
              aria-label={musicOn ? "Pause audio preview" : "Play audio preview"}
            >
              {musicOn ? <Pause size={13} /> : <Play size={13} />}
              <span>{musicOn ? (isId ? "Jeda" : "Pause") : (isId ? "Putar" : "Play")}</span>
            </button>
            <button
              type="button"
              onClick={() => setSoundscapePickerOpen((v) => !v)}
              className="text-xs font-semibold text-monk-accent hover:underline flex items-center gap-1 px-2 py-1"
            >
              <Music size={13} />
              {soundscapePickerOpen ? (isId ? "Tutup" : "Close") : (isId ? "Pilih Suara" : "Choose Sound")}
            </button>
          </div>
        </div>

        {/* Realtime Ambient Volume Slider (Optimized to blend with background playlists) */}
        <div className="flex items-center gap-2 pt-2 border-t border-monk-border/40">
          <span className="text-[11px] font-semibold text-monk-muted flex items-center gap-1.5 shrink-0">
            {volume === 0 ? <VolumeX size={13} /> : volume < 50 ? <Volume1 size={13} /> : <Volume2 size={13} />}
            <span>{isId ? "Volume Suara:" : "Sound Volume:"}</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-full h-1.5 bg-monk-border rounded-lg appearance-none cursor-pointer accent-monk-accent"
            aria-label="Volume ambient"
          />
          <span className="text-[11px] font-bold text-monk-text tabular-nums shrink-0 w-8 text-right">
            {volume}%
          </span>
        </div>

        {soundscapePickerOpen && (
          <div className="space-y-2 pt-2 border-t border-monk-border/60">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-monk-muted">
                {isId
                  ? "Klik untuk langsung mendengar suaranya:"
                  : "Tap any soundscape below for instant live audio preview:"}
              </p>
              <span className="text-[10px] text-monk-muted/80">
                {isId ? "✨ Blend dengan musik lain" : "✨ Blends with music"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {SOUNDSCAPES.map((sound) => {
                const isSelected = selectedSoundscape === sound.id;
                const isPlaying = isSelected && musicOn;
                return (
                  <button
                    key={sound.id}
                    type="button"
                    onClick={() => handleSelectSoundscape(sound)}
                    className={`flex items-start justify-between p-2.5 rounded-xl border text-left transition active:scale-[0.98] ${
                      isPlaying
                        ? "border-monk-accent bg-monk-accent-soft/40 text-monk-accent font-bold ring-1 ring-monk-accent/30 shadow-xs"
                        : isSelected
                        ? "border-monk-accent/60 bg-monk-soft text-monk-text"
                        : "border-monk-border/60 bg-monk-soft/30 text-monk-text hover:border-monk-border-strong hover:bg-monk-soft"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="text-lg shrink-0 mt-0.5">{sound.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-monk-text truncate">
                            {isId ? sound.nameId : sound.nameEn}
                          </p>
                        </div>
                        <p className="text-[10px] text-monk-muted leading-tight mt-0.5 line-clamp-1">
                          {isId ? sound.descId : sound.descEn}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2 mt-0.5">
                      {isPlaying ? (
                        <span className="flex gap-0.5 items-end h-3 text-monk-accent">
                          <span className="w-0.5 h-2 bg-monk-accent rounded-full animate-pulse" />
                          <span className="w-0.5 h-3 bg-monk-accent rounded-full animate-pulse delay-75" />
                          <span className="w-0.5 h-1.5 bg-monk-accent rounded-full animate-pulse delay-150" />
                        </span>
                      ) : (
                        <span className="text-[10px] text-monk-muted/70 flex items-center gap-0.5">
                          <Play size={10} />
                          <span>Preview</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-monk-muted/80 pt-1 text-center">
              {isId
                ? "💡 Suara ambient dirancang lembut dan dapat nge-blend harmonis dengan Spotify / Lo-Fi / Apple Music."
                : "💡 Ambient beds are softly filtered to blend harmoniously behind your external music or Spotify."}
            </p>
          </div>
        )}
      </div>

      {!activeSession && plan.dayType === "goal" ? (
        <Card className="mb-5 border-monk-border bg-monk-soft p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-monk-muted">{t("focus.todaysAction")}</p>
          {intention.when && intention.action ? (
            <div className="mt-1.5 space-y-0.5">
              <p className="text-xs text-monk-muted">{t("today.whenShown", { when: intention.when })}</p>
              <p className="text-sm font-semibold text-monk-text">{t("today.iWillShown", { action: intention.action })}</p>
            </div>
          ) : (
            <p className="mt-1.5 text-sm font-semibold text-monk-text">
              {plan.mainAction || t("focus.oneActionEnough")}
            </p>
          )}
        </Card>
      ) : null}

      {showCloseDayNudge ? (
        <Card className="mb-5 border-monk-accent/25 bg-monk-accent-soft/30 p-4">
          <p className="text-sm text-monk-muted">{t("focus.closeDayNudge")}</p>
          <SecondaryButton className="mt-3" onClick={() => navigate(routes.today)}>
            {t("focus.closeDayCta")}
          </SecondaryButton>
        </Card>
      ) : null}

      {activeSession ? (
        <div className="space-y-5">
          <FocusSessionPanel session={activeSession} mainAction={plan.mainAction} />
          <GhostButton className="w-full min-h-11" onClick={() => navigate(routes.today)}>
            {t("focus.returnToday")}
          </GhostButton>
        </div>
      ) : justCompleted ? (
        <FocusSessionSummary
          session={justCompleted}
          mainAction={plan.mainAction}
          onCloseDay={() => navigate(routes.today)}
          onStartAnother={() => setJustCompleted(null)}
        />
      ) : (
        <FocusSessionStarter />
      )}
      <ZendoProModal isOpen={proModalOpen} onClose={() => setProModalOpen(false)} />
    </>
  );
}

