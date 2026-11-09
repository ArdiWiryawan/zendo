import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../constants/defaultData";
import { useMonkStore } from "../store/useMonkStore";
import { STORAGE_KEY, loadState } from "./storage";
import { mergeRemoteState } from "./syncMerge";
import {
  persistPlanningChange,
  saveIdealWeek,
  saveWeekDraft,
  upsertIdealWeek,
  deleteIdealWeek,
} from "./weeklyPlanningStore";
import { emptyRitual } from "./weeklyPlanning";
import type { IdealBlock, WeeklyDraft } from "../types/app";

const stamp = "2026-11-07T08:00:00.000Z";
const draft: WeeklyDraft = {
  outcomes: [{ id: "o", title: "Read chapter", status: "open" }],
  proposals: [],
  reflection: "Protect mornings",
};
const reference: IdealBlock = {
  id: "r",
  title: "Read",
  days: [1],
  startTime: "09:00",
  duration: 60,
  category: "learning",
  flexible: true,
};
let records: Map<string, string>;
beforeEach(() => {
  records = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => {
      records.set(key, value);
    },
    removeItem: (key: string) => {
      records.delete(key);
    },
  });
  const state = createInitialState();
  state.weeklyPlans = [
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
  useMonkStore.setState(state);
});
afterEach(() => vi.unstubAllGlobals());

