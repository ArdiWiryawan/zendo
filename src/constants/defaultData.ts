import { addDaysToDate, getTodayDateString, nowIso } from "../lib/date";
import { createId } from "../lib/ids";
import type {
  AppSettings,
  BadHabitCategory,
  BadHabitDraft,
  FrictionAction,
  MonkMVPState,
  OnboardingState
} from "../types/app";

export const habitOptions: Array<{ category: BadHabitCategory; label: string }> = [
  { category: "doom_scrolling", label: "Doom scrolling" },
  { category: "gaming", label: "Gaming" },
  { category: "pmo", label: "PMO" },
  { category: "random_youtube", label: "Random YouTube" },
  { category: "late_night_content", label: "Late-night content" },
  { category: "too_much_chatting", label: "Too much chatting" },
  { category: "shopping_impulse", label: "Shopping impulse" },
  { category: "other", label: "Other" }
];

export const learningTypes = [
  { value: "book", label: "Book" },
  { value: "course", label: "Course" },
  { value: "podcast", label: "Podcast" },
  { value: "long_video", label: "Long Video" },
  { value: "other", label: "Other" }
] as const;

export function createDefaultSettings(): AppSettings {
  const timestamp = nowIso();
  return {
    id: createId("settings"),
    theme: "light",
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
    planningAssignments: {}
  };
}

export function createInitialState(): MonkMVPState {
  return {
    userProfile: null,
    appSettings: createDefaultSettings(),
    activeSeason: null,
    goals: [],
    badHabits: [],
    weeklyPlans: [],
    dayPlans: [],
    focusSessions: [],
    learningEntries: [],
    journalEntries: [],
    relapseLogs: [],
    timelineDays: [],
    notificationReminders: [],
    onboarding: createDefaultOnboarding(),
    learningSessions: [],
    timelineEvents: []
  };
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
