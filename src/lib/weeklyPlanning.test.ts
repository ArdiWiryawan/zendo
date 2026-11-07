import { describe, it, expect } from "vitest";
import { createInitialState } from "../constants/defaultData";
import {
  confirmWeek,
  adjustOccurrence,
  referenceProposals,
} from "./weeklyPlanning";

function fixture() {
  const s = createInitialState();
  const stamp = "2026-11-07T08:00:00Z";
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
const proposal = {
  id: "p",
  date: "2026-11-07",
  title: "Read",
  startTime: "09:00",
  duration: 60,
  category: "learning" as const,
  occurrenceKey: "ref:2026-11-07",
};
describe("weekly planning transactions", () => {
  it("references start as suggestions and never mutate actual schedule", () => {
    const s = fixture();
    const p = referenceProposals(
      [
        {
          id: "ref",
          title: "Read",
          days: [6],
          startTime: "09:00",
          duration: 60,
          category: "learning",
          flexible: true,
        },
      ],
      s.weeklyPlans[0],
    );
    expect(p).toHaveLength(1);
    expect(s.dayPlans).toEqual([]);
  });
  it("confirms atomically and never reapplies an occurrence", () => {
    const s = fixture();
    const next = confirmWeek(s, "w", {
      outcomes: [],
      proposals: [proposal],
      reflection: "",
    });
    expect(s.dayPlans).toHaveLength(0);
    expect(next.dayPlans[0].timeBlocks).toHaveLength(1);
    expect(
      confirmWeek(next, "w", {
        outcomes: [],
        proposals: [proposal],
        reflection: "",
      }).dayPlans[0].timeBlocks,
    ).toHaveLength(1);
  });
  it("rejects overlapping proposals without modifying state", () => {
    const s = fixture();
    expect(() =>
      confirmWeek(s, "w", {
        outcomes: [],
        proposals: [
          proposal,
          { ...proposal, id: "other", occurrenceKey: undefined },
        ],
        reflection: "",
      }),
    ).toThrow("conflict");
    expect(s.dayPlans).toEqual([]);
  });
  it("splits midnight across dated days and keeps Highlight/Main Action untouched", () => {
    const next = confirmWeek(fixture(), "w", {
      outcomes: [],
      proposals: [{ ...proposal, startTime: "23:30", duration: 90 }],
      reflection: "",
    });
    expect(
      next.dayPlans.map((d) => [
        d.date,
        d.timeBlocks?.[0].startTime,
        d.timeBlocks?.[0].endTime,
      ]),
    ).toEqual([
      ["2026-11-07", "23:30", "24:00"],
      ["2026-11-08", "00:00", "01:00"],
    ]);
    expect(next.dayPlans[0].mainAction).toBeUndefined();
    expect(next.dayPlans[0].highlight).toBeUndefined();
  });
  it("defers work without changing template, and retains duplicate protection", () => {
    let s = fixture();
    s.appSettings.idealWeek = [
      {
        id: "ref",
        title: "Read",
        days: [6],
        startTime: "09:00",
        duration: 60,
        category: "learning",
        flexible: true,
      },
    ];
    s = confirmWeek(s, "w", {
      outcomes: [],
      proposals: [proposal],
      reflection: "",
    });
    const id = s.dayPlans[0].timeBlocks![0].id;
    const next = adjustOccurrence(s, "2026-11-07", id, { kind: "later" });
    expect(next.dayPlans[0].timeBlocks).toEqual([]);
    expect(next.weeklyPlans[0].ritual?.held).toHaveLength(1);
    expect(next.appSettings.idealWeek).toEqual(s.appSettings.idealWeek);
    expect(
      confirmWeek(next, "w", {
        outcomes: [],
        proposals: [proposal],
        reflection: "",
      }).dayPlans[0].timeBlocks,
    ).toEqual([]);
  });
  it("keeps more than three outcomes and requires explicit completion", () => {
    const outcomes = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      title: "Outcome " + i,
      status: "open" as const,
    }));
    const next = confirmWeek(fixture(), "w", {
      outcomes,
      proposals: [],
      reflection: "",
    });
    expect(next.weeklyPlans[0].ritual?.outcomes).toEqual(outcomes);
  });
});
