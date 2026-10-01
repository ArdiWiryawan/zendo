import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Volume1,
  Volume2,
  VolumeX,
  Sparkles,
  Crown,
  Music,
  Heart,
  Play,
  Pause,
  Waves,
  Sliders,
  Leaf,
  CloudFog,
  TreePine,
  Flower2,
  Bell,
  CloudRain,
  Moon,
  Flame,
  type LucideIcon
} from "lucide-react";
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
import { useT, type MessageKey } from "../i18n";
import { ZendoProModal } from "../components/ZendoProModal";
import type { FocusSession } from "../types/app";

/**
 * Soundscape labels live in i18n (focus.soundscape.<id> / <id>Desc) so the
 * picker and the auto-pick share one source of truth. Only the id and the
 * glyph name stay here; the glyph itself resolves through `SOUNDSCAPE_ICONS`.
 */
const soundNameKey = (id: SoundscapeId) => `focus.soundscape.${id}` as MessageKey;
const soundDescKey = (id: SoundscapeId) => `focus.soundscape.${id}Desc` as MessageKey;

const SOUNDSCAPES: {
  id: SoundscapeId;
  icon: string;
}[] = [
  { id: "day_still", icon: "Leaf" },
  { id: "dawn_mist", icon: "CloudFog" },
  { id: "zen_stream", icon: "Waves" },
  { id: "forest_birds", icon: "TreePine" },
  { id: "binaural_alpha", icon: "Sparkles" },
  { id: "singing_bowl", icon: "Bell" },
  { id: "night_rain", icon: "CloudRain" },
  { id: "day_garden", icon: "Flower2" },
  { id: "dusk_ember", icon: "Flame" },
  { id: "night_deep", icon: "Moon" },
];

/**
 * Soundscape glyphs, keyed by the `icon` name each preset declares — the same
 * name→component idiom as JournalPacks' pack icons.
 *
 * Deliberately lucide rather than emoji: emoji render as full-colour OS glyphs
 * that ignore the tile's accent colour and vary by platform, so a list of them
 * reads as a party of unrelated stickers. Line icons inherit `currentColor`,
 * which is what ties the set to Zendo's palette.
 *
 * Mapped by meaning rather than by literal name: each soundscape gets the mark
 * for the scene it evokes (a leaf for still daylight, a bell for the singing
 * bowl, a moon for deep night). `FallbackIcon` covers anything unmapped, so a
 * new preset never renders an empty row.
 */
const SOUNDSCAPE_ICONS: Record<string, LucideIcon> = {
  Leaf,
  CloudFog,
  Waves,
  TreePine,
  Sparkles,
  Bell,
  CloudRain,
  Flower2,
  Flame,
  Moon,
};

const FallbackIcon: LucideIcon = Music;

/** Resolves a soundscape's stored glyph name to its lucide component. */
const soundscapeIcon = (name: string): LucideIcon => SOUNDSCAPE_ICONS[name] ?? FallbackIcon;

export default function FocusScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
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
  const CurrentSoundIcon = soundscapeIcon(currentSoundMeta.icon);

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
        {activeSession ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 text-monk-accent" aria-hidden>
                <CurrentSoundIcon size={16} strokeWidth={1.5} />
              </span>
              <span className="text-xs font-bold text-monk-text truncate">
                {t(soundNameKey(currentSoundMeta.id))}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleMusicHandler}
              className={`shrink-0 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 flex items-center gap-1.5 ${
                musicOn
                  ? "border-monk-accent bg-monk-accent-soft text-monk-accent shadow-xs"
                  : "border-monk-border bg-monk-soft text-monk-muted hover:text-monk-text"
              }`}
              aria-label={musicOn ? t("focus.audioPauseAria") : t("focus.audioPlayAria")}
            >
              {musicOn ? <Pause size={13} /> : <Play size={13} />}
            </button>
          </div>
        ) : (
        <>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="shrink-0 text-monk-accent" aria-hidden>
              <CurrentSoundIcon size={20} strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-monk-text truncate">
                  {t(soundNameKey(currentSoundMeta.id))}
                </span>
                {musicOn && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-monk-accent font-semibold px-2 py-0.5 rounded-full bg-monk-accent-soft border border-monk-accent/30">
                    <span className="flex gap-0.5 items-end h-2.5">
                      <span className="w-0.5 h-2 bg-monk-accent rounded-full animate-pulse" />
                      <span className="w-0.5 h-3 bg-monk-accent rounded-full animate-pulse delay-75" />
                      <span className="w-0.5 h-1.5 bg-monk-accent rounded-full animate-pulse delay-150" />
                    </span>
                    <span>{t("focus.audioPlaying")}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-monk-muted truncate">
                {t(soundDescKey(currentSoundMeta.id))}
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
              aria-label={musicOn ? t("focus.audioPauseAria") : t("focus.audioPlayAria")}
            >
              {musicOn ? <Pause size={13} /> : <Play size={13} />}
              <span>{musicOn ? t("focus.pause") : t("focus.audioPlay")}</span>
            </button>
            <button
              type="button"
              onClick={() => setSoundscapePickerOpen((v) => !v)}
              className="text-xs font-semibold text-monk-accent hover:underline flex items-center gap-1 px-2 py-1"
            >
              <Music size={13} />
              {soundscapePickerOpen ? t("focus.audioClose") : t("focus.audioChooseSound")}
            </button>
          </div>
        </div>

        {!activeSession && (
        /* Realtime Ambient Volume Slider (Optimized to blend with background playlists) */
        <div className="flex items-center gap-2 pt-2 border-t border-monk-border/40">
          <span className="text-[11px] font-semibold text-monk-muted flex items-center gap-1.5 shrink-0">
            {volume === 0 ? <VolumeX size={13} /> : volume < 50 ? <Volume1 size={13} /> : <Volume2 size={13} />}
            <span>{t("focus.audioSoundVolume")}</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-full h-1.5 bg-monk-border rounded-lg appearance-none cursor-pointer accent-monk-accent"
            aria-label={t("focus.audioVolumeAria")}
          />
          <span className="text-[11px] font-bold text-monk-text tabular-nums shrink-0 w-8 text-right">
            {volume}%
          </span>
        </div>
        )}

        {!activeSession && soundscapePickerOpen && (
          <div className="space-y-2 pt-2 border-t border-monk-border/60">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-monk-muted">
                {t("focus.audioTapToPreview")}
              </p>
              <span className="text-[10px] text-monk-muted/80">
                {t("focus.audioBlendNote")}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {SOUNDSCAPES.map((sound) => {
                const isSelected = selectedSoundscape === sound.id;
                const isPlaying = isSelected && musicOn;
                const SoundIcon = soundscapeIcon(sound.icon);
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
                      <span className="shrink-0 mt-0.5" aria-hidden>
                        <SoundIcon size={16} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-monk-text truncate">
                            {t(soundNameKey(sound.id))}
                          </p>
                        </div>
                        <p className="text-[10px] text-monk-muted leading-tight mt-0.5 line-clamp-1">
                          {t(soundDescKey(sound.id))}
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
                          <span>{t("focus.audioPreview")}</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-monk-muted/80 pt-1 text-center">
              {t("focus.audioBlendFootnote")}
            </p>
          </div>
        )}
        </>
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

