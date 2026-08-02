import { beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "../constants/defaultData";
import { useMonkStore } from "./useMonkStore";
import { selectSeasonFocusSummary } from "./selectors";

function startSeason() {
  const state = useMonkStore.getState();
  state.setSeasonDuration(30);
  const draftId = state.onboarding.goalDrafts[0].id;
  state.updateGoalDraft(draftId, "Read more");
  state.toggleFocusGoal(draftId);
  state.createSeasonFromOnboarding();
  return useMonkStore.getState().activeSeason!;
}

describe("season archive (pastSeasons)", () => {
  beforeEach(() => {
    useMonkStore.setState(createInitialState(), false);
  });

  it("archives the previous season when a new one starts", () => {
    const first = startSeason();
    // Start a second season via the same onboarding path.
    startSeason();
    const { activeSeason, pastSeasons } = useMonkStore.getState();
    expect(pastSeasons).toHaveLength(1);
    expect(pastSeasons[0].id).toBe(first.id);
    expect(activeSeason!.id).not.toBe(first.id);
  });

  it("does not duplicate a season already in pastSeasons", () => {
    const first = startSeason();
    useMonkStore.getState().archiveSeason();
    useMonkStore.getState().archiveSeason();
    expect(useMonkStore.getState().pastSeasons).toHaveLength(1);
    expect(useMonkStore.getState().pastSeasons[0].id).toBe(first.id);
  });

  it("startNewSeason archives the active season into pastSeasons", () => {
    const first = startSeason();
    useMonkStore.getState().startNewSeason();
    const { activeSeason, pastSeasons } = useMonkStore.getState();
    expect(pastSeasons).toHaveLength(1);
    expect(pastSeasons[0].id).toBe(first.id);
    expect(activeSeason?.status).toBe("archived");
  });

  it("old season's focus sessions stay scoped and summary is per-season", () => {
    const first = startSeason();
    const second = startSeason();

    // Simulate a completed focus session in each season.
    const now = new Date().toISOString();
    const mk = (seasonId: string) => ({
      id: `s_${seasonId}`,
      seasonId,
      weeklyPlanId: `w_${seasonId}`,
      dayPlanId: `d_${seasonId}`,
      status: "completed" as const,
      startTime: now,
      focusDurationMinutes: 25,
      durationMinutes: 25,
      createdAt: now,
      updatedAt: now,
    });
    useMonkStore.setState((s) => ({
      focusSessions: [mk(first.id), mk(second.id)],
    }));

    const state = useMonkStore.getState();
    expect(selectSeasonFocusSummary(state, first.id).totalMinutes).toBe(25);
    expect(selectSeasonFocusSummary(state, second.id).totalMinutes).toBe(25);
    expect(selectSeasonFocusSummary(state, first.id).count).toBe(1);
  });

  it("resumeSeason re-opens an archived season without losing data", () => {
    const first = startSeason();
    useMonkStore.getState().archiveSeason();
    expect(useMonkStore.getState().activeSeason?.status).toBe("archived");
    // Keep a goal to confirm it survives resume.
    const goalBefore = useMonkStore.getState().goals.length;

    useMonkStore.getState().resumeSeason();

    const { activeSeason, userProfile } = useMonkStore.getState();
    expect(activeSeason?.id).toBe(first.id);
    expect(activeSeason?.status).toBe("active");
    expect(userProfile?.activeSeasonId).toBe(first.id);
    expect(userProfile?.onboardingCompleted).toBe(true);
    expect(useMonkStore.getState().goals.length).toBe(goalBefore); // data preserved
  });
});
