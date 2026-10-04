import { beforeEach, describe, expect, it } from "vitest";
import {
  COACH_STEP_ORDER,
  COACH_STORAGE_KEY,
  dismissCoachStep,
  getCoachStep,
  isCoachStepDismissed,
  type CoachContext,
  type CoachStepId
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

  it("before the season starts → null", () => {
    expect(getCoachStep(ctx({ today: "2025-12-31" }))).toBeNull();
  });

  it("season not active → null", () => {
    expect(getCoachStep(ctx({ seasonStatus: "draft" }))).toBeNull();
    expect(getCoachStep(ctx({ seasonStatus: "ended" }))).toBeNull();
  });

  it("first-week preference order pickTheme → intention → focus → close is unchanged", () => {
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
    // All four first-day steps satisfied → concepts follow, not null.
    expect(
      getCoachStep(
        ctx({ hasPlan: true, hasIntention: true, hasFocus: true, dayClosed: true })
      )
    ).toBe("highlight");
  });

  it("concepts follow the first-day steps in order", () => {
    const full = ctx({ hasPlan: true, hasIntention: true, hasFocus: true, dayClosed: true });
    expect(getCoachStep(full)).toBe("highlight");
    dismissCoachStep("highlight");
    expect(getCoachStep(full)).toBe("mainAction");
    dismissCoachStep("mainAction");
    expect(getCoachStep(full)).toBe("agenda");
    dismissCoachStep("agenda");
    expect(getCoachStep(full)).toBeNull();
  });

  it("day 40 still gets an undismissed concept step (the bug being fixed)", () => {
    const late = ctx({
      today: "2026-02-09", // season day 40
      hasPlan: true,
      hasIntention: true,
      hasFocus: true,
      dayClosed: true
    });
    expect(getCoachStep(late)).toBe("highlight");
    dismissCoachStep("highlight");
    expect(getCoachStep(late)).toBe("mainAction");
    dismissCoachStep("mainAction");
    expect(getCoachStep(late)).toBe("agenda");
    dismissCoachStep("agenda");
    expect(getCoachStep(late)).toBeNull();
  });

  it("a day-40 user is never sent back to the first-day steps", () => {
    const lateNoPlan = ctx({ today: "2026-02-09", hasPlan: false });
    // pickTheme/intention/focus/close are first-week only; a late user gets a concept.
    expect(getCoachStep(lateNoPlan)).toBe("highlight");
  });

  it("dismissed steps skipped and persist", () => {
    expect(isCoachStepDismissed("pickTheme")).toBe(false);
    dismissCoachStep("pickTheme");
    expect(isCoachStepDismissed("pickTheme")).toBe(true);
    expect(localStorage.getItem(COACH_STORAGE_KEY)).toContain("pickTheme");
    // pickTheme is the only first-day candidate while no plan exists; once
    // dismissed, the concept steps follow.
    expect(getCoachStep(ctx({ hasPlan: false }))).toBe("highlight");
    // once plan exists, intention shows (and precedes the concepts)
    expect(getCoachStep(ctx({ hasPlan: true, hasIntention: false }))).toBe("intention");
  });

  it("every step in the widened union is dismissible and skipped once dismissed", () => {
    for (const step of COACH_STEP_ORDER) {
      expect(isCoachStepDismissed(step), `${step} starts undismissed`).toBe(false);
      dismissCoachStep(step);
      expect(isCoachStepDismissed(step), `${step} records dismissal`).toBe(true);
    }
    // With the whole union dismissed, no context yields a step.
    const firstWeek = ctx({ hasPlan: false });
    const late = ctx({ today: "2026-02-09", hasPlan: false });
    expect(getCoachStep(firstWeek)).toBeNull();
    expect(getCoachStep(late)).toBeNull();
  });

  it("the widened union keeps the four original steps first", () => {
    expect(COACH_STEP_ORDER.slice(0, 4)).toEqual([
      "pickTheme",
      "intention",
      "focus",
      "close"
    ] satisfies CoachStepId[]);
    expect(COACH_STEP_ORDER).toContain("highlight");
    expect(COACH_STEP_ORDER).toContain("mainAction");
    expect(COACH_STEP_ORDER).toContain("agenda");
  });
});
