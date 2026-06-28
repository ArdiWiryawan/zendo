import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Circle,
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
  Lightbulb
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
import { onboardingOrder, routes } from "../constants/routes";
import {
  addDaysToDate,
  datesInRange,
  formatHumanDate,
  getDaysLeft,
  getDaysPassed,
  getSeasonDayLabel,
  getSeasonProgress,
  getTodayDateString,
  nowIso
} from "../lib/date";
import { createId } from "../lib/ids";
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
import { selectActiveGoals, selectCurrentWeeklyPlan, selectTodayPlan, selectJournalEntryForToday } from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import type { EnergyLevel, JournalAnswers, LearningType, SeasonDurationPreset, TimelineStatus, LearningSourceType, LearningSession, TimelineEvent, TimelineEventType } from "../types/app";
import { playZenBell } from "../lib/audio";

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
  "Apa satu hal terpenting yang harus saya selesaikan hari ini?",
  "Apa yang bisa membuat hari ini gagal, dan bagaimana saya mencegahnya?",
  "Apa satu tindakan kecil yang akan membuat saya bangga malam nanti?",
  "Apa distraksi utama saya hari ini?",
  "Apa yang perlu saya ingat saat motivasi saya turun?",
  "Hari ini saya ingin menjadi orang yang seperti apa?",
  "Apa bukti kecil bahwa saya bergerak maju hari ini?"
];

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
  const startBreakSession = useMonkStore((state) => state.startBreakSession);

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
    const targetSeconds = activeSession.timerMode === "pomodoro"
      ? (activeSession.timerState === "break" ? 5 * 60 : 25 * 60)
      : 50 * 60;

    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);

      if (elapsed >= targetSeconds) {
        if (activeSession.timerMode === "pomodoro" && activeSession.timerState === "work") {
          startBreakSession(activeSession.id);
          playZenBell();
          if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
        } else {
          completeFocusSession(activeSession.id, true);
          playZenBell();
          if ("vibrate" in navigator) navigator.vibrate(300);
        }
      } else {
        tickFocusSession(activeSession.id, Math.max(0, elapsed));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession?.id, activeSession?.status, activeSession?.startTime, activeSession?.timerState, activeSession?.timerMode, tickFocusSession, completeFocusSession, startBreakSession]);

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
      <Route path={routes.journal} element={<ProtectedMain><JournalScreen /></ProtectedMain>} />
      <Route path={routes.focus} element={<ProtectedMain><FocusScreen /></ProtectedMain>} />
      <Route path={routes.learn} element={<ProtectedMain><LearningScreen /></ProtectedMain>} />
      <Route path={routes.relapse} element={<ProtectedMain><RelapseScreen /></ProtectedMain>} />
      <Route path={routes.seasonEnd} element={<ProtectedMain allowEnded><SeasonEndScreen /></ProtectedMain>} />
      <Route path={routes.settings} element={<ProtectedMain><SettingsScreen /></ProtectedMain>} />
      <Route path={routes.library} element={<ProtectedMain><LibraryScreen /></ProtectedMain>} />
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

function OnboardingScreen({ path }: { path: string }) {
  const navigate = useNavigate();
  const store = useMonkStore();
  const stepIndex = Math.max(0, onboardingOrder.findIndex((item) => item === path));
  const currentStep = stepIndex + 1;
  const totalSteps = onboardingOrder.length;
  const next = onboardingOrder[Math.min(stepIndex + 1, onboardingOrder.length - 1)];
  const goNext = () => {
    store.setOnboardingStep(next);
    navigate(next);
  };

  if (path === routes.onboardingWelcome) {
    return (
      <OnboardingShell>
        <div className="flex flex-1 flex-col justify-center">
          <div className="mx-auto mb-10 grid h-16 w-16 place-items-center rounded-full border border-monk-border-strong bg-monk-soft text-monk-accent">
            <Circle size={24} strokeWidth={1.5} />
          </div>
          <h1 className="text-center text-[40px] font-bold leading-[48px] tracking-normal">
            Make space for what matters.
          </h1>
          <p className="mx-auto mt-5 max-w-[300px] text-center text-base leading-6 text-monk-muted">
            Zendo helps you choose fewer goals and move with intention.
          </p>
        </div>
        <PrimaryButton onClick={goNext}>Begin</PrimaryButton>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell currentStep={currentStep} totalSteps={totalSteps}>
      {path === routes.onboardingHabits ? <HabitAudit onNext={goNext} /> : null}
      {path === routes.onboardingRemove ? <RemoveDistractions onNext={goNext} /> : null}
      {path === routes.onboardingGreyMode ? <GreyMode onNext={goNext} /> : null}
      {path === routes.onboardingGoals ? <GoalBrainDump onNext={goNext} /> : null}
      {path === routes.onboardingEliminate ? <GoalElimination onNext={goNext} /> : null}
      {path === routes.onboardingFocusGoals ? <FocusGoals onNext={goNext} /> : null}
      {path === routes.onboardingSeason ? <SeasonSetup onNext={goNext} /> : null}
      {path === routes.onboardingNarrow ? <NarrowGoals onNext={goNext} /> : null}
      {path === routes.onboardingKeystone ? <KeystoneSetup onNext={goNext} /> : null}
      {path === routes.onboardingWeekSetup ? <WeekSetup /> : null}
    </OnboardingShell>
  );
}

function ScreenIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 mt-8">
      <h1 className="text-[28px] font-semibold leading-9 tracking-normal">{title}</h1>
      <p className="mt-3 text-base leading-6 text-monk-muted">{subtitle}</p>
    </div>
  );
}

function HabitAudit({ onNext }: { onNext: () => void }) {
  const { onboarding, toggleHabit } = useMonkStore();
  const result = validateHabitAudit(onboarding.selectedHabits.length);
  return (
    <>
      <ScreenIntro title="What usually pulls you away?" subtitle="Notice the patterns that make focus harder." />
      <div className="flex flex-wrap gap-3">
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
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
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
        {!completed ? <CalmAlert type="warning" title="Check one friction action before continuing." /> : null}
        <PrimaryButton disabled={!completed} onClick={onNext}>I made it harder</PrimaryButton>
      </div>
    </>
  );
}

