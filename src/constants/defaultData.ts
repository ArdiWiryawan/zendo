import { addDaysToDate, getTodayDateString, nowIso } from "../lib/date";
import { createId } from "../lib/ids";
import type {
  AppSettings,
  BadHabitCategory,
  BadHabitDraft,
  FrictionAction,
  MonkMVPState,
  NotificationReminder,
  OnboardingState
} from "../types/app";
import { EyeOff, Gamepad2, MessagesSquare, Moon, MoreHorizontal, ShoppingBag, Youtube, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const habitOptions: Array<{ category: BadHabitCategory; label: string; icon: LucideIcon }> = [
  { category: "doom_scrolling", label: "Doom scrolling", icon: Zap },
  { category: "gaming", label: "Gaming", icon: Gamepad2 },
  { category: "pmo", label: "PMO", icon: EyeOff },
  { category: "random_youtube", label: "Random YouTube", icon: Youtube },
  { category: "late_night_content", label: "Late-night content", icon: Moon },
  { category: "too_much_chatting", label: "Too much chatting", icon: MessagesSquare },
  { category: "shopping_impulse", label: "Shopping impulse", icon: ShoppingBag },
  { category: "other", label: "Other", icon: MoreHorizontal }
];

export function createDefaultSettings(): AppSettings {
  const timestamp = nowIso();
  return {
    id: createId("settings"),
    theme: "light",
    language: "id",
    reducedMotion: false,
    notificationEnabled: false,
    greyModeGuideCompleted: false,
    weeklyMode: "flow",
    defaultFocusDuration: 50,
    installDismissed: false,
    openCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function createDefaultOnboarding(): OnboardingState {
  const start = getTodayDateString();
  return {
    currentStep: "/onboarding/welcome",
    selectedHabits: [],
    frictionActions: {},
    greyModeConfirmed: false,
    goalDrafts: Array.from({ length: 5 }, () => ({ id: createId("draft_goal"), title: "" })),
    releasedGoalIds: [],
    selectedFocusGoalIds: [],
    durationPreset: "90_days" as const,
    seasonDurationDays: 90,
    seasonStartDate: start,
    seasonEndDate: addDaysToDate(start, 89),
    keystoneActions: {},
    weeklyMode: "flow",
    weeklyAllocations: [],
    planningAssignments: {},
    antiGoals: [],
    obstacles: [],
    whyDiscovery: {
      selectedValues: [],
      identityStatement: ""
    },
    pastReflection: {
      momentumMemory: "",
      failurePattern: "",
      neverFeltMomentum: false
    },
    valueTradeoffs: {
      protect: [],
      sacrifice: [],
      tradeoffExplanation: ""
    },
    legacyVision: {
      proudChange: "",
      consequenceOfInaction: ""
    },
    identityDraftV1: "",
    timeAudit: {
      freeHoursPerDay: 0,
      peakEnergyBlocks: []
    },
    energyMap: "",
    pastObstacles: [],
    goalWhys: {},
    goalValueMapping: {},
    obstacleMitigations: {}
  };
}

export function createInitialState(): MonkMVPState {
  return {
    userProfile: null,
    appSettings: createDefaultSettings(),
    activeSeason: null,
    pastSeasons: [],
    goals: [],
    badHabits: [],
    weeklyPlans: [],
    dayPlans: [],
    focusSessions: [],
    journalEntries: [],
    relapseLogs: [],
    timelineDays: [],
    notificationReminders: createDefaultReminders(),
    onboarding: createDefaultOnboarding(),
    learningSessions: [],
    timelineEvents: [],
    notebookCategories: DEFAULT_NOTEBOOK_CATEGORIES,
    notebookEntries: [],
    notebookDeletedAt: {},
    journalPacks: BUILT_IN_JOURNAL_PACKS,
    journalPackSessions: [],
    purchasedPackIds: [],
    energyLogs: [],
    weeklyReviews: {},
    releasedSeasonGoals: []
  };
}

/**
 * Default habit cues. `message` carries i18n keys; the scheduler interpolates
 * the {n}-day countdown when it fires. Times are "HH:mm" in the user's local
 * timezone (page-level scheduling — no push infrastructure).
 */
export function createDefaultReminders(): NotificationReminder[] {
  const timestamp = nowIso();
  const base = (type: NotificationReminder["type"], time: string, extras: Partial<NotificationReminder> = {}): NotificationReminder => ({
    id: createId(`rem_${type}`),
    type,
    enabled: true,
    time,
    message: `reminder.${type}Msg`,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...extras
  });

  return [
    base("daily_start", "07:00"),
    base("daily_reflection", "20:00"),
    base("weekly_review", "18:00", { dayOfWeek: 0 }),
    base("season_countdown", "08:00", { daysBeforeSeasonEnd: 3 }),
    base("season_end", "08:00")
  ];
}

export function frictionActionsForHabit(habit: BadHabitDraft): FrictionAction[] {
  const actions: Record<BadHabitCategory, string[]> = {
    doom_scrolling: [
      "Uninstall Instagram",
      "Uninstall TikTok",
      "Logout from X",
      "Remove social apps from home screen"
    ],
    gaming: [
      "Uninstall mobile games",
      "Remove game shortcuts",
      "Turn off game notifications",
      "Move game accounts away from phone"
    ],
    pmo: [
      "Remove trigger sources",
      "Use safe browsing tools",
      "Avoid private browsing at night",
      "Keep phone outside bedroom"
    ],
    random_youtube: [
      "Logout from YouTube",
      "Remove YouTube from home screen",
      "Use watch later intentionally",
      "Avoid Shorts"
    ],
    late_night_content: [
      "Charge phone outside bed",
      "Set screen downtime",
      "Prepare book near bed",
      "Set night cutoff time"
    ],
    too_much_chatting: [
      "Mute non-essential groups",
      "Set reply windows",
      "Remove chat app from home screen"
    ],
    shopping_impulse: [
      "Remove marketplace apps",
      "Logout from ecommerce accounts",
      "Disable promo notifications"
    ],
    other: [
      `Make ${habit.customName || habit.name} harder to reach`,
      "Remove one shortcut",
      "Add one manual step before starting"
    ]
  };

  return actions[habit.category].map((label) => ({
    id: createId("friction"),
    label,
    completed: false
  }));
}

import type { JournalPack, NotebookCategory } from "../types/app";

// ── Notebook Default Categories ──

/** Default fallback category id for notebook entries whose category is deleted. */
export const DEFAULT_FALLBACK_NOTEBOOK_CATEGORY_ID = "cat_lainnya";

export const DEFAULT_NOTEBOOK_CATEGORIES: NotebookCategory[] = [
  { id: "cat_pribadi", name: "Pribadi", icon: "User", isBuiltIn: true, sortOrder: 1 },
  { id: "cat_karier", name: "Karier", icon: "Briefcase", isBuiltIn: true, sortOrder: 2 },
  { id: "cat_keuangan", name: "Keuangan", icon: "Wallet", isBuiltIn: true, sortOrder: 3 },
  { id: "cat_kesehatan", name: "Kesehatan", icon: "Heart", isBuiltIn: true, sortOrder: 4 },
  { id: "cat_hubungan", name: "Hubungan", icon: "Users", isBuiltIn: true, sortOrder: 5 },
  { id: "cat_spiritual", name: "Spiritual", icon: "Sparkles", isBuiltIn: true, sortOrder: 6 },
  { id: "cat_perjalanan", name: "Perjalanan", icon: "Compass", isBuiltIn: true, sortOrder: 7 },
  { id: "cat_kreatif", name: "Kreatif", icon: "Pen", isBuiltIn: true, sortOrder: 8 },
  { id: "cat_lainnya", name: "Lainnya", icon: "MoreHorizontal", isBuiltIn: true, sortOrder: 99 },
];

// ── Built-in Journal Packs ──
// Full catalog from user's prompt collection
// FREE = accessible to all. PREMIUM = requires mock purchase unlock.

export const BUILT_IN_JOURNAL_PACKS: JournalPack[] = [

  // ═══ MORNING & EVENING ═══

  {
    id: "pack_morning_kickstart",
    title: "Morning Kickstart",
    description: "Set your intention before the day begins.",
    icon: "Sun",
    isPremium: false,
    estimatedMinutes: 8,
    questions: [
      { id: "mk_1", order: 1, question: "What's 1 thing I'm grateful for?" },
      { id: "mk_2", order: 2, question: "What's 1 thing I'm excited about?" },
      { id: "mk_3", order: 3, question: "What's 1 virtue I want to exhibit today?" },
      { id: "mk_4", order: 4, question: "What's 1 thing I'm avoiding?" },
      { id: "mk_5", order: 5, question: "What's the 1 thing I need to do today?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_evening_shutdown",
    title: "Evening Shutdown",
    description: "Close your day with clarity and calm.",
    icon: "Moon",
    isPremium: false,
    estimatedMinutes: 5,
    questions: [
      { id: "es_1", order: 1, question: "What were my biggest wins of the day?" },
      { id: "es_2", order: 2, question: "Did I have any major realizations today?" },
      { id: "es_3", order: 3, question: "What's on the agenda for tomorrow?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_daily_reflection",
    title: "Daily Reflection",
    description: "Look back at your day with honest curiosity.",
    icon: "Star",
    isPremium: false,
    estimatedMinutes: 8,
    questions: [
      { id: "dr_1", order: 1, question: "What excited me today?" },
      { id: "dr_2", order: 2, question: "What drained me of energy?" },
      { id: "dr_3", order: 3, question: "What did I learn today?" },
      { id: "dr_4", order: 4, question: "What are 5 things I'm grateful for?" },
      { id: "dr_5", order: 5, question: "How did I push the needle forward?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },

  // ═══ LIFE DESIGN ═══

  {
    id: "pack_eulogy_method",
    title: "The Eulogy Method",
    description: "Live your life backwards — start from the end.",
    icon: "Heart",
    isPremium: false,
    estimatedMinutes: 15,
    questions: [
      { id: "eul_1", order: 1, question: "Imagine you've lived to 100, healthy in body, mind, and spirit. You're observing your own funeral from above. What would you want people to say about how you lived?" },
      { id: "eul_2", order: 2, question: "Imagine you have unlimited time, money, and courage. What would you want to experience, achieve, create, or contribute?" },
      { id: "eul_3", order: 3, question: "What problems or challenges in the world would you seek to remedy?" },
      { id: "eul_4", order: 4, question: "Which of your unique abilities bring you the most joy when using them?" },
      { id: "eul_5", order: 5, question: "If you could leave one lasting positive change in the world, what would it be?" },
      { id: "eul_6", order: 6, question: "What would you do if money were no object? How would you use your talents to serve others?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_fear_setting",
    title: "Fear Setting (Tim Ferriss)",
    description: "Define your fears instead of your goals.",
    icon: "Shield",
    isPremium: false,
    estimatedMinutes: 20,
    questions: [
      { id: "fear_1", order: 1, question: "What is the worst thing that will happen if I do the thing I fear?" },
      { id: "fear_2", order: 2, question: "List 10-20 things that could go wrong — catastrophize fully." },
      { id: "fear_3", order: 3, question: "What can I do to prevent each of those worst things from happening?" },
      { id: "fear_4", order: 4, question: "If the worst case happened, how could I repair it?" },
      { id: "fear_5", order: 5, question: "What are the benefits of an attempt or partial success?" },
      { id: "fear_6", order: 6, question: "If I don't do this, what will my life look like in 6 months, 1 year, and 3 years?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_odyssey_plans",
    title: "Odyssey Plans",
    description: "Design three versions of your next 5 years.",
    icon: "Compass",
    isPremium: false,
    estimatedMinutes: 20,
    questions: [
      { id: "ody_1", order: 1, question: "Plan 1: What would my life look like over the next 5 years if I follow the same path I'm on now?" },
      { id: "ody_2", order: 2, question: "Plan 2: What would my life look like if I couldn't do what I'm doing now and had to choose the next thing instead?" },
      { id: "ody_3", order: 3, question: "Plan 3: What would my life look like if money wasn't an issue and I could do whatever I wanted?" },
      { id: "ody_4", order: 4, question: "Which of these plans excites and energizes you the most? Why?" },
      { id: "ody_5", order: 5, question: "What is one step you can take today toward that plan?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_12_month_celebration",
    title: "12 Month Celebration",
    description: "Rate your life now, then imagine a 10/10 a year from today.",
    icon: "Award",
    isPremium: false,
    estimatedMinutes: 25,
    questions: [
      { id: "12m_1", order: 1, question: "Rate yourself 1-10: Physical Health. What would make it a 10 in a year?" },
      { id: "12m_2", order: 2, question: "Rate yourself 1-10: Mental Health. What would a 10 look like?" },
      { id: "12m_3", order: 3, question: "Rate yourself 1-10: Family relationships. Your 10 in a year?" },
      { id: "12m_4", order: 4, question: "Rate yourself 1-10: Friendships. What needs to change?" },
      { id: "12m_5", order: 5, question: "Rate yourself 1-10: Romantic relationship (or desired one). Your vision?" },
      { id: "12m_6", order: 6, question: "Rate yourself 1-10: Career. What does success look like?" },
      { id: "12m_7", order: 7, question: "Rate yourself 1-10: Finances. What number and why?" },
      { id: "12m_8", order: 8, question: "Rate yourself 1-10: Learning & growth. What's the goal?" },
      { id: "12m_9", order: 9, question: "Rate yourself 1-10: Experiences & joy. Your 10 in a year?" },
      { id: "12m_10", order: 10, question: "Now imagine you're celebrating with a friend in one year — describe that night. What made it worth celebrating?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_80_20_audit",
    title: "80/20 Life Audit",
    description: "Find the 20% that drives 80% of your results — and pain.",
    icon: "Search",
    isPremium: false,
    estimatedMinutes: 15,
    questions: [
      { id: "80_1", order: 1, question: "Where am I feeling satisfied in life right now? (Brain dump — health, finances, relationships, career, spirituality, everything.)" },
      { id: "80_2", order: 2, question: "Where am I feeling dissatisfied? (Brain dump everything.)" },
      { id: "80_3", order: 3, question: "Looking at your satisfaction list — which 20% are creating 80% of the positive results?" },
      { id: "80_4", order: 4, question: "Looking at your dissatisfaction list — which 20% are causing 80% of the negative results?" },
      { id: "80_5", order: 5, question: "What is one action you can take to amplify the positive 20% and reduce the negative 20%?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_bottleneck",
    title: "Bottleneck Analysis",
    description: "Find the one thing holding everything back.",
    icon: "Target",
    isPremium: false,
    estimatedMinutes: 8,
    questions: [
      { id: "bn_1", order: 1, question: "What's the biggest bottleneck to achieving my next goal?" },
      { id: "bn_2", order: 2, question: "Why aren't I working on that bottleneck today?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_compounding",
    title: "The Compounding Projection",
    description: "Where do your daily actions lead?",
    icon: "TrendingUp",
    isPremium: false,
    estimatedMinutes: 5,
    questions: [
      { id: "cp_1", order: 1, question: "If I repeated every action I took today, every day for a year, where would I end up?" },
      { id: "cp_2", order: 2, question: "Is that where I want to be? If not, what one action can I change tomorrow?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },

  // ═══ DEEP INTROSPECTION ═══

  {
    id: "pack_morgan_housel",
    title: "Morgan Housel's Questions",
    description: "10 uncomfortable questions that reveal how you think.",
    icon: "Brain",
    isPremium: false,
    estimatedMinutes: 20,
    questions: [
      { id: "mh_1", order: 1, question: "Whose life do I admire that is secretly miserable?" },
      { id: "mh_2", order: 2, question: "What do I believe is true only because believing it puts me in good standing with my tribe?" },
      { id: "mh_3", order: 3, question: "What annoys me about other people that I sometimes do myself?" },
      { id: "mh_4", order: 4, question: "Which of my current values would be different if I were raised by different parents?" },
      { id: "mh_5", order: 5, question: "What do I believe the most with the least amount of evidence?" },
      { id: "mh_6", order: 6, question: "What do I think is a universal truth but is actually just a norm in my culture?" },
      { id: "mh_7", order: 7, question: "What has the right answer but I ignore because they're a bad communicator?" },
      { id: "mh_8", order: 8, question: "Who is full of it but I pay attention to because they're a good communicator?" },
      { id: "mh_9", order: 9, question: "What in my field is impossible to know no matter how smart I become?" },
      { id: "mh_10", order: 10, question: "What in my field do I think is a law but is actually just a rule?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_10_favorites",
    title: "10 Favorite Prompts",
    description: "Timeless questions to return to again and again.",
    icon: "Star",
    isPremium: false,
    estimatedMinutes: 25,
    questions: [
      { id: "fav_1", order: 1, question: "What would you do if money were no object? How would you use your talents to serve others?" },
      { id: "fav_2", order: 2, question: "What would you like people to say at your funeral?" },
      { id: "fav_3", order: 3, question: "If I repeat this week's actions for 10 years, where does it lead — and is that where I want to be?" },
      { id: "fav_4", order: 4, question: "What activities in the last 2 weeks have energized me vs. drained me?" },
      { id: "fav_5", order: 5, question: "How is my wheel of life? Rate: work, health, relationships." },
      { id: "fav_6", order: 6, question: "Odyssey plan: current path (5 years), alternative path, radical path. What does each look like?" },
      { id: "fav_7", order: 7, question: "What is my goal — and what is the bottleneck holding it back?" },
      { id: "fav_8", order: 8, question: "Which goal, if achieved, would have the greatest impact on my life?" },
      { id: "fav_9", order: 9, question: "Do I work for my business/career, or does it work for me?" },
      { id: "fav_10", order: 10, question: "If I knew I was going to die 2 years from now, how would I spend my time?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_10_year_dreamline",
    title: "10 Year Dreamline",
    description: "What do you want to learn, see, have, be, and do in the next decade?",
    icon: "Rocket",
    isPremium: false,
    estimatedMinutes: 20,
    questions: [
      { id: "dream_1", order: 1, question: "What do you want to LEARN in the next 10 years?" },
      { id: "dream_2", order: 2, question: "What do you want to SEE?" },
      { id: "dream_3", order: 3, question: "What do you want to HAVE?" },
      { id: "dream_4", order: 4, question: "Who do you want to BE?" },
      { id: "dream_5", order: 5, question: "What do you want to TRY?" },
      { id: "dream_6", order: 6, question: "What do you want to DO?" },
      { id: "dream_7", order: 7, question: "Where do you want to GO?" },
      { id: "dream_8", order: 8, question: "What do you want to CREATE?" },
      { id: "dream_9", order: 9, question: "What do you want to CONTRIBUTE to?" },
      { id: "dream_10", order: 10, question: "What do you want to OVERCOME?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },

  // ═══ HARD TIMES ═══

  {
    id: "pack_when_bad_things",
    title: "When Bad Things Happen",
    description: "Process difficult events with clarity and self-compassion.",
    icon: "CloudRain",
    isPremium: false,
    estimatedMinutes: 10,
    questions: [
      { id: "bad_1", order: 1, question: "What happened, objectively? (Just the facts.)" },
      { id: "bad_2", order: 2, question: "What did I make it mean?" },
      { id: "bad_3", order: 3, question: "How would I comfort a friend I loved if this happened to them?" },
      { id: "bad_4", order: 4, question: "How could this be the best thing that has ever happened to me?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },

  // ═══ FREE SELF-DISCOVERY (from unused 100 prompts) ═══

  {
    id: "pack_self_discovery",
    title: "Self-Discovery",
    description: "Understand your patterns, values, and hidden beliefs.",
    icon: "Sparkles",
    isPremium: false,
    estimatedMinutes: 20,
    questions: [
      { id: "sd_1", order: 1, question: "What is a view about the world that has changed for you as you've gotten older?" },
      { id: "sd_2", order: 2, question: "What is a reminder that you would like to tell yourself next time you are in a downward spiral?" },
      { id: "sd_3", order: 3, question: "What are some things that frustrate you? Can you find any values that explain why they bug you so much?" },
      { id: "sd_4", order: 4, question: "What do you need to give yourself more credit for?" },
      { id: "sd_5", order: 5, question: "What is a positive habit you would really like to cultivate? Why and how could you get started?" },
      { id: "sd_6", order: 6, question: "What is holding you back from being more productive at the moment? What can you do about that?" },
      { id: "sd_7", order: 7, question: "How much do your current goals reflect your desires vs. someone else's?" },
      { id: "sd_8", order: 8, question: "What does 'ready' feel like to you? How did you know you were ready for a major step?" },
      { id: "sd_9", order: 9, question: "What is something that you have a hard time being honest about, even to those you trust the most? Why?" },
      { id: "sd_10", order: 10, question: "What made you feel most alive when you were young? How can you bring more of that into your life now?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_relationships",
    title: "Relationships & Connection",
    description: "Explore the relationships that shape your life.",
    icon: "HeartHandshake",
    isPremium: false,
    estimatedMinutes: 15,
    questions: [
      { id: "rel_1", order: 1, question: "How did you bond with one of the best friends you've ever had?" },
      { id: "rel_2", order: 2, question: "What did you learn from your last relationship? If you haven't had one, what could you learn from observing one?" },
      { id: "rel_3", order: 3, question: "Who is the most difficult person in your life and why?" },
      { id: "rel_4", order: 4, question: "Who is somebody that you miss? Why?" },
      { id: "rel_5", order: 5, question: "What are some small things that other people have done that really make your day?" },
      { id: "rel_6", order: 6, question: "What is a boundary that you need to draw in your life?" },
      { id: "rel_7", order: 7, question: "Write a letter to someone you miss dearly. (Sending is optional.)" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_work_purpose",
    title: "Work & Purpose",
    description: "Align your daily work with deeper meaning.",
    icon: "Briefcase",
    isPremium: false,
    estimatedMinutes: 12,
    questions: [
      { id: "wp_1", order: 1, question: "What part of your work do you most enjoy? What part do you least enjoy? Why?" },
      { id: "wp_2", order: 2, question: "Do you work for your business/career, or does it work for you?" },
      { id: "wp_3", order: 3, question: "What is something that you could invest more money in to make life smoother and easier?" },
      { id: "wp_4", order: 4, question: "What would you do if you could stop time for two months?" },
      { id: "wp_5", order: 5, question: "What could you do to make your life more meaningful?" },
      { id: "wp_6", order: 6, question: "What biases do you need to work on?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },

  // ═══════════════════════════════════════════
  // PREMIUM PACKS (require mock purchase)
  // ═══════════════════════════════════════════

  {
    id: "pack_deep_discipline",
    title: "Deep Discipline & Habits",
    description: "Build the habits that build you — premium deep-dive.",
    icon: "Flame",
    isPremium: true,
    priceRp: 29000,
    estimatedMinutes: 25,
    questions: [
      { id: "dd_1", order: 1, question: "What is the one habit that, if you mastered it, would make everything else easier?" },
      { id: "dd_2", order: 2, question: "When does your discipline usually break down — what's the trigger?" },
      { id: "dd_3", order: 3, question: "What's the smallest version of your goal habit that feels almost too easy?" },
      { id: "dd_4", order: 4, question: "What identity do you need to adopt to sustain this habit?" },
      { id: "dd_5", order: 5, question: "What environment change would make the right thing easier than the wrong thing?" },
      { id: "dd_6", order: 6, question: "What reward are you getting from the habit you want to change?" },
      { id: "dd_7", order: 7, question: "If you had to design a 30-day experiment to build this habit, what would it look like?" },
      { id: "dd_8", order: 8, question: "What's the bottleneck in your current routine — and why aren't you fixing it?" },
      { id: "dd_9", order: 9, question: "How do you talk to yourself when you miss a day? What would a kinder voice say?" },
      { id: "dd_10", order: 10, question: "What commitment can you make today that would make you proud 30 days from now?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_shadow_self",
    title: "Shadow Self & Emotions",
    description: "Face the parts of yourself you usually avoid.",
    icon: "Moon",
    isPremium: true,
    priceRp: 29000,
    estimatedMinutes: 20,
    questions: [
      { id: "ss_1", order: 1, question: "What emotion do you avoid feeling the most? Where does it live in your body?" },
      { id: "ss_2", order: 2, question: "What happens when you get angry? What is the anger really trying to protect?" },
      { id: "ss_3", order: 3, question: "Which emotions in others do you have a difficult time being around? Why?" },
      { id: "ss_4", order: 4, question: "What is a made-up rule about your life that you are applying to yourself? How has it held you back?" },
      { id: "ss_5", order: 5, question: "When was the last time you had to hold your tongue? What would you have said?" },
      { id: "ss_6", order: 6, question: "What is a question you are really scared to know the answer to?" },
      { id: "ss_7", order: 7, question: "Write about a mistake that taught you something about yourself." },
      { id: "ss_8", order: 8, question: "Write an apology to yourself for a time you treated yourself poorly." },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_creativity_play",
    title: "Creativity & Play",
    description: "Reconnect with your imagination and sense of wonder.",
    icon: "Paintbrush",
    isPremium: true,
    priceRp: 19000,
    estimatedMinutes: 15,
    questions: [
      { id: "cp_1", order: 1, question: "Draw 25 circles (5x5 grid). Set a 3-minute timer and turn each into something unique." },
      { id: "cp_2", order: 2, question: "Draw a small scribble on the page, then use your imagination to turn it into a full drawing." },
      { id: "cp_3", order: 3, question: "Write a complete story in exactly six words." },
      { id: "cp_4", order: 4, question: "What made you feel most alive when you were young? How would that version of you spend today?" },
      { id: "cp_5", order: 5, question: "If you could stop time for two months, what would you create or explore?" },
      { id: "cp_6", order: 6, question: "What is a positive habit you would really like to cultivate? Describe the most playful way to start." },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_mindset_beliefs",
    title: "Mindset & Beliefs",
    description: "Examine the invisible beliefs running your life.",
    icon: "Lightbulb",
    isPremium: true,
    priceRp: 29000,
    estimatedMinutes: 20,
    questions: [
      { id: "mb_1", order: 1, question: "What is a view about the world that has changed for you as you've gotten older?" },
      { id: "mb_2", order: 2, question: "Are you taking enough risks in your life? Would you like to change your relationship to risk?" },
      { id: "mb_3", order: 3, question: "What biases do you need to work on?" },
      { id: "mb_4", order: 4, question: "What is something that you grew out of that meant a lot to you at the time?" },
      { id: "mb_5", order: 5, question: "Which quotes or pieces of advice do you have committed to memory? Why have those stuck?" },
      { id: "mb_6", order: 6, question: "What life lessons, advice, or habits have you picked up from fiction books?" },
      { id: "mb_7", order: 7, question: "Think about a 'what if?' scenario — work through the problem and identify your options." },
      { id: "mb_8", order: 8, question: "What's a belief you held 5 years ago that you now completely disagree with? What changed you?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "pack_complete_100",
    title: "The Complete 100 (Remaining)",
    description: "The rest of the 100 prompts collection — all in one pack.",
    icon: "Scroll",
    isPremium: true,
    priceRp: 49000,
    estimatedMinutes: 30,
    questions: [
      { id: "c100_1", order: 1, question: "What sensations or experiences do you tend to avoid in your life? Why?" },
      { id: "c100_2", order: 2, question: "What was a seemingly inconsequential decision that made a big impact in your life?" },
      { id: "c100_3", order: 3, question: "Which songs have vivid memories for you?" },
      { id: "c100_4", order: 4, question: "Why do you dress the way that you do?" },
      { id: "c100_5", order: 5, question: "Who has been your greatest teacher?" },
      { id: "c100_6", order: 6, question: "Write a thank you note to someone. (Sending is optional.)" },
      { id: "c100_7", order: 7, question: "Write about an aspect of your personality that you appreciate in other people as well." },
      { id: "c100_8", order: 8, question: "Write about something (or someone) that is currently tempting you." },
      { id: "c100_9", order: 9, question: "You have been temporarily blinded by a bright light. When your vision clears, what do you see?" },
      { id: "c100_10", order: 10, question: "Take a task you've been dreading and break it into the smallest possible steps." },
      { id: "c100_11", order: 11, question: "How do the opinions of others affect you?" },
      { id: "c100_12", order: 12, question: "How do you feel about asking for help?" },
      { id: "c100_13", order: 13, question: "In what ways are you currently self-sabotaging or holding yourself back?" },
      { id: "c100_14", order: 14, question: "What pet peeves do you have? Any idea why they drive you so crazy?" },
      { id: "c100_15", order: 15, question: "What is something that you would like to let go of?" },
    ],
    createdAt: new Date("2026-01-01").toISOString(),
  },
];

export function defaultWeeklyTargets(goalIds: string[]) {
  const patterns: Record<number, number[]> = {
    1: [6],
    2: [3, 3],
    3: [3, 2, 1]
  };
  const pattern = patterns[goalIds.length] ?? [];
  return goalIds.map((goalId, index) => ({
    goalId,
    targetCount: pattern[index] ?? 1,
    completedCount: 0
  }));
}
