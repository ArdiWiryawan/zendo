import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import LoginScreen from "../components/LoginScreen";
import SignupScreen from "../components/SignupScreen";
import PwaInstallBanner from "../components/PwaInstallBanner";
import { startEveningNudgeWatcher } from "../lib/eveningNudge";
import { initReminderScheduler } from "../lib/reminderScheduler";
import { AppShell, OnboardingShell, useCalmToast } from "../components/ui";
import { onboardingOrder, routes } from "../constants/routes";
import { useMonkStore } from "../store/useMonkStore";
import { playZenBell } from "../lib/audio";
import { planFocusTick } from "../lib/focusTicker.worker";

// ponytail: TodayScreen + FocusScreen loaded eagerly (primary screens); others lazy-split
const FocusScreen = lazy(() => import("../screens/FocusScreen"));
const TimelineScreen = lazy(() => import("../screens/TimelineScreen"));
const SettingsScreen = lazy(() => import("../screens/SettingsScreen"));
const WeekScreenLazy = lazy(() => import("../screens/WeekScreen").then(m => ({ default: m.WeekScreen })));
const JournalEntryScreenLazy = lazy(() => import("../screens/JournalEntryScreen").then(m => ({ default: m.JournalEntryScreen })));
const LearningScreenLazy = lazy(() => import("../screens/LearningScreen").then(m => ({ default: m.LearningScreen })));
const RelapseScreenLazy = lazy(() => import("../screens/RelapseScreen").then(m => ({ default: m.RelapseScreen })));
const SeasonEndScreenLazy = lazy(() => import("../screens/SeasonEndScreen").then(m => ({ default: m.SeasonEndScreen })));
const JournalLibraryScreenLazy = lazy(() => import("../screens/LibraryScreen").then(m => ({ default: m.JournalLibraryScreen })));
const NotebookPageLazy = lazy(() => import("../screens/LibraryScreen").then(m => ({ default: m.NotebookPage })));
const PacksPageLazy = lazy(() => import("../screens/LibraryScreen").then(m => ({ default: m.PacksPage })));
const ArchiveScreenLazy = lazy(() => import("../screens/ArchiveScreen").then(m => ({ default: m.ArchiveScreen })));
import { TodayScreen } from "../screens/TodayScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { HabitAudit, GoalBrainDump, SeasonSetup, KeystoneSetup, TodayPreviewStep } from "../screens/OnboardingSteps";