function GreyMode({ onNext }: { onNext: () => void }) {
  const { onboarding, updateOnboarding } = useMonkStore();
  return (
    <>
      <ScreenIntro title="Reduce stimulation. Increase awareness." subtitle="Grey mode makes impulsive scrolling less attractive." />
      <Card important>
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-monk-soft">
          <EyeOff size={22} strokeWidth={1.5} />
        </div>
        <p className="font-semibold">Manual guide</p>
        <p className="mt-2 text-sm leading-6 text-monk-muted">
          Open phone accessibility settings, find color filters or grayscale, then turn it on.
        </p>
      </Card>
      <div className="mt-auto space-y-3 pt-8">
        <PrimaryButton
          onClick={() => {
            updateOnboarding({ greyModeConfirmed: true });
            onNext();
          }}
        >
          Grey mode activated
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
                className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted"
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
      {preset === "custom" ? (
        <div className="mt-4">
          <TextInput
            inputMode="numeric"
            placeholder="Custom days"
            value={custom}
            onChange={(event) => {
              setCustom(event.target.value);
              const value = Number(event.target.value);
              if (value >= 7) setSeasonDuration(value);
            }}
          />
          <p className="mt-2 text-xs text-monk-muted">Choose how many days this season should last.</p>
        </div>
      ) : null}
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
              className={`flex min-h-[64px] w-full items-center justify-between rounded-monk border p-4 text-left transition ${
                isSelected
                  ? "border-monk-accent bg-monk-accent-soft text-monk-text animate-pulse-once"
                  : "border-monk-border bg-monk-surface text-monk-muted"
              }`}
            >
              <span className={isSelected ? "font-semibold" : ""}>{goal.title}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isSelected
                  ? "bg-monk-accent/15 text-monk-accent"
                  : "bg-monk-soft text-monk-text-soft"
              }`}>
                {isSelected ? "Keep this" : "Not now"}
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
  const { onboarding, setKeystoneAction } = useMonkStore();
  const goals = onboarding.goalDrafts.filter((goal) => onboarding.selectedFocusGoalIds.includes(goal.id));
  const result = validateKeystoneActions(onboarding.selectedFocusGoalIds, onboarding.keystoneActions);

  const placeholders = [
    "Study for 25 minutes",
    "Write 300 words",
    "Record one practice video",
    "Walk for 20 minutes",
    "Read 10 pages",
    "Practice one lesson"
  ];

  return (
    <>
      <ScreenIntro
        title="What action moves each goal forward?"
        subtitle="Choose one simple repeatable action for each goal. This is the action you'll return to during the season."
      />
      <div className="space-y-4">
        {goals.map((goal, index) => {
          const placeholder = placeholders[index % placeholders.length];
          return (
            <Card key={goal.id}>
              <p className="mb-3 font-semibold text-monk-text">{goal.title}</p>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-monk-muted block" htmlFor={`keystone-${goal.id}`}>
                  Main action
                </label>
                <TextInput
                  id={`keystone-${goal.id}`}
                  placeholder={placeholder}
                  value={onboarding.keystoneActions[goal.id] ?? ""}
                  onChange={(event) => setKeystoneAction(goal.id, event.target.value)}
                />
                <p className="text-xs text-monk-text-soft">
                  Write the smallest repeatable action that proves this goal is moving.
                </p>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        <p className="text-center text-xs text-monk-muted">Each goal needs one main action.</p>
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
  return (
    <>
      <ScreenIntro title="Shape your quiet week." subtitle="Six focus days. One rest day. Every goal touched at least once." />
      <div className="space-y-3">
        {goals.map((goal) => {
          const allocation = onboarding.weeklyAllocations.find((item) => item.goalId === goal.id);
          return (
            <Card key={goal.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{goal.title}</p>
                  <p className="mt-1 text-sm text-monk-muted">{allocation?.targetCount ?? 1} / 6 focus days</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Decrease"
                    className="grid h-10 w-10 place-items-center rounded-full border border-monk-border"
                    onClick={() => setWeeklyAllocation(goal.id, (allocation?.targetCount ?? 1) - 1)}
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    aria-label="Increase"
                    className="grid h-10 w-10 place-items-center rounded-full border border-monk-border"
                    onClick={() => setWeeklyAllocation(goal.id, (allocation?.targetCount ?? 1) + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
        <Card className="bg-monk-soft">
          <p className="font-semibold">Rest</p>
          <p className="mt-1 text-sm text-monk-muted">1 / 7 days. Rest is part of the path.</p>
        </Card>
      </div>
      <div className="mt-auto space-y-3 pt-8">
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
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

  return (
    <Card className="p-4">
      <p className="font-semibold text-sm mb-3">Weekly Rhythm</p>
      <div className="space-y-3">
        {weeklyPlan.goalAllocations.map((allocation) => {
          const goal = goals.find((item) => item.id === allocation.goalId);
          const touched = allocation.completedCount >= 1;
          return (
            <div key={allocation.goalId} className="flex items-center justify-between text-xs border-b border-monk-border pb-2 last:border-0 last:pb-0">
              <span className="text-monk-muted font-medium">{goal?.title}</span>
              <span className={`px-2 py-0.5 rounded-full font-semibold border ${
                touched
                  ? "bg-monk-success-soft border-monk-success text-monk-success"
                  : "bg-monk-warning-soft border-monk-warning text-monk-warning"
              }`}>
                {touched ? "Touched" : "Needs focus"}
              </span>
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
  const todayPlan = selectTodayPlan(store);
  const activeGoals = selectActiveGoals(store);
  const [selectedMode, setSelectedMode] = useState<"deep_work" | "pomodoro">("deep_work");

  const activeSession = store.focusSessions.find(
    (session) => session.dayPlanId === todayPlan?.id && ["running", "paused"].includes(session.status)
  );

  const todayEntry = store.journalEntries.find(
    (entry) => entry.seasonId === season.id && entry.date === getTodayDateString()
  );
  const hasJournal = !!todayEntry;

  const [editingAction, setEditingAction] = useState(false);
  const [actionInput, setActionInput] = useState("");

  useEffect(() => {
    if (todayPlan?.mainAction) {
      setActionInput(todayPlan.mainAction);
    }
  }, [todayPlan?.mainAction]);

  const progress = {
    daysLeft: getDaysLeft(season.endDate),
    progressPercent: getSeasonProgress(season)
  };

  useEffect(() => {
    store.getOrCreateCurrentWeeklyPlan();
  }, []);

  const goal = todayPlan?.goalId ? store.goals.find((item) => item.id === todayPlan.goalId) : undefined;

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={`${getSeasonDayLabel(season)} · ${progress.daysLeft} days left`}
        rightSlot={<SettingsLink />}
      />
      <div className="space-y-5">
        {!todayPlan ? (
          <>
            <SeasonProgressCard />
            <FlowPickToday goals={activeGoals} />
            <WeeklyStatusIndicators />
          </>
        ) : (
          <>
            <Card important className="relative overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-monk-muted uppercase tracking-widest">
                    {todayPlan.dayType === "rest" ? "Rest Day" : "Today's Focus"}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold leading-8">
                    {todayPlan.dayType === "rest" ? "Quiet recovery" : goal?.title}
                  </h2>
                  <p className="mt-1 text-xs text-monk-muted">Stay with one thing.</p>
                </div>
                <button
                  type="button"
                  aria-label="Toggle completion"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${
                    todayPlan.status === "completed"
                      ? "border-monk-success bg-monk-success text-monk-bg"
                      : "border-monk-border bg-monk-surface hover:border-monk-success text-monk-success"
                  }`}
                  onClick={() => {
                    const willBeCompleted = todayPlan.status !== "completed";
                    if (willBeCompleted) playZenBell();
                    store.toggleTodayCompletion();
                  }}
                >
                  {todayPlan.status === "completed" ? (
                    <Check size={18} strokeWidth={2.5} />
                  ) : null}
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-monk-border bg-monk-bg p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-monk-text-soft">One action</p>
                  {!editingAction && todayPlan.dayType === "goal" && todayPlan.status !== "completed" ? (
                    <button
                      type="button"
                      className="text-[10px] font-bold text-monk-accent hover:underline"
                      onClick={() => {
                        setActionInput(todayPlan.mainAction || "");
                        setEditingAction(true);
                      }}
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
                
                {editingAction ? (
                  <div className="mt-2 space-y-2">
                    <TextInput
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                      placeholder="What action will you take today?"
                      autoFocus
                    />
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
                            store.createOrUpdateDayPlan(getTodayDateString(), {
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
                ) : (
                  <p className="mt-1.5 text-sm font-semibold leading-5">
                    {todayPlan.dayType === "rest"
                      ? "Recharge without leaving your direction."
                      : todayPlan.mainAction}
                  </p>
                )}
              </div>

              {todayPlan.status !== "completed" ? (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-monk-text-soft hover:text-monk-accent hover:underline"
                    onClick={() => store.clearDayPlan(getTodayDateString())}
                  >
                    Reset today's focus
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-xs font-semibold text-monk-success flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-monk-success inline-block"></span>
                  Today moved. Keep this space quiet.
                </p>
              )}
            </Card>
            <SeasonProgressCard compact />
            {todayPlan.dayType === "goal" ? (
              <>
                {todayPlan.status !== "completed" ? (
                  activeSession ? (
                    // Active Focus Timer Card
                    (() => {
                      const targetSeconds = activeSession.timerMode === "pomodoro"
                        ? (activeSession.timerState === "break" ? 5 * 60 : 25 * 60)
                        : 50 * 60;
                      const remaining = Math.max(0, targetSeconds - (activeSession.elapsedSeconds || 0));
                      const minsStr = Math.floor(remaining / 60).toString().padStart(2, "0");
                      const secsStr = (remaining % 60).toString().padStart(2, "0");
                      
                      return (
                        <Card important className="text-center bg-monk-soft border-monk-border-strong relative p-6">
                          <p className="text-[10px] font-bold text-monk-accent uppercase tracking-widest">
                            {activeSession.timerState === "break" 
                              ? "Quiet Break" 
                              : (activeSession.timerMode === "pomodoro" ? "Pomodoro Focus" : "Deep Work Focus")}
                          </p>
                          
                          <div className="my-6 flex items-center justify-center">
                            <div className="relative h-32 w-32 rounded-full border-2 border-monk-border flex flex-col items-center justify-center bg-monk-bg shadow-inner">
                              <p className="font-mono text-3xl font-bold leading-none text-monk-text">{minsStr}:{secsStr}</p>
                              {activeSession.timerMode === "pomodoro" ? (
                                <p className="text-[9px] uppercase font-bold text-monk-muted mt-1.5 tracking-wider">
                                  {activeSession.timerState === "break" ? "Break" : "Work"}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          
                          <p className="text-xs text-monk-muted mb-6 leading-relaxed px-4">
                            {activeSession.timerState === "break"
                              ? "Rest your eyes. Breathe deeply."
                              : todayPlan.mainAction || "Stay with one thing."}
                          </p>
                          
                          <div className="flex gap-2">
                            {activeSession.status === "running" ? (
                              <SecondaryButton onClick={() => store.pauseFocusSession(activeSession.id)} className="flex-1">
                                Pause
                              </SecondaryButton>
                            ) : (
                              <PrimaryButton onClick={() => store.resumeFocusSession(activeSession.id)} className="flex-1">
                                Resume
                              </PrimaryButton>
                            )}
                            <button
                              type="button"
                              className="px-4 py-2 border border-monk-border rounded-xl text-xs font-semibold text-monk-danger hover:border-monk-danger active:scale-95 transition"
                              onClick={() => store.abandonFocusSession(activeSession.id)}
                            >
                              End Focus
                            </button>
                            {activeSession.timerState === "work" ? (
                              <button
                                type="button"
                                className="px-4 py-2 border border-monk-border rounded-xl text-xs font-semibold text-monk-accent hover:border-monk-accent active:scale-95 transition"
                                onClick={() => {
                                  playZenBell();
                                  store.completeFocusSession(activeSession.id, true);
                                }}
                              >
                                Done
                              </button>
                            ) : null}
                          </div>
                          
                          <div className="mt-4">
                            <button
                              type="button"
                              className="text-[10px] font-bold text-monk-muted hover:text-monk-accent flex items-center justify-center gap-1 mx-auto"
                              onClick={() => navigate(routes.focus)}
                            >
                              Enter Distraction-Free Mode →
                            </button>
                          </div>
                        </Card>
                      );
                    })()
                  ) : (
                    // Focus Mode Picker
                    <Card className="bg-monk-surface border-monk-border p-5">
                      <p className="font-bold text-sm">Focus Session</p>
                      <p className="mt-1 text-xs text-monk-muted mb-4">Work on one action that moves your goal forward.</p>
                      <div className="flex gap-2 mb-4">
                        <button
                          type="button"
                          className={`flex-1 min-h-10 rounded-xl border text-xs font-semibold transition active:scale-98 ${
                            selectedMode === "deep_work"
                              ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                              : "border-monk-border bg-monk-soft text-monk-muted hover:border-monk-border-strong"
                          }`}
                          onClick={() => setSelectedMode("deep_work")}
                        >
                          Deep Work (50m)
                        </button>
                        <button
                          type="button"
                          className={`flex-1 min-h-10 rounded-xl border text-xs font-semibold transition active:scale-98 ${
                            selectedMode === "pomodoro"
                              ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                              : "border-monk-border bg-monk-soft text-monk-muted hover:border-monk-border-strong"
                          }`}
                          onClick={() => setSelectedMode("pomodoro")}
                        >
                          Pomodoro (25m)
                        </button>
                      </div>
                      <PrimaryButton onClick={() => store.startFocusSession(selectedMode)}>
                        Start focus
                      </PrimaryButton>
                    </Card>
                  )
                ) : (
                  <div className="space-y-3">
                    {hasJournal ? (
                      <div className="rounded-2xl border border-monk-success bg-monk-success-soft px-4 py-2.5 text-xs text-monk-success text-center font-medium">
                        ✓ Reflection logged for today.
                      </div>
                    ) : null}
                    <PrimaryButton onClick={() => navigate(routes.journal)}>
                      {hasJournal ? "Edit Reflection" : "Reflect Today"}
                    </PrimaryButton>
                  </div>
                )}
                <div className="h-6" aria-hidden="true" />
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <BookOpen size={16} strokeWidth={1.5} className="text-monk-accent" />
                    <p className="font-semibold text-sm">Learning</p>
                  </div>
                  <p className="text-xs leading-5 text-monk-muted">Add one thing you learned that supports today's focus.</p>
                  <GhostButton className="mt-3 px-0 min-h-8" onClick={() => navigate(routes.learn)}>Add learning</GhostButton>
                </Card>
                <EnergyCheck value={todayPlan.energyLevel} onChange={store.updateTodayEnergy} />
              </>
            ) : (
              <div className="space-y-3">
                {hasJournal ? (
                  <div className="rounded-2xl border border-monk-success bg-monk-success-soft px-4 py-2.5 text-xs text-monk-success text-center font-medium">
                    ✓ Reflection logged for today.
                  </div>
                ) : null}
                <SecondaryButton onClick={() => navigate(routes.journal)}>
                  {hasJournal ? "Edit Reflection" : "Reflect Today"}
                </SecondaryButton>
              </div>
            )}
            <WeeklyStatusIndicators />
            <PlanTomorrow goals={activeGoals} />
            <GhostButton className="w-full" onClick={() => navigate(routes.journal + "?expand=relapse")}>
              Log drift gently
            </GhostButton>
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
        <p className="font-semibold">{activeSeason.name}</p>
        <p className="font-mono text-xs text-monk-accent">{daysLeft}d left</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-monk-border">
        <div className="h-2 rounded-full bg-monk-accent" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-sm text-monk-muted">
        {daysPassed} days passed · {daysLeft} days left · Ends {formatHumanDate(activeSeason.endDate)}
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

function FlowPickToday({ goals }: { goals: ReturnType<typeof selectActiveGoals> }) {
  const store = useMonkStore();
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const restUsed = store.dayPlans.some(
    (day) => day.weeklyPlanId === weeklyPlan?.id && day.dayType === "rest" && day.status !== "missed"
  );
  if (!weeklyPlan) return <EmptyState title="Shape this week." description="Six focus days. One rest day." />;

  return (
    <Card important>
      <p className="font-semibold">Choose what deserves today.</p>
      <p className="mt-2 text-sm leading-6 text-monk-muted">One theme is enough.</p>
      <div className="mt-5 space-y-3">
        {weeklyPlan.goalAllocations.map((allocation) => {
          const goal = goals.find((item) => item.id === allocation.goalId);
          const remaining = Math.max(0, allocation.targetCount - allocation.completedCount);
          return (
            <ChoiceCard
              key={allocation.goalId}
              title={goal?.title ?? "Focus goal"}
              description={`${remaining} days remaining this week`}
              selected={false}
              onClick={() => store.createOrUpdateDayPlan(getTodayDateString(), { dayType: "goal", goalId: allocation.goalId })}
            />
          );
        })}
        {!restUsed ? (
          <ChoiceCard
            title="Rest"
            description="Rest is part of the path."
            selected={false}
            onClick={() => store.createOrUpdateDayPlan(getTodayDateString(), { dayType: "rest" })}
          />
        ) : null}
      </div>
    </Card>
  );
}

function EnergyCheck({ value, onChange }: { value?: EnergyLevel; onChange: (value: EnergyLevel) => void }) {
  return (
    <Card className="p-4">
      <p className="mb-3 font-semibold">Energy Check</p>
      <div className="flex gap-2">
        {(["low", "medium", "high"] as EnergyLevel[]).map((level) => (
          <ChoiceChip
            key={level}
            label={level[0].toUpperCase() + level.slice(1)}
            selected={value === level}
            onClick={() => onChange(level)}
          />
        ))}
      </div>
    </Card>
  );
}

function WeekScreen() {
  const store = useMonkStore();
  const weeklyPlan = selectCurrentWeeklyPlan(store);
  const goals = selectActiveGoals(store);
  useEffect(() => {
    store.getOrCreateCurrentWeeklyPlan();
  }, []);
  const weekDates = useMemo(() => {
    return weeklyPlan ? datesInRange(weeklyPlan.startDate, 7) : [];
  }, [weeklyPlan?.startDate]);

  return (
    <>
      <PageHeader title={`Week ${weeklyPlan?.weekNumber ?? 1}`} subtitle="Six focus days. One rest day." rightSlot={<SettingsLink />} />
      <div className="space-y-5">
        {weeklyPlan ? (
          <Card className="p-4 bg-monk-surface/40 border-monk-border/60">
            <p className="font-semibold text-[10px] uppercase tracking-wider mb-3 text-monk-text-soft">Weekly Schedule</p>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {weekDates.map((date: string) => {
                const dayPlan = store.dayPlans.find((d) => d.date === date);
                const weekday = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
                const dayNum = date.slice(8);
                
                let symbol = "·";
                let colorClass = "text-monk-muted bg-monk-surface border-monk-border";
                if (dayPlan) {
                  if (dayPlan.status === "completed") {
                    if (dayPlan.dayType === "rest") {
                      symbol = "☾";
                      colorClass = "bg-monk-rest-soft border-monk-rest text-monk-rest font-bold";
                    } else {
                      symbol = "✓";
                      colorClass = "bg-monk-success-soft border-monk-success text-monk-success font-bold";
                    }
                  } else if (dayPlan.status === "missed") {
                    symbol = "−";
                    colorClass = "bg-monk-soft border-monk-border text-monk-text-soft";
                  } else {
                    symbol = dayPlan.dayType === "rest" ? "☾" : "○";
                    colorClass = dayPlan.dayType === "rest" ? "border-monk-rest/50 text-monk-rest bg-monk-bg" : "border-monk-border text-monk-muted bg-monk-bg";
                  }
                }

                return (
                  <div key={date} className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-monk-text-soft uppercase">{weekday[0]}</span>
                    <div className={`h-8 w-8 rounded-xl border flex items-center justify-center text-xs select-none ${colorClass}`} title={date}>
                      {symbol}
                    </div>
                    <span className="text-[8px] font-mono text-monk-muted">{dayNum}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        <SectionHeader title="This week's rhythm" />
        {weeklyPlan?.goalAllocations.map((allocation) => {
          const goal = goals.find((item) => item.id === allocation.goalId);
          const touched = allocation.completedCount >= 1;
          return (
            <Card key={allocation.goalId}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-base">{goal?.title}</p>
                  <p className="mt-1 text-xs text-monk-muted">
                    {allocation.completedCount} / {allocation.targetCount} days completed
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${
                  touched 
                    ? "bg-monk-success-soft border-monk-success text-monk-success" 
                    : "bg-monk-warning-soft border-monk-warning text-monk-warning"
                }`}>
                  {touched ? "Touched this week" : "Needs focus"}
                </span>
              </div>
            </Card>
          );
        })}
        <Card className="bg-monk-soft border-monk-border">
          <p className="font-semibold text-sm">Rest</p>
          <p className="mt-1 text-xs text-monk-muted">Keep one day for rest. Rest is part of the path.</p>
        </Card>
      </div>
    </>
  );
}


function FocusScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const plan = selectTodayPlan(store);
  const goal = plan?.goalId ? store.goals.find((item) => item.id === plan.goalId) : undefined;
  
  const activeSession = store.focusSessions.find(
    (session) => session.dayPlanId === plan?.id && ["running", "paused"].includes(session.status)
  );

  const [selectedMode, setSelectedMode] = useState<"deep_work" | "pomodoro">("deep_work");

  if (!plan) {
    return (
      <>
        <PageHeader title="Focus" subtitle="Choose today first." />
        <EmptyState title="Choose what deserves today." description="One theme is enough." />
        <PrimaryButton className="mt-5" onClick={() => navigate(routes.today)}>Pick Today</PrimaryButton>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Stay with one thing." subtitle={goal?.title ?? "Quiet recovery"} />
      
      {activeSession ? (
        (() => {
          const targetSeconds = activeSession.timerMode === "pomodoro"
            ? (activeSession.timerState === "break" ? 5 * 60 : 25 * 60)
            : 50 * 60;
          const remaining = Math.max(0, targetSeconds - (activeSession.elapsedSeconds || 0));
          const minsStr = Math.floor(remaining / 60).toString().padStart(2, "0");
          const secsStr = (remaining % 60).toString().padStart(2, "0");

          return (
            <div className="space-y-6">
              <Card important className="text-center p-8 bg-monk-soft border-monk-border-strong relative">
                <p className="text-[10px] font-bold text-monk-accent uppercase tracking-widest">
                  {activeSession.timerState === "break" 
                    ? "Quiet Break" 
                    : (activeSession.timerMode === "pomodoro" ? "Pomodoro Focus" : "Deep Work Focus")}
                </p>
                
                <div className="my-10 flex items-center justify-center">
                  <div className="relative h-44 w-44 rounded-full border-2 border-monk-border flex flex-col items-center justify-center bg-monk-bg shadow-inner">
                    <p className="font-mono text-5xl font-bold leading-none text-monk-text">{minsStr}:{secsStr}</p>
                    {activeSession.timerMode === "pomodoro" ? (
                      <p className="text-[10px] uppercase font-bold text-monk-muted mt-2.5 tracking-wider">
                        {activeSession.timerState === "break" ? "Break" : "Work"}
                      </p>
                    ) : null}
                  </div>
                </div>

                <p className="text-sm leading-6 text-monk-muted max-w-xs mx-auto mb-4 font-medium">
                  {activeSession.timerState === "break"
                    ? "Take a moment to breathe. Relax your attention."
                    : plan.mainAction || "No switching. No noise. Just this."}
                </p>
              </Card>

              <div className="space-y-3">
                {activeSession.status === "running" ? (
                  <SecondaryButton onClick={() => store.pauseFocusSession(activeSession.id)}>
                    Pause
                  </SecondaryButton>
                ) : (
                  <PrimaryButton onClick={() => store.resumeFocusSession(activeSession.id)}>
                    Resume Focus
                  </PrimaryButton>
                )}
                
                {activeSession.timerState === "work" ? (
                  <PrimaryButton
                    onClick={() => {
                      playZenBell();
                      store.completeFocusSession(activeSession.id, true);
                      navigate(routes.today);
                    }}
                  >
                    Complete Today's Focus
                  </PrimaryButton>
                ) : null}

                <GhostButton
                  className="w-full text-monk-danger border-monk-border"
                  onClick={() => {
                    store.abandonFocusSession(activeSession.id);
                    navigate(routes.today);
                  }}
                >
                  End Focus Session
                </GhostButton>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="space-y-5">
          <Card className="bg-monk-surface border-monk-border p-5">
            <p className="font-bold text-sm">Focus Strategy</p>
            <p className="mt-1 text-xs text-monk-muted mb-4">Choose how you want to move today.</p>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                className={`flex-1 min-h-12 rounded-xl border text-xs font-semibold transition active:scale-98 ${
                  selectedMode === "deep_work"
                    ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                    : "border-monk-border bg-monk-soft text-monk-muted hover:border-monk-border-strong"
                }`}
                onClick={() => setSelectedMode("deep_work")}
              >
                Deep Work (50m)
              </button>
              <button
                type="button"
                className={`flex-1 min-h-12 rounded-xl border text-xs font-semibold transition active:scale-98 ${
                  selectedMode === "pomodoro"
                    ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                    : "border-monk-border bg-monk-soft text-monk-muted hover:border-monk-border-strong"
                }`}
                onClick={() => setSelectedMode("pomodoro")}
              >
                Pomodoro (25m)
              </button>
            </div>
            <PrimaryButton onClick={() => store.startFocusSession(selectedMode)}>
              Start Focus Session
            </PrimaryButton>
          </Card>
        </div>
      )}
    </>
  );
}

function JournalScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();

  const todayPlan = selectTodayPlan(store);
  const todayEntry = selectJournalEntryForToday(store);

  const initial = useMemo(() => {
    const draft = localStorage.getItem(JOURNAL_DRAFT_KEY);
    return draft ? (JSON.parse(draft) as JournalAnswers) : todayEntry?.answers ?? {};
  }, [todayEntry?.id]);

  const [answers, setAnswers] = useState<JournalAnswers>(initial);
  const [saved, setSaved] = useState(false);
  const result = validateJournalEntry(answers as Record<string, string | undefined>);

  useEffect(() => {
    localStorage.setItem(JOURNAL_DRAFT_KEY, JSON.stringify(answers));
  }, [answers]);

  const dateSeed = todayPlan ? todayPlan.date : getTodayDateString();
  const promptIndex = useMemo(() => {
    const sum = dateSeed.split("-").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Math.abs(sum) % promptsDailyJournal.length;
  }, [dateSeed]);
  
  const activePrompt = promptsDailyJournal[promptIndex];

  return (
    <>
      <PageHeader title="Journal" subtitle="Close the day with one honest note." rightSlot={<SettingsLink />} />
      {!todayPlan ? <CalmAlert type="warning" title="Pick today's focus before saving reflection." /> : null}
      
      <div className="mt-5 space-y-4">
        {/* Main Required Question */}
        <Card>
          <label className="mb-3 block font-semibold text-sm leading-relaxed text-monk-text" htmlFor="whatMovedToday">
            {activePrompt}
          </label>
          <Textarea
            id="whatMovedToday"
            value={answers.whatMovedToday ?? ""}
            placeholder="Write your honest reflection..."
            onChange={(event) => setAnswers((value) => ({ ...value, whatMovedToday: event.target.value }))}
          />
        </Card>
      </div>

      <div className="mt-6 space-y-3">
        {saved ? <CalmAlert type="success" title="Reflection saved." /> : null}
        {!result.valid ? <CalmAlert type="warning" title={result.message!} /> : null}
        <PrimaryButton
          disabled={!todayPlan || !result.valid}
          onClick={() => {
            store.saveJournalEntry(answers);
            localStorage.removeItem(JOURNAL_DRAFT_KEY);
            setSaved(true);
            setTimeout(() => {
              navigate(routes.today);
            }, 800);
          }}
        >
          Save Reflection
        </PrimaryButton>
      </div>
    </>
  );
}

function LearningScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const todayPlan = selectTodayPlan(store);

  const [type, setType] = useState<LearningSourceType>("book");
  const [title, setTitle] = useState("");
  const [timeMode, setTimeMode] = useState<number | "custom">(30);
  const [customMinutes, setCustomMinutes] = useState("");
  const [keyInsight, setKeyInsight] = useState("");
  const [actionTakeaway, setActionTakeaway] = useState("");
  const [goalId, setGoalId] = useState(todayPlan?.goalId || "");

  const activeGoals = selectActiveGoals(store);

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

        <Card>
          <p className="mb-3 font-semibold text-sm">Related Goal (Optional)</p>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip
              label="None"
              selected={!goalId}
              onClick={() => setGoalId("")}
            />
            {activeGoals.map((g) => (
              <ChoiceChip
                key={g.id}
                label={g.title}
                selected={goalId === g.id}
                onClick={() => setGoalId(g.id)}
              />
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
  const [trigger, setTrigger] = useState<"boredom" | "stress" | "fatigue" | "loneliness" | "trigger_app" | "no_clear_plan" | "other">("boredom");
  const [note, setNote] = useState("");
  const [recoveryAction, setRecoveryAction] = useState("");
  const triggers = [
    ["boredom", "Boredom"],
    ["stress", "Stress"],
    ["fatigue", "Fatigue"],
    ["loneliness", "Loneliness"],
    ["trigger_app", "Trigger app"],
    ["no_clear_plan", "No clear plan"],
    ["other", "Other"]
  ] as const;
  return (
    <>
      <PageHeader title="You drifted. Learn from it." subtitle="This is data, not a verdict." />
      <Card>
        <p className="mb-3 font-semibold">What pulled you away?</p>
        <div className="flex flex-wrap gap-2">
          {triggers.map(([value, label]) => (
            <ChoiceChip key={value} label={label} selected={trigger === value} onClick={() => setTrigger(value)} />
          ))}
        </div>
      </Card>
      <div className="mt-5 space-y-4">
        <Textarea placeholder="What happened?" value={note} onChange={(event) => setNote(event.target.value)} />
        <Textarea placeholder="What can you make harder tomorrow?" value={recoveryAction} onChange={(event) => setRecoveryAction(event.target.value)} />
        <PrimaryButton
          onClick={() => {
            store.saveRelapseLog({ trigger, note, recoveryAction });
            navigate(routes.today);
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
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + (s.actualDurationSeconds ?? (s.durationMinutes * 60)), 0) / 60
  );
    
  const totalFocusSessions = store.focusSessions.filter((s) => s.status === "completed").length;
  
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
    <Card className="grid grid-cols-2 gap-4">
      <div className="border-r border-monk-border pr-2">
        <p className="text-[10px] uppercase font-bold text-monk-text-soft tracking-wider">Focus Time</p>
        <p className="text-xl font-bold mt-1 text-monk-accent">{totalFocusMinutes} <span className="text-xs font-semibold text-monk-muted">mins</span></p>
        <p className="text-[10px] text-monk-muted mt-0.5">{totalFocusSessions} sessions</p>
      </div>
      <div className="pl-2">
        <p className="text-[10px] uppercase font-bold text-monk-text-soft tracking-wider">Consistency</p>
        <p className="text-xl font-bold mt-1 text-monk-success">{consistencyRate}%</p>
        <p className="text-[10px] text-monk-muted mt-0.5">{completedDaysCount} of {totalPassedDays} days done</p>
      </div>
      <div className="border-r border-monk-border pr-2 pt-2 border-t">
        <p className="text-[10px] uppercase font-bold text-monk-text-soft tracking-wider">Learning</p>
        <p className="text-base font-semibold mt-1 text-monk-text">{totalLearningMinutes} mins</p>
        <p className="text-[10px] text-monk-muted mt-0.5">{store.learningSessions.length} notes</p>
      </div>
      <div className="pl-2 pt-2 border-t">
        <p className="text-[10px] uppercase font-bold text-monk-text-soft tracking-wider">Reflections</p>
        <p className="text-base font-semibold mt-1 text-monk-text">{totalJournals} days</p>
        <p className="text-[10px] text-monk-muted mt-0.5">{totalRelapses} drifts logged</p>
      </div>
    </Card>
  );
}

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const store = useMonkStore();
  const icons: Record<TimelineEventType, JSX.Element> = {
    season_started: <Flag size={14} className="text-monk-accent" />,
    season_completed: <Trophy size={14} className="text-monk-success" />,
    goal_created: <Target size={14} className="text-monk-accent" />,
    focus_session: event.title.includes("early") 
      ? <Flame size={14} className="text-monk-warning" /> 
      : <Timer size={14} className="text-monk-success" />,
    learning_session: <Lightbulb size={14} className="text-monk-accent" />,
    journal_entry: <FileText size={14} className="text-monk-muted" />
  };

  const bgClasses: Record<TimelineEventType, string> = {
    season_started: "bg-monk-accent-soft border-monk-accent/20",
    season_completed: "bg-monk-success-soft border-monk-success/20",
    goal_created: "bg-monk-accent-soft border-monk-accent/20",
    focus_session: event.title.includes("early") 
      ? "bg-monk-warning-soft border-monk-warning/20" 
      : "bg-monk-success-soft border-monk-success/20",
    learning_session: "bg-monk-accent-soft border-monk-accent/20",
    journal_entry: "bg-monk-soft border-monk-border/30"
  };

  const timeLabel = new Date(event.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`grid h-8 w-8 place-items-center rounded-full border ${bgClasses[event.type]}`}>
          {icons[event.type]}
        </div>
        <div className="w-[1.5px] flex-1 bg-monk-border/40 min-h-[20px]" />
      </div>
      <div className="flex-1 pb-4">
        <Card className="p-3 bg-monk-surface/40 hover:bg-monk-surface transition-colors border border-monk-border/40">
          <div className="flex justify-between items-start gap-2">
            <h4 className="text-xs font-bold text-monk-text leading-tight">{event.title}</h4>
            <span className="text-[9px] font-bold text-monk-muted font-mono shrink-0">{timeLabel}</span>
          </div>
          {event.description && (
            <p className="mt-1 text-xs text-monk-muted leading-relaxed whitespace-pre-line">{event.description}</p>
          )}
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
    return Array.from({ length: season.durationDays }, (_, index) => {
      const date = new Date(`${season.startDate}T00:00:00`);
      date.setDate(date.getDate() + index);
      return date.toISOString().slice(0, 10);
    });
  }, [season.id]);

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
        <SeasonProgressCard />
        <TimelineStats />
        <Card className="p-4 space-y-3">
          <p className="text-[10px] font-bold text-monk-muted uppercase tracking-widest border-b border-monk-border pb-2">Weekly Progress Rows</p>
          <div className="space-y-2">
            {chunks.map((weekDates, weekIdx) => {
              const completedInWeek = weekDates.filter(date => {
                const dayPlan = store.dayPlans.find(dp => dp.date === date);
                return dayPlan?.status === "completed";
              }).length;
              const rate = Math.round((completedInWeek / 7) * 100);
              
              return (
                <div key={weekIdx} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold text-monk-text-soft w-6 shrink-0 text-center">W{weekIdx + 1}</span>
                  <div className="flex-1 grid grid-cols-7 gap-1">
                    {weekDates.map((date) => {
                       const status = store.timelineDays.find((day) => day.date === date)?.status ?? statusForDate(date);
                      return (
                        <CalendarCell
                          key={date}
                          date={date}
                          status={status}
                          active={date === getTodayDateString()}
                          onClick={() => {
                            setRetroDate(date);
                          }}
                        />
                      );
                    })}
                  </div>
                  <span className={`text-[10px] font-bold font-mono w-8 shrink-0 text-right ${
                    rate >= 80 ? "text-monk-success" : (rate >= 40 ? "text-monk-accent" : "text-monk-muted")
                  }`}>{rate}%</span>
                </div>
              );
            })}
          </div>
        </Card>
        <TimelineLegend />
        
        {/* Timeline Log Section */}
        <div className="space-y-4 pt-2">
          <SectionHeader title="Activity Feed" />
          {groupedEvents.length === 0 ? (
            <Card className="text-center p-6 text-monk-muted text-xs">
              No events logged in the timeline yet. Complete focus sessions, add learning sessions, or log reflections to build your timeline.
            </Card>
          ) : (
            <div className="space-y-4">
              {groupedEvents.map((group) => {
                const isToday = group.date === getTodayDateString();
                const isYesterday = group.date === new Date(Date.now() - 86400000).toISOString().slice(0, 10);
                const groupTitle = isToday ? "Today" : (isYesterday ? "Yesterday" : formatHumanDate(group.date));
                
                return (
                  <div key={group.date} className="space-y-3">
                    <p className="text-[10px] font-bold text-monk-accent uppercase tracking-wider pl-1">{groupTitle}</p>
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
              <p className="text-[10px] font-bold text-monk-accent uppercase tracking-widest">Retroactive Log</p>
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
                <label className="text-[10px] font-bold text-monk-muted uppercase tracking-wider block">Choose theme</label>
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

function statusForDate(date: string): TimelineStatus {
  if (date < getTodayDateString()) return "missed";
  return "not_started";
}

function CalendarCell({ 
  date, 
  status, 
  active,
  onClick 
}: { 
  date: string; 
  status: TimelineStatus; 
  active?: boolean;
  onClick?: () => void;
}) {
  const classes: Record<TimelineStatus, string> = {
    not_started: "bg-monk-surface border-monk-border",
    completed: "bg-monk-success-soft border-monk-success text-monk-success",
    partial: "bg-monk-accent-soft border-monk-accent text-monk-accent",
    missed: "bg-monk-soft border-monk-border text-monk-text-soft",
    relapse: "bg-monk-warning-soft border-monk-warning text-monk-warning",
    rest: "bg-monk-rest-soft border-monk-rest text-monk-rest"
  };

  const symbols: Record<TimelineStatus, string> = {
    not_started: "",
    completed: "✓",
    partial: "•",
    missed: "−",
    relapse: "!",
    rest: "☾"
  };

  const isPast = date < getTodayDateString();
  const diffTime = new Date(getTodayDateString() + "T00:00:00").getTime() - new Date(date + "T00:00:00").getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const isEligible = isPast && diffDays <= 3 && ["missed", "not_started"].includes(status);

  return (
    <div 
      title={date} 
      onClick={isEligible ? onClick : undefined}
      className={`aspect-square rounded-xl border flex items-center justify-center font-bold text-xs select-none ${classes[status]} ${
        active ? "ring-2 ring-monk-accent" : ""
      } ${isEligible ? "cursor-pointer hover:ring-2 hover:ring-monk-accent-soft transition" : ""}`}
    >
      {symbols[status]}
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

function SettingsScreen() {
  const store = useMonkStore();
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
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + s.durationMinutes, 0);
      
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
          `- **What moved today?**: ${j.answers.whatMovedToday || "-"}`,
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
      <PageHeader title="Settings" subtitle="Minimal controls." />
      <div className="space-y-4">
        <SettingsItem title="Calendar Integration" description="Subscribe to a daily reminder in Google/Apple Calendar.">
          <GhostButton onClick={downloadReminderIcs}>Export .ics</GhostButton>
        </SettingsItem>
        <SettingsItem title="Data Backup (.md)" description="Save your entire season history locally as a Markdown file.">
          <GhostButton onClick={downloadSeasonLogMd}>Export Markdown</GhostButton>
        </SettingsItem>
        <SettingsItem title="Notifications" description="Zendo can remind you gently without adding noise.">
          <ChoiceChip
            label={store.appSettings.notificationEnabled ? "Enabled" : "Enable"}
            selected={store.appSettings.notificationEnabled}
            onClick={async () => {
              if ("Notification" in window && Notification.permission !== "granted") {
                await Notification.requestPermission();
              }
              store.updateSettings({ notificationEnabled: !store.appSettings.notificationEnabled });
            }}
          />
        </SettingsItem>
        <SettingsItem title="Grey Mode Guide" description="Store manual confirmation.">
          <ChoiceChip
            label={store.appSettings.greyModeGuideCompleted ? "Done" : "Mark Done"}
            selected={store.appSettings.greyModeGuideCompleted}
            onClick={() => store.updateSettings({ greyModeGuideCompleted: !store.appSettings.greyModeGuideCompleted })}
          />
        </SettingsItem>
        <SettingsItem title="Data (JSON)" description="Raw export of your browser local storage.">
          <GhostButton onClick={() => setExported(JSON.stringify({
            userProfile: store.userProfile,
            activeSeason: store.activeSeason,
            goals: store.goals,
            journalEntries: store.journalEntries
          }, null, 2))}>Export JSON</GhostButton>
        </SettingsItem>
        <SettingsItem title="Reset Season" description="Archive current season, keep progress.">
          <GhostButton onClick={store.archiveSeason}>Archive</GhostButton>
        </SettingsItem>
        <SettingsItem title="Factory Reset" description="Permanently delete all Zendo logs, goals, and history from this device. Wipes storage.">
          <button
            type="button"
            className="text-xs font-bold text-monk-danger border border-monk-danger/30 hover:border-monk-danger bg-monk-danger-soft px-3 py-1.5 rounded-xl transition active:scale-95"
            onClick={() => {
              if (window.confirm("WARNING: Wiping will permanently delete all your season logs, goals, and history. Wiped data cannot be recovered. Are you sure?")) {
                localStorage.clear();
                window.location.href = "/";
              }
            }}
          >
            Wipe All Data
          </button>
        </SettingsItem>
        <Card className="bg-monk-soft">
          <p className="font-semibold">About</p>
          <p className="mt-2 text-sm leading-6 text-monk-muted">Zendo is a quiet digital temple for deep focus and intentional progress.</p>
        </Card>
        {exported ? <Textarea readOnly value={exported} className="font-mono text-xs" /> : null}
        <Link to={routes.today} className="flex min-h-[60px] items-center justify-center rounded-[24px] bg-monk-accent px-6 text-[17px] font-bold text-monk-bg">
          Return to Today
        </Link>
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
      if (s.status !== "completed") return false;
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
                  <div className="border-b border-monk-border/50 pb-2 mb-2">
                    <p className="text-xs font-bold text-monk-accent">{formatHumanDate(j.date)}</p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-bold text-monk-muted uppercase tracking-wider block">Moved today</span>
                      <p className="text-xs font-semibold leading-relaxed mt-0.5 text-monk-text">{j.answers.whatMovedToday}</p>
                    </div>
                    {j.answers.whatShouldBeEasierTomorrow && (
                      <div>
                        <span className="text-[10px] font-bold text-monk-muted uppercase tracking-wider block">Easier tomorrow</span>
                        <p className="text-xs text-monk-text-soft mt-0.5">{j.answers.whatShouldBeEasierTomorrow}</p>
                      </div>
                    )}
                    {j.answers.whatShouldBeHarderTomorrow && (
                      <div>
                        <span className="text-[10px] font-bold text-monk-muted uppercase tracking-wider block">Harder tomorrow</span>
                        <p className="text-xs text-monk-text-soft mt-0.5">{j.answers.whatShouldBeHarderTomorrow}</p>
                      </div>
                    )}
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
                return (
                  <Card key={l.id} className="p-4 bg-monk-surface/30">
                    <div className="flex justify-between items-start gap-2 border-b border-monk-border/50 pb-2 mb-2">
                      <div>
                        <p className="text-xs font-bold text-monk-accent">{formatHumanDate(l.startedAt.slice(0, 10))}</p>
                        {goal && (
                          <span className="text-[10px] text-monk-muted uppercase tracking-wider font-semibold block mt-0.5">
                            Goal: {goal.title}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-monk-success bg-monk-success-soft border border-monk-success/30 px-2 py-0.5 rounded-full">
                        {durationMinutes} mins
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] uppercase font-bold text-monk-accent bg-monk-accent-soft px-2 py-0.5 rounded border border-monk-accent/20">
                        {l.sourceType.replace("_", " ")}
                      </span>
                      <p className="text-sm font-semibold text-monk-text">{l.sourceTitle || "External Source"}</p>
                    </div>
                    {l.lesson && (
                      <div className="mt-2 bg-monk-soft/50 rounded-xl p-3 border border-monk-border/30">
                        <span className="text-[9px] font-bold text-monk-muted uppercase tracking-wider block">What did you learn?</span>
                        <p className="text-xs leading-relaxed text-monk-text mt-0.5">“{l.lesson}”</p>
                      </div>
                    )}
                    {l.actionIdea && (
                      <div className="mt-2 bg-monk-accent-soft/30 rounded-xl p-3 border border-monk-accent/15">
                        <span className="text-[9px] font-bold text-monk-accent uppercase tracking-wider block">How can this help?</span>
                        <p className="text-xs leading-relaxed text-monk-text-soft mt-0.5">{l.actionIdea}</p>
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
                        <p className="text-[10px] text-monk-muted mt-0.5 uppercase tracking-wider font-bold">
                          {s.timerMode === "pomodoro" ? "Pomodoro" : "Deep Work"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-monk-success">{s.durationMinutes}m</p>
                        <p className="text-[10px] text-monk-muted">Duration</p>
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
                        <span className="text-[10px] font-bold text-monk-muted uppercase tracking-wider block">Trigger</span>
                        <p className="text-xs font-semibold leading-relaxed text-monk-danger mt-0.5 uppercase tracking-wider">{r.trigger.replace("_", " ")}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-monk-muted uppercase tracking-wider block">Notes</span>
                        <p className="text-xs text-monk-text mt-0.5 leading-relaxed">{r.note || "-"}</p>
                      </div>
                      {r.recoveryAction && (
                        <div className="bg-monk-soft/30 rounded-xl p-2.5 border border-monk-border/40 mt-1">
                          <span className="text-[9px] font-bold text-monk-muted uppercase tracking-wider block">Recovery plan</span>
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
      <PageHeader title="Library" subtitle="Your reflections, lessons, and saved ideas." rightSlot={<SettingsLink />} />
      <div className="space-y-4">
        {/* Hub Navigation Cards */}
        <button
          type="button"
          onClick={() => setSubview("journal")}
          className="w-full text-left transition active:scale-[0.99]"
        >
          <Card className="p-5 hover:border-monk-accent/50 border border-monk-border transition-colors">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-monk-accent-soft border border-monk-accent/20 text-monk-accent">
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-base text-monk-text">Journal</p>
                  <span className="text-[11px] font-bold text-monk-muted bg-monk-soft px-2 py-0.5 rounded-full">
                    {store.journalEntries.length} entries
                  </span>
                </div>
                <p className="mt-1 text-sm text-monk-muted leading-relaxed">
                  Reflect on your season, progress, blockers, and thoughts.
                </p>
                <div className="mt-3 text-xs font-semibold text-monk-accent">Open →</div>
              </div>
            </div>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => setSubview("learning")}
          className="w-full text-left transition active:scale-[0.99]"
        >
          <Card className="p-5 hover:border-monk-accent/50 border border-monk-border transition-colors">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-monk-accent-soft border border-monk-accent/20 text-monk-accent">
                <BookOpen size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-base text-monk-text">Learning Companion</p>
                  <span className="text-[11px] font-bold text-monk-muted bg-monk-soft px-2 py-0.5 rounded-full">
                    {store.learningSessions.length} notes
                  </span>
                </div>
                <p className="mt-1 text-sm text-monk-muted leading-relaxed">
                  Save useful lessons from books, courses, podcasts, or videos — then connect them to your goals.
                </p>
                <div className="mt-3 text-xs font-semibold text-monk-accent">Open →</div>
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
                {store.focusSessions.filter(s => s.status === "completed").length} focus · {store.relapseLogs.length} drifts
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
