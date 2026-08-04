import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase as getSupabase } from "../lib/supabase";
import { startMusic, stopMusic, toggleMusic } from "../lib/focusMusic";
import LoginScreen from "../components/LoginScreen";
import SignupScreen from "../components/SignupScreen";
import PwaInstallBanner from "../components/PwaInstallBanner";
import { startEveningNudgeWatcher } from "../lib/eveningNudge";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Volume2,
  VolumeX,
  EyeOff,
  FileText,
  History,
  Minus,
  Moon,
  Plus,
  Target,
  Timer,
  Flag,
  Flame,
  Trophy,
  Lightbulb,
  Sun
} from "lucide-react";
import {
  AppShell,
  CalmAlert,
  CalmDialog,
  Card,
  ChoiceCard,
  ChoiceChip,
  DurationCard,
  EmptyState,
  GhostButton,
  OnboardingShell,
  PageHeader,
  PrimaryButton,
  SeasonPreviewCard,
  SecondaryButton,
  SectionHeader,
  SettingsLink,
  TextInput,
  Textarea,
  useCalmToast
} from "../components/ui";
import { useSyncStatus, type SyncStatus } from "../lib/syncStatus";
import { habitOptions, learningTypes, defaultWeeklyTargets } from "../constants/defaultData";
import { DAILY_STATUS_LABELS, getDailyStatusHelper, resolveDailyActivityStatus } from "../constants/dailyActivityStatus";
import { FOCUS_PRESETS, getCompletedSeconds, getCurrentFocusPhase } from "../constants/focusPresets";
import {
  formatFocusSessionTimelineDescription,
  getFocusSessionPreset,
  normalizeFocusSessionRecord,
  resolveFocusSessionStatus
} from "../constants/focusSessionStatus";
import { onboardingOrder, routes } from "../constants/routes";
import { CORE_VALUES } from "../constants/whyValues";
import {
  addDaysToDate,
  datesInRange,
  formatHumanDate,
  getDayNumber,
  getDaysLeft,
  getDaysPassed,
  getSeasonDayLabel,
  getSeasonProgress,
  getTodayDateString,
  nowIso
} from "../lib/date";
import { createId } from "../lib/ids";
import { formatIntention, parseIntention } from "../lib/implementationIntention";
import { capacityCheck, planStrengthLabel, scorePlan } from "../lib/planScoring";
import { dismissCoachStep, getCoachStep, type CoachStepId } from "../lib/coach";
import { exportStateAsJson, JOURNAL_DRAFT_KEY, loadLastFocus, saveLastFocus } from "../lib/storage";
import {
  validateGoalBrainDump,
  validateHabitAudit,
  validateJournalEntry,
  validateKeystoneActions,
  validateNarrowGoals,
  validateSeasonDuration,
  validateWeeklyAllocation
} from "../lib/validation";
import { selectActiveGoals, selectCurrentWeeklyPlan, selectTodayPlan, selectJournalEntryForToday, selectEnergyForDate, selectTodayLearningSessions, selectTotalFocusSecondsForDate } from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import type { EnergyLevel, FocusSession, FocusSessionPreset, JournalAnswers, JournalEntry, LearningType, SeasonDurationPreset, TimelineStatus, LearningSourceType, LearningSession, TimelineEvent, TimelineEventType, MonkMVPState } from "../types/app";
import { playZenBell, unlockAudio } from "../lib/audio";
import { CircularProgress } from "../components/CircularProgress";
import JournalNotebook, { NotebookEditor } from "../screens/JournalNotebook";
import JournalPacks from "../screens/JournalPacks";
import { t, useT, useLanguage } from "../i18n";
import {
  getDailyJournalPromptForDate,
  getJournalAnswerItems,
  getPromptPack,
  getJournalQuestionLabels,
} from "../i18n/prompts";
import type { AppLanguage } from "../types/app";

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
import { TodayScreen, DefenseChips } from "../screens/TodayScreen";
import { FocusSessionPanel, FocusSessionStarter } from "../screens/FocusSession";
import { FrictionWhy, SeasonProgressCard, WhyEditor } from "../components/SeasonWidgets";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import {
  ScreenIntro,
  ValuesStep,
  VisionStep,
  RealityCheck,
  PastObstacles,
  HabitAudit,
  RemoveDistractions,
  GreyMode,
  GoalBrainDump,
  SeasonSetup,
  NarrowGoals,
  KeystoneSetup,
  ObstacleStep,
  WeekSetup,
  TodayPreviewStep,
  CoachHint,
  PlanTomorrow,
  WeeklyStatusIndicators,
} from "../screens/OnboardingSteps";
import {
  getDailyActivity,
  getDailyStatusForDate,
  getCoreDailyStatusForDate,
  getDailyHelperForDate,
  getFocusSummaryForDate,
  getLearningSummaryForDate,
  isCloseDaySkipped,
  skipCloseDay,
  getDayPart,
  isReentryDismissed,
  dismissReentry,
  isReentryChipHidden,
  hideReentryChip,
  shouldOfferReentry,
} from "../lib/dailyActivity";

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

  useEffect(() => {
    if (!activeSession || activeSession.status !== "running") return;

    const notify = (title: string, body: string) => {
      if (Notification.permission === "granted") new Notification(title, { body, icon: "/apple-touch-icon.png", silent: true });
    };

    const tick = () => {
      // Re-read the session from the store: a tick fired by visibilitychange can
      // overlap the interval callback, and if advanceFocusPhase already reset
      // startTime/currentPhaseIndex, the stale closure would advance AGAIN
      // (skipping the break) or complete twice. Fresh state makes the second
      // tick a no-op (elapsed recomputed against the new phase startTime).
      const fresh = useMonkStore.getState().focusSessions.find((s) => s.id === activeSession.id);
      if (!fresh || fresh.status !== "running") return;
      const phaseStartMs = new Date(fresh.startTime).getTime();
      const freshPhase = getCurrentFocusPhase(fresh);
      const freshTargetSeconds = freshPhase.plannedMinutes * 60;
      const elapsed = Math.floor((Date.now() - phaseStartMs) / 1000);
      if (elapsed >= freshTargetSeconds) {
        const phases = fresh.phases ?? [];
        const currentIndex = fresh.currentPhaseIndex ?? 0;
        if (currentIndex < phases.length - 1) {
          advanceFocusPhase(fresh.id);
          playZenBell();
          if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
          const nextPhase = phases[currentIndex + 1];
          notify(
            nextPhase?.type === "break" ? "Break time" : "Focus block",
            nextPhase?.type === "break" ? "Step away and recharge." : "Back to deep work. You've got this."
          );
        } else {
          completeFocusSession(fresh.id, true);
          playZenBell();
          if ("vibrate" in navigator) navigator.vibrate(300);
          notify("Session complete", "You did the work. Rest well.");
        }
      } else {
        tickFocusSession(fresh.id, Math.max(0, elapsed));
      }
    };

    const timer = window.setInterval(tick, 1000);

    // Re-sync immediately when tab becomes visible again (interval may have been throttled)
    const onVisibilityChange = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeSession?.id, activeSession?.status, activeSession?.startTime, activeSession?.currentPhaseIndex, activeSession?.phases, tickFocusSession, completeFocusSession, advanceFocusPhase]);

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

  if (path === routes.onboardingWelcome) {
    return (
      <OnboardingShell>
        <WelcomeScreen onNext={goNext} />
      </OnboardingShell>
    );
  }

  // phase labels mirror onboardingOrder phases only; do not drive order/navigation
  const phaseForStep = (stepPath: string): string | undefined => {
    if (stepPath === routes.onboardingValues || stepPath === routes.onboardingReality || stepPath === routes.onboardingObstacles) return "Reflect";
    if (stepPath === routes.onboardingHabits || stepPath === routes.onboardingRemove || stepPath === routes.onboardingGreyMode) return "Clear";
    if (stepPath === routes.onboardingGoals || stepPath === routes.onboardingSeason) return "Plan";
    if (stepPath === routes.onboardingVision || stepPath === routes.onboardingNarrow || stepPath === routes.onboardingKeystone || stepPath === routes.onboardingObstacleMitigation || stepPath === routes.onboardingWeekSetup) return "Focus";
    if (stepPath === routes.onboardingPreview) return "Review";
    return undefined;
  };

  return (
    <OnboardingShell currentStep={currentStep} totalSteps={totalSteps} phaseLabel={phaseForStep(path)} onBack={goBack}>
      {path === routes.onboardingValues ? <ValuesStep onNext={goNext} /> : null}
      {path === routes.onboardingVision ? <VisionStep onNext={goNext} /> : null}
      {path === routes.onboardingReality ? <RealityCheck onNext={goNext} /> : null}
      {path === routes.onboardingObstacles ? <PastObstacles onNext={goNext} /> : null}
      {path === routes.onboardingHabits ? <HabitAudit onNext={goNext} /> : null}
      {path === routes.onboardingRemove ? <RemoveDistractions onNext={goNext} /> : null}
      {path === routes.onboardingGreyMode ? <GreyMode onNext={goNext} /> : null}
      {path === routes.onboardingGoals ? <GoalBrainDump onNext={goNext} /> : null}
      {path === routes.onboardingSeason ? <SeasonSetup onNext={goNext} /> : null}
      {path === routes.onboardingNarrow ? <NarrowGoals onNext={goNext} /> : null}
      {path === routes.onboardingKeystone ? <KeystoneSetup onNext={goNext} /> : null}
      {path === routes.onboardingObstacleMitigation ? <ObstacleStep onNext={goNext} /> : null}
      {path === routes.onboardingWeekSetup ? <WeekSetup onNext={goNext} /> : null}
      {path === routes.onboardingPreview ? <TodayPreviewStep /> : null}
    </OnboardingShell>
  );
}