export default function App() {
  const hydrate = useMonkStore((state) => state.hydrate);
  const recordOpen = useMonkStore((state) => state.recordOpen);
  const syncPurchases = useMonkStore((state) => state.syncPurchases);
  const [ready, setReady] = useState(false);

  const focusSessions = useMonkStore((state) => state.focusSessions);
  const tickFocusSession = useMonkStore((state) => state.tickFocusSession);
  const completeFocusSession = useMonkStore((state) => state.completeFocusSession);
  const advanceFocusPhase = useMonkStore((state) => state.advanceFocusPhase);

  const activeSession = useMemo(() => {
    return focusSessions.find((session) => ["running", "paused"].includes(session.status));
  }, [focusSessions]);

  useEffect(() => {
    hydrate();
    recordOpen();
    syncPurchases();
    setReady(true);
  }, [hydrate, recordOpen, syncPurchases]);

  useEffect(() => {
    if (!ready) return;
    return startEveningNudgeWatcher();
  }, [ready]);

  const reminderToast = useCalmToast();
  const reminderToastRef = useRef(reminderToast);
  reminderToastRef.current = reminderToast;

  useEffect(() => {
    if (!ready) return;
    return initReminderScheduler({
      osNotify: (title, body) => {
        try {
          new Notification(title, { body, icon: "/apple-touch-icon.png", silent: true });
        } catch {
          /* permission revoked between check and fire — in-app toast still shown */
        }
      },
      toast: (message) => reminderToastRef.current.show(message)
    });
  }, [ready]);

  // Module-level: one worker per app instance. Registering at module scope (not
  // in an effect) makes it StrictMode-safe — no double mount can spawn two
  // timers. The worker is immune to hidden-tab timer throttling, so the focus
  // clock keeps advancing while the tab/PWA is backgrounded.
  const tickerWorkerRef = useRef<Worker | null>(null);
  const lastBellRef = useRef(0);

  useEffect(() => {
    if (!ready) return;

    const notify = (title: string, body: string) => {
      if (Notification.permission === "granted") new Notification(title, { body, icon: "/apple-touch-icon.png", silent: true });
    };

    const runTick = () => {
      // Re-read the session from the store: ticks from the worker can overlap
      // ticks from visibilitychange/focus/pageshow, and if advanceFocusPhase
      // already reset startTime/currentPhaseIndex, a stale closure would advance
      // AGAIN (skipping the break) or complete twice. Fresh state makes the
      // duplicate tick a no-op (elapsed recomputed against the new phase startTime).
      // The active session id is also read fresh (not from the effect closure) so
      // the worker's onmessage can never tick a stale session after a re-run.
      const active = useMonkStore.getState().focusSessions.find((s) => ["running", "paused"].includes(s.status));
      if (!active || active.status !== "running") return;
      const fresh = active;
      const { actions, bell } = planFocusTick(fresh, Date.now());
      let transitioned = false;
      for (const action of actions) {
        // advanceFocusPhase/completeFocusSession are idempotent (status guard),
        // and re-reading fresh state each iteration makes a multi-phase burst
        // safe even though advanceFocusPhase resets startTime to now.
        const current = useMonkStore.getState().focusSessions.find((s) => s.id === fresh.id);
        if (!current || current.status !== "running") break;
        if (action.type === "tick") {
          tickFocusSession(fresh.id, action.elapsedSeconds);
        } else if (action.type === "advance") {
          advanceFocusPhase(fresh.id);
          transitioned = true;
        } else {
          completeFocusSession(fresh.id, true);
          transitioned = true;
        }
      }
      // One bell/vibrate/notification for the phase the session settled into —
      // even if several phases elapsed in one background burst, no wall of bells.
      // Coalesce: worker tick + visibilitychange/focus/pageshow can both fire at
      // the same boundary; ring at most once per second so the duplicate is a
      // no-op. Only ring if the session actually transitioned this tick — a
      // catch-up burst that ran out after the user paused shouldn't ring.
      if (bell && transitioned) {
        const now = Date.now();
        if (now - lastBellRef.current > 1000) {
          lastBellRef.current = now;
          playZenBell();
          if ("vibrate" in navigator) navigator.vibrate(bell.vibrate);
          notify(bell.title, bell.body);
        }
      }
    };

    // Set up the background worker once. Guard against double registration: an
    // effect re-run (StrictMode dev remount, dep change) must not start a second
    // interval inside the worker.
    if (!tickerWorkerRef.current) {
      const worker = new Worker(new URL("../lib/focusTicker.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = () => runTick();
      tickerWorkerRef.current = worker;
    }

    // Re-sync immediately when the tab becomes visible again, when the window
    // regains focus, or on pageshow (bfcache / PWA relaunch). These fire even on
    // iOS standalone / Safari, which may suspend the worker entirely.
    const onVisibilityChange = () => { if (document.visibilityState === "visible") runTick(); };
    const onFocus = () => runTick();
    const onPageShow = () => runTick();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);

    // Cold PWA launch: reconcile immediately (e.g. a session left "running"
    // yesterday should advance through all elapsed phases now, not wait for the
    // next worker tick).
    runTick();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [ready, activeSession?.id, activeSession?.status, tickFocusSession, completeFocusSession, advanceFocusPhase]);

  useEffect(() => {
    return () => {
      tickerWorkerRef.current?.terminate();
      tickerWorkerRef.current = null;
    };
  }, []);

  if (!ready) {
    return (
      <AppShell showBottomNav={false}>
        <Splash />
      </AppShell>
    );
  }

  return (
    <>
      <PwaInstallBanner />
      <reminderToast.Toast />
      <Routes>
        <Route path={routes.root} element={<RootRedirect />} />
        <Route path="/onboarding/*" element={<OnboardingGate />} />
        <Route path={routes.today} element={<ProtectedMain><TodayScreen /></ProtectedMain>} />
        <Route path={routes.week} element={<ProtectedMain><Suspense><WeekScreenLazy /></Suspense></ProtectedMain>} />
        <Route path={routes.timeline} element={<ProtectedMain><Suspense><TimelineScreen /></Suspense></ProtectedMain>} />
        <Route path={routes.journal} element={<ProtectedMain><Suspense><JournalEntryScreenLazy /></Suspense></ProtectedMain>} />
        <Route path={routes.focus} element={<ProtectedMain><Suspense><FocusScreen /></Suspense></ProtectedMain>} />
        <Route path={routes.learn} element={<ProtectedMain><Suspense><LearningScreenLazy /></Suspense></ProtectedMain>} />
        <Route path={routes.relapse} element={<ProtectedMain><Suspense><RelapseScreenLazy /></Suspense></ProtectedMain>} />
        <Route path={routes.seasonEnd} element={<ProtectedMain allowEnded><Suspense><SeasonEndScreenLazy /></Suspense></ProtectedMain>} />
        <Route path={routes.seasons} element={<ProtectedMain allowEnded><Suspense><ArchiveScreenLazy /></Suspense></ProtectedMain>} />
        <Route path={routes.seasonDetail} element={<ProtectedMain allowEnded><Suspense><ArchiveScreenLazy /></Suspense></ProtectedMain>} />
        <Route path={routes.settings} element={<ProtectedMain><Suspense><SettingsScreen /></Suspense></ProtectedMain>} />
        <Route path={routes.login} element={<LoginScreen />} />
        <Route path={routes.signup} element={<SignupScreen />} />
        <Route path={routes.library} element={<ProtectedMain><Suspense><JournalLibraryScreenLazy /></Suspense></ProtectedMain>} />
        <Route path={routes.notebook} element={<ProtectedMain showNav={false}><Suspense><NotebookPageLazy /></Suspense></ProtectedMain>} />
        <Route path={routes.packs} element={<ProtectedMain><Suspense><PacksPageLazy /></Suspense></ProtectedMain>} />
        <Route path="*" element={<Navigate to={routes.root} replace />} />
      </Routes>
    </>
  );
}

function Splash() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-[70dvh] flex-col items-center justify-center text-center"
    >
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-full border border-monk-border-strong bg-monk-surface">
        <span className="h-8 w-8 animate-monk-pulse rounded-full border-2 border-monk-accent" />
      </div>
      <h1 className="text-4xl font-bold leading-[48px] tracking-tight">Zendo</h1>
      <p className="mt-3 text-sm text-monk-muted">A quiet digital temple for focus.</p>
      <span className="sr-only">Loading your season…</span>
    </div>
  );
}