describe("durable weekly planning writes", () => {
  it("customizes selected weekdays while preserving the original routine on other days", () => {
    const original = { ...reference, days: [0, 1, 2, 3, 4, 5, 6], color: "#86afd9" };
    saveIdealWeek([original]);
    const monday = { ...original, id: "monday", title: "Design", days: [1], duration: 90 };
    upsertIdealWeek(original.id, [monday], [1]);
    expect(loadState()?.appSettings.idealWeek).toEqual([
      { ...original, days: [0, 2, 3, 4, 5, 6] }, monday,
    ]);
    const weekend = { ...original, id: "weekend", title: "Learn", days: [0, 6] };
    upsertIdealWeek(original.id, [weekend], [0, 6]);
    expect(loadState()?.appSettings.idealWeek).toContainEqual({ ...original, days: [2, 3, 4, 5] });
    deleteIdealWeek(original.id, [2]);
    expect(loadState()?.appSettings.idealWeek).toContainEqual({ ...original, days: [3, 4, 5] });
  });
  it("persists custom colors through updates/reload and rejects invalid CSS values", () => {
    upsertIdealWeek(reference.id, [{ ...reference, color: "#d65a84" }]);
    expect(loadState()?.appSettings.idealWeek?.[0].color).toBe("#d65a84");
    const before = useMonkStore.getState();
    expect(() => upsertIdealWeek(reference.id, [{ ...reference, color: "red;display:none" }])).toThrow();
    expect(useMonkStore.getState()).toBe(before);
    upsertIdealWeek(reference.id, [reference]);
    expect(loadState()?.appSettings.idealWeek?.[0].color).toBeUndefined();
  });
  it("creates, edits duration/repeat days, and deletes only the chosen activity durably", () => {
    upsertIdealWeek(reference.id, [reference]);
    const other = { ...reference, id: "other", title: "Walk" };
    upsertIdealWeek(other.id, [other]);
    const edited = { ...reference, duration: 30, days: [2, 3] };
    upsertIdealWeek(reference.id, [edited]);
    expect(loadState()?.appSettings.idealWeek).toEqual([other, edited]);
    deleteIdealWeek(reference.id);
    expect(useMonkStore.getState().appSettings.idealWeek).toEqual([other]);
    expect(loadState()?.appSettings.idealWeek).toEqual([other]);
  });
  it("rejects identical routines on shared days without changing saved activities", () => {
    upsertIdealWeek(reference.id, [reference]);
    expect(() => upsertIdealWeek("duplicate", [{ ...reference, id: "duplicate", title: " read " }])).toThrow("duplicate");
    expect(loadState()?.appSettings.idealWeek).toEqual([reference]);
    upsertIdealWeek("different-day", [{ ...reference, id: "different-day", days: [2] }]);
    expect(loadState()?.appSettings.idealWeek).toHaveLength(2);
  });
  it("leaves saved activities intact when deleting fails to persist", () => {
    saveIdealWeek([reference]);
    vi.stubGlobal("localStorage", { setItem: () => { throw new Error("quota"); } });
    expect(() => deleteIdealWeek(reference.id)).toThrow("quota");
    expect(useMonkStore.getState().appSettings.idealWeek).toEqual([reference]);
  });
  it("hydrates each week's own ritual instead of copying the first week", () => {
    const state = useMonkStore.getState();
    const first = state.weeklyPlans[0];
    useMonkStore.setState({
      weeklyPlans: [
        first,
        {
          ...first,
          id: "week-two",
          weekNumber: 2,
          startDate: "2026-11-14",
          endDate: "2026-11-20",
          ritual: {
            ...emptyRitual(),
            outcomes: [
              { id: "second", title: "Second week result", status: "open" },
            ],
          },
        },
      ],
    });
    useMonkStore.getState().hydrate();
    expect(useMonkStore.getState().weeklyPlans.map((w) => w.id)).toEqual([
      first.id,
      "week-two",
    ]);
    expect(
      useMonkStore.getState().weeklyPlans[1].ritual?.outcomes[0].title,
    ).toBe("Second week result");
  });
  it("does not publish live changes if canonical persistence fails", () => {
    const before = useMonkStore.getState();
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(() =>
      persistPlanningChange((s) => ({ ...s, weeklyPlans: [] })),
    ).toThrow();
    expect(useMonkStore.getState()).toBe(before);
  });
  it("saves draft without confirming it, and reloads through existing storage", () => {
    saveWeekDraft("w", draft);
    expect(useMonkStore.getState().weeklyPlans[0].ritual?.draft).toEqual(draft);
    expect(
      useMonkStore.getState().weeklyPlans[0].ritual?.confirmedAt,
    ).toBeUndefined();
    expect(loadState()?.weeklyPlans[0].ritual?.draft).toEqual(draft);
    expect(
      JSON.parse(records.get(STORAGE_KEY)!).weeklyPlans[0].ritual.draft,
    ).toEqual(draft);
  });
  it("preserves confirmed outcomes and occurrence history while editing a draft", () => {
    const state = useMonkStore.getState();
    const confirmed = {
      ...emptyRitual(),
      outcomes: [
        { id: "old", title: "Confirmed result", status: "done" as const },
      ],
      confirmedAt: stamp,
      appliedKeys: ["r:2026-11-07"],
    };
    useMonkStore.setState({
      weeklyPlans: state.weeklyPlans.map((week) => ({
        ...week,
        ritual: confirmed,
      })),
    });
    saveWeekDraft("w", draft);
    const ritual = useMonkStore.getState().weeklyPlans[0].ritual;
    expect(ritual).toEqual({ ...confirmed, draft });
  });
  it("retains confirmed outcome and reference fields during draft edits and cloud merge", () => {
    saveIdealWeek([reference]);
    saveWeekDraft("w", draft);
    const saved = useMonkStore.getState();
    const legacy = createInitialState();
    legacy.appSettings.updatedAt = "2000-01-01T00:00:00.000Z";
    const merged = mergeRemoteState(legacy, saved);
    expect(merged.appSettings.idealWeek).toEqual([reference]);
    expect(merged.weeklyPlans[0].ritual?.draft).toEqual(draft);
    expect(saved.dayPlans).toEqual([]);
    expect(typeof useMonkStore.getState().hydrate).toBe("function");
  });
  it("rejects invalid references and missing weeks before publishing", () => {
    const before = useMonkStore.getState();
    expect(() => saveIdealWeek([{ ...reference, duration: 0 }])).toThrow();
    expect(() => saveWeekDraft("missing", draft)).toThrow();
    expect(useMonkStore.getState()).toBe(before);
  });
});
