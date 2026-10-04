import { describe, expect, it } from "vitest";
import { computeWeeklyRhythm, WEEK_TOTAL_CAPACITY } from "./rhythmAccounting";
import { validateWeeklyAllocation } from "./validation";
import type { GoalAllocation } from "../types/app";

const alloc = (goalId: string, targetCount: number): GoalAllocation => ({
  goalId,
  targetCount,
  completedCount: 0
});

describe("computeWeeklyRhythm", () => {
  it("reports the freed day after one goal is released", () => {
    // What the release flow actually leaves behind: 3 + 2 focus days, 1 rest.
    const rhythm = computeWeeklyRhythm({ goalAllocations: [alloc("g1", 3), alloc("g2", 2)], restDayTarget: 1 });
    expect(rhythm.focusAllocated).toBe(5);
    expect(rhythm.restPlanned).toBe(1);
    expect(rhythm.totalCapacity).toBe(WEEK_TOTAL_CAPACITY);
    expect(rhythm.freeDays).toBe(1);
  });

  it("is zero free days when the plan fills the week", () => {
    const rhythm = computeWeeklyRhythm({ goalAllocations: [alloc("g1", 6)], restDayTarget: 1 });
    expect(rhythm.freeDays).toBe(0);
  });

  it("never reports a negative free day when allocations are over-committed", () => {
    const rhythm = computeWeeklyRhythm({ goalAllocations: [alloc("g1", 8)], restDayTarget: 1 });
    expect(rhythm.freeDays).toBe(0);
  });

  it("reports a whole free week for an empty plan rather than inventing focus days", () => {
    const rhythm = computeWeeklyRhythm({ goalAllocations: [], restDayTarget: 1 });
    expect(rhythm.focusAllocated).toBe(0);
    expect(rhythm.freeDays).toBe(6);
  });
});

describe("validateWeeklyAllocation — the 7-day invariant", () => {
  const validCombinations: Array<[number[], number]> = [
    [[6], 1],
    [[5, 1], 1],
    [[3, 2], 2],
    [[2, 2, 2], 1],
    [[4], 3],
    [[1], 6],
    [[1, 1], 5],
  ];

  it.each(validCombinations)("accepts focus %j with rest %i", (counts, rest) => {
    const allocations = counts.map((count, index) => alloc(`g${index}`, count));
    expect(validateWeeklyAllocation(allocations, rest).valid).toBe(true);
  });

  it.each([
    [[3, 2], 1], // the exact 6→5 shrink a silent release used to produce
    [[7], 1],
    [[6], 2],
    [[5], 1],
  ] as Array<[number[], number]>)("rejects focus %j with rest %i", (counts, rest) => {
    const allocations = counts.map((count, index) => alloc(`g${index}`, count));
    expect(validateWeeklyAllocation(allocations, rest).valid).toBe(false);
  });

  it("rejects a goal with no days", () => {
    expect(validateWeeklyAllocation([alloc("g1", 0), alloc("g2", 7)], 0).valid).toBe(false);
  });

  it("requires at least one rest day, so focus can never claim all seven", () => {
    expect(validateWeeklyAllocation([alloc("g1", 7)], 0).valid).toBe(false);
  });
});

describe("the three reallocation outcomes preserve focus + rest === 7", () => {
  // Mirrors the store's two branches: both claim ALL free days at once, so the
  // outcome is always a full week and no residue is left for the UI to explain.
  const plan = { goalAllocations: [alloc("g1", 3), alloc("g2", 2)], restDayTarget: 1 };

  it("add to an existing goal", () => {
    const { freeDays } = computeWeeklyRhythm(plan);
    const next = {
      goalAllocations: plan.goalAllocations.map((a) => (a.goalId === "g2" ? { ...a, targetCount: a.targetCount + freeDays } : a)),
      restDayTarget: plan.restDayTarget
    };
    const rhythm = computeWeeklyRhythm(next);
    expect(rhythm.focusAllocated).toBe(6);
    expect(rhythm.restPlanned).toBe(1);
    expect(rhythm.freeDays).toBe(0);
    expect(validateWeeklyAllocation(next.goalAllocations, next.restDayTarget).valid).toBe(true);
  });

  it("make it a rest day", () => {
    const { freeDays } = computeWeeklyRhythm(plan);
    const next = { goalAllocations: plan.goalAllocations, restDayTarget: plan.restDayTarget + freeDays };
    const rhythm = computeWeeklyRhythm(next);
    expect(rhythm.focusAllocated).toBe(5);
    expect(rhythm.restPlanned).toBe(2);
    expect(rhythm.freeDays).toBe(0);
    expect(validateWeeklyAllocation(next.goalAllocations, next.restDayTarget).valid).toBe(true);
  });

  it("create a new goal", () => {
    const { freeDays } = computeWeeklyRhythm(plan);
    const next = { goalAllocations: [...plan.goalAllocations, alloc("g3", freeDays)], restDayTarget: plan.restDayTarget };
    const rhythm = computeWeeklyRhythm(next);
    expect(rhythm.focusAllocated).toBe(6);
    expect(rhythm.freeDays).toBe(0);
    expect(validateWeeklyAllocation(next.goalAllocations, next.restDayTarget).valid).toBe(true);
  });

  it("every outcome lands exactly on the capacity", () => {
    const { freeDays } = computeWeeklyRhythm(plan);
    const outcomes = [
      { goalAllocations: plan.goalAllocations.map((a) => (a.goalId === "g1" ? { ...a, targetCount: a.targetCount + freeDays } : a)), restDayTarget: 1 },
      { goalAllocations: [...plan.goalAllocations, alloc("g3", freeDays)], restDayTarget: 1 },
      { goalAllocations: plan.goalAllocations, restDayTarget: 1 + freeDays },
    ];
    for (const outcome of outcomes) {
      const rhythm = computeWeeklyRhythm(outcome);
      expect(rhythm.focusAllocated + rhythm.restPlanned).toBe(WEEK_TOTAL_CAPACITY);
    }
  });
});
