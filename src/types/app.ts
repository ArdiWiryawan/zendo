export type ISODateString = string;
export type DateOnlyString = string;

export type WeeklyMode = "planning" | "flow";
export type SeasonStatus = "draft" | "active" | "ended" | "archived";
export type GoalStatus = "active" | "paused" | "completed" | "released";
export type DayType = "goal" | "rest";
export type DayStatus = "planned" | "active" | "completed" | "skipped" | "missed" | "partial" | "relapse" | "rest";
export type EnergyLevel = "low" | "medium" | "high";
export type LearningType = "book" | "course" | "podcast" | "long_video" | "other";
export type TimelineStatus =
  | "not_started"
  | "completed"
  | "partial"
  | "missed"
  | "relapse"
  | "rest";

export type UserProfile = {
  id: string;
  name?: string;
  onboardingCompleted: boolean;
  activeSeasonId?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type AppLanguage = "en" | "id";

export type AppSettings = {
  id: string;
  theme: "light" | "dark" | "system";
  language: AppLanguage;
  reducedMotion: boolean;
  notificationEnabled: boolean;
  greyModeGuideCompleted: boolean;
  weeklyMode: WeeklyMode;
  defaultFocusDuration: number;
  installDismissed?: boolean;
  openCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

/** Motivation snapshot from onboarding — survives createSeasonFromOnboarding. */
export type SeasonWhy = {
  identity: string;
  consequenceOfInaction: string;
  protectValues: string[];
};

export type Season = {
  id: string;
  name: string;
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  durationDays: number;
  status: SeasonStatus;
  mode: WeeklyMode;
  goalIds: string[];
  badHabitIds: string[];
  antiGoals?: string[];
  obstacles?: string[];
  why?: SeasonWhy;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type Goal = {
  id: string;
  seasonId: string;
  title: string;
  description?: string;
  keystoneAction: string;
  /** Why this goal matters — short personal reason. */
  why?: string;
  /** Biggest inner obstacle expected for this goal. */
  obstacle?: string;
  /** Plan B — parsed from "When [obstacle], I will [plan B]". */
  obstacleMitigation?: string;
  priority: 1 | 2 | 3;
  weeklyTargetCount: number;
  status: GoalStatus;
  antiGoals?: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type FrictionAction = {
  id: string;
  label: string;
  completed: boolean;
};

export type BadHabitCategory =
  | "doom_scrolling"
  | "gaming"
  | "pmo"
  | "random_youtube"
  | "late_night_content"
  | "too_much_chatting"
  | "shopping_impulse"
  | "other";

export type BadHabit = {
  id: string;
  seasonId: string;
  name: string;
  category: BadHabitCategory;
  frictionActions: FrictionAction[];
  status: "active" | "reduced" | "relapsed" | "removed";
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type GoalAllocation = {
  goalId: string;
  targetCount: number;
  completedCount: number;
};

/** A goal released mid-season. The goal itself stays in `goals` (status "released") so history is preserved. */
export type ReleasedSeasonGoal = {
  goalId: string;
  note?: string;
  releasedAt: ISODateString;
};

export type WeeklyPlan = {
  id: string;
  seasonId: string;
  weekNumber: number;
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  mode: WeeklyMode;
  goalAllocations: GoalAllocation[];
  restDayTarget: number;
  status: "draft" | "active" | "completed" | "missed";
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type LearningPlan = {
  type: LearningType;
  title?: string;
  targetMinutes?: number;
  targetPages?: number;
};

export type DayPlan = {
  id: string;
  seasonId: string;
  weeklyPlanId: string;
  date: DateOnlyString;
  dayType: DayType;
  goalId?: string;
  mainAction?: string;
  learningPlan?: LearningPlan;
  energyLevel?: EnergyLevel;
  status: DayStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type FocusSession = {
  id: string;
  seasonId: string;
  weeklyPlanId: string;
  dayPlanId: string;
  goalId?: string;
  startTime: ISODateString;
  endTime?: ISODateString;
  durationMinutes: number;
  status: "running" | "paused" | "completed" | "ended_early" | "abandoned";
  note?: string;
  timerMode?: FocusSessionPreset;
  timerState?: "work" | "break";
  elapsedSeconds?: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;

  // New schema fields
  startedAt?: string;
  endedAt?: string;
  completedAt?: string;
  plannedDurationMinutes?: number;
  actualDurationSeconds?: number;
  totalDurationSeconds?: number;
  focusDurationSeconds?: number;
  breakDurationSeconds?: number;
  segmentsCompleted?: number;
  expectedTotalDurationSeconds?: number;
  expectedFocusDurationSeconds?: number;
  expectedBreakDurationSeconds?: number;
  expectedSegmentsCompleted?: number;
  actionId?: string | null;
  preset?: FocusSessionPreset;
  completedDurationMinutes?: number;
  focusDurationMinutes?: number;
  breakDurationMinutes?: number;
  completedFocusBlocks?: number;
  completedBreakBlocks?: number;
  totalFocusBlocks?: number;
  totalBreakBlocks?: number;
  currentPhaseIndex?: number;
  phases?: FocusSessionPhase[];
};

export type FocusSessionPreset = "custom" | "deep_work" | "pomodoro";

export type FocusSessionPhase = {
  type: "focus" | "break";
  label: string;
  plannedMinutes: number;
  completedMinutes: number;
  status: "pending" | "running" | "completed" | "ended_early";
};

export type LearningSourceType =
  | "book"
  | "course"
  | "podcast"
  | "long_video"
  | "article"
  | "mentor"
  | "other";

export type LearningSession = {
  id: string;
  seasonId?: string;
  relatedGoalId?: string | null;

  sourceType: LearningSourceType;
  sourceTitle?: string;

  startedAt: string;
  endedAt?: string;

  plannedDurationMinutes?: number;
  actualDurationSeconds: number;

  lesson?: string;
  actionIdea?: string;

  // Hierarchy: parent -> child sessions (module -> submodule)
  parentId?: string;
  childIds?: string[];

  // Obsidian-style linking
  linkedSessionIds?: string[];

  // Long-form notes
  content?: string;

  // Course/book structure
  chapter?: string;
  sourceUrl?: string;

  status: "completed" | "cancelled" | "abandoned";

  createdAt: string;
  updatedAt: string;
};

export type TimelineEventType =
  | "focus_session"
  | "learning_session"
  | "journal_entry"
  | "goal_created"
  | "season_started"
  | "season_completed";

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  seasonId?: string;
  relatedGoalId?: string | null;
  sourceId: string;
  title: string;
  description?: string;
  occurredAt: string;
  createdAt: string;
  focusSession?: FocusSessionTimelineDetails;
};

export type FocusSessionTimelineDetails = {
  id: string;
  type: "focus_session";
  preset: FocusSessionPreset;
  title: string;
  startedAt: string;
  endedAt: string;
  completedAt?: string;
  plannedDurationMinutes: number;
  completedDurationMinutes: number;
  totalDurationSeconds?: number;
  focusDurationSeconds?: number;
  breakDurationSeconds?: number;
  segmentsCompleted?: number;
  expectedTotalDurationSeconds?: number;
  expectedFocusDurationSeconds?: number;
  expectedBreakDurationSeconds?: number;
  expectedSegmentsCompleted?: number;
  focusDurationMinutes: number;
  breakDurationMinutes: number;
  completedFocusBlocks: number;
  completedBreakBlocks: number;
  totalFocusBlocks: number;
  totalBreakBlocks: number;
  status: "completed" | "ended_early" | "paused";
  phases: FocusSessionPhase[];
};

export type LearningEntry = {
  id: string;
  seasonId: string;
  weeklyPlanId: string;
  dayPlanId: string;
  goalId?: string;
  type: LearningType;
  title: string;
  durationMinutes?: number;
  pagesRead?: number;
  keyInsight?: string;
  actionTakeaway?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type JournalAnswers = {
  whatMovedToday?: string;
  whatDistractedMe?: string;
  whatDidILearn?: string;
  whatShouldBeEasierTomorrow?: string;
  whatShouldBeHarderTomorrow?: string;
  morningPages?: string;
};

export type JournalEntry = {
  id: string;
  seasonId: string;
  weeklyPlanId: string;
  dayPlanId: string;
  date: DateOnlyString;
  answers: JournalAnswers;
  mood?: "calm" | "clear" | "tired" | "restless" | "focused";
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type RelapseLog = {
  id: string;
  seasonId: string;
  weeklyPlanId?: string;
  dayPlanId?: string;
  badHabitId?: string;
  date: DateOnlyString;
  trigger:
    | "boredom"
    | "stress"
    | "fatigue"
    | "loneliness"
    | "trigger_app"
    | "no_clear_plan"
    | "other";
  note?: string;
  reflection?: string;
  recoveryAction?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type TimelineDay = {
  id: string;
  seasonId: string;
  date: DateOnlyString;
  dayType: DayType;
  goalId?: string;
  status: TimelineStatus;
  focusMinutes: number;
  learningMinutes: number;
  journalCompleted: boolean;
  relapseCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type NotificationReminder = {
  id: string;
  type:
    | "daily_start"
    | "daily_reflection"
    | "weekly_review"
    | "season_countdown"
    | "season_end";
  enabled: boolean;
  time?: string;
  daysBeforeSeasonEnd?: number;
  message: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type GoalDraft = {
  id: string;
  title: string;
};

export type BadHabitDraft = {
  id: string;
  name: string;
  category: BadHabitCategory;
  customName?: string;
};

export type SeasonDurationPreset = "7_days" | "30_days" | "90_days" | "custom";

export type OnboardingState = {
  currentStep: string;
  selectedHabits: BadHabitDraft[];
  frictionActions: Record<string, FrictionAction[]>;
  greyModeConfirmed: boolean;
  goalDrafts: GoalDraft[];
  releasedGoalIds: string[];
  selectedFocusGoalIds: string[];
  durationPreset: SeasonDurationPreset;
  seasonDurationDays: number;
  customDurationDays?: number;
  seasonStartDate: DateOnlyString;
  seasonEndDate: DateOnlyString;
  keystoneActions: Record<string, string>;
  weeklyMode: WeeklyMode;
  weeklyAllocations: GoalAllocation[];
  planningAssignments: Record<string, string | "rest">;
  antiGoals: string[];
  obstacles: string[];
  whyDiscovery: {
    selectedValues: string[];
    identityStatement: string;
  };
  // New depth fields
  pastReflection: {
    momentumMemory: string;
    failurePattern: string;
    neverFeltMomentum: boolean;
  };
  valueTradeoffs: {
    protect: string[];
    sacrifice: string[];
    tradeoffExplanation: string;
  };
  legacyVision: {
    proudChange: string;
    consequenceOfInaction: string;
  };
  identityDraftV1: string;
  timeAudit: {
    freeHoursPerDay: number;
    peakEnergyBlocks: string[];
  };
  energyMap: string;
  pastObstacles: string[];
  goalWhys: Record<string, string>;
  goalValueMapping: Record<string, string[]>;
  obstacleMitigations: Record<string, string>;
};

export type WeeklyReviewDecision = {
  action: "continue" | "adjust" | "release";
  mainAction?: string;
};

export type WeeklyReview = {
  date: string;
  decisions: Record<string, WeeklyReviewDecision>;
  skipped?: boolean;
};

export type MonkMVPState = {
  userProfile: UserProfile | null;
  appSettings: AppSettings;
  activeSeason: Season | null;
  pastSeasons: Season[];
  goals: Goal[];
  badHabits: BadHabit[];
  weeklyPlans: WeeklyPlan[];
  dayPlans: DayPlan[];
  focusSessions: FocusSession[];
  learningEntries: LearningEntry[];
  journalEntries: JournalEntry[];
  relapseLogs: RelapseLog[];
  timelineDays: TimelineDay[];
  notificationReminders: NotificationReminder[];
  onboarding: OnboardingState;

  // New state properties
  learningSessions: LearningSession[];
  timelineEvents: TimelineEvent[];

  // Notebook (Free Journal)
  notebookCategories: NotebookCategory[];
  notebookEntries: NotebookEntry[];

  // Journal Packs
  journalPacks: JournalPack[];
  journalPackSessions: JournalPackSession[];
  purchasedPackIds: string[];

  // Energy Logs
  energyLogs: EnergyLog[];

  // Weekly re-decide review
  weeklyReviews: Record<string, WeeklyReview>;

  // Released (mid-season) goals — ritual archive, never destructive to history
  releasedSeasonGoals: ReleasedSeasonGoal[];
};

// ── Notebook (Free Journal) ──

export type NotebookCategory = {
  id: string;
  name: string;
  icon: string;
  isBuiltIn: boolean;
  sortOrder: number;
};

export type NotebookEntry = {
  id: string;
  title: string;
  body: string;
  categoryId: string;
  tags: string[];
  isPinned: boolean;
  // imageIds referencing blobs in IndexedDB "zendo_images" (lib/imageStore).
  // Local-only by design — never synced. Optional: older persisted entries lack it.
  images?: string[];
  // Multi-page notes. Additive: `body` stays the flat join of all pages so
  // search/render/GC keep working on a single string. Absent = single-page
  // legacy note (body canonical). Editor writes both on save.
  pages?: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

// ── Journal Packs (Themed Q&A) ──

export type JournalPack = {
  id: string;
  title: string;
  description: string;
  icon: string;
  questions: JournalPackQuestion[];
  estimatedMinutes: number;
  isPremium: boolean;
  createdAt: ISODateString;
};

export type JournalPackQuestion = {
  id: string;
  order: number;
  question: string;
  hint?: string;
};

export type JournalPackAnswer = {
  questionId: string;
  answer: string;
};

export type JournalPackSession = {
  id: string;
  packId: string;
  answers: JournalPackAnswer[];
  startedAt: ISODateString;
  completedAt?: ISODateString;
  progress: number; // 0-100
};

export type ValidationResult = {
  valid: boolean;
  message?: string;
};

// ── Energy Log ──

export type EnergyLog = {
  id: string;
  date: string; // YYYY-MM-DD
  level: EnergyLevel;
  createdAt: ISODateString;
};
