export type ISODateString = string;
export type DateOnlyString = string;

export type WeeklyMode = "planning" | "flow";
export type SeasonStatus = "draft" | "active" | "ended" | "archived";
export type GoalStatus = "active" | "paused" | "completed" | "released";
/**
 * What kind of goal this is — the distinction §12 asks for.
 *  - `achievement`: a finite outcome with a completion point ("Ship the launch").
 *  - `frequency`:   a countable outcome reached N times per week ("Run 3x/week").
 *  - `maintenance`: an ongoing standard that is never "finished" ("Stay pain-free").
 * Optional and additive: absent means unspecified, never invalid.
 */
export type GoalType = "achievement" | "frequency" | "maintenance";
export type DayType = "goal" | "rest";
export type DayStatus = "planned" | "active" | "completed" | "skipped" | "missed" | "partial" | "relapse" | "rest";
export type EnergyLevel = "low" | "medium" | "high";
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

export type AppTheme =
  | "dark"
  | "sumi_ink"
  | "system"
  | "kyoto_moss"
  | "wabi_sabi"
  | "kurogane"
  | "temple_gold";

export type AppSettings = {
  id: string;
  theme: AppTheme;
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

/** Motivation snapshot — 4-component flow: Why, Desired Outcome, Anti-Why, plus identity/values */
export type SeasonWhy = {
  identity: string;
  consequenceOfInaction: string;
  protectValues: string[];
  /** Intrinsic reason: "Why does this matter to you?" */
  why?: string;
  /** Desired outcome: "What gets better if you finish?" */
  desiredOutcome?: string;
  /** Anti-Why / cost of inaction: "If I keep stalling, what likely remains a problem?" */
  antiWhy?: string;
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

export type GoalTask = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: ISODateString;
  /** §16 — the finite unit of work this step belongs to, when it has one. */
  projectId?: string;
};

export type ProjectStatus = "active" | "done" | "dropped";

/**
 * PROJECT (§16) — a finite, nameable unit of work under a goal. "Publish video
 * #27", not "publish 1 video/week": without this a recurring goal's tasks are a
 * flat checklist with no way to tell one run from the next. Deliberately thin —
 * a title, a parent, and a lifecycle. No dates, no estimates; a project is not a
 * schedule, and adding one here would duplicate the day plan's job.
 */
export type Project = {
  id: string;
  seasonId: string;
  goalId: string;
  title: string;
  status: ProjectStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

/**
 * GOAL TRACK — a named focus area a season's goals are grouped under
 * ("Magang", "YouTube", "Bisnis"). The entity carries identity, order and
 * lifecycle; `Goal.track` still holds the track NAME and stays the single
 * source of truth for what a goal belongs to, so every existing read site keeps
 * working. Renaming a track rewrites the matching goal strings in the same set.
 */
export type GoalTrack = {
  id: string;
  seasonId: string;
  name: string;
  order: number;
  status: "active" | "paused" | "archived";
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type Goal = {
  id: string;
  seasonId: string;
  title: string;
  description?: string;
  keystoneAction: string;
  /** Goal Track (e.g. "Magang", "YouTube", "Bisnis", "Personal") */
  track?: string;
  /** Subtasks breakdown for the goal */
  tasks?: GoalTask[];
  /** Why this goal matters — short personal reason. */
  why?: string;
  /** Desired outcome: what gets better if this goal is finished. */
  desiredOutcome?: string;
  /** Implementation intention context (When & Where: e.g. "Tomorrow 08:30 at work desk") */
  whenWhere?: string;
  /**
   * AVAILABILITY (§14) — the days and time window this goal is realistically
   * workable in. Optional and additive: `whenWhere` above stays the free-text
   * implementation intention ("after morning coffee at the desk"), which carries
   * meaning a weekday set cannot. This is the structured half, so scheduling can
   * suggest *when* rather than only how often.
   */
  availability?: GoalAvailability;
  /** Definition of done / clear completion criteria */
  definitionOfDone?: string;
  /** Biggest inner obstacle expected for this goal. */
  obstacle?: string;
  /** Plan B — parsed from "When [obstacle], I will [plan B]". */
  obstacleMitigation?: string;
  priority: 1 | 2 | 3;
  /**
   * PRACTICE RHYTHM — how often you show up for this goal's keystone action.
   * This is the "days per week" dial, and it is NOT the outcome target; the two
   * were previously conflated under this one field (§13). See
   * `outcomeFrequencyPerWeek` for the countable outcome.
   */
  weeklyTargetCount: number;
  /** What kind of goal this is (§12). Optional for backward compatibility. */
  type?: GoalType;
  /**
   * OUTCOME FREQUENCY — how many times the desired outcome must be reached per
   * week, for `frequency` goals ("run 3 times"). Distinct from the practice
   * rhythm above: showing up 5 days a week and completing the outcome 3 times a
   * week are different commitments, and conflating them made the plan dishonest.
   * Undefined for achievement/maintenance goals.
   */
  outcomeFrequencyPerWeek?: number;
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

/**
 * A POSITIVE practice (§23) — something you want to *do*, as opposed to the
 * `BadHabit` above, which is something you want to *stop*.
 *
 * The two are deliberately separate record types rather than one type with a
 * polarity flag: they have different lifecycles (a practice accumulates
 * evidence, a bad habit accumulates relapses), different UI (strength vs
 * friction), and different questions. Until now a positive habit like
 * "meditate 10 min/day" had nowhere to live except as free text inside a
 * goal's keystone action.
 */
export type Practice = {
  id: string;
  seasonId: string;
  name: string;
  /**
   * OPTIONAL link to a goal (§25). A practice can support a goal ("run 3x"
   * lives under the running goal) or stand alone ("brush teeth"). Undefined
   * means standalone — never invalid.
   */
  goalId?: string;
  /** Days per week you intend to show up. Same unit as `Goal.weeklyTargetCount`. */
  weeklyTargetCount: number;
  /** Free text: the cue that starts it. Implementation-intention style. */
  cue?: string;
  status: "active" | "paused" | "archived";
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

/**
 * One completed instance of a practice. Kept as its own record rather than a
 * counter on `Practice` so multi-device merge stays last-write-wins per day
 * (two devices ticking the same day is one fact, not two), and so un-ticking a
 * day is a delete rather than a decrement that can drift.
 */
export type PracticeLog = {
  id: string;
  practiceId: string;
  seasonId: string;
  date: DateOnlyString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

/** Monday-first weekday index, matching how `date.ts` already computes weeks. */
export type GoalWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * §14 — when this goal can realistically be worked on.
 *
 * Both halves are optional and independent: a goal can have preferred days and
 * no window ("weekends, whenever"), a window and no days ("mornings sometime"),
 * or neither (the field is then simply absent). Absent never means "unavailable"
 * — it means the user hasn't said, and the app should not pretend otherwise.
 */
export type GoalAvailability = {
  /** Monday-first weekday indices (0 = Monday). Empty/absent = no preference. */
  preferredDays?: GoalWeekday[];
  /** "HH:mm" local start of the workable window, e.g. "07:00". */
  preferredStartTime?: string;
  /** "HH:mm" local end of the workable window, e.g. "09:00". */
  preferredEndTime?: string;
};

export type GoalAllocation = {  goalId: string;
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

export type TimeBlockCategory =
  | "deep_work"
  | "shallow"
  | "learning"
  | "rest"
  | "personal";

export type TimeBlock = {
  id: string;
  startTime: string; // "HH:mm" e.g. "08:00"
  endTime: string;   // "HH:mm" e.g. "10:00"
  title: string;
  category: TimeBlockCategory;
  customCategory?: string;
  goalId?: string;
  completed?: boolean;
};

export type DayPlan = {
  id: string;
  seasonId: string;
  weeklyPlanId: string;
  date: DateOnlyString;
  dayType: DayType;
  goalId?: string;
  mainAction?: string;
  highlight?: string;
  agenda?: string[];
  energyLevel?: EnergyLevel;
  status: DayStatus;
  planningCompleted?: boolean;
  timeBlocks?: TimeBlock[];
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
  pausedAt?: ISODateString;
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
  dayPlanId?: string;
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
  weeklyPlanId?: string;
  dayPlanId?: string;
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
  /** 0=Sunday … 6=Saturday — only used by weekly_review. */
  dayOfWeek?: number;
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
  goalDesiredOutcomes: Record<string, string>;
  goalValueMapping: Record<string, string[]>;
  obstacleMitigations: Record<string, string>;
  /**
   * Last write to this onboarding draft. The whole OnboardingState is merged
   * as ONE scalar (syncMerge SCALAR_KEYS → mergeScalar), so without a
   * timestamp a stale device always won: `isNewer` sees no timestamp on either
   * side and returns false, keeping local. That silently discarded the season's
   * real goal selection (`selectedFocusGoalIds`) when it was chosen elsewhere.
   *
   * Optional on purpose. Two states must stay timestamp-less (and therefore
   * lose the scalar comparison, making the remote win):
   *   - a default/fresh onboarding, which is a draft nobody has edited yet;
   *     stamping it "now" would beat a genuinely newer remote selection;
   *   - an onboarding written before this field existed, which carries no
   *     ordering signal and so must adopt the dated device's version.
   * Every user write stamps it, so from the first real edit onward multi-device
   * merge is ordinary last-write-wins.
   */
  updatedAt?: ISODateString;
};

export type WeeklyReviewDecision = {
  action: "continue" | "adjust" | "release";
  mainAction?: string;
};

export type WeeklyReflectionAnswers = {
  wins?: string;
  challenges?: string;
  lesson?: string;
  organise?: string;
  priorities?: string;
};

export type RestActivityItem = {
  id: string;
  title: string;
  category?: "physical" | "creative" | "social" | "solitude" | "custom";
  icon?: string;
  notes?: string;
};

export type WeeklyReview = {
  date: string;
  decisions: Record<string, WeeklyReviewDecision>;
  reflection?: WeeklyReflectionAnswers;
  restActivity?: RestActivityItem;
  skipped?: boolean;
};

export type MonkMVPState = {
  userProfile: UserProfile | null;
  appSettings: AppSettings;
  activeSeason: Season | null;
  pastSeasons: Season[];
  goals: Goal[];
  /** Named focus areas for the season's goals (see GoalTrack). */
  goalTracks: GoalTrack[];
  badHabits: BadHabit[];
  /** §23 positive practices — the "do this" layer, separate from badHabits. */
  practices: Practice[];
  practiceLogs: PracticeLog[];
  /** §16 finite units of work, grouped under a goal. */
  projects: Project[];
  weeklyPlans: WeeklyPlan[];
  dayPlans: DayPlan[];
  focusSessions: FocusSession[];
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
  // Tombstones for deleted notebook entries (id → deletion time). A delete must
  // survive multi-device merge even when another device re-uploads the entry.
  // Delete always wins: any entry whose id appears here is dropped on merge and
  // hidden at render, regardless of updatedAt recency. Pruned on hydrate.
  notebookDeletedAt: Record<string, ISODateString>;
  notebookCategoryDeletedAt?: Record<string, ISODateString>;

  // Journal Packs
  journalPacks: JournalPack[];
  journalPackSessions: JournalPackSession[];
  purchasedPackIds: string[];

  // Energy Logs
  energyLogs: EnergyLog[];

  // Weekly re-decide review
  weeklyReviews: Record<string, WeeklyReview>;

  // Pro Membership
  isPro?: boolean;
  proTier?: "lifetime" | "season" | null;
  proExpiresAt?: ISODateString | null;
  proPurchasedAt?: ISODateString | null;

  // Released (mid-season) goals — ritual archive, never destructive to history
  releasedSeasonGoals: ReleasedSeasonGoal[];
};

// ── Notebook (Free Journal / Second Brain) ──

export type ParaType = "project" | "area" | "resource" | "archive";

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
  /** PARA Classification (Tiago Forte BASB) */
  paraType?: ParaType;
  /** Optional link to an active Season Goal */
  goalId?: string;
  /** References / bi-directional linked notes */
  linkedNoteIds?: string[];
  /** Progressive Summarization (Tier 3 Executive Takeaway) */
  takeaway?: string;
  // imageIds referencing blobs in IndexedDB "zendo_images" (lib/imageStore).
  // Local-only by design — never synced. Optional: older persisted entries lack it.
  images?: string[];
  // The single sketch attached to this note (lib/imageStore blob), plus the page
  // it belongs to. Kept separate from `images` so re-opening the pad can seed
  // from the note's own drawing instead of guessing. Local-only, never synced.
  drawingImageId?: string;
  drawingPageIndex?: number;
  // Multi-page notes. Additive: `body` stays the flat join of all pages so
  // search/render/GC keep working on a single string. Absent = single-page
  // legacy note (body canonical). Editor writes both on save.
  pages?: string[];
  // Soft-hide marker. Present = hidden from "All" and its PARA tab, shown in the
  // archive tab. Additive and lossless: paraType is never touched, so restoring
  // (clearing this) returns the note to exactly its previous tab.
  archivedAt?: ISODateString;
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
  /** Price in Indonesian Rupiah for Bayar GG payment checkout. Only premium packs. */
  priceRp?: number;
  createdAt: ISODateString;
};

export type JournalPackQuestion = {
  id: string;
  order: number;
  question: string;
  hint?: string;
  /**
   * The question is answered by drawing, not typing. The session screen opens
   * the sketchpad as the primary surface and drops the textarea entirely, so
   * the answer is the sketch and nothing else.
   */
  drawOnly?: boolean;
  /**
   * Prime the sketchpad with an NxN guide grid. Only for prompts that name a
   * grid — the cells are there to aim at, and the user can toggle them off.
   */
  grid?: number;
};

export type JournalPackAnswer = {
  questionId: string;
  answer: string;
  // Sketch for this answer (lib/imageStore blob id). Local-only, never synced —
  // same contract as the notebook's `drawingImageId`.
  drawingImageId?: string;
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
