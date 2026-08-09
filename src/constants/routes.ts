export const routes = {
  root: "/",
  onboardingWelcome: "/onboarding/welcome",
  onboardingSeason: "/onboarding/season",
  onboardingGoals: "/onboarding/goals",
  onboardingKeystone: "/onboarding/keystone",
  onboardingPreview: "/onboarding/preview",
  onboardingHabits: "/onboarding/habits",
  today: "/today",
  week: "/week",
  timeline: "/timeline",
  journal: "/journal",
  focus: "/focus",
  learn: "/learn",
  relapse: "/relapse",
  seasonEnd: "/season-end",
  seasons: "/seasons",
  seasonDetail: "/seasons/:seasonId",
  settings: "/settings",
  library: "/library",
  notebook: "/notebook",
  packs: "/packs",
  login: "/login",
  signup: "/signup"
} as const;

export const onboardingOrder = [
  routes.onboardingWelcome,
  routes.onboardingHabits,
  routes.onboardingGoals,
  routes.onboardingKeystone,
  routes.onboardingSeason,
  routes.onboardingPreview
] as const;
