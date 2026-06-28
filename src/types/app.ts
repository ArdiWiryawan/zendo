export type ISODateString = string;
export type DateOnlyString = string;

export type WeeklyMode = "planning" | "flow";
export type SeasonStatus = "draft" | "active" | "ended" | "archived";
export type GoalStatus = "active" | "paused" | "completed" | "released";
export type DayType = "goal" | "rest";
export type DayStatus = "planned" | "active" | "completed" | "skipped" | "missed";
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

export type AppSettings = {
  id: string;
  theme: "light" | "dark" | "system";
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
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type Goal = {
  id: string;
  seasonId: string;
  title: string;
  description?: string;
  keystoneAction: string;
  priority: 1 | 2 | 3;
  weeklyTargetCount: number;
  status: GoalStatus;
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
  status: "running" | "paused" | "completed" | "abandoned";
  note?: string;
  timerMode?: "deep_work" | "pomodoro";
  timerState?: "work" | "break";
  elapsedSeconds?: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;

  // New schema fields
  startedAt?: string;
  endedAt?: string;
  plannedDurationMinutes?: number;
  actualDurationSeconds?: number;
  actionId?: string | null;
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
};

export type MonkMVPState = {
  userProfile: UserProfile | null;
  appSettings: AppSettings;
  activeSeason: Season | null;
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
};

export type ValidationResult = {
  valid: boolean;
  message?: string;
};
