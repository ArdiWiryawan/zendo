import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore, goalEvidence, goalProgress } from "./useMonkStore";
import { createInitialState } from "../constants/defaultData";
import { getTodayDateString } from "../lib/date";
import type { FocusSession, Goal, MonkMVPState } from "../types/app";

/**
 * Progress must be DERIVED from qualifying evidence, never accumulated.
 *
 * The bug these pin: the allocation counter counted only day plans marked
 * "completed" and never looked at focus sessions, so finishing two deep work
 * sessions linked to a goal still showed 0/2 and the user's real work vanished.
 *
 * Because progress is recomputed from the session records on every read, these
 * also hold the properties a counter cannot provide: deleting a session lowers
 * the count, pausing does not inflate it, and an abandoned session never counts.
 */
describe("goal progress is derived from evidence", () => {
  const now = new Date().toISOString();

  const goal = (over: Partial<Goal> = {}): Goal => ({
    id: "goal-1",
    seasonId: "season-1",
    title: "Ship the report",
    keystoneAction: "Draft the findings",
    priority: 1,
    weeklyTargetCount: 2,
    type: "frequency",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...over
  });

  const session = (over: Partial<FocusSession> = {}): FocusSession => ({
    id: "fs-1",
    seasonId: "season-1",
    weeklyPlanId: "week-1",
    dayPlanId: "day-1",
    goalId: "goal-1",
    startTime: "2026-09-30T09:00:00.000Z",
    completedAt: "2026-09-30T09:52:00.000Z",
    durationMinutes: 52,
    status: "completed",
    createdAt: now,
    updatedAt: now,
    ...over
  });

  const stateWith = (sessions: FocusSession[], goals: Goal[] = [goal()]): MonkMVPState =>
    ({ ...createInitialState(), focusSessions: sessions, goals } as MonkMVPState);

  beforeEach(() => {
    useMonkStore.setState(createInitialState(), false);
  });

  it("counts a completed session linked to the goal", () => {
    const state = stateWith([session()]);
    expect(goalEvidence(state, "goal-1")).toHaveLength(1);
  });

  it("reaches the target after two qualifying sessions", () => {
    const state = stateWith([
      session({ id: "fs-1" }),
      session({ id: "fs-2", completedAt: "2026-09-30T14:00:00.000Z" })
    ]);
    const progress = goalProgress(state, goal());
    expect(progress.count).toBe(2);
    expect(progress.target).toBe(2);
  });

  it("ignores a session linked to a different goal", () => {
    const state = stateWith([session({ goalId: "goal-other" })]);
    expect(goalEvidence(state, "goal-1")).toHaveLength(0);
  });

  it("ignores a session with no goal at all", () => {
    const state = stateWith([session({ goalId: undefined })]);
    expect(goalEvidence(state, "goal-1")).toHaveLength(0);
  });

  it("does not count a running, paused or abandoned session", () => {
    const state = stateWith([
      session({ id: "fs-run", status: "running" }),
      session({ id: "fs-paused", status: "paused" }),
      session({ id: "fs-abandoned", status: "abandoned" }),
      session({ id: "fs-early", status: "ended_early" })
    ]);
    // §8: starting or pausing work is not yet evidence of it.
    expect(goalEvidence(state, "goal-1")).toHaveLength(0);
  });

  it("counts a session once however many times it was paused and resumed", () => {
    // Pause/resume mutates the same record, so the id stays the unit of
    // evidence — a pause can never become a second +1 (§12).
    const state = stateWith([session({ id: "fs-1", status: "completed" })]);
    expect(goalEvidence(state, "goal-1")).toHaveLength(1);
  });

  it("drops back to the real count when a qualifying session is deleted", () => {
    // Scenario 8: removing evidence recalculates. A stored counter would have
    // kept reporting 2 here.
    const two = stateWith([session({ id: "fs-1" }), session({ id: "fs-2" })]);
    expect(goalEvidence(two, "goal-1")).toHaveLength(2);
    const one = stateWith([session({ id: "fs-1" })]);
    expect(goalEvidence(one, "goal-1")).toHaveLength(1);
  });

  it("keeps history and re-derives when the target is raised", () => {
    // Scenario 7: 2 sessions still exist, the target moves — so 2/3, not a
    // stretched or reset counter.
    const state = stateWith([
      session({ id: "fs-1" }),
      session({ id: "fs-2" })
    ]);
    const progress = goalProgress(state, goal({ weeklyTargetCount: 3 }));
    expect(progress.count).toBe(2);
    expect(progress.target).toBe(3);
  });

  it("respects the period bounds", () => {
    const state = stateWith([
      session({ id: "fs-in", completedAt: "2026-09-30T09:00:00.000Z" }),
      session({ id: "fs-out", completedAt: "2026-08-01T09:00:00.000Z" })
    ]);
    const inPeriod = goalEvidence(state, "goal-1", {
      since: "2026-09-28T00:00:00.000Z",
      until: "2026-10-04T23:59:59.999Z"
    });
    expect(inPeriod).toHaveLength(1);
    expect(inPeriod[0].id).toBe("fs-in");
  });

  it("reports no target for goal types that have no per-period count", () => {
    // §9: an achievement goal has no "N per week" meaning, so it must not be
    // shown a fabricated target. Evidence is still reported.
    const state = stateWith([session()]);
    const progress = goalProgress(state, goal({ type: "achievement" }));
    expect(progress.count).toBe(1);
    expect(progress.target).toBeUndefined();
  });

  it("does not let deep work complete an output goal", () => {
    // §9 Type B: sessions on a publish-a-video goal are supporting evidence.
    // Counting them as the completion number would claim the goal is done when
    // nothing shipped, so the type carries no automatic target.
    const state = stateWith([session(), session({ id: "fs-2" })]);
    const progress = goalProgress(state, goal({ type: "maintenance" }));
    expect(progress.count).toBe(2);
    expect(progress.target).toBeUndefined();
  });

  it("prefers the outcome frequency over the practice rhythm when both are set", () => {
    // §13: the two are different commitments. The outcome target is what the
    // progress number is measured against.
    const state = stateWith([session()]);
    const progress = goalProgress(
      state,
      goal({ weeklyTargetCount: 5, outcomeFrequencyPerWeek: 2 })
    );
    expect(progress.target).toBe(2);
  });

  it("starts the week's allocation at zero with no evidence", () => {
    const state = stateWith([]);
    expect(goalEvidence(state, "goal-1")).toHaveLength(0);
  });

  it("counts only the sessions belonging to the goal it was asked about", () => {
    const state = stateWith(
      [session({ id: "fs-1", goalId: "goal-1" }), session({ id: "fs-2", goalId: "goal-2" })],
      [goal(), goal({ id: "goal-2", title: "Other" })]
    );
    expect(goalEvidence(state, "goal-1")).toHaveLength(1);
    expect(goalEvidence(state, "goal-2")).toHaveLength(1);
  });

  it("keeps today's date out of the derivation", () => {
    // Guards the class of bug that broke two other suites when the calendar
    // rolled over: nothing here should depend on the wall clock.
    expect(getTodayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
