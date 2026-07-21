import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase as getSupabase } from "../lib/supabase";
import { startMusic, stopMusic, toggleMusic } from "../lib/focusMusic";
import LoginScreen from "../components/LoginScreen";
import SignupScreen from "../components/SignupScreen";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Circle,
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
  Textarea
} from "../components/ui";
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
import { JOURNAL_DRAFT_KEY } from "../lib/storage";
import {
  validateFocusGoalSelection,
  validateGoalBrainDump,
  validateGoalElimination,
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
import { playZenBell } from "../lib/audio";
import { CircularProgress } from "../components/CircularProgress";
import JournalNotebook, { NotebookEditor } from "../components/JournalNotebook";
import JournalPacks from "../components/JournalPacks";

const promptsBig90Days = [
  "Kalau 90 hari ke depan berjalan dengan sangat baik, apa yang berubah dalam hidup saya?",
  "Versi diri seperti apa yang ingin saya bangun dalam 90 hari ke depan?",
  "Apa 3 hal yang paling ingin saya perbaiki sebelum 90 hari ini selesai?",
  "Apa masalah terbesar yang membuat hidup saya terasa stuck saat ini?",
  "Apa satu keputusan yang kalau saya ambil sekarang, akan membuat 90 hari ke depan jauh lebih jelas?",
  "Apa yang selama ini saya tunda, padahal saya tahu itu penting?",
  "Apa hal yang harus saya berhenti lakukan agar 90 hari ini berhasil?",
  "Apa hal kecil yang kalau saya lakukan setiap hari, hasilnya akan besar dalam 90 hari?"
];

const promptsFocusGoal = [
  "Apa satu goal utama yang paling layak saya perjuangkan dalam 90 hari ke depan?",
  "Kenapa goal ini penting untuk hidup saya sekarang?",
  "Kalau saya hanya boleh fokus pada satu area hidup, area mana yang paling butuh perhatian?",
  "Apa goal yang terlihat menarik, tapi sebenarnya hanya distraksi?",
  "Apa goal yang kalau tercapai akan membuat goal lain jadi lebih mudah?",
  "Apa konsekuensi kalau saya tidak berubah dalam 90 hari ke depan?",
  "Apa bukti nyata bahwa saya benar-benar serius dengan goal ini?"
];

const promptsLifeAudit = [
  "Apa kebiasaan saya saat ini yang sedang membawa saya naik?",
  "Apa kebiasaan saya saat ini yang diam-diam menghancurkan progress saya?",
  "Apa 3 aktivitas yang paling banyak membuang waktu saya?",
  "Kapan saya merasa paling produktif, dan karena apa?",
  "Kapan saya paling mudah terdistraksi, dan biasanya pemicunya apa?",
  "Apa yang selama ini membuat saya lelah secara mental?",
  "Apa yang membuat saya merasa hidup, bersemangat, dan punya arah?"
];

const promptsSystemDesign = [
  "Rutinitas pagi seperti apa yang akan membantu saya menang hari ini?",
  "Rutinitas malam seperti apa yang akan membantu saya menutup hari dengan tenang?",
  "Apa sistem sederhana yang bisa membuat saya konsisten tanpa bergantung pada motivasi?",
  "Apa lingkungan yang harus saya ubah agar kebiasaan baik jadi lebih mudah?",
  "Apa distraksi yang harus saya jauhkan dari hidup saya selama 90 hari?",
  "Apa aturan pribadi yang perlu saya buat untuk menjaga fokus?",
  "Apa indikator sederhana bahwa hari ini adalah hari yang berhasil?",
  "Apa hal minimum yang tetap harus saya lakukan bahkan saat saya capek?"
];

const promptsIdentityDiscipline = [
  "Saya ingin menjadi orang seperti apa dalam 90 hari ke depan?",
  "Apa yang akan dilakukan versi diri saya yang lebih disiplin hari ini?",
  "Apa yang harus saya buktikan kepada diri sendiri, bukan kepada orang lain?",
  "Apa janji kecil yang harus saya tepati setiap hari?",
  "Apa standar baru yang ingin saya bangun untuk diri saya sendiri?",
  "Apa kebiasaan lama yang sudah tidak cocok dengan identitas baru saya?",
  "Kalau saya benar-benar menghormati masa depan saya, apa yang akan saya lakukan hari ini?"
];

const promptsWeeklyReview = [
  "Apa progress terbesar saya minggu ini?",
  "Apa hal yang belum berjalan sesuai rencana?",
  "Apa pelajaran paling penting dari minggu ini?",
  "Apa yang membuat saya terdistraksi minggu ini?",
  "Apa yang memberi saya energi minggu ini?",
  "Apa yang harus saya kurangi minggu depan?",
  "Apa satu perubahan kecil yang akan membuat minggu depan lebih baik?",
  "Apakah tindakan saya minggu ini sudah sesuai dengan goal 90 hari saya?"
];

const promptsDailyJournal = [
  "Apa yang sebenarnya kamu pikirkan saat ini — tanpa menyaringnya?",
  "Kalau hari ini cuma satu hal yang berjalan benar-benar baik, apa itu?",
  "Apa yang kamu hindari seharian ini — dan apakah itu sepenting yang kamu kira?",
  "Kapan terakhir kali kamu merasa benar-benar hadir, dan apa yang terjadi saat itu?",
  "Apa yang akan kamu ubah besok, kalau hari ini mengajarkan sesuatu?",
  "Apa yang berat di pundakmu sekarang — dan apa yang kamu syukuri?",
  "Apa yang membuatmu berhenti sejenak hari ini, meskipun kamu tidak menyadarinya?",
  "Kalau kamu bisa mengulang satu momen hari ini, mana yang akan kamu pilih?",
  "Apa yang sebenarnya kamu butuhkan saat ini — bukan yang kamu inginkan?",
  "Apa yang akan kamu ingat dari hari ini, sebulan lagi?",
];

const JOURNAL_QUESTION_LABELS: Record<keyof JournalAnswers, string> = {
  whatMovedToday: "What moved today?",
  whatDistractedMe: "What distracted me?",
  whatDidILearn: "What did I learn today?",
  whatShouldBeEasierTomorrow: "What should be easier tomorrow?",
  whatShouldBeHarderTomorrow: "What should be harder tomorrow?",
  morningPages: "Morning Pages"
};

function getDailyJournalPromptForDate(date: string) {
  const sum = date.split("-").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return promptsDailyJournal[Math.abs(sum) % promptsDailyJournal.length];
}

function getJournalAnswerItems(answers: JournalAnswers, date?: string) {
  return (Object.keys(JOURNAL_QUESTION_LABELS) as Array<keyof JournalAnswers>)
    .map((key) => ({
      id: key,
      question: key === "whatMovedToday" && date ? getDailyJournalPromptForDate(date) : JOURNAL_QUESTION_LABELS[key],
      answer: answers[key]?.trim()
    }))
    .filter((item): item is { id: keyof JournalAnswers; question: string; answer: string } => Boolean(item.answer));
}

const promptsClosing90Days = [
  "Apa perubahan terbesar dalam diri saya setelah 90 hari ini?",
  "Apa kebiasaan yang paling berdampak?",
  "Apa goal yang tercapai, dan apa yang belum?",
  "Apa pelajaran terbesar tentang diri saya?",
  "Apa yang ternyata tidak sepenting yang saya kira?",
  "Apa yang ingin saya lanjutkan untuk 90 hari berikutnya?",
  "Apa nasihat yang akan saya berikan kepada diri saya 90 hari yang lalu?",
  "Versi diri saya yang baru ini ingin membangun apa selanjutnya?"
];

export default function App() {
  const hydrate = useMonkStore((state) => state.hydrate);
  const recordOpen = useMonkStore((state) => state.recordOpen);
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
    setReady(true);
  }, [hydrate, recordOpen]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== "running") return;
    const startMs = new Date(activeSession.startTime).getTime();
    const currentPhase = getCurrentFocusPhase(activeSession);
    const targetSeconds = currentPhase.plannedMinutes * 60;

    const notify = (title: string, body: string) => {
      if (Notification.permission === "granted") new Notification(title, { body, icon: "/apple-touch-icon.png", silent: true });
    };

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      if (elapsed >= targetSeconds) {
        const phases = activeSession.phases ?? [];
        const currentIndex = activeSession.currentPhaseIndex ?? 0;
        if (currentIndex < phases.length - 1) {
          advanceFocusPhase(activeSession.id);
          playZenBell();
          if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
          const nextPhase = phases[currentIndex + 1];
          notify(
            nextPhase?.type === "break" ? "Break time" : "Focus block",
            nextPhase?.type === "break" ? "Step away and recharge." : "Back to deep work. You've got this."
          );
        } else {
          completeFocusSession(activeSession.id, true);
          playZenBell();
          if ("vibrate" in navigator) navigator.vibrate(300);
          notify("Session complete", "You did the work. Rest well.");
        }
      } else {
        tickFocusSession(activeSession.id, Math.max(0, elapsed));
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
    <Routes>
      <Route path={routes.root} element={<RootRedirect />} />
      <Route path="/onboarding/*" element={<OnboardingGate />} />
      <Route path={routes.today} element={<ProtectedMain><TodayScreen /></ProtectedMain>} />
      <Route path={routes.week} element={<ProtectedMain><WeekScreen /></ProtectedMain>} />
      <Route path={routes.timeline} element={<ProtectedMain><TimelineScreen /></ProtectedMain>} />
      <Route path={routes.journal} element={<ProtectedMain><JournalEntryScreen /></ProtectedMain>} />
      <Route path={routes.focus} element={<ProtectedMain><FocusScreen /></ProtectedMain>} />
      <Route path={routes.learn} element={<ProtectedMain><LearningScreen /></ProtectedMain>} />
      <Route path={routes.relapse} element={<ProtectedMain><RelapseScreen /></ProtectedMain>} />
      <Route path={routes.seasonEnd} element={<ProtectedMain allowEnded><SeasonEndScreen /></ProtectedMain>} />
      <Route path={routes.settings} element={<ProtectedMain><SettingsScreen /></ProtectedMain>} />
      <Route path={routes.login} element={<LoginScreen />} />
      <Route path={routes.signup} element={<SignupScreen />} />
      <Route path={routes.library} element={<ProtectedMain><JournalLibraryScreen /></ProtectedMain>} />
      <Route path={routes.notebook} element={<ProtectedMain><NotebookPage /></ProtectedMain>} />
      <Route path={routes.packs} element={<ProtectedMain><PacksPage /></ProtectedMain>} />
      <Route path="*" element={<Navigate to={routes.root} replace />} />
    </Routes>
  );
}

function Splash() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-full border border-monk-border-strong bg-monk-surface">
        <span className="h-8 w-8 rounded-full border-2 border-monk-accent" />
      </div>
      <h1 className="text-[40px] font-bold leading-[48px] tracking-normal">Zendo</h1>
      <p className="mt-3 text-sm text-monk-muted">A quiet digital temple for focus.</p>
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
  if (activeSeason.status === "ended") return <Navigate to={routes.seasonEnd} replace />;
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

function ProtectedMain({ children, allowEnded = false }: { children: JSX.Element; allowEnded?: boolean }) {
  const { userProfile, activeSeason, ensureSeasonFresh } = useMonkStore();
  useEffect(() => {
    ensureSeasonFresh();
  }, [ensureSeasonFresh]);

  if (!userProfile?.onboardingCompleted || !activeSeason) {
    return <Navigate to={routes.onboardingWelcome} replace />;
  }
  if (!allowEnded && activeSeason.status === "ended") {
    return <Navigate to={routes.seasonEnd} replace />;
  }
  return <AppShell>{children}</AppShell>;
}

function getDailyActivity(store: MonkMVPState, date: string) {
  const dayPlanIds = store.dayPlans.filter((plan) => plan.date === date).map((plan) => plan.id);
  const focusSessions = store.focusSessions.filter((session) => {
    const sessionDate = (session.endedAt ?? session.endTime ?? session.startedAt ?? session.startTime).slice(0, 10);
    return (dayPlanIds.includes(session.dayPlanId) || sessionDate === date) && ["completed", "ended_early"].includes(session.status);
  });
  const learningSessions = store.learningSessions.filter(
    (session) => (session.endedAt ?? session.startedAt).slice(0, 10) === date && session.status === "completed"
  );
  const legacyLearningEntries = store.learningEntries.filter((entry) => dayPlanIds.includes(entry.dayPlanId));
  return { focusSessions, learningSessions, legacyLearningEntries };
}

function getDailyStatusForDate(store: MonkMVPState, date: string): TimelineStatus {
  const day = store.timelineDays.find((item) => item.date === date);
  if (day?.status === "relapse" || day?.status === "rest") return day.status;
  return getCoreDailyStatusForDate(store, date);
}

function getCoreDailyStatusForDate(store: MonkMVPState, date: string) {
  const activity = getDailyActivity(store, date);
  return resolveDailyActivityStatus({
    focusSessions: activity.focusSessions,
    learningSessions: activity.learningSessions.length > 0
      ? activity.learningSessions
      : activity.legacyLearningEntries.map((entry) => ({ id: entry.id }))
  });
}

function getDailyHelperForDate(store: MonkMVPState, date: string) {
  const activity = getDailyActivity(store, date);
  return getDailyStatusHelper({
    focusSessions: activity.focusSessions,
    learningSessions: activity.learningSessions.length > 0
      ? activity.learningSessions
      : activity.legacyLearningEntries.map((entry) => ({ id: entry.id }))
  });
}

function getFocusSummaryForDate(store: MonkMVPState, date: string) {
  const session = getDailyActivity(store, date).focusSessions[0];
  if (!session) return "Not done yet";
  const preset = FOCUS_PRESETS[session.preset ?? session.timerMode ?? "deep_work"].shortLabel;
  return `${formatFocusSessionTimelineDescription(normalizeFocusSessionRecord(session))} · ${preset}`;
}

