import { beforeEach, describe, expect, it } from "vitest";
import type { MonkMVPState } from "../types/app";
import { createInitialState } from "../constants/defaultData";
import {
  STORAGE_KEY,
  BACKUP_KEY,
  LAST_FOCUS_KEY,
  clearState,
  hasMeaningfulState,
  loadLastFocus,
  loadState,
  saveBackupState,
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

/** The shape a real install has after onboarding: identity + season + records. */
function meaningfulState(): MonkMVPState {
  const state = createInitialState();
  state.userProfile = {
    id: "user_1",
    onboardingCompleted: true,
    activeSeasonId: "s1",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z"
  };
  state.activeSeason = {
    id: "s1",
    name: "Zendo Season I",
    startDate: "2026-09-29",
    endDate: "2026-12-27",
    durationDays: 90,
    status: "active",
    mode: "planning",
    goalIds: ["g1"],
    badHabitIds: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z"
  };
  state.goals = [
    {
      id: "g1",
      seasonId: "s1",
      title: "Write every morning",
      keystoneAction: "Open the notebook",
      priority: 1,
      weeklyTargetCount: 5,
      status: "active",
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z"
    }
  ];
  return state;
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

  it("keeps the unparseable raw state under a quarantine key", () => {
    // A null from loadState makes `hydrate` no-op, so the store keeps its
    // initial state and the next write persists that over the user's data. The
    // raw string must survive somewhere recoverable instead of vanishing.
    localStorage.setItem(STORAGE_KEY, "{not-json");
    loadState();
    expect(localStorage.getItem(`${STORAGE_KEY}__corrupt_backup`)).toBe("{not-json");
  });

  it("does not quarantine when the state parses", () => {
    saveState(baseState());
    loadState();
    expect(localStorage.getItem(`${STORAGE_KEY}__corrupt_backup`)).toBeNull();
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

  it("separate keys are read only when the main blob omits the array", () => {
    // The main blob is the authoritative copy: it is written first and contains
    // all three arrays. Letting a satellite override unconditionally made the
    // stale satellite left by an interrupted write win on the next load.
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
    expect(loaded.focusSessions.map((s) => s.id)).toEqual(["from-main"]);
    expect(loaded.learningSessions).toEqual([{ id: "learn-main" }]);
    expect(loaded.timelineEvents.map((e) => e.id)).toEqual(["tl-main"]);
  });

  it("separate keys are the fallback for a legacy main blob that omits them", () => {
    const legacy = baseState();
    delete (legacy as Partial<MonkMVPState>).focusSessions;
    delete (legacy as Partial<MonkMVPState>).learningSessions;
    delete (legacy as Partial<MonkMVPState>).timelineEvents;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    localStorage.setItem("focusSessions", JSON.stringify([{ id: "from-key" }]));
    localStorage.setItem("learningSessions", JSON.stringify([{ id: "learn-key" }]));
    localStorage.setItem("timelineEvents", JSON.stringify([{ id: "tl-key" }]));

    const loaded = loadState()!;
    expect(loaded.focusSessions.some((s) => s.id === "from-key")).toBe(true);
    expect(loaded.learningSessions).toEqual([{ id: "learn-key" }]);
    expect(loaded.timelineEvents.map((e) => e.id)).toContain("tl-key");
  });

  it("an absent array in the main blob is not resurrected from a stale satellite", () => {
    const state = baseState({
      learningSessions: [],
      timelineEvents: []
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem("learningSessions", JSON.stringify([{ id: "stale-learn" }]));
    localStorage.setItem("timelineEvents", JSON.stringify([{ id: "stale-tl" }]));
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

  it("clearState removes the last-known-good snapshot too", () => {
    saveBackupState(meaningfulState());
    clearState();
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  // Regression: `partialize` used to omit practices/practiceLogs, so hydrate's
  // `stored.practices ?? []` wiped a user's practices and their logged history
  // on every reload. This asserts the round-trip at the storage layer, which is
  // what the persist adapter actually writes and loadState actually reads.
  it("round-trips practices and practiceLogs through saveState/loadState", () => {
    const state = baseState({
      practices: [{ id: "p1", name: "Membaca" } as MonkMVPState["practices"][number]],
      practiceLogs: [{ id: "l1", practiceId: "p1", date: "2026-08-01" } as MonkMVPState["practiceLogs"][number]]
    });
    saveState(state);

    const loaded = loadState()!;
    expect(loaded.practices).toEqual([{ id: "p1", name: "Membaca" }]);
    expect(loaded.practiceLogs).toEqual([{ id: "l1", practiceId: "p1", date: "2026-08-01" }]);
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

// 2026-10-15 incident: the origin's localStorage was emptied outside the app,
// the app booted blank, showed onboarding, and its own next write persisted the
// blank state — the season only survived in the cloud. These guards make that
// class recoverable: a blank state cannot erase stored data, every boot keeps a
// snapshot worth restoring, and loadState heals a blank/corrupt key from it.
describe("data-loss guards", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
      writable: true
    });
  });

  it("hasMeaningfulState separates seed defaults from user data", () => {
    expect(hasMeaningfulState(createInitialState())).toBe(false);
    expect(hasMeaningfulState(meaningfulState())).toBe(true);
    expect(hasMeaningfulState(null)).toBe(false);
    expect(hasMeaningfulState(undefined)).toBe(false);
  });

  it("saveState refuses to overwrite stored data with a blank state", () => {
    saveState(meaningfulState());
    const before = localStorage.getItem(STORAGE_KEY);
    saveState(createInitialState());
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
    expect(loadState()!.goals.length).toBe(1);
  });

  it("saveState still writes a blank state when nothing is stored", () => {
    saveState(createInitialState());
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(loadState()).not.toBeNull();
  });

  it("saveBackupState ignores blank states", () => {
    saveBackupState(createInitialState());
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it("loadState heals from the snapshot when the main key is blank", () => {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(meaningfulState()));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createInitialState()));
    const loaded = loadState()!;
    expect(loaded.userProfile?.id).toBe("user_1");
    expect(loaded.activeSeason?.id).toBe("s1");
    expect(loaded.goals.map((g) => g.id)).toEqual(["g1"]);
  });

  it("loadState heals from the snapshot when the main key is missing", () => {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(meaningfulState()));
    expect(loadState()!.activeSeason?.id).toBe("s1");
  });

  it("a meaningful main state always wins over the snapshot", () => {
    const stored = meaningfulState();
    stored.goals = [{ ...stored.goals[0], id: "g-main" }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const snapshot = meaningfulState();
    snapshot.goals = [{ ...snapshot.goals[0], id: "g-backup" }];
    localStorage.setItem(BACKUP_KEY, JSON.stringify(snapshot));
    expect(loadState()!.goals.map((g) => g.id)).toEqual(["g-main"]);
  });
});