function RootRedirect() {
  const { userProfile, activeSeason, ensureSeasonFresh } = useMonkStore();

  useEffect(() => {
    ensureSeasonFresh();
  }, [ensureSeasonFresh]);

  if (!userProfile || !userProfile.onboardingCompleted || !activeSeason) {
    return <Navigate to={routes.onboardingWelcome} replace />;
  }
  if (activeSeason.status === "ended" || activeSeason.status === "archived") return <Navigate to={routes.seasonEnd} replace />;
  return <Navigate to={routes.today} replace />;
}

function OnboardingGate() {
  const activeSeason = useMonkStore((state) => state.activeSeason);
  const userProfile = useMonkStore((state) => state.userProfile);
  const location = useLocation();
  if (userProfile?.onboardingCompleted && activeSeason?.status === "active") {
    return <Navigate to={routes.today} replace />;
  }
  return <OnboardingScreen path={location.pathname} />;
}

function ProtectedMain({ children, allowEnded = false, showNav = true }: { children: JSX.Element; allowEnded?: boolean; showNav?: boolean }) {
  const { userProfile, activeSeason, ensureSeasonFresh } = useMonkStore();
  const location = useLocation();

  useEffect(() => {
    ensureSeasonFresh();
  }, [ensureSeasonFresh]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!userProfile?.onboardingCompleted || !activeSeason) {
    return <Navigate to={routes.onboardingWelcome} replace />;
  }
  if (!allowEnded && (activeSeason.status === "ended" || activeSeason.status === "archived")) {
    return <Navigate to={routes.seasonEnd} replace />;
  }
  return <AppShell showBottomNav={showNav}>{children}</AppShell>;
}



function OnboardingScreen({ path }: { path: string }) {
  const navigate = useNavigate();
  const store = useMonkStore();
  const stepIndex = Math.max(0, onboardingOrder.findIndex((item) => item === path));
  const currentStep = stepIndex + 1;
  const totalSteps = onboardingOrder.length;
  const next = onboardingOrder[Math.min(stepIndex + 1, onboardingOrder.length - 1)];
  const prev = stepIndex > 0 ? onboardingOrder[stepIndex - 1] : null;
  const goNext = () => {
    store.setOnboardingStep(next);
    navigate(next);
  };
  const goBack = prev ? () => {
    store.setOnboardingStep(prev);
    navigate(prev);
  } : undefined;

  // Unknown /onboarding/* paths (e.g. removed steps) resolve to step 1
  const isKnownStep = (onboardingOrder as readonly string[]).includes(path);
  if (!isKnownStep) {
    return (
      <OnboardingShell>
        <WelcomeScreen onNext={goNext} />
      </OnboardingShell>
    );
  }
  if (path === routes.onboardingWelcome) {
    return (
      <OnboardingShell>
        <WelcomeScreen onNext={goNext} />
      </OnboardingShell>
    );
  }

  // phase labels mirror onboardingOrder phases only; do not drive order/navigation
  const phaseForStep = (stepPath: string): string | undefined => {
    if (stepPath === routes.onboardingHabits) return "Clear";
    if (stepPath === routes.onboardingGoals || stepPath === routes.onboardingSeason) return "Plan";
    if (stepPath === routes.onboardingKeystone) return "Focus";
    if (stepPath === routes.onboardingPreview) return "Review";
    return undefined;
  };

  return (
    <OnboardingShell currentStep={currentStep} totalSteps={totalSteps} phaseLabel={phaseForStep(path)} onBack={goBack}>
      {path === routes.onboardingHabits ? <HabitAudit onNext={goNext} /> : null}
      {path === routes.onboardingGoals ? <GoalBrainDump onNext={goNext} /> : null}
      {path === routes.onboardingKeystone ? <KeystoneSetup onNext={goNext} /> : null}
      {path === routes.onboardingSeason ? <SeasonSetup onNext={goNext} /> : null}
      {path === routes.onboardingPreview ? <TodayPreviewStep /> : null}
    </OnboardingShell>
  );
}

