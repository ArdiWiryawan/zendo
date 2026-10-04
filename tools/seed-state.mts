/**
 * Dump a seeded Zendo state to stdout as the JSON the app expects in
 * localStorage under `monk_mode_pwa_state_v1`.
 *
 * Why this exists: the app gates every main route on
 * `userProfile.onboardingCompleted && activeSeason`, and the onboarding flow is
 * seven screens long. Reaching /settings or /guide in a browser check otherwise
 * means clicking through all of them. This builds the post-onboarding state
 * directly so Playwright can seed localStorage and land on the real screen.
 *
 *   node --import tsx tools/seed-state.mts > seed.json
 */
import { createInitialState } from "../src/constants/defaultData";
import { getTodayDateString } from "../src/lib/date";
import type { MonkMVPState } from "../src/types/app";

/** Onboarding draft that createSeasonFromOnboarding can consume. */
function seededState(): MonkMVPState {
  const base = createInitialState();
  const today = getTodayDateString();
  const goalId = "goal-seed-1";

  const state = {
    ...base,
    onboarding: {
      ...base.onboarding,
      goalDrafts: [{ id: goalId, title: "Ship the onboarding redesign" }],
      selectedFocusGoalIds: [goalId],
      keystoneActions: { [goalId]: "Write the guide copy" },
      goalWhys: { [goalId]: "People quit because they never learn the system." },
      selectedHabits: [],
    },
    userProfile: {
      id: "user-seed",
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    appSettings: { ...base.appSettings, language: "en" as const },
  } as MonkMVPState;

  return state;
}

// createSeasonFromOnboarding lives on the store, which needs a browser-ish
// environment (zustand persist). Instead of instantiating the store here, emit
// the state and let the store build the season on first hydrate: the app calls
// ensureSeasonFresh(), but only when a profile exists. So we build the season
// shape ourselves with the same fields createSeasonFromOnboarding writes.
const s = seededState();
const now = new Date().toISOString();
const seasonId = "season-seed-1";
const today = getTodayDateString();
const end = new Date();
end.setDate(end.getDate() + 29);
const endDate = end.toISOString().slice(0, 10);

const out: MonkMVPState = {
  ...s,
  userProfile: { ...s.userProfile!, activeSeasonId: seasonId },
  activeSeason: {
    id: seasonId,
    name: "Seeded season",
    startDate: today,
    endDate,
    durationDays: 30,
    status: "active",
    createdAt: now,
    updatedAt: now,
  } as MonkMVPState["activeSeason"],
  goals: [
    {
      id: "goal-seed-1",
      seasonId,
      title: "Ship the onboarding redesign",
      keystoneAction: "Write the guide copy",
      priority: 1,
      weeklyTargetCount: 3,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ] as MonkMVPState["goals"],
};

process.stdout.write(JSON.stringify(out));
