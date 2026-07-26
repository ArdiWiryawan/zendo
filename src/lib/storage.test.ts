import { beforeEach, describe, expect, it } from "vitest";
import type { MonkMVPState } from "../types/app";
import {
  STORAGE_KEY,
  LAST_FOCUS_KEY,
  clearState,
  loadLastFocus,
  loadState,
  saveLastFocus,
  saveState
} from "./storage";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    }
  };
}

function baseState(overrides: Partial<MonkMVPState> = {}): MonkMVPState {
  return {
    user: {
      id: "u1",
      onboardingCompleted: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    settings: {
      id: "s1",
      theme: "dark",
      language: "en",
      reducedMotion: false,
      notificationEnabled: false,
      greyModeGuideCompleted: false,
      weeklyMode: "flow",
      defaultFocusDuration: 50,
      openCount: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    seasons: [],
    goals: [],
    badHabits: [],
    weeklyPlans: [],
    dayPlans: [],
    focusSessions: [],
    learningSessions: [],
    journalEntries: [],
    relapseLogs: [],
    timelineDays: [],
    timelineEvents: [],
    notifications: [],
    onboarding: {
      currentStep: "done",
      selectedHabits: [],
      frictionActions: {},
      greyModeConfirmed: true,
      goalDrafts: [],
      releasedGoalIds: [],
      selectedFocusGoalIds: [],
      durationPreset: "30_days",
      seasonDurationDays: 30,
      seasonStartDate: "2026-01-01",
      seasonEndDate: "2026-01-30",
      keystoneActions: {}
    } as unknown as MonkMVPState["onboarding"],
    ...overrides
  } as MonkMVPState;
}

describe("storage", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
      writable: true
    });
  });

  it("loadState returns null when empty", () => {
    expect(loadState()).toBeNull();
  });

  it("loadState returns null on corrupt JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not-json");
    expect(loadState()).toBeNull();
  });

  it("saveState + loadState round-trips main state", () => {
    const state = baseState({ goals: [{ id: "g1" } as MonkMVPState["goals"][number]] });
    saveState(state);
    const loaded = loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.goals).toEqual([{ id: "g1" }]);
    expect(loaded!.focusSessions).toEqual([]);
    expect(loaded!.learningSessions).toEqual([]);
    expect(loaded!.timelineEvents).toEqual([]);
  });

  it("separate keys override focusSessions and replace learning/timeline", () => {
    const state = baseState({
      focusSessions: [{ id: "from-main" } as MonkMVPState["focusSessions"][number]],
      learningSessions: [{ id: "learn-main" } as MonkMVPState["learningSessions"][number]],
      timelineEvents: [{ id: "tl-main" } as MonkMVPState["timelineEvents"][number]]
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(
      "focusSessions",
      JSON.stringify([{ id: "from-key", mode: "deepWork", status: "completed" }])
    );
    localStorage.setItem("learningSessions", JSON.stringify([{ id: "learn-key" }]));
    localStorage.setItem(
      "timelineEvents",
      JSON.stringify([{ id: "tl-key", type: "journal_entry", sourceId: "j1", title: "t", occurredAt: "2026-01-01", createdAt: "2026-01-01" }])
    );

    const loaded = loadState()!;
    expect(loaded.focusSessions.some((s) => s.id === "from-key")).toBe(true);
    expect(loaded.learningSessions).toEqual([{ id: "learn-key" }]);
    expect(loaded.timelineEvents.map((e) => e.id)).toContain("tl-key");
  });

  it("learningSessions and timelineEvents reset to [] without separate keys", () => {
    const state = baseState({
      learningSessions: [{ id: "learn-main" } as MonkMVPState["learningSessions"][number]],
      timelineEvents: [{ id: "tl-main" } as MonkMVPState["timelineEvents"][number]]
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const loaded = loadState()!;
    expect(loaded.learningSessions).toEqual([]);
    expect(loaded.timelineEvents).toEqual([]);
  });

  it("clearState removes main and separate keys", () => {
    saveState(baseState());
    clearState();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("focusSessions")).toBeNull();
    expect(localStorage.getItem("learningSessions")).toBeNull();
    expect(localStorage.getItem("timelineEvents")).toBeNull();
    expect(loadState()).toBeNull();
  });

  it("loadLastFocus returns null when missing/invalid", () => {
    expect(loadLastFocus()).toBeNull();
    localStorage.setItem(LAST_FOCUS_KEY, "{bad");
    expect(loadLastFocus()).toBeNull();
    localStorage.setItem(LAST_FOCUS_KEY, JSON.stringify({ preset: "nope", customMinutes: 20 }));
    expect(loadLastFocus()).toBeNull();
  });

  it("saveLastFocus clamps customMinutes and loadLastFocus reads it", () => {
    saveLastFocus("custom", 2);
    expect(loadLastFocus()).toEqual({ preset: "custom", customMinutes: 5 });
    saveLastFocus("deep_work", 50.6);
    expect(loadLastFocus()).toEqual({ preset: "deep_work", customMinutes: 51 });
  });
});
