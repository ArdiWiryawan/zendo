import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore } from "./useMonkStore";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import { MAX_ACTIVE_GOAL_TRACKS } from "../lib/validation";

/**
 * GOAL TRACKS — a real entity behind the season's focus areas, so a track can
 * be renamed, reordered, paused and deleted. `Goal.track` still holds the track
 * NAME, so the tests below pin the two invariants that keeps honest: a rename
 * propagates to the matching goals, and a delete never touches them.
 */
describe("goal tracks", () => {
  beforeEach(() => {
    useMonkStore.setState(createInitialState(), false);
    const now = new Date().toISOString();
    // Derived, never hardcoded: a fixed date silently rots as the calendar rolls.
    useMonkStore.setState({
      activeSeason: {
        id: "season-1",
        name: "Test Season",
        startDate: getTodayDateString(),
        endDate: "2099-09-30",
        durationDays: 30,
        status: "active",
        mode: "flow",
        goalIds: [],
        badHabitIds: [],
        createdAt: now,
        updatedAt: now
      },
      goals: [
        {
          id: "goal-1",
          seasonId: "season-1",
          title: "Ship the channel",
          keystoneAction: "Record one clip",
          track: "YouTube",
          priority: 1,
          status: "active",
          weeklyTargetCount: 4,
          createdAt: now,
          updatedAt: now
        },
        {
          id: "goal-2",
          seasonId: "season-1",
          title: "Land the internship",
          keystoneAction: "Send one application",
          track: "Magang",
          priority: 2,
          status: "active",
          weeklyTargetCount: 4,
          createdAt: now,
          updatedAt: now
        }
      ]
    });
  });

  const tracks = () => useMonkStore.getState().goalTracks;
  const activeCount = () => tracks().filter((t) => t.status === "active").length;

  function addActive(name: string) {
    return useMonkStore.getState().addGoalTrack(name);
  }

  it("creates a track scoped to the season with an incrementing order", () => {
    const first = addActive("Studi");
    const second = addActive("Bisnis");

    expect(first).toBeDefined();
    expect(first!.seasonId).toBe("season-1");
    expect(first!.status).toBe("active");
    expect(first!.name).toBe("Studi");
    expect(first!.order).toBe(1);
    expect(second!.order).toBe(2);
    expect(tracks()).toHaveLength(2);
  });

  it("trims the name and rejects a blank one", () => {
    expect(addActive("   ")).toBeUndefined();
    expect(tracks()).toHaveLength(0);

    const trimmed = addActive("  Bisnis  ");
    expect(trimmed!.name).toBe("Bisnis");
  });

  it("refuses the track past the active cap", () => {
    addActive("A");
    addActive("B");
    addActive("C");
    expect(activeCount()).toBe(MAX_ACTIVE_GOAL_TRACKS);

    const refused = addActive("D");
    expect(refused).toBeUndefined();
    expect(tracks()).toHaveLength(MAX_ACTIVE_GOAL_TRACKS);
    expect(tracks().some((t) => t.name === "D")).toBe(false);
  });

  it("frees a slot when a track is paused", () => {
    addActive("A");
    addActive("B");
    addActive("C");
    const [first] = tracks();

    useMonkStore.getState().setGoalTrackStatus(first.id, "paused");
    expect(activeCount()).toBe(MAX_ACTIVE_GOAL_TRACKS - 1);
    // Pausing keeps the record — it is a lifecycle change, not a delete.
    expect(tracks()).toHaveLength(MAX_ACTIVE_GOAL_TRACKS);

    const replacement = addActive("D");
    expect(replacement).toBeDefined();
    expect(activeCount()).toBe(MAX_ACTIVE_GOAL_TRACKS);
  });

  it("resumes a paused track", () => {
    const created = addActive("A");
    useMonkStore.getState().setGoalTrackStatus(created!.id, "paused");
    useMonkStore.getState().setGoalTrackStatus(created!.id, "active");
    expect(tracks()[0].status).toBe("active");
  });

  it("propagates a rename to every goal in the season holding the old name", () => {
    const created = addActive("YouTube");

    useMonkStore.getState().renameGoalTrack(created!.id, "Konten");

    expect(tracks()[0].name).toBe("Konten");
    expect(useMonkStore.getState().goals.find((g) => g.id === "goal-1")!.track).toBe("Konten");
    // A goal on a different track is left alone.
    expect(useMonkStore.getState().goals.find((g) => g.id === "goal-2")!.track).toBe("Magang");
  });

  it("ignores a blank rename instead of blanking the track", () => {
    const created = addActive("YouTube");
    useMonkStore.getState().renameGoalTrack(created!.id, "   ");
    expect(tracks()[0].name).toBe("YouTube");
    expect(useMonkStore.getState().goals.find((g) => g.id === "goal-1")!.track).toBe("YouTube");
  });

  it("persists reorder from the given id sequence", () => {
    const a = addActive("A");
    const b = addActive("B");
    const c = addActive("C");

    useMonkStore.getState().reorderGoalTracks([c!.id, a!.id, b!.id]);

    const ordered = [...tracks()].sort((x, y) => x.order - y.order).map((t) => t.name);
    expect(ordered).toEqual(["C", "A", "B"]);
  });

  it("removes a track without touching the goals that carried its name", () => {
    const created = addActive("YouTube");

    useMonkStore.getState().removeGoalTrack(created!.id);

    expect(tracks()).toHaveLength(0);
    // The goal survives, still labelled — it just reads as untracked now.
    const goal = useMonkStore.getState().goals.find((g) => g.id === "goal-1");
    expect(goal).toBeDefined();
    expect(goal!.track).toBe("YouTube");
    expect(useMonkStore.getState().goals).toHaveLength(2);
  });

  it("does nothing without an active season", () => {
    useMonkStore.setState({ activeSeason: null, goalTracks: [] }, false);
    expect(addActive("A")).toBeUndefined();
    expect(tracks()).toHaveLength(0);
  });
});
