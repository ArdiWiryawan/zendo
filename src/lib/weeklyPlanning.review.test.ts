import { describe, expect, it } from "vitest";
import { createInitialState } from "../constants/defaultData";
import {
  adjustOccurrence,
  confirmWeek,
  undoPlanningChange,
  occurrenceDetails,
} from "./weeklyPlanning";
import { mergeRemoteState } from "./syncMerge";

function fixture() {
  const s = createInitialState();
  const stamp = "2020-01-01T00:00:00.000Z";
  s.activeSeason = {
    id: "s",
    name: "Season",
    startDate: "2026-11-01",
    endDate: "2026-12-31",
    durationDays: 61,
    status: "active",
    mode: "flow",
    goalIds: [],
    badHabitIds: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
  s.weeklyPlans = [
    {
      id: "w",
      seasonId: "s",
      weekNumber: 1,
      startDate: "2026-11-07",
      endDate: "2026-11-13",
      mode: "flow",
      goalAllocations: [],
      restDayTarget: 1,
      status: "active",
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
  return s;
}
const p = {
  id: "p",
  date: "2026-11-07",
  title: "Read",
  startTime: "09:00",
  duration: 60,
  category: "learning" as const,
  occurrenceKey: "reference:2026-11-07",
};
describe("weekly planning review regressions", () => {
  it("does not resurrect undone new actual blocks after cloud merge", () => {
    const before = fixture();
    const after = confirmWeek(before, "w", {
      outcomes: [],
      proposals: [p],
      reflection: "",
    });
    const undone = undoPlanningChange(before, after, after);
    const merged = mergeRemoteState(undone, after);
    expect(merged.dayPlans.flatMap((d) => d.timeBlocks ?? [])).toEqual([]);
  });
  it("preserves provenance on every dated part of a midnight reschedule", () => {
    const state = confirmWeek(fixture(), "w", {
      outcomes: [],
      proposals: [p],
      reflection: "",
    });
    const changed = adjustOccurrence(state, p.date, "weekly:p", {
      kind: "reschedule",
      date: p.date,
      startTime: "23:30",
      duration: 90,
    });
    const parts = changed.dayPlans.flatMap((d) => d.timeBlocks ?? []);
    expect(parts).toHaveLength(2);
    expect(parts.map((b) => b.occurrenceKey)).toEqual([
      p.occurrenceKey,
      p.occurrenceKey,
    ]);
  });
  it("assigns a week-boundary midnight continuation to its actual week", () => {
    const state = fixture();
    const changed = confirmWeek(state, "w", {
      outcomes: [],
      proposals: [
        { ...p, date: "2026-11-13", startTime: "23:30", duration: 90 },
      ],
      reflection: "",
    });
    const continuation = changed.dayPlans.find((d) => d.date === "2026-11-14")!;
    const owner = changed.weeklyPlans.find(
      (w) => w.id === continuation.weeklyPlanId,
    )!;
    expect(
      owner.startDate <= continuation.date &&
        owner.endDate >= continuation.date,
    ).toBe(true);
  });
  it("adjusts an entire midnight occurrence even when its continuation is selected", () => {
    const state = confirmWeek(fixture(), "w", {
      outcomes: [],
      proposals: [{ ...p, startTime: "23:30", duration: 90 }],
      reflection: "",
    });
    const details = occurrenceDetails(state, "2026-11-08", "weekly:p:next");
    expect(details.date).toBe(p.date);
    expect(details.duration).toBe(90);
    expect(details.parts).toHaveLength(2);
    const changed = adjustOccurrence(state, "2026-11-08", "weekly:p:next", {
      kind: "later",
    });
    expect(changed.dayPlans.flatMap((d) => d.timeBlocks ?? [])).toEqual([]);
    expect(changed.weeklyPlans[0].ritual?.held).toHaveLength(1);
    expect(changed.weeklyPlans[0].ritual?.held[0].duration).toBe(90);
  });
  it("reschedules a midnight occurrence without leaving its old continuation", () => {
    const state = confirmWeek(fixture(), "w", {
      outcomes: [],
      proposals: [{ ...p, startTime: "23:30", duration: 90 }],
      reflection: "",
    });
    const changed = adjustOccurrence(state, p.date, "weekly:p", {
      kind: "reschedule",
      date: "2026-11-09",
      startTime: "10:00",
      duration: 90,
    });
    expect(
      changed.dayPlans
        .filter((d) => d.date < "2026-11-09")
        .flatMap((d) => d.timeBlocks ?? []),
    ).toEqual([]);
    const details = occurrenceDetails(changed, "2026-11-09", "weekly:p");
    expect(details.parts).toHaveLength(1);
    expect(details.duration).toBe(90);
    expect(details.block.occurrenceKey).toBe(p.occurrenceKey);
  });
  it("does not rewrite unrelated day records while confirming another date", () => {
    const state = fixture();
    const stamp = "2020-01-01T00:00:00.000Z";
    state.dayPlans = [
      {
        id: "other",
        seasonId: "s",
        weeklyPlanId: "w",
        date: "2026-11-10",
        dayType: "rest",
        status: "planned",
        createdAt: stamp,
        updatedAt: stamp,
      },
    ];
    const changed = confirmWeek(state, "w", {
      outcomes: [],
      proposals: [p],
      reflection: "",
    });
    expect(changed.dayPlans.find((d) => d.id === "other")).toEqual(
      state.dayPlans[0],
    );
  });
});
