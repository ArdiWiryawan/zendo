import { beforeEach, describe, expect, it } from "vitest";
import {
  COACH_STORAGE_KEY,
  dismissCoachStep,
  getCoachStep,
  isCoachStepDismissed,
  type CoachContext
} from "./coach";

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

function ctx(overrides: Partial<CoachContext> = {}): CoachContext {
  return {
    seasonStartDate: "2026-01-01",
    seasonStatus: "active",
    today: "2026-01-01",
    hasPlan: false,
    hasIntention: false,
    hasFocus: false,
    dayClosed: false,
    ...overrides
  };
}

describe("coach", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
      writable: true
    });
  });

  it("outside day 1-7 → null", () => {
    expect(getCoachStep(ctx({ today: "2025-12-31" }))).toBeNull();
    expect(getCoachStep(ctx({ today: "2026-01-08" }))).toBeNull();
  });

  it("season not active → null", () => {
    expect(getCoachStep(ctx({ seasonStatus: "draft" }))).toBeNull();
    expect(getCoachStep(ctx({ seasonStatus: "ended" }))).toBeNull();
  });

  it("priority order pickTheme → intention → focus → close", () => {
    expect(getCoachStep(ctx({ hasPlan: false }))).toBe("pickTheme");
    expect(getCoachStep(ctx({ hasPlan: true, hasIntention: false }))).toBe("intention");
    expect(
      getCoachStep(ctx({ hasPlan: true, hasIntention: true, hasFocus: false }))
    ).toBe("focus");
    expect(
      getCoachStep(
        ctx({ hasPlan: true, hasIntention: true, hasFocus: true, dayClosed: false })
      )
    ).toBe("close");
    expect(
      getCoachStep(
        ctx({ hasPlan: true, hasIntention: true, hasFocus: true, dayClosed: true })
      )
    ).toBeNull();
  });

  it("dismissed steps skipped and persist", () => {
    expect(isCoachStepDismissed("pickTheme")).toBe(false);
    dismissCoachStep("pickTheme");
    expect(isCoachStepDismissed("pickTheme")).toBe(true);
    expect(localStorage.getItem(COACH_STORAGE_KEY)).toContain("pickTheme");
    // next priority after dismiss while still no plan: no candidate (pickTheme dismissed)
    expect(getCoachStep(ctx({ hasPlan: false }))).toBeNull();
    // once plan exists, intention shows
    expect(getCoachStep(ctx({ hasPlan: true, hasIntention: false }))).toBe("intention");
  });
});
