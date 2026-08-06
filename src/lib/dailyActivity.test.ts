import { beforeEach, describe, expect, it } from "vitest";
import type { MonkMVPState } from "../types/app";
import { getRelapseForDate, isReentryAnswered, isRetroEligible, markReentryAnswered } from "./dailyActivity";

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

describe("isRetroEligible", () => {
  it("rejects today and future dates", () => {
    expect(isRetroEligible("2026-08-01", "not_started", "2026-08-01")).toBe(false);
    expect(isRetroEligible("2026-08-02", "not_started", "2026-08-01")).toBe(false);
  });

  it("accepts yesterday not_started", () => {
    expect(isRetroEligible("2026-07-31", "not_started", "2026-08-01")).toBe(true);
  });

  it("rejects not_started older than 3 calendar days", () => {
    expect(isRetroEligible("2026-07-28", "not_started", "2026-08-01")).toBe(false);
  });

  it("accepts yesterday missed, rejects completed/partial/relapse", () => {
    expect(isRetroEligible("2026-07-31", "missed", "2026-08-01")).toBe(true);
    expect(isRetroEligible("2026-07-31", "completed", "2026-08-01")).toBe(false);
    expect(isRetroEligible("2026-07-31", "partial", "2026-08-01")).toBe(false);
    expect(isRetroEligible("2026-07-31", "relapse", "2026-08-01")).toBe(false);
  });

  it("accepts exactly 3 calendar days ago", () => {
    expect(isRetroEligible("2026-07-29", "not_started", "2026-08-01")).toBe(true);
  });
});

describe("isReentryAnswered", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
      writable: true
    });
  });

  it("is false by default and true after markReentryAnswered", () => {
    expect(isReentryAnswered("2026-08-01")).toBe(false);
    markReentryAnswered("2026-08-01");
    expect(isReentryAnswered("2026-08-01")).toBe(true);
  });

  it("is per-date", () => {
    markReentryAnswered("2026-08-01");
    expect(isReentryAnswered("2026-08-01")).toBe(true);
    expect(isReentryAnswered("2026-08-02")).toBe(false);
  });
});

describe("getRelapseForDate", () => {
  it("returns the relapse log for the date", () => {
    const store = {
      relapseLogs: [
        {
          id: "r1",
          seasonId: "s1",
          date: "2026-07-31",
          trigger: "stress",
          note: "deadline piling up",
          recoveryAction: "",
          createdAt: "2026-07-31T08:00:00.000Z",
          updatedAt: "2026-07-31T08:00:00.000Z"
        },
        {
          id: "r2",
          seasonId: "s1",
          date: "2026-07-30",
          trigger: "fatigue",
          recoveryAction: "",
          createdAt: "2026-07-30T08:00:00.000Z",
          updatedAt: "2026-07-30T08:00:00.000Z"
        }
      ] as MonkMVPState["relapseLogs"]
    };
    expect(getRelapseForDate(store, "2026-07-31")?.trigger).toBe("stress");
    expect(getRelapseForDate(store, "2026-07-31")?.note).toBe("deadline piling up");
  });

  it("returns undefined when no log exists for the date", () => {
    const store = { relapseLogs: [] as MonkMVPState["relapseLogs"] };
    expect(getRelapseForDate(store, "2026-08-01")).toBeUndefined();
  });
});
