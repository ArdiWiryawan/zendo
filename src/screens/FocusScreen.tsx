import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";
import {
  Card,
  EmptyState,
  GhostButton,
  PageHeader,
  SecondaryButton,
} from "../components/ui";
import { FocusSessionPanel, FocusSessionStarter, FocusSessionSummary } from "../screens/FocusSession";
import { routes } from "../constants/routes";
import { getTodayDateString } from "../lib/date";
import { parseIntention } from "../lib/implementationIntention";
import { isCloseDaySkipped } from "../lib/eveningNudge";
import { unlockAudio } from "../lib/audio";
import { isMusicOn, toggleMusic } from "../lib/focusMusic";
import { selectTodayPlan, selectTotalFocusSecondsForDate } from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import type { FocusSession } from "../types/app";

export default function FocusScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const plan = selectTodayPlan(store);
  const goal = plan?.goalId ? store.goals.find((item) => item.id === plan.goalId) : undefined;
  const [musicOn, setMusicOn] = useState(isMusicOn);
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
    // Music must survive navigation while a session runs, so it is NOT stopped on
    // unmount. It is stopped only when the session actually ends (completed / ended
    // early / abandoned) — see useMonkStore actions. Keep the header icon in sync.
    setMusicOn(isMusicOn());
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

  const toggleMusicHandler = () => {
    unlockAudio();
    // Soundscape auto-picked by hour/day inside startMusic — no chooser UI
    setMusicOn(toggleMusic().on);
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

  return (
    <>
      <PageHeader
        title={activeSession ? t("focus.inSession") : t("focus.title")}
        subtitle={goal?.title ?? t("today.quietRecovery")}
        rightSlot={
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
        }
      />

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
    </>
  );
}