function getLearningSummaryForDate(store: MonkMVPState, date: string) {
  const activity = getDailyActivity(store, date);
  const session = activity.learningSessions[0];
  if (session) {
    const minutes = Math.round(session.actualDurationSeconds / 60);
    const sourceType = session.sourceType.replace("_", " ");
    return `${minutes} min · ${sourceType} · ${session.sourceTitle || "External Source"}`;
  }
  const entry = activity.legacyLearningEntries[0];
  if (entry) return `${entry.durationMinutes ?? 0} min · ${entry.title}`;
  return "Not done yet";
}

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minsStr = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const secsStr = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minsStr}:${secsStr}`;
}

function getSessionPhases(session: FocusSession) {
  return session.phases?.length
    ? session.phases
    : FOCUS_PRESETS[session.preset ?? session.timerMode ?? "deep_work"].buildPhases(session.durationMinutes);
}

function getPhasePosition(session: FocusSession, type = getCurrentFocusPhase(session).type) {
  const phases = getSessionPhases(session);
  const currentIndex = session.currentPhaseIndex ?? 0;
  const total = phases.filter((item) => item.type === type).length;
  const current = phases.slice(0, currentIndex + 1).filter((item) => item.type === type).length;
  return { current: Math.max(1, current), total: Math.max(1, total) };
}

function getPhaseRoundLabel(session: FocusSession) {
  const phase = getCurrentFocusPhase(session);
  const position = getPhasePosition(session, phase.type);
  return `${phase.type === "break" ? "Break" : "Focus"} ${position.current} of ${position.total}`;
}

function getRemainingFocusBlocks(session: FocusSession) {
  const phases = getSessionPhases(session);
  const currentIndex = session.currentPhaseIndex ?? 0;
  return phases.slice(currentIndex + 1).filter((item) => item.type === "focus").length;
}

function getSessionLeftTitle(session: FocusSession) {
  return (session.preset ?? session.timerMode) === "pomodoro" ? "Sessions left" : "Session left";
}

function getSessionLeftLabel(session: FocusSession) {
  const preset = session.preset ?? session.timerMode ?? "deep_work";
  const remainingFocusBlocks = getRemainingFocusBlocks(session);
  if (preset === "custom") return "Single focus block";
  if (remainingFocusBlocks === 0) return "Final focus block";
  if (preset === "pomodoro") {
    return `${remainingFocusBlocks} ${remainingFocusBlocks === 1 ? "cycle" : "cycles"} after this`;
  }
  return `${remainingFocusBlocks} focus ${remainingFocusBlocks === 1 ? "block" : "blocks"} after this`;
}

function getBreakGuidance(session: FocusSession): {
  title: string;
  description: string;
  activities: { label: string; emoji: string }[];
} {
  const phase = getCurrentFocusPhase(session);
  if (phase.plannedMinutes >= 10) {
    return {
      title: "10-min recharge",
      description: "Real recovery needs a scene change. Try:",
      activities: [
        { label: "Doodle freely — no goal, just pen on paper", emoji: "✏️" },
        { label: "Walk outside or to a window", emoji: "🚶" },
        { label: "Stretch neck, shoulders, hips", emoji: "🧘" },
        { label: "Refill water, grab a snack", emoji: "🥜" },
      ],
    };
  }
  return {
    title: "5-min reset",
    description: "Short movement beats passive scrolling. Pick one:",
    activities: [
      { label: "Stand & shake out your hands", emoji: "🤲" },
      { label: "Look 20ft away for 20 seconds", emoji: "👁️" },
      { label: "3 slow deep breaths", emoji: "🌬️" },
      { label: "Drink water", emoji: "💧" },
    ],
  };
}

function getNextFocusLabel(session: FocusSession) {
  const phases = getSessionPhases(session);
  const currentIndex = session.currentPhaseIndex ?? 0;
  const nextFocusIndex = phases.findIndex((item, index) => index > currentIndex && item.type === "focus");
  if (nextFocusIndex === -1) return "Next: Complete";
  const totalFocusBlocks = phases.filter((item) => item.type === "focus").length;
  const nextFocusPosition = phases.slice(0, nextFocusIndex + 1).filter((item) => item.type === "focus").length;
  return `Next: Focus ${nextFocusPosition} of ${totalFocusBlocks}`;
}

function FocusSessionPanel({
  session,
  mainAction,
  compact = false,
  onOpenFocus
}: {
  session: FocusSession;
  mainAction?: string;
  compact?: boolean;
  onOpenFocus?: () => void;
}) {
  const store = useMonkStore();
  const phase = getCurrentFocusPhase(session);
  const targetSeconds = Math.max(1, phase.plannedMinutes * 60);
  const elapsed = session.elapsedSeconds || 0;
  const remaining = Math.max(0, targetSeconds - elapsed);
  const phaseProgress = Math.min(100, (elapsed / targetSeconds) * 100);
  const completedSeconds = getCompletedSeconds(session);
  const plannedMinutes = session.plannedDurationMinutes ?? 0;
  const sessionProgress = plannedMinutes > 0 ? Math.min(100, (completedSeconds / (plannedMinutes * 60)) * 100) : 0;
  const modeLabel = FOCUS_PRESETS[session.preset ?? session.timerMode ?? "deep_work"].shortLabel;
  const blockLabel = getPhaseRoundLabel(session);
  const isBreak = phase.type === "break";
  const isPaused = session.status === "paused";
  const breakGuidance = getBreakGuidance(session);
  const intention = parseIntention(mainAction || "");
  const ringSize = compact ? 148 : 196;
  const ringColor = isBreak ? "var(--color-rest)" : isPaused ? "var(--color-warning)" : "var(--color-accent)";

  return (
    <Card
      important
      className={`relative text-center border-monk-border-strong ${compact ? "p-5" : "p-7"} ${
        isBreak ? "bg-monk-rest-soft/40" : "bg-monk-soft"
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="rounded-full border border-monk-border bg-monk-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-monk-muted">
          {modeLabel}
        </span>
        {isPaused ? (
          <span className="rounded-full border border-monk-warning/40 bg-monk-warning-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-monk-warning">
            Paused
          </span>
        ) : isBreak ? (
          <span className="rounded-full border border-monk-rest/40 bg-monk-rest-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-monk-rest">
            Break
          </span>
        ) : (
          <span className="rounded-full border border-monk-accent/30 bg-monk-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-monk-accent">
            Focus
          </span>
        )}
      </div>
      <p className="mt-2 text-sm font-semibold text-monk-text">{blockLabel}</p>

      <div className={`${compact ? "my-5" : "my-8"} flex items-center justify-center`}>
        <CircularProgress
          progress={phaseProgress}
          size={ringSize}
          strokeWidth={compact ? 7 : 8}
          color={ringColor}
          bgColor="var(--color-border)"
        >
          <p className={`${compact ? "text-3xl" : "text-[44px]"} font-mono font-bold leading-none tabular-nums text-monk-text`}>
            {formatTimer(remaining)}
          </p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-monk-muted">
            {isBreak ? "break left" : "focus left"}
          </p>
        </CircularProgress>
      </div>

      {isBreak ? (
        <div className={`${compact ? "" : "mx-auto max-w-sm"} mb-5 text-left`}>
          <div className="rounded-2xl border border-monk-border bg-monk-bg p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-monk-rest">{breakGuidance.title}</p>
            <p className="mt-2 text-xs leading-5 text-monk-muted">{breakGuidance.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {breakGuidance.activities.map((activity) => (
                <span
                  key={activity.label}
                  className="flex items-center gap-1.5 rounded-full border border-monk-border bg-monk-soft px-3 py-1.5 text-xs text-monk-text"
                >
                  <span aria-hidden>{activity.emoji}</span>
                  {activity.label}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold text-monk-muted">{getNextFocusLabel(session)}</p>
          </div>
        </div>
      ) : (
        <div className={`${compact ? "" : "mx-auto max-w-sm"} mb-5 text-left`}>
          <div className="rounded-2xl border border-monk-border bg-monk-bg p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-monk-muted">This block</p>
            {intention.when && intention.action ? (
              <div className="mt-1.5 space-y-1">
                <p className="text-xs text-monk-muted">When {intention.when}</p>
                <p className="text-sm font-semibold text-monk-text">I will {intention.action}</p>
              </div>
            ) : (
              <p className="mt-1.5 text-sm font-semibold text-monk-text">
                {mainAction || "Stay with one task."}
              </p>
            )}
            <p className="mt-3 text-xs text-monk-muted">
              {getSessionLeftLabel(session)} · distractions on paper, not on screen
            </p>
          </div>
        </div>
      )}

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-monk-muted">
          <span>Session</span>
          <span className="tabular-nums">{Math.round(sessionProgress)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-monk-border">
          <div
            className="h-full rounded-full bg-monk-accent transition-all duration-500"
            style={{ width: `${sessionProgress}%` }}
          />
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        {session.status === "running" ? (
          <SecondaryButton onClick={() => store.pauseFocusSession(session.id)} className="flex-1 min-h-12">
            Pause
          </SecondaryButton>
        ) : (
          <PrimaryButton onClick={() => store.resumeFocusSession(session.id)} className="flex-1 min-h-12">
            Resume
          </PrimaryButton>
        )}
        <button
          type="button"
          aria-label="Reset session"
          className="min-h-12 min-w-12 rounded-monk border border-monk-border px-3 text-xs font-semibold text-monk-muted transition hover:border-monk-accent hover:text-monk-accent active:scale-95"
          onClick={() => store.resetFocusSession(session.id)}
        >
          Reset
        </button>
        <button
          type="button"
          aria-label="End session"
          className="min-h-12 min-w-12 rounded-monk border border-monk-danger/40 px-3 text-xs font-semibold text-monk-danger transition hover:border-monk-danger active:scale-95"
          onClick={() => store.abandonFocusSession(session.id)}
        >
          End
        </button>
      </div>

      {onOpenFocus ? (
        <button
          type="button"
          className="mx-auto mt-4 flex min-h-11 items-center justify-center gap-1 px-4 text-xs font-bold text-monk-muted transition hover:text-monk-accent"
          onClick={onOpenFocus}
        >
          Full focus mode →
        </button>
      ) : null}
    </Card>
  );
}

const CHECKLIST_ITEMS = [
  "Close other tabs and notifications",
  "Water bottle nearby",
  "Phone face-down or on silent",
  "Clear desk, one task in mind",
];

function FocusSessionStarter({ compact = false }: { compact?: boolean }) {
  const store = useMonkStore();
  const [selectedPreset, setSelectedPreset] = useState<FocusSessionPreset>("deep_work");
  const [customMinutes, setCustomMinutes] = useState(50);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const selected = FOCUS_PRESETS[selectedPreset];
  const phases = selected.buildPhases(customMinutes);
  const totalMinutes = phases.reduce((sum, phase) => sum + phase.plannedMinutes, 0);
  const canStart = selectedPreset !== "custom" || customMinutes >= 5;
  const checklistDone = checked.size;

  function toggleItem(item: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  return (
    <Card className="border-monk-border bg-monk-surface p-5">
      {showChecklist ? (
        <>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-monk-text">Ready to focus?</p>
              <p className="mt-1 text-xs text-monk-muted">Optional check — skip any that don't fit.</p>
            </div>
            <span className="rounded-full bg-monk-soft px-2.5 py-1 text-[10px] font-bold tabular-nums text-monk-muted">
              {checklistDone}/{CHECKLIST_ITEMS.length}
            </span>
          </div>
          <FrictionWhy className="mb-4" />
          <div className="mb-5 flex flex-col gap-2">
            {CHECKLIST_ITEMS.map((item) => {
              const isChecked = checked.has(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleItem(item)}
                  className={`flex min-h-12 items-center gap-3 rounded-xl border p-3 text-left transition ${
                    isChecked
                      ? "border-monk-accent/40 bg-monk-accent-soft"
                      : "border-monk-border bg-monk-soft hover:border-monk-border-strong"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                      isChecked
                        ? "border-monk-accent bg-monk-accent text-monk-bg"
                        : "border-monk-border bg-monk-surface"
                    }`}
                  >
                    {isChecked ? <Check size={14} strokeWidth={2.5} /> : null}
                  </span>
                  <span className="text-sm text-monk-text">{item}</span>
                </button>
              );
            })}
          </div>
          <PrimaryButton
            className="min-h-12"
            onClick={() => {
              if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
              }
              store.startFocusSession(selectedPreset, customMinutes);
            }}
          >
            Begin {selected.shortLabel}
          </PrimaryButton>
          <GhostButton className="mt-2 w-full min-h-11" onClick={() => setShowChecklist(false)}>
            Back
          </GhostButton>
        </>
      ) : (
        <>
          <p className="text-sm font-bold text-monk-text">{compact ? "Start a focus block" : "Choose your rhythm"}</p>
          <p className="mb-4 mt-1 text-xs text-monk-muted">One block. One task. No multitasking.</p>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {(["deep_work", "pomodoro", "custom"] as FocusSessionPreset[]).map((preset) => {
              const active = selectedPreset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  className={`min-h-12 rounded-xl border px-2 text-xs font-semibold transition active:scale-[0.98] ${
                    active
                      ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                      : "border-monk-border bg-monk-soft text-monk-muted hover:border-monk-border-strong"
                  }`}
                  onClick={() => setSelectedPreset(preset)}
                >
                  {FOCUS_PRESETS[preset].shortLabel}
                </button>
              );
            })}
          </div>

          {selectedPreset === "custom" ? (
            <div className="mb-4">
              <label className="text-xs font-bold uppercase tracking-wider text-monk-muted" htmlFor="custom-focus-minutes">
                Minutes
              </label>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease minutes"
                  className="grid min-h-12 min-w-12 place-items-center rounded-xl border border-monk-border bg-monk-soft text-monk-muted"
                  onClick={() => setCustomMinutes((m) => Math.max(5, m - 5))}
                >
                  <Minus size={16} />
                </button>
                <input
                  id="custom-focus-minutes"
                  type="number"
                  min={5}
                  max={180}
                  value={customMinutes}
                  onChange={(event) => setCustomMinutes(Number(event.target.value))}
                  className="min-h-12 w-full rounded-xl border border-monk-border bg-monk-soft px-4 text-center text-sm font-semibold tabular-nums text-monk-text focus:border-monk-accent focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Increase minutes"
                  className="grid min-h-12 min-w-12 place-items-center rounded-xl border border-monk-border bg-monk-soft text-monk-muted"
                  onClick={() => setCustomMinutes((m) => Math.min(180, m + 5))}
                >
                  <Plus size={16} />
                </button>
              </div>
              <p className="mt-2 text-xs text-monk-muted">5–180 minutes. Step ±5.</p>
            </div>
          ) : null}

          <div className="mb-4 rounded-2xl border border-monk-border bg-monk-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-monk-text">{selected.title.replace(" Focus Session", "")}</p>
                <p className="mt-1 text-xs leading-5 text-monk-muted">{selected.summary}</p>
              </div>
              <span className="shrink-0 rounded-full bg-monk-bg px-2.5 py-1 text-[10px] font-bold tabular-nums text-monk-accent">
                {totalMinutes}m
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {phases.map((phase) => (
                <span
                  key={phase.label}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    phase.type === "focus"
                      ? "bg-monk-accent-soft text-monk-accent"
                      : "bg-monk-bg text-monk-muted"
                  }`}
                >
                  {phase.type === "focus" ? "Focus" : "Break"} · {phase.plannedMinutes}m
                </span>
              ))}
            </div>
          </div>

          {!canStart ? <CalmAlert type="warning" title="Choose at least 5 minutes." /> : null}
          <PrimaryButton className="min-h-12" disabled={!canStart} onClick={() => setShowChecklist(true)}>
            Continue with {selected.shortLabel}
          </PrimaryButton>
        </>
      )}
    </Card>
  );
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
        <div className="flex flex-1 flex-col justify-center">
          <div className="relative mx-auto mb-10">
            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-monk-accent/10 blur-2xl" aria-hidden />
            <div className="relative grid h-20 w-20 place-items-center rounded-full border border-monk-accent/30 bg-monk-soft text-monk-accent">
              <Circle size={28} strokeWidth={1.5} />
            </div>
          </div>
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-monk-accent">ZENDO</p>
          <h1 className="text-center text-[40px] font-bold leading-[48px] tracking-tight">
            Make space for what matters.
          </h1>
          <p className="mx-auto mt-5 max-w-[280px] text-center text-base leading-6 text-monk-muted">
            Zendo helps you choose fewer goals and move with intention.
          </p>
        </div>
        <PrimaryButton className="mt-8" onClick={goNext}>Begin</PrimaryButton>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell currentStep={currentStep} totalSteps={totalSteps} onBack={goBack}>
      {path === routes.onboardingValues ? <ValuesStep onNext={goNext} /> : null}
      {path === routes.onboardingReality ? <RealityCheck onNext={goNext} /> : null}
      {path === routes.onboardingObstacles ? <PastObstacles onNext={goNext} /> : null}
      {path === routes.onboardingHabits ? <HabitAudit onNext={goNext} /> : null}
      {path === routes.onboardingRemove ? <RemoveDistractions onNext={goNext} /> : null}
      {path === routes.onboardingGreyMode ? <GreyMode onNext={goNext} /> : null}
      {path === routes.onboardingGoals ? <GoalBrainDump onNext={goNext} /> : null}
      {path === routes.onboardingSeason ? <SeasonSetup onNext={goNext} /> : null}
      {path === routes.onboardingNarrow ? <NarrowGoals onNext={goNext} /> : null}
      {path === routes.onboardingKeystone ? <KeystoneSetup onNext={goNext} /> : null}
      {path === routes.onboardingWeekSetup ? <WeekSetup /> : null}
    </OnboardingShell>
  );
}

function ScreenIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 mt-4">
      <h1 className="text-[26px] font-semibold leading-9 tracking-tight">{title}</h1>
      <p className="mt-3 text-[15px] leading-6 text-monk-muted">{subtitle}</p>
    </div>
  );
}

function ValuesStep({ onNext }: { onNext: () => void }) {
  const { onboarding, updateOnboarding } = useMonkStore();
  const [protect, setProtect] = useState<string[]>(onboarding.valueTradeoffs.protect);
  const [sacrifice, setSacrifice] = useState<string[]>(onboarding.valueTradeoffs.sacrifice);
  const [tradeoff, setTradeoff] = useState(onboarding.valueTradeoffs.tradeoffExplanation);
  const [vision, setVision] = useState(onboarding.legacyVision.proudChange);
  const [consequence, setConsequence] = useState(onboarding.legacyVision.consequenceOfInaction);

  const canContinue =
    protect.length === 3 &&
    sacrifice.length === 3 &&
    tradeoff.length >= 30 &&
    vision.length >= 30 &&
    consequence.length >= 20;

  const handleNext = () => {
    updateOnboarding({
      valueTradeoffs: { protect, sacrifice, tradeoffExplanation: tradeoff },
      legacyVision: { proudChange: vision, consequenceOfInaction: consequence },
      whyDiscovery: { selectedValues: protect, identityStatement: vision }
    });
    onNext();
  };

  return (
    <>
      <ScreenIntro title="Values & Vision" subtitle="What matters most in next 90 days?" />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Protect (pick 3):</p>
        <span className="rounded-full bg-monk-soft px-2.5 py-1 text-xs font-bold text-monk-muted">
          {protect.length}/3
        </span>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-2">
        {CORE_VALUES.map(v => (
          <ChoiceCard
            key={v.id}
            title={v.label}
            selected={protect.includes(v.id)}
            onClick={() => {
              if (protect.includes(v.id)) {
                setProtect(protect.filter(x => x !== v.id));
              } else if (protect.length < 3) {
                setProtect([...protect, v.id]);
              }
            }}
          />
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Defer for now (pick 3):</p>
        <span className="rounded-full bg-monk-soft px-2.5 py-1 text-xs font-bold text-monk-muted">
          {sacrifice.length}/3
        </span>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-2">
        {CORE_VALUES.filter(v => !protect.includes(v.id)).map(v => (
          <ChoiceCard
            key={v.id}
            title={v.label}
            selected={sacrifice.includes(v.id)}
            onClick={() => {
              if (sacrifice.includes(v.id)) {
                setSacrifice(sacrifice.filter(x => x !== v.id));
              } else if (sacrifice.length < 3) {
                setSacrifice([...sacrifice, v.id]);
              }
            }}
          />
        ))}
      </div>

      <div className="mb-6">
        <Textarea
          label="Why this tradeoff?"
          value={tradeoff}
          onChange={e => setTradeoff(e.target.value)}
          rows={3}
          showCharCount
          minLength={30}
        />
      </div>

      <div className="mb-6">
        <Textarea
          label="90 days from now, what change are you proud of?"
          value={vision}
          onChange={e => setVision(e.target.value)}
          rows={3}
          showCharCount
          minLength={30}
        />
      </div>

      <div className="mb-6">
        <Textarea
          label="If you stay the same, what do you lose?"
          value={consequence}
          onChange={e => setConsequence(e.target.value)}
          rows={3}
          showCharCount
          minLength={20}
        />
      </div>

      <div className="mt-auto space-y-3 pt-8">
        {!canContinue ? <CalmAlert type="warning" title="Complete all fields to continue." /> : null}
        <PrimaryButton disabled={!canContinue} onClick={handleNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

function RealityCheck({ onNext }: { onNext: () => void }) {
  const { onboarding, updateOnboarding } = useMonkStore();
  const [hours, setHours] = useState(onboarding.timeAudit.freeHoursPerDay);
  const [blocks, setBlocks] = useState<string[]>(onboarding.timeAudit.peakEnergyBlocks);
  const [crash, setCrash] = useState(onboarding.energyMap);

  const timeBlocks = ['Morning (6-9)', 'Midday (9-12)', 'Afternoon (12-17)', 'Evening (17-21)', 'Night (21-24)'];
  const canContinue = hours > 0 && blocks.length > 0 && crash.length >= 30;

  const handleNext = () => {
    updateOnboarding({
      timeAudit: { freeHoursPerDay: hours, peakEnergyBlocks: blocks },
      energyMap: crash
    });
    onNext();
  };

  return (
    <>
      <ScreenIntro title="Reality Check" subtitle="Ground plan in actual capacity" />

      <Card>
        <TextInput
          label="Free hours per day (after work/obligations):"
          type="number"
          value={String(hours)}
          onChange={e => setHours(Number(e.target.value))}
        />
        <p className="mt-2 text-xs leading-5 text-monk-muted">Honest estimate. Not ideal hours.</p>
      </Card>

      <Card className="mt-6">
        <p className="mb-3 text-sm font-semibold">Peak energy blocks (select all):</p>
        <div className="flex flex-wrap gap-2">
          {timeBlocks.map(tb => (
            <ChoiceChip
              key={tb}
              label={tb}
              selected={blocks.includes(tb)}
              onClick={() => {
                if (blocks.includes(tb)) {
                  setBlocks(blocks.filter(x => x !== tb));
                } else {
                  setBlocks([...blocks, tb]);
                }
              }}
            />
          ))}
        </div>
      </Card>

      <Textarea
        label="When do you usually crash?"
        value={crash}
        onChange={e => setCrash(e.target.value)}
        rows={3}
        placeholder="e.g. After lunch, late night scrolling, Sunday evenings..."
        className="mt-6"
        showCharCount
        minLength={30}
      />

      <div className="mt-auto space-y-3 pt-8">
        {!canContinue ? <CalmAlert type="warning" title="Complete all fields to continue." /> : null}
        <PrimaryButton disabled={!canContinue} onClick={handleNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

function PastObstacles({ onNext }: { onNext: () => void }) {
  const { onboarding, updateOnboarding } = useMonkStore();
  const [obstacles, setObstacles] = useState<string[]>(onboarding.pastObstacles);
  const [current, setCurrent] = useState('');

  const handleAdd = () => {
    if (current.trim() && obstacles.length < 5) {
      setObstacles([...obstacles, current.trim()]);
      setCurrent('');
    }
  };

  const handleNext = () => {
    updateOnboarding({ pastObstacles: obstacles });
    onNext();
  };

  return (
    <>
      <ScreenIntro title="Past Obstacles" subtitle="What killed momentum before? (0-5)" />
      <p className="mb-4 text-sm leading-6 text-monk-muted">Optional — skip if none come to mind</p>

      <div className="flex gap-2">
        <TextInput
          value={current}
          onChange={e => setCurrent(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="e.g. No accountability, too ambitious, burnout..."
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={obstacles.length >= 5}
          className="grid min-h-[48px] w-[48px] shrink-0 place-items-center rounded-xl border border-monk-border bg-monk-surface text-monk-muted disabled:opacity-40"
        >
          <Plus size={18} strokeWidth={1.5} />
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {obstacles.map((obs, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-monk-border bg-monk-surface p-3 transition-colors hover:border-monk-border-strong hover:bg-monk-soft">
            <span className="text-sm">{obs}</span>
            <button
              onClick={() => setObstacles(obstacles.filter((_, idx) => idx !== i))}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-monk-muted hover:bg-monk-surface"
            >
              <Minus size={16} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-3 pt-8">
        <PrimaryButton onClick={handleNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

function HabitAudit({ onNext }: { onNext: () => void }) {
  const { onboarding, toggleHabit } = useMonkStore();
  const result = validateHabitAudit(onboarding.selectedHabits.length);
  const selectedCount = onboarding.selectedHabits.length;
  return (
    <>
      <ScreenIntro title="What usually pulls you away?" subtitle="Notice the patterns that make focus harder." />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Patterns</p>
        <span className="rounded-full bg-monk-soft px-2.5 py-1 text-xs font-bold text-monk-muted">
          {selectedCount} selected
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {habitOptions.map((habit) => (
          <ChoiceChip
            key={habit.category}
            label={habit.label}
            selected={onboarding.selectedHabits.some((item) => item.category === habit.category)}
            onClick={() => toggleHabit(habit.category, habit.label)}
          />
        ))}
      </div>
      {onboarding.selectedHabits.some((item) => item.category === "other") ? (
        <TextInput
          className="mt-5"
          placeholder="Name the pattern"
          value={onboarding.selectedHabits.find((item) => item.category === "other")?.customName ?? ""}
          onChange={(event) => useMonkStore.getState().setCustomHabitName(event.target.value)}
        />
      ) : null}
      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message || "Select at least 1 habit"} /> : null}
        <PrimaryButton disabled={!result.valid} onClick={onNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

function RemoveDistractions({ onNext }: { onNext: () => void }) {
  const { onboarding, toggleFrictionAction } = useMonkStore();
  const completed = Object.values(onboarding.frictionActions).some((actions) =>
    actions.some((action) => action.completed)
  );
  return (
    <>
      <ScreenIntro title="Make distractions harder to reach." subtitle="You do not need perfection. Just add friction." />
      <div className="space-y-4">
        {onboarding.selectedHabits.map((habit) => (
          <Card key={habit.id}>
            <p className="font-semibold">{habit.customName || habit.name}</p>
            <div className="mt-4 space-y-2">
              {(onboarding.frictionActions[habit.id] ?? []).map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => toggleFrictionAction(habit.id, action.id)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-2xl text-left text-sm"
                >
                  <span className={`grid h-6 w-6 place-items-center rounded-full border ${
                    action.completed ? "border-monk-success bg-monk-success-soft" : "border-monk-border"
                  }`}>
                    {action.completed ? <Check size={14} strokeWidth={1.5} /> : null}
                  </span>
                  {action.label}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-auto space-y-3 pt-8">
        {!completed ? <CalmAlert type="warning" title="Select at least 1 friction action" /> : null}
        <PrimaryButton disabled={!completed} onClick={onNext}>I made it harder</PrimaryButton>
      </div>
    </>
  );
}

function GreyMode({ onNext }: { onNext: () => void }) {
  const { onboarding, updateOnboarding } = useMonkStore();
  return (
    <>
      <ScreenIntro title="Grey mode" subtitle="Make distracting apps less magnetic." />
      <Card important>
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-monk-soft">
          <EyeOff size={22} strokeWidth={1.5} />
        </div>
        <p className="font-semibold">Manual guide</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-monk-muted">
          <li>Open Accessibility settings</li>
          <li>Find Color filters / Grayscale</li>
          <li>Turn it on</li>
        </ol>
      </Card>
      <div className="mt-auto space-y-3 pt-8">
        <PrimaryButton
          onClick={() => {
            updateOnboarding({ greyModeConfirmed: true });
            onNext();
          }}
        >
          I've turned it on
        </PrimaryButton>
        <SecondaryButton
          onClick={() => {
            updateOnboarding({ greyModeConfirmed: onboarding.greyModeConfirmed });
            onNext();
          }}
        >
          I'll do this later
        </SecondaryButton>
      </div>
    </>
  );
}

function GoalBrainDump({ onNext }: { onNext: () => void }) {
  const { onboarding, addGoalDraft, removeGoalDraft, updateGoalDraft } = useMonkStore();
  const filledCount = onboarding.goalDrafts.filter((g) => g.title.trim()).length;
  const result = validateGoalBrainDump(onboarding.goalDrafts);
  return (
    <>
      <ScreenIntro title="What feels important right now?" subtitle="Write 5–10 possible goals first. Don't filter yet — we'll narrow them down after." />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-monk-muted">Add anything that feels important for this season.</p>
        <span className="rounded-full bg-monk-soft px-2.5 py-1 text-xs font-bold text-monk-muted">
          {filledCount}/10
        </span>
      </div>
      <div className="space-y-3">
        {onboarding.goalDrafts.map((goal, index) => (
          <div key={goal.id} className="flex gap-2">
            <TextInput
              aria-label={`Goal ${index + 1}`}
              placeholder="Example: Build a study routine, finish a course…"
              value={goal.title}
              onChange={(event) => updateGoalDraft(goal.id, event.target.value)}
            />
            {onboarding.goalDrafts.length > 5 ? (
              <button
                type="button"
                aria-label="Remove goal"
                onClick={() => removeGoalDraft(goal.id)}
                className="grid min-h-[48px] min-w-[48px] shrink-0 place-items-center rounded-xl border border-monk-border bg-monk-surface text-monk-muted"
              >
                <Minus size={18} strokeWidth={1.5} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {onboarding.goalDrafts.length < 10 ? (
        <GhostButton className="mt-4" onClick={addGoalDraft}>
          <span className="inline-flex items-center gap-2"><Plus size={16} /> Add goal</span>
        </GhostButton>
      ) : null}
      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        <PrimaryButton disabled={!result.valid} onClick={onNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

function GoalElimination({ onNext }: { onNext: () => void }) {
  const { onboarding, toggleReleasedGoal } = useMonkStore();
  const goals = onboarding.goalDrafts.filter((goal) => goal.title.trim());
  const result = validateGoalElimination(onboarding.releasedGoalIds.length);
  return (
    <>
      <ScreenIntro title="What can you release for now?" subtitle="Not everything needs your energy this season." />
      <div className="space-y-3">
        {goals.map((goal) => {
          const released = onboarding.releasedGoalIds.includes(goal.id);
          return (
            <button
              type="button"
              key={goal.id}
              onClick={() => toggleReleasedGoal(goal.id)}
              className={`flex min-h-[64px] w-full items-center justify-between rounded-monk border p-4 text-left transition ${
                released ? "border-monk-danger bg-monk-danger-soft text-monk-muted line-through" : "border-monk-border bg-monk-surface"
              }`}
            >
              <span>{goal.title}</span>
              <span className="text-sm text-monk-muted">{released ? "Released" : "Release"}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        <PrimaryButton disabled={!result.valid} onClick={onNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

function FocusGoals({ onNext }: { onNext: () => void }) {
  const store = useMonkStore();
  const { onboarding } = store;
  const nonEmptyGoals = onboarding.goalDrafts.filter((goal) => goal.title.trim());
  const result = validateFocusGoalSelection(nonEmptyGoals.length);

  return (
    <>
      <ScreenIntro title="What feels important in this season?" subtitle="Write one to three focus goals. Fewer is stronger." />
      <div className="space-y-3">
        {onboarding.goalDrafts.map((goal, index) => (
          <div key={goal.id} className="flex gap-2">
            <TextInput
              aria-label={`Goal ${index + 1}`}
              placeholder="Write a goal"
              value={goal.title}
              onChange={(event) => store.updateGoalDraft(goal.id, event.target.value)}
            />
            {onboarding.goalDrafts.length > 1 ? (
              <button
                type="button"
                aria-label="Remove goal"
                onClick={() => store.removeGoalDraft(goal.id)}
                className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted"
              >
                <Minus size={18} strokeWidth={1.5} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {onboarding.goalDrafts.length < 3 ? (
        <GhostButton className="mt-4" onClick={store.addGoalDraft}>
          <span className="inline-flex items-center gap-2"><Plus size={16} /> Add goal</span>
        </GhostButton>
      ) : null}
      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        <PrimaryButton
          disabled={!result.valid}
          onClick={() => {
            const validGoals = onboarding.goalDrafts.filter((g) => g.title.trim());
            const goalIds = validGoals.map((g) => g.id);
            const currentAllocations = onboarding.weeklyAllocations;
            const isMatch = currentAllocations.length === goalIds.length &&
              currentAllocations.every((alloc) => goalIds.includes(alloc.goalId));
            store.updateOnboarding({
              selectedFocusGoalIds: goalIds,
              weeklyAllocations: isMatch ? currentAllocations : defaultWeeklyTargets(goalIds)
            });
            onNext();
          }}
        >
          Choose Season
        </PrimaryButton>
      </div>
    </>
  );}

function SeasonSetup({ onNext }: { onNext: () => void }) {
  const { onboarding, setSeasonDuration, updateOnboarding } = useMonkStore();
  const [custom, setCustom] = useState(onboarding.customDurationDays?.toString() ?? "");
  const preset = onboarding.durationPreset;
  const result = validateSeasonDuration(onboarding.seasonDurationDays);

  const selectPreset = (p: SeasonDurationPreset, days: number) => {
    updateOnboarding({ durationPreset: p });
    setSeasonDuration(days);
  };

  return (
    <>
      <ScreenIntro
        title="Choose your season length"
        subtitle="Your focus goals stay fixed until this season ends. Pick a time container that feels realistic."
      />
      <div className="space-y-3">
        <DurationCard
          title="7 Days"
          badge="Quick reset"
          description="Best for restarting, testing a routine, or getting back on track."
          selected={preset === "7_days"}
          onClick={() => selectPreset("7_days", 7)}
        />
        <DurationCard
          title="30 Days"
          badge="Focused month"
          description="Best for building consistency and daily momentum."
          selected={preset === "30_days"}
          onClick={() => selectPreset("30_days", 30)}
        />
        <DurationCard
          title="90 Days"
          badge="Deep season"
          description="Best for meaningful progress on bigger life goals."
          selected={preset === "90_days"}
          onClick={() => selectPreset("90_days", 90)}
        />
        <DurationCard
          title="Custom"
          badge="Set your own length"
          description="Choose the number of days that fits your season."
          selected={preset === "custom"}
          onClick={() => {
            updateOnboarding({ durationPreset: "custom" });
            setSeasonDuration(Math.max(7, Number(custom) || 14));
          }}
        />
      </div>
      <div className={`mt-4 ${preset !== "custom" ? "opacity-50" : ""}`}>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-monk-muted">
          Custom days (min 7)
        </label>
        <TextInput
          inputMode="numeric"
          placeholder="Custom days"
          value={custom}
          disabled={preset !== "custom"}
          onChange={(event) => {
            setCustom(event.target.value);
            const value = Number(event.target.value);
            if (value >= 7) setSeasonDuration(value);
          }}
        />
      </div>
      <div className="mt-5">
        <SeasonPreviewCard
          startLabel={`Today · ${formatHumanDate(onboarding.seasonStartDate)}`}
          endLabel={formatHumanDate(onboarding.seasonEndDate)}
          durationLabel={`${onboarding.seasonDurationDays} days of focused progress`}
        />
      </div>
      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        <PrimaryButton disabled={!result.valid} onClick={onNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

function NarrowGoals({ onNext }: { onNext: () => void }) {
  const { onboarding, toggleFocusGoal } = useMonkStore();
  const goals = onboarding.goalDrafts.filter((goal) => goal.title.trim());
  const selectedCount = onboarding.selectedFocusGoalIds.length;
  const result = validateNarrowGoals(selectedCount);

  return (
    <>
      <ScreenIntro
        title="Now choose your real focus"
        subtitle="Pick 1–3 goals to keep. The rest can wait. Fewer goals means more energy for what matters."
      />
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-monk-muted">
        Tap the goals you want to keep this season ({selectedCount}/3 selected)
      </p>
      <div className="space-y-3">
        {goals.map((goal) => {
          const isSelected = onboarding.selectedFocusGoalIds.includes(goal.id);
          return (
            <button
              type="button"
              key={goal.id}
              onClick={() => toggleFocusGoal(goal.id)}
              className={`flex min-h-[56px] w-full items-center justify-between gap-3 rounded-monk border px-4 py-3 text-left transition-colors duration-150 ${
                isSelected
                  ? "border-monk-accent bg-monk-accent-soft text-monk-text"
                  : "border-monk-border bg-monk-surface text-monk-text hover:border-monk-border-strong"
              }`}
            >
              <span className={isSelected ? "font-semibold" : ""}>{goal.title}</span>
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                  isSelected
                    ? "border-monk-accent bg-monk-accent text-white"
                    : "border-monk-border bg-monk-surface text-transparent"
                }`}
              >
                <Check size={14} strokeWidth={2.5} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        <PrimaryButton disabled={!result.valid} onClick={onNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

function KeystoneSetup({ onNext }: { onNext: () => void }) {
  const { onboarding, setKeystoneAction, updateOnboarding } = useMonkStore();
  const goals = onboarding.goalDrafts.filter((goal) => onboarding.selectedFocusGoalIds.includes(goal.id));
  const result = validateKeystoneActions(onboarding.selectedFocusGoalIds, onboarding.keystoneActions);
  const whenHints = onboarding.timeAudit.peakEnergyBlocks;

  const actionPlaceholders = [
    "Study for 25 minutes",
    "Write 300 words",
    "Record one practice video",
    "Walk for 20 minutes",
    "Read 10 pages",
    "Practice one lesson"
  ];
  const whenPlaceholders = [
    "after morning pages",
    "right after lunch",
    "before dinner",
    "first thing after coffee"
  ];

  return (
    <>
      <ScreenIntro
        title="What action moves each goal forward?"
        subtitle="Pair each action with a time or cue. Add why it matters — optional, powerful."
      />
      <div className="space-y-4">
        {goals.map((goal, index) => {
          const parsed = parseIntention(onboarding.keystoneActions[goal.id] ?? "");
          const actionPh = actionPlaceholders[index % actionPlaceholders.length];
          const whenPh = whenHints[index] || whenPlaceholders[index % whenPlaceholders.length];
          const goalWhy = onboarding.goalWhys[goal.id] ?? "";
          const commit = (when: string, action: string) => {
            setKeystoneAction(goal.id, formatIntention(when, action));
          };
          return (
            <Card key={goal.id}>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-monk-muted">
                Goal {index + 1}
              </p>
              <p className="mb-3 font-semibold text-monk-text">{goal.title}</p>
              <div className="space-y-3">
                <TextInput
                  label="When"
                  id={`keystone-when-${goal.id}`}
                  placeholder={whenPh}
                  value={parsed.when}
                  onChange={(event) => commit(event.target.value, parsed.action)}
                />
                <TextInput
                  label="I will"
                  id={`keystone-action-${goal.id}`}
                  placeholder={actionPh}
                  value={parsed.action}
                  onChange={(event) => commit(parsed.when, event.target.value)}
                />
                <TextInput
                  label="Why this goal (optional)"
                  id={`goal-why-${goal.id}`}
                  placeholder="Because…"
                  value={goalWhy}
                  onChange={(event) =>
                    updateOnboarding({
                      goalWhys: { ...onboarding.goalWhys, [goal.id]: event.target.value }
                    })
                  }
                />
                <p className="text-xs text-monk-text-soft">
                  Smallest repeatable proof this goal is moving.
                </p>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        <PrimaryButton disabled={!result.valid} onClick={onNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}


function WeekSetup() {
  const navigate = useNavigate();
  const { onboarding, setWeeklyAllocation, createSeasonFromOnboarding, updateOnboarding } = useMonkStore();
  const goals = onboarding.goalDrafts.filter((goal) => onboarding.selectedFocusGoalIds.includes(goal.id));
  const goalIdsJson = JSON.stringify(goals.map((g) => g.id));

  useEffect(() => {
    const goalIds = goals.map((g) => g.id);
    const currentAllocations = onboarding.weeklyAllocations;
    const isMatch = currentAllocations.length === goalIds.length &&
      currentAllocations.every((alloc) => goalIds.includes(alloc.goalId));
    if (!isMatch) {
      updateOnboarding({
        weeklyAllocations: defaultWeeklyTargets(goalIds)
      });
    }
  }, [goalIdsJson, onboarding.weeklyAllocations, updateOnboarding]);

  const result = validateWeeklyAllocation(onboarding.weeklyAllocations, 1);
  const allocatedDays = onboarding.weeklyAllocations.reduce((sum, item) => sum + item.targetCount, 0);
  const freeHours = onboarding.timeAudit.freeHoursPerDay;
  const cap = capacityCheck(freeHours, allocatedDays);
  const remaining = Math.max(0, 6 - allocatedDays);

  const previewGoals = goals.map((draft, index) => ({
    id: draft.id,
    seasonId: "preview",
    title: draft.title.trim(),
    keystoneAction: onboarding.keystoneActions[draft.id]?.trim() || "",
    priority: (index + 1) as 1 | 2 | 3,
    weeklyTargetCount:
      onboarding.weeklyAllocations.find((a) => a.goalId === draft.id)?.targetCount ?? 1,
    status: "active" as const,
    createdAt: "",
    updatedAt: ""
  }));
  const previewSeason = {
    id: "preview",
    name: "Preview",
    startDate: onboarding.seasonStartDate,
    endDate: onboarding.seasonEndDate,
    durationDays: onboarding.seasonDurationDays,
    status: "active" as const,
    mode: onboarding.weeklyMode,
    goalIds: goals.map((g) => g.id),
    badHabitIds: [],
    antiGoals: onboarding.antiGoals.filter((ag) => ag.trim()),
    obstacles: onboarding.obstacles.filter((ob) => ob.trim()),
    createdAt: "",
    updatedAt: ""
  };
  const planScore = scorePlan(previewSeason, previewGoals);
  const strength = planStrengthLabel(planScore.total);
  const strengthColor =
    planScore.total >= 80 ? "text-monk-success" :
    planScore.total >= 55 ? "text-monk-accent" :
    "text-monk-warning";

  return (
    <>
      <ScreenIntro
        title="Shape your quiet week."
        subtitle="Allocate 6 focus days across goals. One rest day stays open."
      />

      <Card className="mb-5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-monk-muted">Focus days</p>
            <p className="mt-1 text-sm text-monk-text">
              {allocatedDays === 6
                ? "Full week planned"
                : remaining > 0
                ? `${remaining} day${remaining === 1 ? "" : "s"} left to place`
                : `${allocatedDays - 6} over target`}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
            allocatedDays === 6
              ? "bg-monk-success-soft text-monk-success"
              : allocatedDays > 6
              ? "bg-monk-warning-soft text-monk-warning"
              : "bg-monk-soft text-monk-muted"
          }`}>
            {allocatedDays}/6
          </span>
        </div>
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < Math.min(allocatedDays, 6) ? "bg-monk-accent" : "bg-monk-soft"
              }`}
            />
          ))}
          <span className="h-2 w-6 rounded-full bg-monk-rest/40" title="Rest day" />
        </div>
        <p className="mt-2 text-xs text-monk-muted">Every goal needs at least one day.</p>
      </Card>

      <div className="space-y-3">
        {goals.map((goal) => {
          const allocation = onboarding.weeklyAllocations.find((item) => item.goalId === goal.id);
          const count = allocation?.targetCount ?? 1;
          return (
            <Card key={goal.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{goal.title}</p>
                  <p className="mt-1 text-xs text-monk-muted">Focus days this week</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-label={`Decrease ${goal.title}`}
                    disabled={count <= 1}
                    className="grid min-h-11 min-w-11 place-items-center rounded-full border border-monk-border bg-monk-bg text-monk-text transition active:scale-95 disabled:opacity-30"
                    onClick={() => setWeeklyAllocation(goal.id, count - 1)}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center text-lg font-bold tabular-nums">{count}</span>
                  <button
                    type="button"
                    aria-label={`Increase ${goal.title}`}
                    disabled={allocatedDays >= 6}
                    className="grid min-h-11 min-w-11 place-items-center rounded-full border border-monk-border bg-monk-bg text-monk-text transition active:scale-95 disabled:opacity-30"
                    onClick={() => setWeeklyAllocation(goal.id, count + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
        <Card className="bg-monk-soft p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-monk-surface text-monk-muted">
              <Moon size={18} strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold">Rest</p>
              <p className="mt-1 text-sm text-monk-muted">1 day reserved. Rest is part of the path.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-5 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-monk-muted">Plan solidity</p>
          <span className={`text-sm font-bold ${strengthColor}`}>{strength} · {planScore.total}</span>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-monk-soft overflow-hidden">
          <div
            className="h-full rounded-full bg-monk-accent transition-all"
            style={{ width: `${Math.min(100, planScore.total)}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-monk-muted">
          <span>Keystones {planScore.breakdown.keystoneActions}/30</span>
          <span>Weekly load {planScore.breakdown.weeklyTargets}/30</span>
          <span>Anti-goals {planScore.breakdown.antiGoals}/20</span>
          <span>Duration {planScore.breakdown.duration}/20</span>
        </div>
      </Card>

      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        {cap.message ? (
          <CalmAlert type={cap.ok ? "info" : "warning"} title={cap.message} />
        ) : freeHours > 0 ? (
          <p className="text-center text-xs text-monk-muted">
            ~{cap.loadHours.toFixed(0)}h focus planned · ~{cap.availableHours.toFixed(0)}h free capacity
          </p>
        ) : null}
        <PrimaryButton
          disabled={!result.valid}
          onClick={() => {
            createSeasonFromOnboarding();
            navigate(routes.today, { replace: true });
          }}
        >
          Enter Season
        </PrimaryButton>
      </div>
    </>
  );
}

function PlanTomorrow({ goals }: { goals: ReturnType<typeof selectActiveGoals> }) {
  const store = useMonkStore();
  const season = store.activeSeason!;
  const tomorrowDate = addDaysToDate(getTodayDateString(), 1);
  const tomorrowPlan = store.dayPlans.find(
    (day) => day.seasonId === season.id && day.date === tomorrowDate
  );
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const [isEditing, setIsEditing] = useState(false);

  if (!weeklyPlan) return null;

  const handleSelect = (goalId?: string, dayType: "goal" | "rest" = "goal") => {
    store.createOrUpdateDayPlan(tomorrowDate, { dayType, goalId });
    setIsEditing(false);
  };

  const goal = tomorrowPlan?.goalId ? store.goals.find((item) => item.id === tomorrowPlan.goalId) : undefined;

  if (tomorrowPlan && !isEditing) {
    return (
      <Card className="bg-monk-surface border-monk-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-monk-text-soft uppercase tracking-wider font-semibold">Tomorrow's Focus</p>
            <p className="mt-1 font-semibold text-base">
              {tomorrowPlan.dayType === "rest" ? "Quiet recovery (Rest)" : goal?.title}
            </p>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-monk-accent hover:underline"
            onClick={() => setIsEditing(true)}
          >
            Change
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <p className="font-semibold text-sm">Plan Tomorrow</p>
      <p className="mt-1 text-xs text-monk-muted">Decide your focus theme one day before.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {goals.map((item) => (
          <button
            key={item.id}
            type="button"
            className="min-h-9 rounded-xl border border-monk-border bg-monk-soft px-3 text-xs font-medium text-monk-muted hover:border-monk-accent hover:text-monk-accent"
            onClick={() => handleSelect(item.id, "goal")}
          >
            {item.title}
          </button>
        ))}
        <button
          type="button"
          className="min-h-9 rounded-xl border border-monk-border bg-monk-soft px-3 text-xs font-medium text-monk-muted hover:border-monk-accent hover:text-monk-accent"
          onClick={() => handleSelect(undefined, "rest")}
        >
          Rest
        </button>
      </div>
    </Card>
  );
}

function WeeklyStatusIndicators() {
  const store = useMonkStore();
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const goals = selectActiveGoals(store);
  if (!weeklyPlan) return null;

  const doneDays = weeklyPlan.goalAllocations.reduce((sum, a) => sum + a.completedCount, 0);
  const targetDays = weeklyPlan.goalAllocations.reduce((sum, a) => sum + a.targetCount, 0) || 6;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold text-sm">This week</p>
        <span className="text-xs font-mono text-monk-muted tabular-nums">{doneDays}/{targetDays} focus</span>
      </div>
      <div className="space-y-3">
        {weeklyPlan.goalAllocations.map((allocation) => {
          const goal = goals.find((item) => item.id === allocation.goalId);
          const progress = allocation.targetCount > 0
            ? Math.min(100, Math.round((allocation.completedCount / allocation.targetCount) * 100))
            : 0;
          const complete = allocation.completedCount >= allocation.targetCount;
          const touched = allocation.completedCount >= 1;
          return (
            <div key={allocation.goalId} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-monk-text truncate">{goal?.title}</span>
                <span className={`shrink-0 font-semibold ${
                  complete ? "text-monk-success" : touched ? "text-monk-accent" : "text-monk-muted"
                }`}>
                  {allocation.completedCount}/{allocation.targetCount}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-monk-soft overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    complete ? "bg-monk-success" : touched ? "bg-monk-accent" : "bg-monk-border-strong"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TodayScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const season = store.activeSeason!;
  const today = getTodayDateString();
  const todayPlan = selectTodayPlan(store);
  const activeGoals = selectActiveGoals(store);
  const weeklyPlan = selectCurrentWeeklyPlan(store);

  const activeSession = store.focusSessions.find(
    (session) => session.dayPlanId === todayPlan?.id && ["running", "paused"].includes(session.status)
  );

  const todayEntry = store.journalEntries.find(
    (entry) => entry.seasonId === season.id && entry.date === today
  );
  const hasJournal = !!todayEntry;
  const hasMorningPages = !!todayEntry?.answers.morningPages?.trim();
  const learningSessions = selectTodayLearningSessions(store, today);
  const hasLearning = learningSessions.length > 0;
  const focusSeconds = selectTotalFocusSecondsForDate(store, today);
  const focusMinutes = Math.round(focusSeconds / 60);

  const [editingAction, setEditingAction] = useState(false);
  const [actionInput, setActionInput] = useState("");

  useEffect(() => {
    if (todayPlan?.mainAction) {
      setActionInput(todayPlan.mainAction);
    }
  }, [todayPlan?.mainAction]);

  useEffect(() => {
    store.getOrCreateCurrentWeeklyPlan();
  }, []);

  const goal = todayPlan?.goalId ? store.goals.find((item) => item.id === todayPlan.goalId) : undefined;
  const daysLeft = getDaysLeft(season.endDate);
  const isRest = todayPlan?.dayType === "rest";
  const isDone = todayPlan?.status === "completed";
  const energy = selectEnergyForDate(store, today);
  const allocation = todayPlan?.goalId && weeklyPlan
    ? weeklyPlan.goalAllocations.find((a) => a.goalId === todayPlan.goalId)
    : undefined;

  const statusLabel = !todayPlan
    ? "Open"
    : isDone
    ? "Done"
    : activeSession
    ? "In session"
    : isRest
    ? "Rest"
    : todayPlan.status === "partial"
    ? "Partial"
    : "Focus";

  const statusClass = isDone
    ? "border-monk-success/30 bg-monk-success-soft text-monk-success"
    : activeSession
    ? "border-monk-accent/40 bg-monk-accent-soft text-monk-accent"
    : isRest
    ? "border-monk-rest/30 bg-monk-rest-soft text-monk-rest"
    : "border-monk-border bg-monk-soft text-monk-muted";

  const checklist = todayPlan
    ? [
        { id: "morning", label: "Morning pages", done: hasMorningPages, hide: false },
        { id: "focus", label: isRest ? "Rest held" : "Focus done", done: isDone, hide: false },
        { id: "learn", label: "Learning", done: hasLearning, hide: isRest },
        { id: "energy", label: "Energy", done: !!energy, hide: false },
        { id: "reflect", label: "Reflection", done: hasJournal && !!todayEntry?.answers.whatMovedToday?.trim(), hide: false }
      ].filter((item) => !item.hide)
    : [];
  const checklistDone = checklist.filter((c) => c.done).length;

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={`${getSeasonDayLabel(season)} · ${daysLeft}d left`}
        rightSlot={<SettingsLink />}
      />
      <div className="space-y-5">
        <WhyStrip />
        {!todayPlan ? (
          <>
            <SeasonProgressCard />
            <FlowPickToday goals={activeGoals} />
            <WeeklyStatusIndicators />
          </>
        ) : (
          <>
            <Card
              important
              className={`relative overflow-hidden ${
                isDone ? "border-monk-success/30" : isRest ? "border-monk-rest/25" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-monk-muted uppercase tracking-widest">
                      {isRest ? "Rest day" : "Today's focus"}
                    </p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <h2 className="mt-2 text-2xl font-bold leading-8">
                    {isRest ? "Quiet recovery" : goal?.title ?? "One theme"}
                  </h2>
                  {!isRest && goal?.why ? (
                    <p className="mt-1 text-sm leading-5 text-monk-accent/90 line-clamp-2">
                      Because {goal.why}
                    </p>
                  ) : null}
                  {allocation ? (
                    <p className="mt-1 text-xs text-monk-muted">
                      {allocation.completedCount}/{allocation.targetCount} days on this goal this week
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-monk-muted">
                      {isRest ? "Protect recovery. Direction stays." : "Stay with one thing."}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                  className={`flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${
                    isDone
                      ? "border-monk-success bg-monk-success text-monk-bg"
                      : "border-monk-border bg-monk-surface hover:border-monk-success text-monk-success"
                  }`}
                  onClick={() => {
                    const willBeCompleted = !isDone;
                    if (willBeCompleted) playZenBell();
                    store.toggleTodayCompletion();
                  }}
                >
                  {isDone ? <Check size={18} strokeWidth={2.5} /> : null}
                </button>
              </div>

              {checklist.length ? (
                <div className="mt-4 flex flex-wrap gap-1.5" aria-label={`Day checklist ${checklistDone} of ${checklist.length}`}>
                  {checklist.map((item) => (
                    <span
                      key={item.id}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        item.done
                          ? "border-monk-success/30 bg-monk-success-soft text-monk-success"
                          : "border-monk-border/60 bg-monk-bg text-monk-text-soft"
                      }`}
                    >
                      {item.done ? "✓ " : ""}{item.label}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-monk-border bg-monk-bg p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-monk-text-soft">
                    {isRest ? "Rest note" : "One action"}
                  </p>
                  {!editingAction && !isRest && !isDone ? (
                    <button
                      type="button"
                      className="text-xs font-bold text-monk-accent hover:underline"
                      onClick={() => {
                        setActionInput(todayPlan.mainAction || goal?.keystoneAction || "");
                        setEditingAction(true);
                      }}
                    >
                      Edit
                    </button>
                  ) : null}
                </div>

                {editingAction ? (
                  <div className="mt-2 space-y-2">
                    {(() => {
                      const parsed = parseIntention(actionInput);
                      return (
                        <>
                          <TextInput
                            label="When…"
                            value={parsed.when}
                            onChange={(e) => setActionInput(formatIntention(e.target.value, parsed.action))}
                            placeholder="I sit down after coffee"
                            autoFocus
                          />
                          <TextInput
                            label="I will…"
                            value={parsed.action}
                            onChange={(e) => setActionInput(formatIntention(parsed.when, e.target.value))}
                            placeholder="work 45 minutes on the keystone"
                          />
                        </>
                      );
                    })()}
                    <div className="flex justify-end gap-3 pt-1">
                      <button
                        type="button"
                        className="text-xs font-semibold text-monk-muted hover:underline"
                        onClick={() => setEditingAction(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-monk-accent hover:underline"
                        onClick={() => {
                          if (actionInput.trim()) {
                            store.createOrUpdateDayPlan(today, {
                              dayType: "goal",
                              goalId: todayPlan.goalId,
                              mainAction: actionInput.trim()
                            });
                            setEditingAction(false);
                          }
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : isRest ? (
                  <p className="mt-1.5 text-sm font-semibold leading-5">
                    Recharge without leaving your direction.
                  </p>
                ) : (() => {
                  const shown = parseIntention(todayPlan.mainAction || "");
                  if (shown.when && shown.action) {
                    return (
                      <div className="mt-1.5 space-y-1">
                        <p className="text-xs text-monk-muted">When {shown.when}</p>
                        <p className="text-sm font-semibold leading-5">I will {shown.action}</p>
                      </div>
                    );
                  }
                  if (todayPlan.mainAction) {
                    return (
                      <p className="mt-1.5 text-sm font-semibold leading-5">{todayPlan.mainAction}</p>
                    );
                  }
                  if (goal?.keystoneAction) {
                    return (
                      <div className="mt-1.5 space-y-2">
                        <p className="text-sm font-semibold leading-5 text-monk-text-soft">{goal.keystoneAction}</p>
                        <button
                          type="button"
                          className="text-xs font-bold text-monk-accent hover:underline"
                          onClick={() => {
                            setActionInput(goal.keystoneAction);
                            setEditingAction(true);
                          }}
                        >
                          Make it today's intention
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div className="mt-1.5 space-y-2">
                      <p className="text-sm text-monk-muted">Name one action for today.</p>
                      <button
                        type="button"
                        className="text-xs font-bold text-monk-accent hover:underline"
                        onClick={() => {
                          setActionInput("");
                          setEditingAction(true);
                        }}
                      >
                        Add intention
                      </button>
                    </div>
                  );
                })()}
              </div>

              {(focusMinutes > 0 || hasLearning) ? (
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-monk-muted">
                  {focusMinutes > 0 ? (
                    <span className="rounded-full border border-monk-border bg-monk-bg px-2.5 py-1 font-mono">
                      {focusMinutes}m focus
                    </span>
                  ) : null}
                  {hasLearning ? (
                    <span className="rounded-full border border-monk-border bg-monk-bg px-2.5 py-1 font-mono">
                      {learningSessions.length} learn
                    </span>
                  ) : null}
                </div>
              ) : null}

              {isDone ? (
                <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-monk-success">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-monk-success" />
                  Today moved. Keep this space quiet.
                </p>
              ) : (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-monk-text-soft hover:text-monk-accent hover:underline"
                    onClick={() => store.clearDayPlan(today)}
                  >
                    Change today's theme
                  </button>
                </div>
              )}
            </Card>

            <DefenseChips compact />

            {isRest ? (
              <div className="space-y-3">
                <Card className="border-monk-rest/25 bg-monk-rest-soft/30 p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-monk-surface text-monk-rest">
                      <Moon size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold">Rest is part of the path</p>
                      <p className="mt-1 text-sm leading-6 text-monk-muted">
                        No focus blocks today. Light walk, early sleep, fewer inputs.
                      </p>
                    </div>
                  </div>
                </Card>
                {!hasJournal ? (
                  <PrimaryButton onClick={() => navigate(routes.journal)}>Reflect lightly</PrimaryButton>
                ) : (
                  <div className="rounded-2xl border border-monk-success bg-monk-success-soft px-4 py-2.5 text-center text-xs font-medium text-monk-success">
                    Rest held · reflection logged.
                  </div>
                )}
                <EnergyCheck
                  value={todayPlan.energyLevel}
                  onChange={(level) => {
                    store.updateTodayEnergy(level);
                    store.logEnergy(level);
                  }}
                />
              </div>
            ) : !isDone ? (
              <>
                {/* Primary: focus */}
                {activeSession ? (
                  <FocusSessionPanel
                    session={activeSession}
                    mainAction={todayPlan.mainAction}
                    compact
                    onOpenFocus={() => navigate(routes.focus)}
                  />
                ) : (
                  <FocusSessionStarter compact />
                )}
                {energy === "low" ? (
                  <div className="rounded-xl border border-monk-danger/20 bg-monk-danger/5 px-3 py-2 text-xs text-monk-danger/80">
                    Low energy — shorter sessions still serve your why.
                  </div>
                ) : null}
                <EnergyCheck
                  value={todayPlan.energyLevel}
                  onChange={(level) => {
                    store.updateTodayEnergy(level);
                    store.logEnergy(level);
                  }}
                />
              </>
            ) : (
              <div className="space-y-3">
                {!hasJournal || !todayEntry?.answers.whatMovedToday?.trim() ? (
                  <>
                    <p className="text-center text-xs text-monk-muted">Focus done. Close the loop.</p>
                    <PrimaryButton onClick={() => navigate(routes.journal)}>Reflect today</PrimaryButton>
                  </>
                ) : (
                  <Card className="border-monk-success/30 bg-monk-success-soft/40 p-5 text-center">
                    <p className="font-semibold text-monk-success">Day held.</p>
                    <p className="mt-1 text-sm text-monk-muted">Optional: learning, morning pages, or rest.</p>
                  </Card>
                )}
                <EnergyCheck
                  value={todayPlan.energyLevel}
                  onChange={(level) => {
                    store.updateTodayEnergy(level);
                    store.logEnergy(level);
                  }}
                />
              </div>
            )}

            {/* Secondary — collapsed */}
            <details className="group rounded-monk border border-monk-border bg-monk-surface">
              <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-monk-muted marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between">
                  More for today
                  <ChevronRight size={14} className="transition group-open:rotate-90" />
                </span>
              </summary>
              <div className="space-y-3 border-t border-monk-border/50 px-4 pb-4 pt-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-monk-border bg-monk-soft px-3 py-2.5 text-left text-sm"
                  onClick={() => navigate(routes.journal + (hasMorningPages ? "?tab=morning" : "?tab=morning"))}
                >
                  <span className="flex items-center gap-2">
                    <Sun size={14} className="text-monk-accent" />
                    Morning pages
                  </span>
                  <span className="text-[11px] text-monk-muted">{hasMorningPages ? "Edit" : "Write"}</span>
                </button>
                {!isRest ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-monk-border bg-monk-soft px-3 py-2.5 text-left text-sm"
                    onClick={() => navigate(routes.learn)}
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen size={14} className="text-monk-accent" />
                      Learning
                    </span>
                    <span className="text-[11px] text-monk-muted">
                      {hasLearning ? `${learningSessions.length} logged` : "Add"}
                    </span>
                  </button>
                ) : null}
                {hasJournal && isDone ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-monk-border bg-monk-soft px-3 py-2.5 text-left text-sm"
                    onClick={() => navigate(routes.journal)}
                  >
                    <span>Edit reflection</span>
                    <span className="text-[11px] text-monk-muted">Open</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-monk-border bg-monk-soft px-3 py-2.5 text-left text-sm text-monk-muted"
                  onClick={() => navigate(routes.relapse)}
                >
                  <span>Log drift gently</span>
                  <span className="text-[11px]">→</span>
                </button>
              </div>
            </details>

            <SeasonProgressCard compact />
            <WeeklyStatusIndicators />
            <PlanTomorrow goals={activeGoals} />
          </>
        )}
      </div>
    </>
  );
}

function SeasonProgressCard({ compact = false }: { compact?: boolean }) {
  const store = useMonkStore();
  const { activeSeason } = store;
  if (!activeSeason) return null;
  const daysPassed = getDaysPassed(activeSeason.startDate);
  const daysLeft = getDaysLeft(activeSeason.endDate);
  const progress = getSeasonProgress(activeSeason);
  const goals = selectActiveGoals(store);
  return (
    <Card className="bg-monk-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold truncate">{activeSeason.name}</p>
        <p className="shrink-0 font-mono text-xs text-monk-accent">{daysLeft}d left</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-monk-border">
        <div className="h-full rounded-full bg-monk-accent transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-sm text-monk-muted">
        {compact
          ? `Day ${daysPassed} · ${daysLeft}d left`
          : `Day ${daysPassed} of ${activeSeason.durationDays} · ends ${formatHumanDate(activeSeason.endDate)}`}
      </p>
      {!compact && goals.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {goals.map((goal) => (
            <span key={goal.id} className="rounded-full border border-monk-border bg-monk-soft px-3 py-1 text-xs text-monk-muted">
              {goal.title}
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

/** One-line why for friction moments (focus start, relapse). */
function FrictionWhy({ className = "" }: { className?: string }) {
  const why = useMonkStore((s) => s.activeSeason?.why);
  if (!why?.identity && !why?.consequenceOfInaction) return null;
  return (
    <div className={`rounded-xl border border-monk-accent/20 bg-monk-accent-soft/30 px-3 py-2.5 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">Remember why</p>
      {why.identity ? (
        <p className="mt-1 text-sm font-medium leading-5 text-monk-text line-clamp-2">{why.identity}</p>
      ) : null}
      {why.consequenceOfInaction ? (
        <p className="mt-1 text-xs leading-5 text-monk-muted line-clamp-2">
          If you stop: {why.consequenceOfInaction}
        </p>
      ) : null}
    </div>
  );
}

/** Anti-goals + obstacles from season — soft defenses. */
function DefenseChips({ compact = false }: { compact?: boolean }) {
  const season = useMonkStore((s) => s.activeSeason);
  const anti = (season?.antiGoals ?? []).filter(Boolean).slice(0, compact ? 2 : 4);
  const obs = (season?.obstacles ?? []).filter(Boolean).slice(0, compact ? 2 : 4);
  if (!anti.length && !obs.length) return null;
  return (
    <Card className="p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">
        {compact ? "Guardrails" : "What to avoid · what to watch"}
      </p>
      {anti.length ? (
        <div className="mt-2">
          <p className="text-[11px] font-semibold text-monk-text-soft">Avoid</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {anti.map((item) => (
              <span
                key={item}
                className="rounded-full border border-monk-danger/25 bg-monk-danger-soft/40 px-2.5 py-1 text-[11px] text-monk-danger/90"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {obs.length ? (
        <div className={anti.length ? "mt-3" : "mt-2"}>
          <p className="text-[11px] font-semibold text-monk-text-soft">Watch for</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {obs.map((item) => (
              <span
                key={item}
                className="rounded-full border border-monk-warning/30 bg-monk-warning-soft/40 px-2.5 py-1 text-[11px] text-monk-warning"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function WhyEditor({
  initial,
  onSave,
  onCancel
}: {
  initial?: { identity?: string; consequenceOfInaction?: string; protectValues?: string[] };
  onSave: (why: { identity: string; consequenceOfInaction: string; protectValues: string[] }) => void;
  onCancel: () => void;
}) {
  const [identity, setIdentity] = useState(initial?.identity ?? "");
  const [consequence, setConsequence] = useState(initial?.consequenceOfInaction ?? "");
  const [protect, setProtect] = useState<string[]>(initial?.protectValues ?? []);
  const canSave = identity.trim().length >= 10 || consequence.trim().length >= 10;

  const toggleValue = (id: string) => {
    setProtect((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  return (
    <div className="space-y-4">
      <Textarea
        label="Who are you becoming?"
        value={identity}
        onChange={(e) => setIdentity(e.target.value)}
        rows={3}
        showCharCount
        minLength={10}
        placeholder="e.g. Someone who ships daily and protects deep work"
      />
      <Textarea
        label="If you stop, what happens?"
        value={consequence}
        onChange={(e) => setConsequence(e.target.value)}
        rows={3}
        showCharCount
        minLength={10}
        placeholder="e.g. Another year of the same stuck loop"
      />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Protect (up to 3)</p>
          <span className="text-xs font-bold text-monk-muted">{protect.length}/3</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CORE_VALUES.map((v) => (
            <ChoiceCard
              key={v.id}
              title={v.label}
              selected={protect.includes(v.id)}
              onClick={() => toggleValue(v.id)}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <SecondaryButton className="flex-1" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          className="flex-1"
          disabled={!canSave}
          onClick={() =>
            onSave({
              identity: identity.trim(),
              consequenceOfInaction: consequence.trim(),
              protectValues: protect
            })
          }
        >
          Save why
        </PrimaryButton>
      </div>
    </div>
  );
}

/** Compact why reminder — Today. Empty state invites add. */
function WhyStrip() {
  const store = useMonkStore();
  const why = store.activeSeason?.why;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const hasWhy = !!(why?.identity || why?.consequenceOfInaction);

  if (editing) {
    return (
      <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-monk-accent">
          {hasWhy ? "Edit why" : "Add your why"}
        </p>
        <WhyEditor
          initial={why}
          onCancel={() => setEditing(false)}
          onSave={(next) => {
            store.updateSeasonWhy(next);
            setEditing(false);
            setOpen(true);
          }}
        />
      </Card>
    );
  }

  if (!hasWhy) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full rounded-monk border border-dashed border-monk-accent/30 bg-monk-accent-soft/20 px-4 py-3 text-left transition active:scale-[0.99]"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">Why you started</p>
        <p className="mt-1 text-sm text-monk-muted">Add your identity + what you lose if you stop.</p>
      </button>
    );
  }

  const line = why!.identity || why!.consequenceOfInaction;
  return (
    <div className="rounded-monk border border-monk-accent/20 bg-monk-accent-soft/40 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">Why you started</p>
            <p className={`mt-1 text-sm leading-5 text-monk-text ${open ? "" : "line-clamp-2"}`}>{line}</p>
            {open && why!.consequenceOfInaction && why!.identity ? (
              <p className="mt-2 text-xs leading-5 text-monk-muted">
                If you stop: {why!.consequenceOfInaction}
              </p>
            ) : null}
            {open && why!.protectValues?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {why!.protectValues.map((id) => {
                  const v = CORE_VALUES.find((c) => c.id === id);
                  return (
                    <span
                      key={id}
                      className="rounded-full border border-monk-border bg-monk-bg px-2 py-0.5 text-[10px] font-medium text-monk-muted"
                    >
                      {v?.label ?? id}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
          <ChevronRight
            size={14}
            className={`mt-1 shrink-0 text-monk-muted transition ${open ? "rotate-90" : ""}`}
          />
        </div>
      </button>
      {open ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 text-xs font-semibold text-monk-accent transition hover:opacity-80"
        >
          Edit why
        </button>
      ) : null}
    </div>
  );
}

/** Full why card — Timeline. Always visible; empty invites add. */
function WhyCard() {
  const store = useMonkStore();
  const why = store.activeSeason?.why;
  const [editing, setEditing] = useState(false);
  const hasWhy = !!(why?.identity || why?.consequenceOfInaction);

  if (editing) {
    return (
      <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-monk-accent">
          {hasWhy ? "Edit why" : "Add your why"}
        </p>
        <WhyEditor
          initial={why}
          onCancel={() => setEditing(false)}
          onSave={(next) => {
            store.updateSeasonWhy(next);
            setEditing(false);
          }}
        />
      </Card>
    );
  }

  if (!hasWhy) {
    return (
      <Card className="border-dashed border-monk-accent/30 bg-monk-accent-soft/20 p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">Your why</p>
        <p className="mt-2 text-sm leading-6 text-monk-muted">
          No why yet. Capture identity + cost of stopping so daily work stays meaningful.
        </p>
        <PrimaryButton className="mt-4" onClick={() => setEditing(true)}>
          Add why
        </PrimaryButton>
      </Card>
    );
  }

  return (
    <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">Your why</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-monk-accent transition hover:opacity-80"
        >
          Edit
        </button>
      </div>
      {why!.identity ? (
        <p className="mt-2 text-base font-semibold leading-6 text-monk-text">{why!.identity}</p>
      ) : null}
      {why!.consequenceOfInaction ? (
        <div className="mt-3 rounded-2xl border border-monk-border/70 bg-monk-bg/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-monk-muted">If you stop</p>
          <p className="mt-1 text-sm leading-5 text-monk-text-soft">{why!.consequenceOfInaction}</p>
        </div>
      ) : null}
      {why!.protectValues?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {why!.protectValues.map((id) => {
            const v = CORE_VALUES.find((c) => c.id === id);
            return (
              <span
                key={id}
                className="rounded-full border border-monk-border bg-monk-soft px-2.5 py-1 text-[11px] text-monk-muted"
              >
                {v?.label ?? id}
              </span>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}

function FlowPickToday({ goals }: { goals: ReturnType<typeof selectActiveGoals> }) {
  const store = useMonkStore();
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const restUsed = store.dayPlans.some(
    (day) => day.weeklyPlanId === weeklyPlan?.id && day.dayType === "rest" && day.status !== "missed"
  );
  if (!weeklyPlan) {
    return <EmptyState title="Shape this week." description="Six focus days. One rest day." />;
  }

  const ranked = weeklyPlan.goalAllocations
    .map((allocation) => {
      const remaining = Math.max(0, allocation.targetCount - allocation.completedCount);
      return { allocation, remaining };
    })
    .sort((a, b) => b.remaining - a.remaining);
  const maxRemaining = ranked[0]?.remaining ?? 0;

  return (
    <Card important>
      <p className="font-semibold">Choose what deserves today.</p>
      <p className="mt-2 text-sm leading-6 text-monk-muted">One theme is enough. Prefer the goal still short on days.</p>
      <div className="mt-5 space-y-3">
        {ranked.map(({ allocation, remaining }) => {
          const goal = goals.find((item) => item.id === allocation.goalId);
          const progress = allocation.targetCount > 0
            ? Math.min(100, Math.round((allocation.completedCount / allocation.targetCount) * 100))
            : 0;
          const recommend = remaining > 0 && remaining === maxRemaining;
          const done = remaining === 0;
          return (
            <button
              key={allocation.goalId}
              type="button"
              onClick={() => store.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal", goalId: allocation.goalId })}
              className={`w-full rounded-monk border p-4 text-left transition active:scale-[0.99] ${
                recommend
                  ? "border-monk-accent/50 bg-monk-accent-soft/40"
                  : "border-monk-border bg-monk-surface hover:border-monk-border-strong"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{goal?.title ?? "Focus goal"}</p>
                    {recommend ? (
                      <span className="rounded-full border border-monk-accent/40 bg-monk-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-monk-accent">
                        Suggested
                      </span>
                    ) : null}
                    {done ? (
                      <span className="rounded-full border border-monk-success/30 bg-monk-success-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-monk-success">
                        Target met
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-monk-muted line-clamp-2">
                    {goal?.keystoneAction?.trim() || `${remaining} day${remaining === 1 ? "" : "s"} left this week`}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-monk-muted tabular-nums">
                  {allocation.completedCount}/{allocation.targetCount}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-monk-soft">
                <div
                  className={`h-full rounded-full ${done ? "bg-monk-success" : "bg-monk-accent"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </button>
          );
        })}
        {!restUsed ? (
          <button
            type="button"
            onClick={() => store.createOrUpdateDayPlan(getTodayDateString(), { dayType: "rest" })}
            className="flex w-full items-start gap-3 rounded-monk border border-monk-border bg-monk-soft/60 p-4 text-left transition hover:border-monk-rest/40 active:scale-[0.99]"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-monk-surface text-monk-rest">
              <Moon size={16} strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold">Rest</p>
              <p className="mt-1 text-xs text-monk-muted">One quiet day. Rest is part of the path.</p>
            </div>
          </button>
        ) : null}
      </div>
    </Card>
  );
}

function EnergyCheck({ value, onChange }: { value?: EnergyLevel; onChange: (value: EnergyLevel) => void }) {
  const store = useMonkStore();
  const today = getTodayDateString();
  const past7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - (6 - i));
    return getTodayDateString(d);
  });

  const labels: Record<EnergyLevel, string> = {
    low: "Low",
    medium: "Steady",
    high: "High"
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-sm">Energy</p>
          <p className="mt-0.5 text-xs text-monk-muted">How full is the tank today?</p>
        </div>
        {value ? (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            value === "high"
              ? "border-monk-success/30 bg-monk-success-soft text-monk-success"
              : value === "medium"
              ? "border-monk-accent/30 bg-monk-accent-soft text-monk-accent"
              : "border-monk-danger/30 bg-monk-danger-soft text-monk-danger"
          }`}>
            {labels[value]}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["low", "medium", "high"] as EnergyLevel[]).map((level) => {
          const selected = value === level;
          const tone =
            level === "high"
              ? selected
                ? "border-monk-success bg-monk-success-soft text-monk-success"
                : "border-monk-border text-monk-muted hover:border-monk-success/40"
              : level === "medium"
              ? selected
                ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                : "border-monk-border text-monk-muted hover:border-monk-accent/40"
              : selected
              ? "border-monk-danger bg-monk-danger-soft text-monk-danger"
              : "border-monk-border text-monk-muted hover:border-monk-danger/40";
          return (
            <button
              key={level}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(level)}
              className={`min-h-12 rounded-monk border text-sm font-semibold transition active:scale-95 ${tone}`}
            >
              {labels[level]}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-monk-muted">7-day trend</p>
        <div className="flex items-end gap-1.5" aria-label="Energy trend last 7 days">
          {past7.map((date) => {
            const log = store.energyLogs?.find((l) => l.date === date);
            const isToday = date === today;
            const h = log?.level === "high" ? "h-5" : log?.level === "medium" ? "h-3.5" : log?.level === "low" ? "h-2" : "h-1.5";
            const color = log?.level === "high"
              ? "bg-monk-success"
              : log?.level === "medium"
              ? "bg-monk-accent"
              : log?.level === "low"
              ? "bg-monk-danger"
              : "bg-monk-border/40";
            return (
              <span
                key={date}
                title={`${date}${log ? ` · ${log.level}` : ""}`}
                className={`inline-block w-full rounded-sm ${h} ${color} ${isToday ? "ring-1 ring-monk-accent/50" : ""}`}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function WeekScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const goals = selectActiveGoals(store);
  const today = getTodayDateString();
  const todayPlan = selectTodayPlan(store);

  useEffect(() => {
    store.getOrCreateCurrentWeeklyPlan();
  }, []);

  const weekDates = useMemo(() => {
    return weeklyPlan ? datesInRange(weeklyPlan.startDate, 7) : [];
  }, [weeklyPlan?.startDate]);

  const stats = useMemo(() => {
    if (!weeklyPlan) return null;
    const plans = weekDates.map((date) => store.dayPlans.find((d) => d.date === date));
    const completed = plans.filter((p) => p?.status === "completed").length;
    const partial = plans.filter((p) => p?.status === "partial").length;
    const rest = plans.filter((p) => p?.dayType === "rest" || p?.status === "rest").length;
    const missed = plans.filter((p) => p?.status === "missed" || p?.status === "relapse").length;
    const targetFocus = weeklyPlan.goalAllocations.reduce((s, a) => s + a.targetCount, 0) || 6;
    const focusDone = weeklyPlan.goalAllocations.reduce((s, a) => s + a.completedCount, 0);
    const energyCounts = weekDates.reduce((acc, date) => {
      const lvl = selectEnergyForDate(store, date);
      if (lvl) acc[lvl] = (acc[lvl] ?? 0) + 1;
      return acc;
    }, {} as Record<EnergyLevel, number>);
    const energyTotal = Object.values(energyCounts).reduce((a, b) => a + b, 0);
    return { completed, partial, rest, missed, targetFocus, focusDone, energyCounts, energyTotal };
  }, [weeklyPlan, weekDates, store.dayPlans, store.energyLogs]);

  const remainingDays = weekDates.filter((d) => d >= today).length;

  return (
    <>
      <PageHeader
        title={weeklyPlan ? `Week ${weeklyPlan.weekNumber}` : "Week"}
        subtitle={
          weeklyPlan
            ? `${formatHumanDate(weeklyPlan.startDate)} – ${formatHumanDate(weeklyPlan.endDate)}`
            : "Six focus days. One rest day."
        }
        rightSlot={<SettingsLink />}
      />
      <div className="space-y-5">
        {!weeklyPlan || !stats ? (
          <EmptyState title="Shape this week." description="Your weekly rhythm appears once a season is active." />
        ) : (
          <>
            <DefenseChips />
            <Card className="p-5">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-monk-muted">Weekly rhythm</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                    {stats.focusDone}
                    <span className="text-base font-semibold text-monk-muted">/{stats.targetFocus}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-monk-muted">focus days complete</p>
                </div>
                <div className="text-right text-xs text-monk-muted space-y-0.5">
                  {stats.rest > 0 ? <p>{stats.rest} rest</p> : null}
                  {stats.partial > 0 ? <p>{stats.partial} partial</p> : null}
                  {stats.missed > 0 ? <p className="text-monk-danger/80">{stats.missed} missed</p> : null}
                  <p>{remainingDays} day{remainingDays === 1 ? "" : "s"} left</p>
                </div>
              </div>

              <div className="mb-4 h-1.5 rounded-full bg-monk-soft overflow-hidden" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-monk-accent transition-all"
                  style={{ width: `${Math.min(100, Math.round((stats.focusDone / Math.max(1, stats.targetFocus)) * 100))}%` }}
                />
              </div>

              <div className="flex items-stretch justify-between gap-1.5" role="list" aria-label="Days this week">
                {weekDates.map((date) => {
                  const dayPlan = store.dayPlans.find((d) => d.date === date);
                  const weekday = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
                  const dayNum = date.slice(8);
                  const isToday = date === today;
                  const isFuture = date > today;
                  const status = dayPlan?.status ?? "not_started";
                  const isCompleted = status === "completed";
                  const isPartial = status === "partial";
                  const isRest = dayPlan?.dayType === "rest" || status === "rest";
                  const isRelapse = status === "relapse";
                  const isMissed = status === "missed";
                  const energyLevel = selectEnergyForDate(store, date);
                  const energyDot =
                    energyLevel === "high" ? "bg-monk-success" :
                    energyLevel === "medium" ? "bg-monk-accent" :
                    energyLevel === "low" ? "bg-monk-danger" : "bg-transparent";
                  const goalTitle = dayPlan?.goalId
                    ? goals.find((g) => g.id === dayPlan.goalId)?.title
                    : isRest ? "Rest" : undefined;
                  const label = [
                    weekday,
                    dayNum,
                    isToday ? "today" : "",
                    isCompleted ? "completed" : isPartial ? "partial" : isRest ? "rest" : isMissed ? "missed" : isRelapse ? "relapse" : isFuture ? "upcoming" : "open",
                    goalTitle ?? ""
                  ].filter(Boolean).join(", ");

                  const circleClass = isCompleted
                    ? "bg-monk-success/15 border-monk-success/50 text-monk-success"
                    : isPartial
                    ? "bg-monk-accent/15 border-monk-accent/40 text-monk-accent"
                    : isRest
                    ? "bg-monk-rest/15 border-monk-rest/40 text-monk-rest"
                    : isRelapse
                    ? "bg-monk-danger/10 border-monk-danger/40 text-monk-danger"
                    : isMissed
                    ? "bg-monk-text-soft/5 border-monk-text-soft/25 text-monk-text-soft/50"
                    : isFuture
                    ? "bg-transparent border-monk-border/30 text-monk-text-soft/40"
                    : "bg-monk-soft border-monk-border text-monk-text-soft";

                  const DayInner = (
                    <>
                      <div
                        className={`grid h-11 w-11 place-items-center rounded-full border-2 text-[11px] font-mono font-bold transition-colors ${circleClass} ${
                          isToday ? "ring-2 ring-monk-accent/60 ring-offset-2 ring-offset-monk-bg" : ""
                        }`}
                      >
                        {isCompleted ? <Check size={16} strokeWidth={2.5} /> : isRest ? <Moon size={14} strokeWidth={1.75} /> : dayNum}
                      </div>
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${
                        isToday ? "text-monk-accent" : "text-monk-text-soft/60"
                      }`}>
                        {weekday.slice(0, 2)}
                      </span>
                      <span className={`h-1.5 w-1.5 rounded-full ${energyDot}`} aria-hidden="true" />
                    </>
                  );

                  if (isToday) {
                    return (
                      <button
                        key={date}
                        type="button"
                        role="listitem"
                        aria-label={label}
                        onClick={() => navigate(routes.today)}
                        className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-1 transition active:scale-95"
                      >
                        {DayInner}
                      </button>
                    );
                  }

                  return (
                    <div key={date} role="listitem" aria-label={label} className="flex flex-1 flex-col items-center gap-1.5 py-1">
                      {DayInner}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-monk-text-soft/70">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-monk-success/80" />done</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-monk-accent/70" />partial</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-monk-rest/60" />rest</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-monk-success" />
                  <span className="h-1.5 w-1.5 rounded-full bg-monk-accent" />
                  <span className="h-1.5 w-1.5 rounded-full bg-monk-danger" />
                  energy
                </span>
              </div>
            </Card>

            {!todayPlan ? (
              <Card className="p-4 border-monk-accent/30 bg-monk-accent-soft/40">
                <p className="text-sm font-semibold">Today is open</p>
                <p className="mt-1 text-xs text-monk-muted">Pick one focus theme. One theme is enough.</p>
                <PrimaryButton className="mt-4" onClick={() => navigate(routes.today)}>
                  Plan Today
                </PrimaryButton>
              </Card>
            ) : null}

            {stats.energyTotal > 0 ? (
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-monk-muted">Energy</p>
                  <span className="text-xs text-monk-muted">{stats.energyTotal} logged</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-monk-soft">
                  {(["high", "medium", "low"] as EnergyLevel[]).map((lvl) => {
                    const n = stats.energyCounts[lvl] ?? 0;
                    if (!n) return null;
                    const color = lvl === "high" ? "bg-monk-success" : lvl === "medium" ? "bg-monk-accent" : "bg-monk-danger";
                    return (
                      <div
                        key={lvl}
                        className={color}
                        style={{ width: `${(n / stats.energyTotal) * 100}%` }}
                        title={`${n} ${lvl}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-monk-muted">
                  {(["high", "medium", "low"] as EnergyLevel[]).map((lvl) =>
                    stats.energyCounts[lvl] ? (
                      <span key={lvl} className="capitalize">{lvl} {stats.energyCounts[lvl]}d</span>
                    ) : null
                  )}
                </div>
              </Card>
            ) : null}

            <div>
              <SectionHeader title="Goals this week" subtitle="Touch every goal at least once." />
              <div className="space-y-3">
                {weeklyPlan.goalAllocations.map((allocation) => {
                  const goal = goals.find((item) => item.id === allocation.goalId);
                  const progress = allocation.targetCount > 0
                    ? Math.min(100, Math.round((allocation.completedCount / allocation.targetCount) * 100))
                    : 0;
                  const complete = allocation.completedCount >= allocation.targetCount;
                  const remaining = Math.max(0, allocation.targetCount - allocation.completedCount);
                  const behind = !complete && remaining > remainingDays;
                  const statusLabel = complete ? "Done" : behind ? "Behind" : allocation.completedCount > 0 ? "In progress" : "Not started";
                  const statusClass = complete
                    ? "text-monk-success border-monk-success/30 bg-monk-success-soft"
                    : behind
                    ? "text-monk-warning border-monk-warning/30 bg-monk-warning-soft"
                    : allocation.completedCount > 0
                    ? "text-monk-accent border-monk-accent/30 bg-monk-accent-soft"
                    : "text-monk-muted border-monk-border bg-monk-soft";

                  return (
                    <Card key={allocation.goalId} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{goal?.title ?? "Goal"}</p>
                          {goal?.why ? (
                            <p className="mt-1 text-xs text-monk-accent/90 line-clamp-2">Because {goal.why}</p>
                          ) : null}
                          {goal?.keystoneAction ? (
                            <p className="mt-1 text-xs text-monk-muted line-clamp-2">{goal.keystoneAction}</p>
                          ) : null}
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-monk-soft">
                          <div
                            className={`h-full rounded-full transition-all ${
                              complete ? "bg-monk-success" : behind ? "bg-monk-warning" : "bg-monk-accent"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs font-mono tabular-nums text-monk-muted">
                          {allocation.completedCount}/{allocation.targetCount}
                        </span>
                      </div>
                      {goal ? <GoalWhyInline goalId={goal.id} why={goal.why} /> : null}
                    </Card>
                  );
                })}

                <Card className="bg-monk-soft/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-monk-surface text-monk-rest">
                      <Moon size={16} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Rest day</p>
                      <p className="mt-0.5 text-xs text-monk-muted">
                        {stats.rest > 0 ? "Taken this week. Protect the recovery." : "Still open — rest is part of the path."}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <WeeklyReviewCard
              weeklyPlan={weeklyPlan}
              goals={goals}
              stats={stats}
              remainingDays={remainingDays}
              weekDates={weekDates}
              today={today}
            />
          </>
        )}
      </div>
    </>
  );
}

function GoalWhyInline({ goalId, why }: { goalId: string; why?: string }) {
  const updateGoalWhy = useMonkStore((s) => s.updateGoalWhy);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(why ?? "");

  if (editing) {
    return (
      <div className="mt-3 space-y-2 border-t border-monk-border/40 pt-3">
        <TextInput
          label="Why this goal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Because…"
        />
        <div className="flex gap-2">
          <GhostButton className="flex-1 min-h-9 text-xs" onClick={() => setEditing(false)}>
            Cancel
          </GhostButton>
          <PrimaryButton
            className="flex-1 min-h-9 text-xs"
            onClick={() => {
              updateGoalWhy(goalId, draft);
              setEditing(false);
            }}
          >
            Save
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(why ?? "");
        setEditing(true);
      }}
      className="mt-2 text-[11px] font-semibold text-monk-accent hover:underline"
    >
      {why ? "Edit goal why" : "Add goal why"}
    </button>
  );
}

function WeeklyReviewCard({
  weeklyPlan,
  goals,
  stats,
  remainingDays,
  weekDates,
  today
}: {
  weeklyPlan: NonNullable<ReturnType<typeof selectCurrentWeeklyPlan>>;
  goals: ReturnType<typeof selectActiveGoals>;
  stats: {
    completed: number;
    partial: number;
    rest: number;
    missed: number;
    targetFocus: number;
    focusDone: number;
  };
  remainingDays: number;
  weekDates: string[];
  today: string;
}) {
  const navigate = useNavigate();
  const why = useMonkStore((s) => s.activeSeason?.why);
  const weekEnded = remainingDays === 0 || weekDates[weekDates.length - 1] < today;
  const lateWeek = remainingDays <= 1 || weekEnded;

  if (!lateWeek) return null;

  const starved = weeklyPlan.goalAllocations
    .map((a) => {
      const goal = goals.find((g) => g.id === a.goalId);
      return { goal, remaining: Math.max(0, a.targetCount - a.completedCount), done: a.completedCount, target: a.targetCount };
    })
    .filter((x) => x.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  const hitRate = stats.targetFocus > 0 ? Math.round((stats.focusDone / stats.targetFocus) * 100) : 0;

  return (
    <Card className="border-monk-accent/25 bg-monk-accent-soft/20 p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">
        {weekEnded ? "Week review" : "Almost week-end"}
      </p>
      <p className="mt-2 text-sm font-semibold text-monk-text">
        {stats.focusDone}/{stats.targetFocus} focus days · {hitRate}% of target
      </p>
      {stats.missed > 0 ? (
        <p className="mt-1 text-xs text-monk-muted">{stats.missed} missed · data, not verdict.</p>
      ) : (
        <p className="mt-1 text-xs text-monk-muted">No missed days logged. Steady.</p>
      )}

      {starved.length ? (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-monk-muted">Needs attention</p>
          <ul className="mt-2 space-y-1.5">
            {starved.slice(0, 3).map(({ goal, remaining, done, target }) => (
              <li key={goal?.id ?? target} className="text-sm text-monk-text">
                <span className="font-semibold">{goal?.title ?? "Goal"}</span>
                <span className="text-monk-muted"> · {done}/{target} · {remaining} short</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-monk-success">Every goal touched enough this week.</p>
      )}

      {why?.identity || why?.consequenceOfInaction ? (
        <div className="mt-4 rounded-xl border border-monk-border/70 bg-monk-bg/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-monk-muted">Still true?</p>
          <p className="mt-1 text-sm leading-5 text-monk-text line-clamp-3">
            {why.identity || why.consequenceOfInaction}
          </p>
          <button
            type="button"
            className="mt-2 text-[11px] font-semibold text-monk-accent hover:underline"
            onClick={() => navigate(routes.timeline)}
          >
            Revisit why
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="mt-4 text-xs font-semibold text-monk-accent hover:underline"
          onClick={() => navigate(routes.timeline)}
        >
          Set your why before next week
        </button>
      )}

      <p className="mt-4 text-xs leading-5 text-monk-muted">
        Next week: protect starved goals first. One theme per day still wins.
      </p>
      <SecondaryButton className="mt-3" onClick={() => navigate(routes.today)}>
        Plan tomorrow
      </SecondaryButton>
    </Card>
  );
}

function FocusScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const plan = selectTodayPlan(store);
  const goal = plan?.goalId ? store.goals.find((item) => item.id === plan.goalId) : undefined;
  const [musicOn, setMusicOn] = useState(false);

  const activeSession = store.focusSessions.find(
    (session) => session.dayPlanId === plan?.id && ["running", "paused"].includes(session.status)
  );

  useEffect(() => {
    return () => { stopMusic(); };
  }, []);

  const toggleMusicHandler = () => {
    const on = toggleMusic();
    setMusicOn(on);
  };

  if (!plan) {
    return (
      <>
        <PageHeader title="Focus" subtitle="Choose today first." />
        <EmptyState title="Choose what deserves today." description="One theme is enough." />
        <PrimaryButton className="mt-5" onClick={() => navigate(routes.today)}>Pick Today</PrimaryButton>
      </>
    );
  }

  const intention = parseIntention(plan.mainAction || "");

  return (
    <>
      <PageHeader
        title={activeSession ? "In session" : "Focus"}
        subtitle={goal?.title ?? "Quiet recovery"}
        rightSlot={
          <button
            type="button"
            onClick={toggleMusicHandler}
            className={`grid min-h-11 min-w-11 place-items-center rounded-full border transition active:scale-90 ${
              musicOn
                ? "border-monk-accent/40 bg-monk-accent-soft text-monk-accent"
                : "border-monk-border bg-monk-surface text-monk-muted hover:border-monk-accent hover:text-monk-accent"
            }`}
            aria-label={musicOn ? "Mute music" : "Unmute music"}
          >
            {musicOn ? <Volume2 size={18} strokeWidth={1.5} /> : <VolumeX size={18} strokeWidth={1.5} />}
          </button>
        }
      />

      {!activeSession && plan.dayType === "goal" ? (
        <Card className="mb-5 border-monk-border bg-monk-soft p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-monk-muted">Today's action</p>
          {intention.when && intention.action ? (
            <div className="mt-1.5 space-y-0.5">
              <p className="text-xs text-monk-muted">When {intention.when}</p>
              <p className="text-sm font-semibold text-monk-text">I will {intention.action}</p>
            </div>
          ) : (
            <p className="mt-1.5 text-sm font-semibold text-monk-text">
              {plan.mainAction || "One action is enough."}
            </p>
          )}
        </Card>
      ) : null}

      {activeSession ? (
        <div className="space-y-5">
          <FocusSessionPanel session={activeSession} mainAction={plan.mainAction} />
          <GhostButton className="w-full min-h-11" onClick={() => navigate(routes.today)}>
            Return to Today
          </GhostButton>
        </div>
      ) : (
        <FocusSessionStarter />
      )}
    </>
  );
}

function JournalEntryScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const todayPlan = selectTodayPlan(store);
  const todayEntry = selectJournalEntryForToday(store);
  const dateSeed = todayPlan ? todayPlan.date : getTodayDateString();
  const journalDraftKey = `${JOURNAL_DRAFT_KEY}:${dateSeed}`;

  const initial = useMemo(() => {
    const draft = localStorage.getItem(journalDraftKey);
    return draft ? (JSON.parse(draft) as JournalAnswers) : todayEntry?.answers ?? {};
  }, [journalDraftKey, todayEntry?.id, todayEntry?.updatedAt]);

  const [answers, setAnswers] = useState<JournalAnswers>(initial);
  const [saved, setSaved] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    setAnswers(initial);
    setSaved(false);
  }, [initial]);

  useEffect(() => {
    localStorage.setItem(journalDraftKey, JSON.stringify(answers));
  }, [answers, journalDraftKey]);

  const activePrompt = useMemo(() => getDailyJournalPromptForDate(dateSeed), [dateSeed]);

  const now = new Date();
  const isEvening = now.getHours() >= 17;
  const urlTab = searchParams.get("tab");
  const defaultTab: "reflection" | "morning" = urlTab === "morning" || urlTab === "reflection" ? urlTab : (isEvening ? "reflection" : "morning");
  const [currentTab, setCurrentTab] = useState(defaultTab);

  useEffect(() => {
    setCurrentTab(defaultTab);
  }, [defaultTab]);

  const setTab = (tab: "reflection" | "morning") => {
    setCurrentTab(tab);
    setSearchParams({ tab });
  };

  const wordCount = useMemo(() => {
    const text = answers.morningPages || "";
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [answers.morningPages]);

  const canSave = todayPlan && (
    currentTab === "morning"
      ? !!answers.morningPages?.trim()
      : !!answers.whatMovedToday?.trim()
  );

  return (
    <>
      <PageHeader
        title="Journal"
        subtitle={isEvening ? "How did today really go?" : "Set the tone before the day begins."}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(routes.library)}
              className="grid h-9 w-9 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted hover:text-monk-accent hover:border-monk-accent transition active:scale-90"
              aria-label="View journal library"
            >
              <BookOpen size={16} strokeWidth={1.5} />
            </button>
            <SettingsLink />
          </div>
        }
      />
      {!todayPlan ? <CalmAlert type="warning" title="Pick today's focus before saving reflection." /> : null}

      <div className="flex rounded-xl bg-monk-soft p-1 mb-5 border border-monk-border/40">
        <button
          type="button"
          className={`flex-1 min-h-11 rounded-lg py-2 text-xs font-semibold tracking-wide transition relative ${
            currentTab === "morning"
              ? "bg-monk-surface text-monk-text border border-monk-border-strong shadow-sm"
              : "text-monk-muted hover:text-monk-text"
          }`}
          onClick={() => setTab("morning")}
        >
          Morning
          {answers.morningPages?.trim() && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-monk-accent" />}
        </button>
        <button
          type="button"
          className={`flex-1 min-h-11 rounded-lg py-2 text-xs font-semibold tracking-wide transition relative ${
            currentTab === "reflection"
              ? "bg-monk-surface text-monk-text border border-monk-border-strong shadow-sm"
              : "text-monk-muted hover:text-monk-text"
          }`}
          onClick={() => setTab("reflection")}
        >
          Reflection
          {answers.whatMovedToday?.trim() && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-monk-success" />}
        </button>
      </div>

      {currentTab === "morning" ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-widest text-monk-text-soft font-mono">Morning Pages</span>
            <span className={`text-[10px] font-mono ${wordCount >= 750 ? "text-monk-success" : "text-monk-text-soft"}`}>
              {wordCount > 0 ? `${wordCount} words${wordCount >= 750 ? " ✦" : ""}` : "0 words"}
            </span>
          </div>
          {wordCount > 0 && (
            <div className="h-1 rounded-full bg-monk-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${wordCount >= 750 ? "bg-monk-success" : "bg-monk-accent"}`}
                style={{ width: `${Math.min((wordCount / 750) * 100, 100)}%` }}
              />
            </div>
          )}
          <div className="morning-page-card">
            <textarea
              id="morningPages"
              value={answers.morningPages ?? ""}
              placeholder="Start writing — anything on your mind..."
              className="morning-page-textarea"
              onChange={(event) => setAnswers((value) => ({ ...value, morningPages: event.target.value }))}
            />
          </div>
          <p className="text-[11px] text-monk-text-soft text-center leading-relaxed px-2">
            Free-form. Stream of consciousness. No prompts, no pressure.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Main Required Question */}
          <Card>
            <div className="mb-3 space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-monk-text-soft font-mono">Today's prompt · {formatHumanDate(dateSeed)}</div>
              <label className="block font-semibold text-base leading-relaxed text-monk-text" htmlFor="whatMovedToday">
                {activePrompt}
              </label>
            </div>
            <Textarea
              id="whatMovedToday"
              value={answers.whatMovedToday ?? ""}
              placeholder="Write your honest reflection..."
              onChange={(event) => setAnswers((value) => ({ ...value, whatMovedToday: event.target.value }))}
            />
            <p className="text-[11px] text-monk-text-soft mt-3">One honest answer is enough.</p>
          </Card>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {(currentTab === "reflection" || currentTab === "morning") ? <>
        {saved ? <CalmAlert type="success" title="Saved successfully." /> : null}
        {!canSave && todayPlan ? (
          <p className="text-xs text-monk-text-soft text-center">
            {currentTab === "morning"
              ? "Write something in your morning pages before saving."
              : "Write at least one reflection before saving."}
          </p>
        ) : null}
        <PrimaryButton
          disabled={!canSave}
          onClick={() => {
            store.saveJournalEntry(answers);
            localStorage.removeItem(journalDraftKey);
            setSaved(true);
            setTimeout(() => {
              navigate(routes.today);
            }, 800);
          }}
        >
          {currentTab === "morning" ? "Save Morning Pages" : "Save Reflection"}
        </PrimaryButton>
      </> : null}
      </div>

      {/* Notebook & Packs shortcuts below save */}
      <div className="grid grid-cols-2 gap-3 pt-6 pb-8">
        <button
          type="button"
          onClick={() => navigate(routes.notebook)}
          className="rounded-monk border border-monk-border bg-monk-surface p-4 text-left transition hover:border-monk-accent"
        >
          <div className="w-6 h-6 rounded-full bg-monk-accent-soft flex items-center justify-center mb-2">
            <FileText size={14} strokeWidth={1.5} className="text-monk-accent" />
          </div>
          <span className="block text-xs font-semibold text-monk-text mb-0.5">Notebook</span>
          <span className="block text-[10px] text-monk-text-soft">Free notes</span>
        </button>
        <button
          type="button"
          onClick={() => navigate(routes.packs)}
          className="rounded-monk border border-monk-border bg-monk-surface p-4 text-left transition hover:border-monk-accent"
        >
          <div className="w-6 h-6 rounded-full bg-monk-success-soft flex items-center justify-center mb-2">
            <BookOpen size={14} strokeWidth={1.5} className="text-monk-success" />
          </div>
          <span className="block text-xs font-semibold text-monk-text mb-0.5">Packs</span>
          <span className="block text-[10px] text-monk-text-soft">Guided themes</span>
        </button>
      </div>
    </>
  );
}

function LearningScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const todayPlan = selectTodayPlan(store);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [type, setType] = useState<LearningSourceType>("book");
  const [title, setTitle] = useState("");
  const [timeMode, setTimeMode] = useState<number | "custom">(30);
  const [customMinutes, setCustomMinutes] = useState("");
  const [keyInsight, setKeyInsight] = useState("");
  const [actionTakeaway, setActionTakeaway] = useState("");
  const [goalId, setGoalId] = useState(todayPlan?.goalId || "");
  const [chapter, setChapter] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [parentId, setParentId] = useState("");
  const [linkIds, setLinkIds] = useState<string[]>([]);
  const [content, setContent] = useState("");

  const activeGoals = selectActiveGoals(store);
  const parentOptions = store.learningSessions.filter((s) => !s.parentId && s.id !== "");

  const learningSessionTypes = [
    { value: "book", label: "Book" },
    { value: "course", label: "Course" },
    { value: "podcast", label: "Podcast" },
    { value: "long_video", label: "Long Video" },
    { value: "article", label: "Article" },
    { value: "mentor", label: "Mentor" },
    { value: "other", label: "Other" }
  ] as const;

  const timePresets = [10, 15, 25, 30, 45, 60];

  const actualMinutes = timeMode === "custom" ? (Number(customMinutes) || 0) : timeMode;
  const isValid = keyInsight.trim() !== "" && actualMinutes > 0;

  return (
    <>
      <PageHeader
        title="Add learning session"
        subtitle="Track one thing you learned that supports your current focus."
      />
      <div className="space-y-5">
        <Card>
          <p className="mb-3 font-semibold text-sm">Source Type</p>
          <div className="flex flex-wrap gap-2">
            {learningSessionTypes.map((item) => (
              <ChoiceChip
                key={item.value}
                label={item.label}
                selected={type === item.value}
                onClick={() => setType(item.value)}
              />
            ))}
          </div>
        </Card>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted" htmlFor="source-title">
            Source Title
          </label>
          <TextInput
            id="source-title"
            placeholder="Atomic Habits, Coursera course, Ali Abdaal podcast…"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <Card>
          <p className="mb-3 font-semibold text-sm">Learning Time</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {timePresets.map((preset) => (
              <ChoiceChip
                key={preset}
                label={`${preset} min`}
                selected={timeMode === preset}
                onClick={() => setTimeMode(preset)}
              />
            ))}
            <ChoiceChip
              label="Custom"
              selected={timeMode === "custom"}
              onClick={() => setTimeMode("custom")}
            />
          </div>
          {timeMode === "custom" && (
            <TextInput
              inputMode="numeric"
              placeholder="How many minutes did you learn?"
              value={customMinutes}
              onChange={(event) => setCustomMinutes(event.target.value)}
            />
          )}
        </Card>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted block" htmlFor="key-insight">
            What did you learn? *
          </label>
          <Textarea
            id="key-insight"
            placeholder="Write the key lesson in your own words."
            value={keyInsight}
            onChange={(event) => setKeyInsight(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted block" htmlFor="action-takeaway">
            How can this help your goal?
          </label>
          <Textarea
            id="action-takeaway"
            placeholder="Turn this lesson into a small action or reminder."
            value={actionTakeaway}
            onChange={(event) => setActionTakeaway(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted" htmlFor="chapter">Chapter / Module</label>
          <TextInput
            id="chapter"
            placeholder="e.g. Module 2, Chapter 3"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted" htmlFor="source-url">Source URL</label>
          <TextInput
            id="source-url"
            placeholder="https://..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </div>

        {parentOptions.length > 0 && (
          <Card>
            <p className="mb-2 font-semibold text-sm">Parent Module</p>
            <p className="text-xs text-monk-muted mb-3">Attach this note to an existing module for hierarchy.</p>
            <div className="flex flex-wrap gap-2">
              <ChoiceChip label="None (top-level)" selected={!parentId} onClick={() => setParentId("")} />
              {parentOptions.map((s) => (
                <ChoiceChip
                  key={s.id}
                  label={s.sourceTitle || s.lesson?.slice(0, 30) || s.id.slice(0, 8)}
                  selected={parentId === s.id}
                  onClick={() => setParentId(s.id)}
                />
              ))}
            </div>
          </Card>
        )}

        <Card>
          <p className="mb-2 font-semibold text-sm">Link to Other Notes</p>
          <p className="text-xs text-monk-muted mb-3">Connect related ideas across your learning.</p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {store.learningSessions
              .filter((s) => !linkIds.includes(s.id))
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="text-xs rounded-full border border-monk-border px-2.5 py-1 text-monk-muted hover:border-monk-accent hover:text-monk-accent transition"
                  onClick={() => setLinkIds((prev) => [...prev, s.id])}
                >
                  + {s.sourceTitle || s.lesson?.slice(0, 25) || s.id.slice(0, 8)}
                </button>
              ))}
          </div>
          {linkIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {linkIds.map((lid) => {
                const linked = store.learningSessions.find((s) => s.id === lid);
                return (
                  <span key={lid} className="inline-flex items-center gap-1 rounded-full bg-monk-accent-soft border border-monk-accent/20 px-2 py-0.5 text-xs text-monk-accent">
                    {linked?.sourceTitle || linked?.lesson?.slice(0, 20) || lid.slice(0, 8)}
                    <button type="button" onClick={() => setLinkIds((prev) => prev.filter((id) => id !== lid))} className="hover:text-monk-danger">x</button>
                  </span>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted" htmlFor="long-content">Notes</label>
          <Textarea
            id="long-content"
            placeholder="Write your full notes here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px]"
          />
        </div>

        <Card>
          <p className="mb-3 font-semibold text-sm">Related Goal (Optional)</p>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip label="None" selected={!goalId} onClick={() => setGoalId("")} />
            {activeGoals.map((g) => (
              <ChoiceChip key={g.id} label={g.title} selected={goalId === g.id} onClick={() => setGoalId(g.id)} />
            ))}
          </div>
        </Card>

        {!keyInsight.trim() ? <CalmAlert type="warning" title="What did you learn? is required." /> : null}
        {actualMinutes <= 0 ? <CalmAlert type="warning" title="Enter a valid learning duration." /> : null}

        <PrimaryButton
          disabled={!isValid}
          onClick={() => {
            const now = nowIso();
            const session: LearningSession = {
              id: createId("learning"),
              seasonId: store.activeSeason?.id,
              relatedGoalId: goalId || null,
              sourceType: type,
              sourceTitle: title.trim() || undefined,
              startedAt: now,
              endedAt: now,
              plannedDurationMinutes: actualMinutes,
              actualDurationSeconds: actualMinutes * 60,
              lesson: keyInsight.trim(),
              actionIdea: actionTakeaway.trim() || undefined,
              parentId: parentId || undefined,
              childIds: [],
              linkedSessionIds: linkIds,
              content: content.trim() || undefined,
              chapter: chapter.trim() || undefined,
              sourceUrl: sourceUrl.trim() || undefined,
              status: "completed",
              createdAt: now,
              updatedAt: now
            };
            store.saveLearningSession(session);
            navigate(routes.today);
          }}
        >
          Save learning session
        </PrimaryButton>
      </div>
    </>
  );
}

function RelapseScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const why = store.activeSeason?.why;
  const obstacles = (store.activeSeason?.obstacles ?? []).filter(Boolean).slice(0, 4);
  const [trigger, setTrigger] = useState<"boredom" | "stress" | "fatigue" | "loneliness" | "trigger_app" | "no_clear_plan" | "other">("boredom");
  const [note, setNote] = useState("");
  const [recoveryAction, setRecoveryAction] = useState("");
  const [saved, setSaved] = useState(false);
  const triggers = [
    ["boredom", "Boredom"],
    ["stress", "Stress"],
    ["fatigue", "Fatigue"],
    ["loneliness", "Loneliness"],
    ["trigger_app", "Trigger app"],
    ["no_clear_plan", "No clear plan"],
    ["other", "Other"]
  ] as const;

  if (saved) {
    return (
      <>
        <PageHeader title="Logged. Now re-anchor." subtitle="Drift is data. Why still stands." />
        <FrictionWhy className="mb-4" />
        {why?.identity || why?.consequenceOfInaction ? null : (
          <Card className="mb-4 p-4">
            <p className="text-sm text-monk-muted">No why set yet — add one so the next drift has something to hold onto.</p>
            <SecondaryButton className="mt-3" onClick={() => navigate(routes.timeline)}>
              Add why on Timeline
            </SecondaryButton>
          </Card>
        )}
        <PrimaryButton onClick={() => navigate(routes.today)}>Back to today</PrimaryButton>
        <GhostButton className="mt-2 w-full" onClick={() => navigate(routes.focus)}>
          Start a short focus block
        </GhostButton>
      </>
    );
  }

  return (
    <>
      <PageHeader title="You drifted. Learn from it." subtitle="This is data, not a verdict." />
      <FrictionWhy className="mb-4" />
      <Card>
        <p className="mb-3 font-semibold">What pulled you away?</p>
        <div className="flex flex-wrap gap-2">
          {triggers.map(([value, label]) => (
            <ChoiceChip key={value} label={label} selected={trigger === value} onClick={() => setTrigger(value)} />
          ))}
        </div>
      </Card>
      {obstacles.length ? (
        <Card className="mt-4 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">Known obstacles</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {obstacles.map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-full border border-monk-border bg-monk-soft px-2.5 py-1 text-[11px] text-monk-text-soft transition hover:border-monk-accent hover:text-monk-accent"
                onClick={() =>
                  setRecoveryAction((prev) =>
                    prev.includes(item) ? prev : prev ? `${prev}\nHarder: ${item}` : `Make harder: ${item}`
                  )
                }
              >
                + {item}
              </button>
            ))}
          </div>
        </Card>
      ) : null}
      <div className="mt-5 space-y-4">
        <Textarea placeholder="What happened?" value={note} onChange={(event) => setNote(event.target.value)} />
        <Textarea
          placeholder="What can you make harder tomorrow?"
          value={recoveryAction}
          onChange={(event) => setRecoveryAction(event.target.value)}
        />
        <PrimaryButton
          onClick={() => {
            store.saveRelapseLog({ trigger, note, recoveryAction });
            setSaved(true);
          }}
        >
          Save Insight
        </PrimaryButton>
      </div>
    </>
  );
}

function TimelineStats() {
  const store = useMonkStore();
  const season = store.activeSeason!;

  const totalFocusMinutes = Math.round(
    store.focusSessions
      .filter((s) => ["completed", "ended_early"].includes(s.status))
      .reduce((sum, s) => sum + (s.focusDurationMinutes ?? s.durationMinutes), 0)
  );

  const totalFocusSessions = store.focusSessions.filter((s) => ["completed", "ended_early"].includes(s.status)).length;

  const totalLearningMinutes = Math.round(
    store.learningSessions
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + s.actualDurationSeconds, 0) / 60
  );

  const totalJournals = store.journalEntries.length;
  const totalRelapses = store.relapseLogs.length;

  const completedDaysCount = store.dayPlans.filter(
    (day) => day.seasonId === season.id && day.status === "completed"
  ).length;

  const totalPassedDays = Math.min(
    season.durationDays,
    getDaysPassed(season.startDate)
  );

  const consistencyRate = totalPassedDays > 0
    ? Math.round((completedDaysCount / totalPassedDays) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-monk-accent/25 bg-gradient-to-br from-monk-surface to-monk-surface/60 p-3 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-monk-border/20">
          <div className="h-full bg-monk-accent/40 transition-all" style={{ width: `${Math.min(100, totalFocusSessions * 10)}%` }} />
        </div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase font-bold text-monk-muted tracking-wider">Focus Time</p>
            <p className="text-2xl font-bold mt-0.5 text-monk-accent tabular-nums leading-none">{totalFocusMinutes}<span className="text-xs font-semibold text-monk-muted ml-0.5">m</span></p>
            <p className="text-[10px] text-monk-muted mt-0.5">{totalFocusSessions} sessions</p>
          </div>
          <div className="grid h-7 w-7 place-items-center rounded-full bg-monk-accent/10 shrink-0 mt-0.5">
            <Timer size={13} strokeWidth={1.5} className="text-monk-accent" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-monk-success/25 bg-gradient-to-br from-monk-surface to-monk-surface/60 p-3 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-monk-border/20">
          <div className="h-full bg-monk-success/40 transition-all" style={{ width: `${consistencyRate}%` }} />
        </div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase font-bold text-monk-muted tracking-wider">Consistency</p>
            <p className="text-2xl font-bold mt-0.5 text-monk-success tabular-nums leading-none">{consistencyRate}<span className="text-xs font-semibold text-monk-muted ml-0.5">%</span></p>
            <p className="text-[10px] text-monk-muted mt-0.5">{completedDaysCount}/{totalPassedDays} days</p>
          </div>
          <div className="grid h-7 w-7 place-items-center rounded-full bg-monk-success/10 shrink-0 mt-0.5">
            <Flame size={13} strokeWidth={1.5} className="text-monk-success" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-monk-accent/25 bg-gradient-to-br from-monk-surface to-monk-surface/60 p-3 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-monk-border/20">
          <div className="h-full bg-monk-accent/40 transition-all" style={{ width: `${Math.min(100, totalLearningMinutes / 2)}%` }} />
        </div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase font-bold text-monk-muted tracking-wider">Learning</p>
            <p className="text-2xl font-bold mt-0.5 text-monk-accent tabular-nums leading-none">{totalLearningMinutes}<span className="text-xs font-semibold text-monk-muted ml-0.5">m</span></p>
            <p className="text-[10px] text-monk-muted mt-0.5">{store.learningSessions.length} notes</p>
          </div>
          <div className="grid h-7 w-7 place-items-center rounded-full bg-monk-accent/10 shrink-0 mt-0.5">
            <Lightbulb size={13} strokeWidth={1.5} className="text-monk-accent" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-monk-border/40 bg-gradient-to-br from-monk-surface to-monk-surface/60 p-3 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-monk-border/20">
          <div className="h-full bg-monk-muted/30 transition-all" style={{ width: `${Math.min(100, totalJournals * 10)}%` }} />
        </div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase font-bold text-monk-muted tracking-wider">Reflections</p>
            <p className="text-2xl font-bold mt-0.5 text-monk-text tabular-nums leading-none">{totalJournals}</p>
            <p className="text-[10px] text-monk-muted mt-0.5">entries · {totalRelapses} drifts</p>
          </div>
          <div className="grid h-7 w-7 place-items-center rounded-full bg-monk-border/30 shrink-0 mt-0.5">
            <FileText size={13} strokeWidth={1.5} className="text-monk-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const store = useMonkStore();
  const focusRecord = event.type === "focus_session"
    ? event.focusSession ?? store.focusSessions.find((session) => session.id === event.sourceId)
    : undefined;
  const normalizedFocusRecord = focusRecord ? normalizeFocusSessionRecord(focusRecord) : undefined;
  const focusCompleted = normalizedFocusRecord ? resolveFocusSessionStatus(normalizedFocusRecord) === "completed" : false;
  const focusPreset = normalizedFocusRecord ? getFocusSessionPreset(normalizedFocusRecord) : undefined;
  const focusTitle = focusPreset
    ? `${FOCUS_PRESETS[focusPreset].shortLabel} ${focusCompleted ? "completed" : "ended early"}`
    : event.title;
  const displayTitle = event.type === "focus_session" && normalizedFocusRecord ? focusTitle : event.title;
  const journalRecord = event.type === "journal_entry"
    ? store.journalEntries.find((entry) => entry.id === event.sourceId)
    : undefined;
  const journalItems = journalRecord ? getJournalAnswerItems(journalRecord.answers, journalRecord.date) : [];
  const displayDescription = event.type === "focus_session" && normalizedFocusRecord
    ? formatFocusSessionTimelineDescription(normalizedFocusRecord, focusCompleted ? undefined : "saved")
    : event.type === "journal_entry" && journalItems.length > 0
      ? undefined
    : event.description;
  const icons: Record<TimelineEventType, JSX.Element> = {
    season_started: <Flag size={12} strokeWidth={1.5} className="text-monk-accent" />,
    season_completed: <Trophy size={12} strokeWidth={1.5} className="text-monk-success" />,
    goal_created: <Target size={12} strokeWidth={1.5} className="text-monk-accent" />,
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? <Flame size={12} strokeWidth={1.5} className="text-monk-warning" />
      : <Timer size={12} strokeWidth={1.5} className="text-monk-success" />,
    learning_session: <Lightbulb size={12} strokeWidth={1.5} className="text-monk-accent" />,
    journal_entry: <FileText size={12} strokeWidth={1.5} className="text-monk-muted" />
  };

  const bgClasses: Record<TimelineEventType, string> = {
    season_started: "bg-monk-accent/5 border-monk-accent/15",
    season_completed: "bg-monk-success/5 border-monk-success/15",
    goal_created: "bg-monk-accent/5 border-monk-accent/15",
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? "bg-monk-warning/5 border-monk-warning/15"
      : "bg-monk-success/5 border-monk-success/15",
    learning_session: "bg-monk-accent/5 border-monk-accent/15",
    journal_entry: "bg-monk-surface border-monk-border/20"
  };

  const typeColors: Record<TimelineEventType, string> = {
    season_started: "from-monk-accent to-transparent",
    season_completed: "from-monk-success to-transparent",
    goal_created: "from-monk-accent to-transparent",
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? "from-monk-warning to-transparent"
      : "from-monk-success to-transparent",
    learning_session: "from-monk-accent to-transparent",
    journal_entry: "from-monk-muted to-transparent"
  };

  const leftAccent: Record<TimelineEventType, string> = {
    season_started: "border-monk-accent",
    season_completed: "border-monk-success",
    goal_created: "border-monk-accent",
    focus_session: !focusCompleted && displayTitle.includes("early")
      ? "border-monk-warning"
      : "border-monk-success",
    learning_session: "border-monk-accent",
    journal_entry: "border-monk-muted"
  };

  const timeLabel = new Date(event.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`grid h-8 w-8 place-items-center rounded-full border ${bgClasses[event.type]}`}>
          {icons[event.type]}
        </div>
        <div className={`w-[2px] flex-1 bg-gradient-to-b ${typeColors[event.type]} min-h-[20px]`} />
      </div>
      <div className="flex-1 pb-4">
        <Card className={`p-3 bg-monk-surface/30 hover:bg-monk-surface/60 hover:shadow-sm transition-all border-l-2 ${leftAccent[event.type]} border-t border-r border-b border-monk-border/30`}>
          <div className="flex justify-between items-start gap-2">
            <h4 className="text-xs font-bold text-monk-text leading-tight">{displayTitle}</h4>
            <span className="text-[10px] font-mono text-monk-muted/80 shrink-0">{timeLabel}</span>
          </div>
          {displayDescription && (
            <p className="mt-1 text-xs text-monk-muted leading-relaxed whitespace-pre-line">{displayDescription}</p>
          )}
          {journalItems.length > 0 ? (
            <div className="mt-2 space-y-2">
              {journalItems.map((item) => (
                <div key={item.id}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-monk-muted/70">{item.question}</p>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-monk-text">{item.answer}</p>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function TimelineScreen() {
  const store = useMonkStore();
  const season = store.activeSeason!;
  const activeGoals = selectActiveGoals(store);
  
  const [retroDate, setRetroDate] = useState<string | null>(null);
  const [retroGoalId, setRetroGoalId] = useState<string>("");
  const [retroDayType, setRetroDayType] = useState<"goal" | "rest">("goal");

  useEffect(() => {
    if (activeGoals.length > 0 && !retroGoalId) {
      setRetroGoalId(activeGoals[0].id);
    }
  }, [activeGoals, retroGoalId]);

  const dates = useMemo(() => {
    return datesInRange(season.startDate, season.durationDays);
  }, [season.id, season.startDate, season.durationDays]);

  const chunks = useMemo(() => {
    const result: string[][] = [];
    for (let i = 0; i < dates.length; i += 7) {
      result.push(dates.slice(i, i + 7));
    }
    return result;
  }, [dates]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    store.timelineEvents.forEach((event) => {
      const date = event.occurredAt.slice(0, 10);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        events: groups[date].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      }));
  }, [store.timelineEvents]);

  return (
    <>
      <PageHeader title="Timeline" subtitle="Your path, one day at a time." rightSlot={<SettingsLink />} />
      <div className="space-y-5">
        <WhyCard />
        <SeasonProgressCard />
        <TimelineStats />
        <Card className="p-5 space-y-4">
          {(() => {
            const today = getTodayDateString();
            const todayDayNum = getDayNumber(today, season.startDate);
            const todayPlan = selectTodayPlan(store);
            const todayCompleted = todayPlan?.status === "completed";
            const DOW = ["M", "T", "W", "T", "F", "S", "S"];

            function dotStyle(date: string) {
              const status = getDailyStatusForDate(store, date);
              const isToday = date === today;
              const isCompleted = status === "completed" || (isToday && todayCompleted);
              const isPartial = status === "partial";
              const isRelapse = status === "relapse";
              const isRest = status === "rest";
              const isMissed = status === "missed";

              if (isToday) {
                if (isCompleted) return "bg-monk-success shadow-[0_0_10px_rgba(100,123,94,0.6)] ring-2 ring-monk-success/40";
                if (isPartial) return "bg-monk-accent/80 ring-2 ring-monk-accent/40";
                if (isRelapse) return "bg-monk-danger/80 ring-2 ring-monk-danger/40";
                if (isRest) return "bg-monk-rest/60 ring-2 ring-monk-rest/40";
                return "bg-monk-border-strong animate-pulse ring-2 ring-monk-accent/40";
              }
              if (isCompleted) return "bg-monk-success/75";
              if (isPartial) return "bg-monk-accent/60";
              if (isRelapse) return "bg-monk-danger/55";
              if (isRest) return "bg-monk-rest/45";
              if (isMissed) return "bg-monk-text-soft/20";
              return "bg-monk-border/40";
            }

            return (
              <div className="space-y-3">
                {/* Today status row */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">Day {todayDayNum} of {season.durationDays}</p>
                    <p className="mt-0.5 text-sm font-semibold text-monk-text">{getDailyHelperForDate(store, today)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    todayCompleted ? "bg-monk-success/20 text-monk-success border border-monk-success/30" :
                    getDailyStatusForDate(store, today) === "partial" ? "bg-monk-accent/20 text-monk-accent border border-monk-accent/30" :
                    getDailyStatusForDate(store, today) === "relapse" ? "bg-monk-danger/20 text-monk-danger border border-monk-danger/30" :
                    "bg-monk-surface text-monk-muted border border-monk-border"
                  }`}>
                    {DAILY_STATUS_LABELS[getCoreDailyStatusForDate(store, today)]}
                  </span>
                </div>
                {/* Heatmap: circles when early in season, grid when enough days */}
                {todayDayNum <= 13 ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {dates.filter((date) => date <= today).map((date) => {
                      const isToday = date === today;
                      const status = getDailyStatusForDate(store, date);
                      const dayNum = getDayNumber(date, season.startDate);
                      const isPast = date < today;
                      const diffTime = new Date(today + "T00:00:00").getTime() - new Date(date + "T00:00:00").getTime();
                      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                      const isEligible = isPast && diffDays <= 3 && ["missed", "not_started"].includes(status);

                      return (
                        <div
                          key={date}
                          role={isEligible ? "button" : undefined}
                          tabIndex={isEligible ? 0 : undefined}
                          title={`Day ${dayNum} · ${status}${isEligible ? " · Tap to log" : ""}`}
                          aria-label={`Day ${dayNum} · ${status}${isEligible ? " · Tap to log" : ""}`}
                          onClick={isEligible ? () => setRetroDate(date) : undefined}
                          onKeyDown={isEligible ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRetroDate(date); }} : undefined}
                          className={`h-6 w-6 rounded-full transition-all duration-300 ${dotStyle(date)} ${isToday ? "scale-110 ring-2 ring-monk-accent/40" : ""} ${isEligible ? "cursor-pointer hover:scale-110 hover:ring-2 hover:ring-monk-accent/40" : ""} flex items-center justify-center text-[8px] font-bold text-monk-text/60`}
                        >
                          {isToday ? dayNum : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {/* Day-of-week header */}
                    <div className="grid grid-cols-7 gap-2 px-0.5">
                      {DOW.map((d, i) => (
                        <span key={i} className="text-center text-[9px] font-bold uppercase text-monk-muted/50 tabular-nums">{d}</span>
                      ))}
                    </div>
                    {/* Heatmap rows */}
                    <div className="space-y-2">
                      {chunks.map((week, wi) => {
                        const allFuture = week.every((d) => d > today);
                        if (allFuture) return null;
                        return (
                          <div key={wi} className="grid grid-cols-7 gap-2">
                            {week.map((date) => {
                              const isFuture = date > today;
                              const isToday = date === today;
                              const status = getDailyStatusForDate(store, date);
                              const dayNum = getDayNumber(date, season.startDate);
                              const isPast = date < today;
                              const diffTime = new Date(today + "T00:00:00").getTime() - new Date(date + "T00:00:00").getTime();
                              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                              const isEligible = isPast && diffDays <= 3 && ["missed", "not_started"].includes(status);

                              return (
                                <div
                                  key={date}
                                  role={isEligible ? "button" : undefined}
                                  tabIndex={isEligible ? 0 : undefined}
                                  title={`Day ${dayNum} · ${status}${isEligible ? " · Tap to log" : ""}`}
                                  aria-label={`Day ${dayNum} · ${status}${isEligible ? " · Tap to log" : ""}`}
                                  onClick={isEligible ? () => setRetroDate(date) : undefined}
                                  onKeyDown={isEligible ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRetroDate(date); }} : undefined}
                                  className={`w-full aspect-square rounded-md transition-all duration-300 ${
                                    isFuture ? "bg-monk-border/10" : dotStyle(date)
                                  } ${isToday ? "ring-2 ring-monk-accent/50" : ""} ${isEligible ? "cursor-pointer hover:scale-105 hover:ring-2 hover:ring-monk-accent/40" : ""}`}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {/* Legend */}
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  {([["bg-monk-success/75", "Done"], ["bg-monk-accent/60", "Partial"], ["bg-monk-rest/45", "Rest"], ["bg-monk-danger/55", "Drift"], ["bg-monk-text-soft/20", "Missed"]] as const).map(([cls, label]) => (
                    <span key={label} className="flex items-center gap-1">
                      <span className={`inline-block w-2 h-2 rounded-[3px] ${cls}`} />
                      <span className="text-[9px] text-monk-muted/70">{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </Card>
        
        {/* Timeline Log Section */}
        <div className="space-y-4 pt-2">
          <SectionHeader title="Activity" />
          {groupedEvents.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Focus sessions, learning, and reflections appear here."
            />
          ) : (
            <div className="space-y-5">
              {groupedEvents.map((group) => {
                const isToday = group.date === getTodayDateString();
                const isYesterday = group.date === addDaysToDate(getTodayDateString(), -1);
                const groupTitle = isToday ? "Today" : (isYesterday ? "Yesterday" : formatHumanDate(group.date));

                return (
                  <div key={group.date} className="space-y-3">
                    <div className="sticky top-0 z-10 bg-monk-bg/90 backdrop-blur py-1.5 -mx-1 px-1 flex items-center gap-2">
                      <p className="text-xs font-bold text-monk-accent uppercase tracking-wider">{groupTitle}</p>
                      <span className="text-[10px] font-bold text-monk-muted bg-monk-surface/60 px-1.5 py-0.5 rounded-full">
                        {group.events.length}
                      </span>
                    </div>
                    <div className="space-y-0">
                      {group.events.map((event) => (
                        <TimelineEventRow key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Retroactive Logging Modal Overlay */}
      {retroDate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm p-6 bg-monk-bg border border-monk-border shadow-2xl space-y-4">
            <div>
              <p className="text-xs font-bold text-monk-accent uppercase tracking-widest">Retroactive Log</p>
              <h3 className="text-lg font-bold text-monk-text mt-1">Log for {formatHumanDate(retroDate)}</h3>
              <p className="text-xs text-monk-muted mt-1 leading-normal">
                Logged entries count toward weekly allocations and season consistency.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 min-h-10 rounded-xl border text-xs font-semibold transition active:scale-98 ${
                  retroDayType === "goal"
                    ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                    : "border-monk-border bg-monk-soft text-monk-muted"
                }`}
                onClick={() => setRetroDayType("goal")}
              >
                Focus Goal
              </button>
              <button
                type="button"
                className={`flex-1 min-h-10 rounded-xl border text-xs font-semibold transition active:scale-98 ${
                  retroDayType === "rest"
                    ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                    : "border-monk-border bg-monk-soft text-monk-muted"
                }`}
                onClick={() => setRetroDayType("rest")}
              >
                Rest Day
              </button>
            </div>

            {retroDayType === "goal" ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-monk-muted uppercase tracking-wider block">Choose theme</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {activeGoals.map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      className={`w-full p-3 rounded-xl border text-xs text-left font-semibold transition ${
                        retroGoalId === goal.id
                          ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                          : "border-monk-border bg-monk-surface hover:border-monk-border-strong text-monk-text"
                      }`}
                      onClick={() => setRetroGoalId(goal.id)}
                    >
                      {goal.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 py-3 border border-monk-border rounded-xl text-xs font-semibold text-monk-muted hover:border-monk-border-strong active:scale-98 transition"
                onClick={() => setRetroDate(null)}
              >
                Cancel
              </button>
              <PrimaryButton
                disabled={retroDayType === "goal" && !retroGoalId}
                onClick={() => {
                  store.createOrUpdateDayPlan(retroDate, {
                    dayType: retroDayType,
                    goalId: retroDayType === "goal" ? retroGoalId : undefined,
                    status: "completed"
                  });
                  setRetroDate(null);
                }}
              >
                Save Log
              </PrimaryButton>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function CalendarCell({
  date,
  dayNumber,
  status,
  active,
  helperText,
  onClick
}: {
  date: string;
  dayNumber?: number;
  status: TimelineStatus;
  active?: boolean;
  helperText?: string;
  onClick?: () => void;
}) {
  const dotColor = {
    completed: "bg-monk-success/80",
    partial: "bg-monk-accent/70",
    missed: "bg-monk-text-soft/20",
    relapse: "bg-monk-danger/60",
    rest: "bg-monk-rest/50",
    not_started: "bg-monk-border/30"
  }[status];

  const isPast = date < getTodayDateString();
  const diffTime = new Date(getTodayDateString() + "T00:00:00").getTime() - new Date(date + "T00:00:00").getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const isEligible = isPast && diffDays <= 3 && ["missed", "not_started"].includes(status);

  return (
    <div
      title={`${dayNumber ? "Day " + dayNumber + " · " : ""}${status}${active ? " (today)" : ""}`}
      onClick={isEligible ? onClick : undefined}
      className={`aspect-square flex items-center justify-center ${isEligible ? "cursor-pointer" : ""}`}
    >
      <span className={`block w-1 h-1 rounded-full transition-all duration-300 ${dotColor} ${active ? "!w-2 !h-2 !bg-monk-accent/80 shadow-[0_0_6px_rgba(164,139,94,0.4)]" : ""} ${isEligible ? "hover:!w-2 hover:!h-2" : ""}`} />
    </div>
  );
}

function TimelineLegend() {
  const items: Array<[TimelineStatus, string]> = [
    ["completed", "Completed"],
    ["partial", "Partial"],
    ["missed", "Missed"],
    ["relapse", "Relapse"],
    ["rest", "Rest"]
  ];
  return (
    <Card className="bg-monk-soft">
      <div className="flex flex-wrap gap-3">
        {items.map(([status, label]) => (
          <div key={status} className="flex items-center gap-2 text-sm text-monk-muted">
            <CalendarCell date={label} status={status} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SeasonEndScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const questions = ["What changed?", "What mattered most?", "What should continue?", "What should be released?", "What comes next?"];
  return (
    <>
      <PageHeader title="Your season has ended." subtitle="Reflect before you continue." />
      <div className="space-y-4">
        {questions.map((question) => (
          <Card key={question}>
            <label className="mb-3 block font-semibold">{question}</label>
            <Textarea value={answers[question] ?? ""} onChange={(event) => setAnswers((value) => ({ ...value, [question]: event.target.value }))} />
          </Card>
        ))}
        <PrimaryButton onClick={() => {
          store.startNewSeason();
          navigate(routes.onboardingGoals);
        }}>
          Start New Season
        </PrimaryButton>
        <SecondaryButton onClick={() => {
          store.archiveSeason();
          navigate(routes.onboardingWelcome);
        }}>
          Archive Season
        </SecondaryButton>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-monk-muted uppercase tracking-[0.2em] mb-3 px-1">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function JournalLibraryScreen() {
  const store = useMonkStore();
  const navigate = useNavigate();
  const season = store.activeSeason;
  const journalEntries = store.journalEntries.filter(e => e.seasonId === season?.id);
  const notebookEntries = store.notebookEntries;
  const packSessions = store.journalPackSessions.filter(s => s.completedAt);
  const categories = store.notebookCategories;

  const [libTab, setLibTab] = useState<"reflections" | "notebook" | "packs">("reflections");

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Unknown";

  return (
    <>
      <PageHeader
        title="Journal Library"
        subtitle={libTab === "reflections" ? `${journalEntries.length} reflections` : libTab === "notebook" ? `${notebookEntries.length} notes` : `${packSessions.length} pack sessions`}
        rightSlot={<SettingsLink />}
      />
      <div className="flex rounded-xl bg-monk-soft p-1 mb-5 border border-monk-border/40 overflow-x-auto">
        <button type="button" className={`flex-1 rounded-lg py-2 text-xs font-semibold tracking-wide transition whitespace-nowrap px-2 ${libTab === "reflections" ? "bg-monk-surface text-monk-text border border-monk-border-strong shadow-sm" : "text-monk-muted hover:text-monk-text"}`} onClick={() => setLibTab("reflections")}>Reflections</button>
        <button type="button" className={`flex-1 rounded-lg py-2 text-xs font-semibold tracking-wide transition whitespace-nowrap px-2 ${libTab === "notebook" ? "bg-monk-surface text-monk-text border border-monk-border-strong shadow-sm" : "text-monk-muted hover:text-monk-text"}`} onClick={() => setLibTab("notebook")}>Notebook</button>
        <button type="button" className={`flex-1 rounded-lg py-2 text-xs font-semibold tracking-wide transition whitespace-nowrap px-2 ${libTab === "packs" ? "bg-monk-surface text-monk-text border border-monk-border-strong shadow-sm" : "text-monk-muted hover:text-monk-text"}`} onClick={() => setLibTab("packs")}>Packs</button>
      </div>
      <div className="space-y-4 pb-8">

        {libTab === "notebook" ? (
          notebookEntries.length === 0
            ? <EmptyState title="No notebook entries" description="Write freely in the Notebook tab." />
            : [...notebookEntries]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((entry) => (
                <div key={entry.id} className="p-4 bg-monk-surface border border-monk-border/40 rounded-xl transition hover:border-monk-accent">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-monk-text truncate mr-2">{entry.title || "Untitled"}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-monk-accent bg-monk-accent-soft px-2 py-0.5 rounded-full shrink-0">{catName(entry.categoryId)}</span>
                  </div>
                  <p className="text-xs text-monk-muted mt-1 line-clamp-2">{entry.body.replace(/\n/g, " ").slice(0, 200)}</p>
                  <p className="text-xs text-monk-text-soft mt-1">{new Date(entry.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
              ))
        ) : libTab === "packs" ? (
          packSessions.length === 0
            ? <EmptyState title="No pack sessions completed" description="Complete a themed journal pack first." />
            : [...packSessions]
              .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
              .map((session) => {
                const pack = store.journalPacks.find((p) => p.id === session.packId);
                return (
                  <div key={session.id} className="p-4 bg-monk-surface border border-monk-border/40 rounded-xl transition hover:border-monk-accent">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">🧭</span>
                      <span className="text-sm font-semibold text-monk-text">{pack?.title ?? "Unknown Pack"}</span>
                    </div>
                    <p className="text-xs text-monk-muted mt-1">{session.answers.length} answers</p>
                    <p className="text-xs text-monk-text-soft mt-1">
                      {session.completedAt ? `Completed ${new Date(session.completedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                    </p>
                  </div>
                );
              })
        ) : (
          journalEntries.length === 0
            ? <EmptyState title="No entries yet" description="Morning pages and reflections appear here." />
            : [...journalEntries]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((entry) => {
                const hasMorningPages = !!entry.answers.morningPages?.trim();
                const hasReflection = !!entry.answers.whatMovedToday?.trim();
                return (
                  <button key={entry.id} className="w-full text-left p-4 bg-monk-surface hover:bg-monk-surface/40 transition border border-monk-border/40 rounded-xl hover:border-monk-accent relative"
                    onClick={() => navigate(`/journal?tab=${hasReflection ? "reflection" : "morning"}&date=${entry.date}`)}>
                    {(hasMorningPages || hasReflection) && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-monk-accent rounded-l-xl" />}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-monk-text">{formatHumanDate(entry.date)}</span>
                      <div className="flex gap-1.5">
                        {hasMorningPages ? <span className="text-xs font-bold uppercase tracking-wider text-monk-accent bg-monk-accent-soft px-2 py-0.5 rounded-full">AM</span> : null}
                        {hasReflection ? <span className="text-xs font-bold uppercase tracking-wider text-monk-success bg-monk-success-soft px-2 py-0.5 rounded-full">PM</span> : null}
                      </div>
                    </div>
                    {hasReflection ? <p className="text-xs text-monk-muted mt-1 line-clamp-2">{entry.answers.whatMovedToday}</p> : hasMorningPages ? <p className="text-xs text-monk-muted mt-1 line-clamp-2">{entry.answers.morningPages}</p> : null}
                  </button>
                );
              })
        )}
        <GhostButton className="w-full mt-4" onClick={() => navigate(routes.journal)}>
          Write new entry
        </GhostButton>
      </div>
    </>
  );
}

function NotebookPage() {
  const navigate = useNavigate();
  return (
    <div className="notebook-page-bg -mx-6 min-h-[calc(100dvh-120px)] px-6 pb-8 pt-2">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-handwriting text-[2rem] leading-none text-monk-text">Notebook</h1>
          <p className="mt-1 text-sm text-monk-muted">Jurnal bebas. Tanpa prompt.</p>
        </div>
        <div className="flex items-center gap-1 pt-1">
          <button
            type="button"
            onClick={() => navigate(routes.library)}
            className="flex min-h-10 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-monk-text-soft transition hover:text-monk-accent"
          >
            <BookOpen size={13} strokeWidth={1.5} />
            Library
          </button>
          <button
            type="button"
            onClick={() => navigate(routes.journal)}
            className="flex min-h-10 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-monk-text-soft transition hover:text-monk-accent"
          >
            <FileText size={13} strokeWidth={1.5} />
            Journal
          </button>
        </div>
      </div>
      <JournalNotebook />
    </div>
  );
}

function PacksPage() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        title="Packs"
        subtitle="Themed questions for deeper reflection"
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(routes.library)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-monk-text-soft transition hover:text-monk-accent"
            >
              <BookOpen size={12} strokeWidth={1.5} /> Library
            </button>
            <button
              type="button"
              onClick={() => navigate(routes.journal)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-monk-text-soft transition hover:text-monk-accent"
            >
              <FileText size={12} strokeWidth={1.5} /> Journal
            </button>
          </div>
        }
      />
      <JournalPacks />
    </>
  );
}

function AccountStatus() {
  const navigate = useNavigate();
  const [session, setSession] = useState<{ email?: string } | null>(null);
  const sb = typeof getSupabase === "function" ? (getSupabase as () => any)() : null;

  useEffect(() => {
    if (!sb?.auth) return;
    sb.auth.getSession().then(({ data }: any) => {
      if (data?.session) setSession({ email: data.session.user?.email });
    });
  }, []);

  const handleLogout = async () => {
    if (!sb?.auth) return;
    await sb.auth.signOut();
    setSession(null);
  };

  if (session?.email) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-monk-muted">{session.email}</span>
        <GhostButton onClick={handleLogout}>Logout</GhostButton>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-monk-muted">Not connected</span>
      <GhostButton onClick={() => navigate(routes.login)}>Connect Account</GhostButton>
    </div>
  );
}

function SettingsScreen() {
  const store = useMonkStore();
  const navigate = useNavigate();
  const [exported, setExported] = useState("");

  const downloadReminderIcs = () => {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Zendo//Daily Reflection Reminder//EN",
      "BEGIN:VEVENT",
      "UID:zendo-daily-reflection-reminder@zendo.app",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z",
      "DTSTART;TZID=Asia/Jakarta:" + new Date().getFullYear() + "0101T210000",
      "RRULE:FREQ=DAILY",
      "SUMMARY:Zendo: Time to Reflect",
      "DESCRIPTION:Open Zendo to log your daily focus reflection.",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zendo_daily_reminder.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadSeasonLogMd = () => {
    const season = store.activeSeason;
    if (!season) return;
    
    const totalFocusMinutes = store.focusSessions
      .filter((s) => ["completed", "ended_early"].includes(s.status))
      .reduce((sum, s) => sum + (s.focusDurationMinutes ?? s.durationMinutes), 0);
      
    const completedDaysCount = store.dayPlans.filter(
      (day) => day.seasonId === season.id && day.status === "completed"
    ).length;
    
    const totalPassedDays = Math.max(1, getDaysPassed(season.startDate));
    const consistencyRate = Math.min(100, Math.round((completedDaysCount / totalPassedDays) * 100));

    const lines = [
      `# Zendo Season Log`,
      `Season ID: ${season.id}`,
      `Status: ${season.status}`,
      `Start Date: ${season.startDate}`,
      `End Date: ${season.endDate}`,
      `Duration: ${season.durationDays} days`,
      `Goals completed/passed: ${completedDaysCount} days`,
      `Total focus time: ${totalFocusMinutes} minutes`,
      `Consistency rate: ${consistencyRate}%`,
      "",
      "## Focus Goals & Keystones",
      ...store.goals.map(g => `- **${g.title}**: ${g.keystoneAction}`),
      "",
      "## Daily Focus Log",
      ...store.dayPlans.map(d => {
        const goal = store.goals.find(g => g.id === d.goalId);
        return `- **${d.date}**: ${d.dayType === "rest" ? "Rest Day" : `Goal: "${goal?.title}"`} (Status: ${d.status}, Action: ${d.mainAction || "None"})`;
      }),
      "",
      "## Reflections (Journal)",
      ...store.journalEntries.map(j => {
        return [
          `### Reflection for ${j.date}`,
          `- **${getDailyJournalPromptForDate(j.date)}**: ${j.answers.whatMovedToday || "-"}`,
          j.answers.whatDistractedMe ? `- **What distracted me?**: ${j.answers.whatDistractedMe}` : "",
          j.answers.whatDidILearn ? `- **What did I learn?**: ${j.answers.whatDidILearn}` : "",
          j.answers.whatShouldBeEasierTomorrow ? `- **What should be easier tomorrow?**: ${j.answers.whatShouldBeEasierTomorrow}` : "",
          j.answers.whatShouldBeHarderTomorrow ? `- **What should be harder tomorrow?**: ${j.answers.whatShouldBeHarderTomorrow}` : ""
        ].filter(Boolean).join("\n");
      }),
      "",
      "## Learning Log",
      ...store.learningEntries.map(l => `- **${l.createdAt.slice(0,10)}** (${l.type}): ${l.title} - Insight: ${l.keyInsight || "-"}`),
      "",
      "## Relapse & Drift Logs",
      ...store.relapseLogs.map(r => `- **${r.createdAt.slice(0,10)}** (Trigger: ${r.trigger}): ${r.note} - Recovery: ${r.recoveryAction || "-"}`)
    ];
    
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zendo_season_log_${season.startDate}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Customize your experience." />
      <div className="space-y-6 pb-8">

        {/* Preferences */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted px-1 mb-2">Preferences</p>
          <Card className="divide-y divide-monk-border/40 p-0 overflow-hidden">
            <SettingsRow title="Notifications" description="Daily reflection reminder.">
              <button
                type="button"
                onClick={async () => {
                  if ("Notification" in window && Notification.permission !== "granted") {
                    await Notification.requestPermission();
                  }
                  store.updateSettings({ notificationEnabled: !store.appSettings.notificationEnabled });
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${store.appSettings.notificationEnabled ? "bg-monk-accent" : "bg-monk-border"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${store.appSettings.notificationEnabled ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
              </button>
            </SettingsRow>
            <SettingsRow title="Grey Mode Guide" description="Mark digital detox guide as read.">
              <button
                type="button"
                onClick={() => store.updateSettings({ greyModeGuideCompleted: !store.appSettings.greyModeGuideCompleted })}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${store.appSettings.greyModeGuideCompleted ? "bg-monk-accent" : "bg-monk-border"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${store.appSettings.greyModeGuideCompleted ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
              </button>
            </SettingsRow>
          </Card>
        </div>

        {/* Data & Export */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted px-1 mb-2">Data & Export</p>
          <Card className="divide-y divide-monk-border/40 p-0 overflow-hidden">
            <SettingsRow title="Calendar Reminder" description="Download .ics file — import into Google Calendar, Apple Calendar, or Outlook.">
              <GhostButton onClick={downloadReminderIcs}>Export .ics</GhostButton>
            </SettingsRow>
            <SettingsRow title="Season Log" description="Download full season history as Markdown.">
              <GhostButton onClick={downloadSeasonLogMd}>Export .md</GhostButton>
            </SettingsRow>
            <SettingsRow title="Data (JSON)" description="Export or import your full data.">
              <div className="flex gap-2 shrink-0">
                <GhostButton onClick={() => setExported(JSON.stringify({
                  userProfile: store.userProfile,
                  activeSeason: store.activeSeason,
                  goals: store.goals,
                  journalEntries: store.journalEntries,
                  dayPlans: store.dayPlans,
                  weeklyPlans: store.weeklyPlans,
                  focusSessions: store.focusSessions,
                  learningSessions: store.learningSessions,
                  learningEntries: store.learningEntries,
                  relapseLogs: store.relapseLogs,
                  energyLogs: store.energyLogs,
                  timelineEvents: store.timelineEvents,
                  appSettings: store.appSettings,
                }, null, 2))}>Export</GhostButton>
                <label className="cursor-pointer">
                  <input type="file" accept=".json" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const data = JSON.parse(ev.target?.result as string);
                        if (data.userProfile || data.activeSeason || data.goals) {
                          if (window.confirm("Import will merge with current data. Continue?")) {
                            const separateKeys = new Set(["focusSessions", "learningSessions", "timelineEvents"]);
                            const mainState: Record<string, unknown> = {};
                            Object.entries(data).forEach(([key, value]) => {
                              if (separateKeys.has(key)) {
                                localStorage.setItem(key, JSON.stringify(value));
                              } else {
                                mainState[key] = value;
                              }
                            });
                            if (Object.keys(mainState).length > 0) {
                              const existing = localStorage.getItem("monk_mode_pwa_state_v1");
                              const base = existing ? JSON.parse(existing) : {};
                              localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify({ ...base, ...mainState }));
                            }
                            setExported("✓ Imported successfully. Reload to apply.");
                          }
                        } else {
                          alert("Invalid Zendo backup file.");
                        }
                      } catch { alert("Failed to parse file."); }
                    };
                    reader.readAsText(file);
                  }} />
                  <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-monk-muted border border-monk-border rounded-full hover:border-monk-accent hover:text-monk-accent transition active:scale-95">Import</span>
                </label>
              </div>
            </SettingsRow>
          </Card>
          {exported ? <Textarea readOnly value={exported} className="font-mono text-xs mt-3" /> : null}
        </div>

        {/* Account */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted px-1 mb-2">Account</p>
          <Card className="p-0 overflow-hidden">
            <SettingsRow title="Sync" description="Connect to sync across devices. Works offline without an account.">
              <AccountStatus />
            </SettingsRow>
          </Card>
        </div>

        {/* Season */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted px-1 mb-2">Season</p>
          <Card className="p-0 overflow-hidden">
            <SettingsRow title="Archive Season" description="End current season, preserve all progress.">
              <GhostButton onClick={store.archiveSeason}>Archive</GhostButton>
            </SettingsRow>
          </Card>
        </div>

        {/* Danger Zone */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-danger/60 px-1 mb-2">Danger Zone</p>
          <Card className="border-monk-danger/20 p-0 overflow-hidden">
            <SettingsRow title="Factory Reset" description="Permanently delete all logs, goals, and history from this device.">
              <button
                type="button"
                className="shrink-0 text-xs font-bold text-monk-danger border border-monk-danger/30 hover:border-monk-danger bg-monk-danger/5 px-3 py-1.5 rounded-full transition active:scale-95"
                onClick={() => {
                  if (window.confirm("WARNING: Wiping will permanently delete all your season logs, goals, and history. Wiped data cannot be recovered. Are you sure?")) {
                    localStorage.clear();
                    window.location.href = "/";
                  }
                }}
              >
                Wipe All Data
              </button>
            </SettingsRow>
          </Card>
        </div>

        {/* About */}
        <p className="text-center text-xs text-monk-muted/50 pb-2">Zendo — a quiet space for deep focus and intentional progress.</p>
      </div>
    </>
  );
}



function LibraryScreen() {
  const store = useMonkStore();
  const navigate = useNavigate();
  const [subview, setSubview] = useState<"journal" | "learning" | "history" | null>(null);
  const [activeTab, setActiveTab] = useState<"focus" | "drifts">("focus");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReflections = useMemo(() => {
    return store.journalEntries.filter((j) => {
      const q = searchQuery.toLowerCase();
      return (
        j.date.toLowerCase().includes(q) ||
        (j.answers.whatMovedToday || "").toLowerCase().includes(q) ||
        (j.answers.whatDistractedMe || "").toLowerCase().includes(q) ||
        (j.answers.whatDidILearn || "").toLowerCase().includes(q)
      );
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [store.journalEntries, searchQuery]);

  const filteredFocus = useMemo(() => {
    return store.focusSessions.filter((s) => {
      if (!["completed", "ended_early"].includes(s.status)) return false;
      const q = searchQuery.toLowerCase();
      const goal = store.goals.find((g) => g.id === s.goalId);
      return (
        (goal?.title || "").toLowerCase().includes(q) ||
        (s.note || "").toLowerCase().includes(q) ||
        s.startTime.includes(q)
      );
    }).sort((a, b) => b.startTime.localeCompare(a.startTime));
  }, [store.focusSessions, store.goals, searchQuery]);

  const filteredLearning = useMemo(() => {
    return store.learningSessions.filter((l) => {
      const q = searchQuery.toLowerCase();
      const goal = store.goals.find((g) => g.id === l.relatedGoalId);
      return (
        (l.sourceTitle || "").toLowerCase().includes(q) ||
        (l.lesson || "").toLowerCase().includes(q) ||
        (l.actionIdea || "").toLowerCase().includes(q) ||
        (goal?.title || "").toLowerCase().includes(q)
      );
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [store.learningSessions, store.goals, searchQuery]);

  const filteredDrifts = useMemo(() => {
    return store.relapseLogs.filter((r) => {
      const q = searchQuery.toLowerCase();
      return (
        r.trigger.toLowerCase().includes(q) ||
        (r.note || "").toLowerCase().includes(q) ||
        (r.recoveryAction || "").toLowerCase().includes(q)
      );
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [store.relapseLogs, searchQuery]);

  if (subview === "journal") {
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => { setSubview(null); setSearchQuery(""); }}
            className="grid h-10 w-10 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-monk-text">Journal</h1>
            <p className="text-xs text-monk-muted">Reflect on your season, progress, blockers, and thoughts.</p>
          </div>
        </div>

        <div className="space-y-4">
          <PrimaryButton onClick={() => navigate(routes.journal)}>
            Write journal
          </PrimaryButton>

          <TextInput
            placeholder="Search reflections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="space-y-3 pt-2">
            {filteredReflections.length === 0 ? (
              <EmptyState
                title="Your journal is still empty."
                description="Write your first reflection to understand what's really happening in your season."
              />
            ) : (
              filteredReflections.map((j) => (
                <Card key={j.id} className="p-4 bg-monk-surface/30">
                  <div className="border-b border-monk-border/50 pb-3 mb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-monk-accent">{formatHumanDate(j.date)}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-monk-muted">
                          {getDailyHelperForDate(store, j.date)}
                        </p>
                      </div>
                      <span className="rounded-full border border-monk-border bg-monk-soft px-2 py-1 text-xs font-bold uppercase tracking-wider text-monk-muted">
                        {DAILY_STATUS_LABELS[resolveDailyActivityStatus({
                          focusSessions: getDailyActivity(store, j.date).focusSessions,
                          learningSessions: getDailyActivity(store, j.date).learningSessions.length > 0
                            ? getDailyActivity(store, j.date).learningSessions
                            : getDailyActivity(store, j.date).legacyLearningEntries.map((entry) => ({ id: entry.id }))
                        })]}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-monk-border bg-monk-bg p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-monk-muted">Focus</p>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-monk-text">{getFocusSummaryForDate(store, j.date)}</p>
                      </div>
                      <div className="rounded-xl border border-monk-border bg-monk-bg p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-monk-muted">Learning</p>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-monk-text">{getLearningSummaryForDate(store, j.date)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {getJournalAnswerItems(j.answers, j.date).map((item) => (
                        <div key={item.id}>
                          <span className="block text-xs font-bold uppercase tracking-wider text-monk-muted">{item.question}</span>
                          <p className="mt-0.5 text-xs font-medium leading-relaxed text-monk-text">{item.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </>
    );
  }

  if (subview === "learning") {
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => { setSubview(null); setSearchQuery(""); }}
            className="grid h-10 w-10 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-monk-text">Learning Companion</h1>
            <p className="text-xs text-monk-muted">Capture what you learn, then connect it to your current goals.</p>
          </div>
        </div>

        <div className="space-y-4">
          <PrimaryButton onClick={() => navigate(routes.learn)}>
            Add learning
          </PrimaryButton>

          <TextInput
            placeholder="Search learning notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="space-y-3 pt-2">
            {filteredLearning.length === 0 ? (
              <EmptyState
                title="No learning notes yet."
                description="Add one lesson from a book, course, podcast, or video that can support your season."
              />
            ) : (
              filteredLearning.map((l) => {
                const goal = store.goals.find((g) => g.id === l.relatedGoalId);
                const durationMinutes = Math.round(l.actualDurationSeconds / 60);
                const parent = l.parentId ? store.learningSessions.find((s) => s.id === l.parentId) : null;
                const linked = l.linkedSessionIds?.map((lid) => store.learningSessions.find((s) => s.id === lid)).filter(Boolean) ?? [];
                return (
                  <Card key={l.id} className="p-4 bg-monk-surface/30">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-xs font-bold text-monk-accent">{formatHumanDate(l.startedAt.slice(0, 10))}</p>
                        <p className="text-sm font-semibold text-monk-text mt-0.5">{l.sourceTitle || "Untitled Note"}</p>
                        {l.chapter && <p className="text-xs text-monk-muted mt-0.5">{l.chapter}</p>}
                      </div>
                      <span className="text-xs font-bold text-monk-success bg-monk-success-soft border border-monk-success/30 px-2 py-0.5 rounded-full shrink-0">
                        {durationMinutes} mins
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-xs uppercase font-bold text-monk-accent bg-monk-accent-soft px-2 py-0.5 rounded border border-monk-accent/20">
                        {l.sourceType.replace("_", " ")}
                      </span>
                      {goal && <span className="text-xs text-monk-muted bg-monk-soft px-2 py-0.5 rounded border border-monk-border">{goal.title}</span>}
                      {parent && <span className="text-xs text-monk-text-soft bg-monk-soft px-2 py-0.5 rounded border border-monk-border">under: {parent.sourceTitle || parent.lesson?.slice(0, 20) || parent.id.slice(0, 8)}</span>}
                    </div>
                    {l.lesson && (
                      <div className="mt-3 bg-monk-soft/50 rounded-xl p-3 border border-monk-border/30">
                        <span className="text-xs font-bold text-monk-muted uppercase tracking-wider block">Lesson</span>
                        <p className="text-xs leading-relaxed text-monk-text mt-0.5">"{l.lesson}"</p>
                      </div>
                    )}
                    {l.content && (
                      <div className="mt-3 bg-monk-bg/60 rounded-xl p-3 border border-monk-border/30">
                        <span className="text-xs font-bold text-monk-muted uppercase tracking-wider block">Notes</span>
                        <p className="text-xs leading-6 text-monk-text whitespace-pre-wrap mt-0.5">{l.content}</p>
                      </div>
                    )}
                    {l.actionIdea && (
                      <div className="mt-3 bg-monk-accent-soft/30 rounded-xl p-3 border border-monk-accent/15">
                        <span className="text-xs font-bold text-monk-accent uppercase tracking-wider block">Action</span>
                        <p className="text-xs leading-relaxed text-monk-text-soft mt-0.5">{l.actionIdea}</p>
                      </div>
                    )}
                    {linked.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {linked.filter(Boolean).map((lnk: any) => (
                          <span key={lnk?.id} className="text-xs text-monk-accent bg-monk-accent-soft px-2 py-0.5 rounded-full border border-monk-accent/20">
                            linked: {lnk?.sourceTitle || lnk?.lesson?.slice(0, 20) || lnk?.id?.slice(0, 8)}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </>
    );
  }

  if (subview === "history") {
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => { setSubview(null); setSearchQuery(""); }}
            className="grid h-10 w-10 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-monk-text">History & Logs</h1>
            <p className="text-xs text-monk-muted">Past focus sessions and drifts.</p>
          </div>
        </div>

        <div className="space-y-4">
          <TextInput
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="flex gap-2">
            {[
              { id: "focus", label: `Focus Sessions (${filteredFocus.length})` },
              { id: "drifts", label: `Drift Logs (${filteredDrifts.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`flex-1 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                  activeTab === tab.id
                    ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                    : "border-monk-border bg-monk-surface text-monk-muted"
                }`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            {activeTab === "focus" && (
              filteredFocus.length === 0 ? (
                <EmptyState title="No focus sessions found" description="Complete a focus session to see it here." />
              ) : (
                filteredFocus.map((s) => {
                  const goal = store.goals.find((g) => g.id === s.goalId);
                  return (
                    <Card key={s.id} className="p-4 bg-monk-surface/30 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-monk-accent">{formatHumanDate(s.startTime.slice(0, 10))}</p>
                        <p className="text-sm font-semibold mt-1">{goal?.title || "Focus Session"}</p>
                        <p className="text-xs text-monk-muted mt-0.5 uppercase tracking-wider font-bold">
                          {FOCUS_PRESETS[s.preset ?? s.timerMode ?? "deep_work"].shortLabel}
                          {s.status === "ended_early" ? " · Ended early" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-monk-success">{s.focusDurationMinutes ?? s.durationMinutes}m</p>
                        <p className="text-xs text-monk-muted">{s.breakDurationMinutes ?? 0}m break</p>
                      </div>
                    </Card>
                  );
                })
              )
            )}

            {activeTab === "drifts" && (
              filteredDrifts.length === 0 ? (
                <EmptyState title="No drift logs found" description="You are fully on course." />
              ) : (
                filteredDrifts.map((r) => (
                  <Card key={r.id} className="p-4 bg-monk-surface/30 border-monk-danger/20">
                    <div className="border-b border-monk-border/50 pb-2 mb-2">
                      <p className="text-xs font-bold text-monk-danger">{formatHumanDate(r.createdAt.slice(0, 10))}</p>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-bold text-monk-muted uppercase tracking-wider block">Trigger</span>
                        <p className="text-xs font-semibold leading-relaxed text-monk-danger mt-0.5 uppercase tracking-wider">{r.trigger.replace("_", " ")}</p>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-monk-muted uppercase tracking-wider block">Notes</span>
                        <p className="text-xs text-monk-text mt-0.5 leading-relaxed">{r.note || "-"}</p>
                      </div>
                      {r.recoveryAction && (
                        <div className="bg-monk-soft/30 rounded-xl p-2.5 border border-monk-border/40 mt-1">
                          <span className="text-xs font-bold text-monk-muted uppercase tracking-wider block">Recovery plan</span>
                          <p className="text-xs text-monk-text-soft mt-0.5 leading-normal">{r.recoveryAction}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Library" subtitle="Your second brain." rightSlot={<SettingsLink />} />
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setSubview("journal")}
          className="w-full text-left transition active:scale-[0.99]"
        >
          <Card className="p-5 border border-monk-border/60 bg-monk-surface/20 hover:bg-monk-surface/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-monk-accent/5 border border-monk-accent/15 text-monk-accent">
                <FileText size={18} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-monk-text">Reflections</p>
                  <span className="text-xs font-bold text-monk-muted bg-monk-soft/80 px-2 py-0.5 rounded-full">
                    {store.journalEntries.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-monk-muted leading-relaxed">
                  Daily reflections, morning pages, and what moved.
                </p>
              </div>
            </div>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => setSubview("learning")}
          className="w-full text-left transition active:scale-[0.99]"
        >
          <Card className="p-5 border border-monk-border/60 bg-monk-surface/20 hover:bg-monk-surface/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-monk-accent/5 border border-monk-accent/15 text-monk-accent">
                <BookOpen size={18} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-monk-text">Learning Notes</p>
                  <span className="text-xs font-bold text-monk-muted bg-monk-soft/80 px-2 py-0.5 rounded-full">
                    {store.learningSessions.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-monk-muted leading-relaxed">
                  Lessons, modules, and connected ideas.
                </p>
              </div>
            </div>
          </Card>
        </button>

        {/* Collapsible History Section */}
        <button
          type="button"
          onClick={() => setSubview("history")}
          className="w-full text-left transition active:scale-[0.99] mt-2"
        >
          <Card className="p-4 border border-monk-border bg-monk-surface/40 hover:bg-monk-surface transition-colors">
            <div className="flex items-center justify-between gap-3 text-monk-muted">
              <div className="flex items-center gap-3">
                <History size={16} />
                <span className="text-sm font-semibold">History & Logs</span>
              </div>
              <span className="text-xs text-monk-text-soft">
                {store.focusSessions.filter(s => ["completed", "ended_early"].includes(s.status)).length} focus · {store.relapseLogs.length} drifts
              </span>
            </div>
          </Card>
        </button>
      </div>
    </>
  );
}

function SettingsItem({ title, description, children }: { title: string; description?: string; children: JSX.Element }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">{title}</p>
          {description ? <p className="mt-1 text-sm leading-6 text-monk-muted">{description}</p> : null}
        </div>
        {children}
      </div>
    </Card>
  );
}

function SettingsRow({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-monk-text">{title}</p>
        {description ? <p className="text-xs text-monk-muted mt-0.5 leading-4">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
