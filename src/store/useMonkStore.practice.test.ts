import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore } from "./useMonkStore";
import { createInitialState } from "../constants/defaultData";

/**
 * §23-25: a positive practice is its own entity, not a `BadHabit` with a
 * flipped sign. These pin the behaviours the rest of the app depends on:
 * goal linkage is optional, logging is idempotent per day, and deleting a
 * practice takes its logs with it.
 */
describe("positive practices", () => {
  beforeEach(() => {
    useMonkStore.setState(createInitialState(), false);
    const now = new Date().toISOString();
    useMonkStore.setState({
      activeSeason: {
        id: "season-1",
        name: "Test Season",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        durationDays: 30,
        status: "active",
        mode: "flow",
        goalIds: [],
        badHabitIds: [],
        createdAt: now,
        updatedAt: now
      }
    });
  });

  it("creates a standalone practice with no goal link", () => {
    const p = useMonkStore.getState().addPractice({ name: "Meditate 10 min" });
    expect(p).toBeDefined();
    expect(p!.goalId).toBeUndefined();
    expect(p!.status).toBe("active");
    expect(p!.seasonId).toBe("season-1");
  });

  it("creates a practice linked to a goal (§25)", () => {
    const p = useMonkStore.getState().addPractice({
      name: "Easy run",
      goalId: "goal-1",
      weeklyTargetCount: 3,
      cue: "After morning coffee"
    });
    expect(p!.goalId).toBe("goal-1");
    expect(p!.weeklyTargetCount).toBe(3);
    expect(p!.cue).toBe("After morning coffee");
  });

  it("rejects a blank name rather than storing an empty practice", () => {
    expect(useMonkStore.getState().addPractice({ name: "   " })).toBeUndefined();
    expect(useMonkStore.getState().practices).toHaveLength(0);
  });

  it("clamps the weekly target to a real week", () => {
    const hi = useMonkStore.getState().addPractice({ name: "A", weeklyTargetCount: 99 });
    const lo = useMonkStore.getState().addPractice({ name: "B", weeklyTargetCount: 0 });
    expect(hi!.weeklyTargetCount).toBe(7);
    expect(lo!.weeklyTargetCount).toBe(1);
  });

  it("logging the same day twice is one fact, not two", () => {
    const p = useMonkStore.getState().addPractice({ name: "Meditate" })!;
    useMonkStore.getState().togglePracticeLog(p.id, "2026-09-30");
    useMonkStore.getState().togglePracticeLog(p.id, "2026-09-30");
    // Second call un-toggles — a day is either done or not, never twice.
    expect(useMonkStore.getState().practiceLogs).toHaveLength(0);

    useMonkStore.getState().togglePracticeLog(p.id, "2026-09-30");
    useMonkStore.getState().togglePracticeLog(p.id, "2026-09-29");
    expect(useMonkStore.getState().practiceLogs).toHaveLength(2);
  });

  it("un-toggling removes only the targeted day", () => {
    const p = useMonkStore.getState().addPractice({ name: "Meditate" })!;
    useMonkStore.getState().togglePracticeLog(p.id, "2026-09-30");
    useMonkStore.getState().togglePracticeLog(p.id, "2026-09-29");
    useMonkStore.getState().togglePracticeLog(p.id, "2026-09-30");

    const logs = useMonkStore.getState().practiceLogs;
    expect(logs).toHaveLength(1);
    expect(logs[0].date).toBe("2026-09-29");
  });

  it("removing a practice removes its logs too", () => {
    const p = useMonkStore.getState().addPractice({ name: "Meditate" })!;
    useMonkStore.getState().togglePracticeLog(p.id, "2026-09-30");
    expect(useMonkStore.getState().practiceLogs).toHaveLength(1);

    useMonkStore.getState().removePractice(p.id);
    expect(useMonkStore.getState().practices).toHaveLength(0);
    // An orphaned log would read as a completion of something that is gone.
    expect(useMonkStore.getState().practiceLogs).toHaveLength(0);
  });

  it("updatePractice can pause without losing its history", () => {
    const p = useMonkStore.getState().addPractice({ name: "Meditate" })!;
    useMonkStore.getState().togglePracticeLog(p.id, "2026-09-30");
    useMonkStore.getState().updatePractice(p.id, { status: "paused", name: "Meditate 15 min" });

    const updated = useMonkStore.getState().practices[0];
    expect(updated.status).toBe("paused");
    expect(updated.name).toBe("Meditate 15 min");
    expect(useMonkStore.getState().practiceLogs).toHaveLength(1);
  });

  it("updatePractice ignores a blank rename instead of erasing the name", () => {
    const p = useMonkStore.getState().addPractice({ name: "Meditate" })!;
    useMonkStore.getState().updatePractice(p.id, { name: "   " });
    expect(useMonkStore.getState().practices[0].name).toBe("Meditate");
  });

  it("a practice needs an active season", () => {
    useMonkStore.setState({ activeSeason: null });
    expect(useMonkStore.getState().addPractice({ name: "Meditate" })).toBeUndefined();
  });
});
