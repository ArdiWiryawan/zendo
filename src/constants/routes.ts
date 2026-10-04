export const routes = {
  root: "/",
  onboardingWelcome: "/onboarding/welcome",
  onboardingSeason: "/onboarding/season",
  onboardingGoals: "/onboarding/goals",
  onboardingKeystone: "/onboarding/keystone",
  onboardingPreview: "/onboarding/preview",
  onboardingHabits: "/onboarding/habits",
  onboardingFriction: "/onboarding/friction",
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
  guide: "/guide",
  packs: "/packs",
  login: "/login",
  signup: "/signup"
} as const;

export const onboardingOrder = [
  routes.onboardingWelcome,
  routes.onboardingHabits,
  routes.onboardingFriction,
  routes.onboardingGoals,
  routes.onboardingKeystone,
  routes.onboardingSeason,
  routes.onboardingPreview
] as const;
