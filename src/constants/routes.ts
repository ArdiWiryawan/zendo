export const routes = {
  root: "/",
  onboardingWelcome: "/onboarding/welcome",
  onboardingHabits: "/onboarding/habits",
  onboardingRemove: "/onboarding/remove",
  onboardingGreyMode: "/onboarding/grey-mode",
  onboardingGoals: "/onboarding/goals",
  onboardingEliminate: "/onboarding/eliminate",
  onboardingFocusGoals: "/onboarding/focus-goals",
  onboardingNarrow: "/onboarding/narrow",
  onboardingSeason: "/onboarding/season",
  onboardingKeystone: "/onboarding/keystone",
  onboardingWeeklyMode: "/onboarding/weekly-mode",
  onboardingWeekSetup: "/onboarding/week-setup",
  today: "/today",
  week: "/week",
  timeline: "/timeline",
  journal: "/journal",
  focus: "/focus",
  learn: "/learn",
  relapse: "/relapse",
  seasonEnd: "/season-end",
  settings: "/settings",
  library: "/library"
} as const;

export const onboardingOrder = [
  routes.onboardingWelcome,
  routes.onboardingSeason,
  routes.onboardingGoals,
  routes.onboardingNarrow,
  routes.onboardingKeystone,
  routes.onboardingWeekSetup
] as const;
