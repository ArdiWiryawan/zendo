import { beforeEach, describe, expect, it } from "vitest";
import { addDaysToDate, getTodayDateString, parseLocalDateKey } from "./date";
import { practiceMonthView, practiceWeekView } from "./practiceHistory";
import { useMonkStore } from "../store/useMonkStore";
import type { Practice, PracticeLog } from "../types/app";

/**
 * Regression cover for the history-panel navigation introduced in
 * `src/components/PracticesCard.tsx` (`anchor` / `shift` / `atCurrentPeriod` /
 * `periodLabel`).
 *
 * Those helpers are inline in the component, which this repo cannot render:
 * there is NO jsdom, NO happy-dom and NO @testing-library here — the vitest
 * environment is plain Node (`vite.config.ts`) and every existing `*.test.tsx`
 * only drives `react-dom/server`. So instead of reaching into private state,
 * this file pins the same invariants against the real primitives the component
 * is built out of, and reproduces the component's own arithmetic verbatim:
 *
 *   mondayOf(date) = monday of the week containing `date`
 *   week step      = addDaysToDate(anchor, 7 * direction)
 *   month step     = getTodayDateString(new Date(y, m + direction, 1))
 *   atCurrentPeriod(week)  = mondayOf(anchor) >= mondayOf(today)
 *   atCurrentPeriod(month) = anchor.slice(0, 7) === today.slice(0, 7)
 *
 * If someone later changes the component's stepping (e.g. shifts by 30 days for
 * months, or derives the week start from `anchor` directly), these tests stay
 * green while the shipped behaviour breaks — that is the known limit of testing
 * a helper that lives inside an un-renderable component.
 *
 * Every date below is fixed. Nothing here reads the real clock except where a
 * test explicitly passes `today` in as a parameter.
 */

/** Monday of the week containing `date`. Copied from the component verbatim. */
function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return getTodayDateString(d);
}

/** The component's week branch of `shift`. */
function stepWeek(anchor: string, direction: -1 | 1): string {
  return addDaysToDate(anchor, 7 * direction);
}

/** The component's month branch of `shift`, modelled exactly. */
function stepMonth(anchor: string, direction: -1 | 1): string {
  const d = new Date(`${anchor}T00:00:00`);
  return getTodayDateString(new Date(d.getFullYear(), d.getMonth() + direction, 1));
}

/** The component's `atCurrentPeriod` for the week scale. */
function atCurrentWeek(anchor: string, today: string): boolean {
  return mondayOf(anchor) >= mondayOf(today);
}

/** The component's `atCurrentPeriod` for the month scale. */
function atCurrentMonth(anchor: string, today: string): boolean {
  return anchor.slice(0, 7) === today.slice(0, 7);
}

function makePractice(overrides: Partial<Practice> = {}): Practice {
  return {
    id: "p1",
    seasonId: "s1",
    name: "Read",
    weeklyTargetCount: 5,
    status: "active",
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
    ...overrides
  };
}

function makeLog(date: string, practiceId = "p1"): PracticeLog {
  return {
    id: `log-${practiceId}-${date}`,
    practiceId,
    seasonId: "s1",
    date,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`
  };
}

describe("week stepping (anchor +/- 7 days)", () => {
  it("steps back from a Monday to exactly the previous Monday", () => {
    // 2026-08-31 is a real Monday; 2026-08-24 is the one before it.
    expect(mondayOf("2026-08-31")).toBe("2026-08-31");
    expect(stepWeek("2026-08-31", -1)).toBe("2026-08-24");
    expect(stepWeek("2026-08-31", 1)).toBe("2026-09-07");
  });

  it("three steps back is exactly 21 days", () => {
    const threeBack = stepWeek(stepWeek(stepWeek("2026-08-31", -1), -1), -1);
    expect(threeBack).toBe("2026-08-10");
    expect(addDaysToDate("2026-08-31", -21)).toBe(threeBack);
  });

  it("stepping from a mid-week day stays inside whole weeks", () => {
    // Thursday 2026-09-03 belongs to the week of Monday 2026-08-31.
    expect(mondayOf("2026-09-03")).toBe("2026-08-31");
    expect(mondayOf(stepWeek("2026-09-03", -1))).toBe("2026-08-24");
  });

  it("crosses a month boundary without drifting", () => {
    expect(stepWeek("2026-09-07", -1)).toBe("2026-08-31");
    expect(mondayOf("2026-08-31")).toBe("2026-08-31");
  });
});

describe("month stepping (1st of the neighbouring month)", () => {
  it("steps from a mid-month date to the 1st of the previous month", () => {
    expect(stepMonth("2026-10-15", -1)).toBe("2026-09-01");
  });

  it("steps forward from a mid-month date to the 1st of the next month", () => {
    expect(stepMonth("2026-10-15", 1)).toBe("2026-11-01");
  });

  it("stepping from the 1st itself moves a whole month, not zero days", () => {
    expect(stepMonth("2026-10-01", -1)).toBe("2026-09-01");
    expect(stepMonth("2026-10-01", 1)).toBe("2026-11-01");
  });

  it("does not drift across a 31-day month", () => {
    // March has 31 days: a naive "-30 days" or "keep the day-of-month" step
    // would land on 2026-02-28 / 2026-02-31 and then stick.
    expect(stepMonth("2026-03-15", -1)).toBe("2026-02-01");
    // May has 31 days and April has 30 — the step must still be to the 1st.
    expect(stepMonth("2026-05-15", -1)).toBe("2026-04-01");
  });

  it("does not drift backwards out of a longer month either", () => {
    expect(stepMonth("2026-04-15", -1)).toBe("2026-03-01");
    expect(stepMonth("2026-02-15", -1)).toBe("2026-01-01");
  });

  it("handles the January boundary and the year rollover", () => {
    expect(stepMonth("2026-01-15", -1)).toBe("2025-12-01");
    expect(stepMonth("2026-12-15", 1)).toBe("2027-01-01");
  });

  it("consecutive steps land on the 1st of each month exactly", () => {
    const first = stepMonth("2026-10-15", -1);
    const second = stepMonth(first, -1);
    const third = stepMonth(second, -1);

    expect([first, second, third]).toEqual(["2026-09-01", "2026-08-01", "2026-07-01"]);
  });

  it("round-trips: forward then back returns to the 1st of the same month", () => {
    const forward = stepMonth("2026-10-15", 1);
    expect(stepMonth(forward, -1)).toBe("2026-10-01");
  });

  it("crosses a leap February without landing on a phantom day", () => {
    // 2028 is a leap year; Feb 29 exists, so a day-of-month-preserving step
    // from the 31st would break here.
    expect(stepMonth("2028-03-31", -1)).toBe("2028-02-01");
    expect(parseLocalDateKey("2028-02-01").getMonth()).toBe(1);
  });
});

describe("atCurrentPeriod (is the anchored period the current one?)", () => {
  const TODAY = "2026-10-01"; // a Thursday

  it("is false for a past week and true for the current week", () => {
    expect(atCurrentWeek("2026-09-24", TODAY)).toBe(false);
    expect(atCurrentWeek(TODAY, TODAY)).toBe(true);
  });

  it("treats every day of the current week as current", () => {
    // Monday 2026-09-28 .. Sunday 2026-10-04 all sit in today's week.
    for (const day of ["2026-09-28", "2026-09-30", "2026-10-01", "2026-10-04"]) {
      expect(atCurrentWeek(day, TODAY), `${day} should count as the current week`).toBe(true);
    }
    // 2026-09-27 is the Sunday of the week before — one day earlier, not current.
    expect(atCurrentWeek("2026-09-27", TODAY)).toBe(false);
  });

  it("is true for the current month and false for any other", () => {
    expect(atCurrentMonth(TODAY, TODAY)).toBe(true);
    expect(atCurrentMonth("2026-09-15", TODAY)).toBe(false);
    expect(atCurrentMonth("2026-11-01", TODAY)).toBe(false);
  });

  it("compares months by calendar month, not by day offset", () => {
    // Same month, far-apart days: still current.
    expect(atCurrentMonth("2026-10-31", TODAY)).toBe(true);
    // Adjacent month, one day away: not current.
    expect(atCurrentMonth("2026-09-30", TODAY)).toBe(false);
  });

  it("disagrees between the week and month readings exactly where it should", () => {
    // 2026-09-30 is in the previous month but inside today's week: the month
    // arrow must be enabled while the week arrow stays disabled. This is the
    // case a single shared `atCurrentPeriod` would get wrong.
    expect(atCurrentWeek("2026-09-30", TODAY)).toBe(true);
    expect(atCurrentMonth("2026-09-30", TODAY)).toBe(false);
  });
});

describe("practiceMonthView honours the anchored month", () => {
  it("counts only the anchored month's logs and excludes another month's", () => {
    const practice = makePractice();
    const logs = [
      makeLog("2026-09-02"), // anchored month, inside the window
      makeLog("2026-09-20"), // anchored month but AFTER the anchor — excluded
      makeLog("2026-10-01"), // current month — must be excluded
      makeLog("2026-08-30"), // earlier month — must be excluded
      makeLog("2026-09-10", "other-practice") // another practice — excluded
    ];

    // The window runs from the 1st to the reference date, so an anchor of
    // 2026-09-15 deliberately drops the later September log.
    const view = practiceMonthView(logs, practice, "2026-09-15");

    expect(view.startDate).toBe("2026-09-01");
    expect(view.endDate).toBe("2026-09-15");
    expect(view.done).toBe(1);
  });

  it("counts every log of a past month when the anchor is the month's last day", () => {
    const practice = makePractice();
    const logs = [
      makeLog("2026-09-02"),
      makeLog("2026-09-20"),
      makeLog("2026-10-01"), // current month — must be excluded
      makeLog("2026-08-30"), // earlier month — must be excluded
      makeLog("2026-09-10", "other-practice") // another practice — excluded
    ];

    const view = practiceMonthView(logs, practice, "2026-09-30");

    expect(view.endDate).toBe("2026-09-30");
    expect(view.done).toBe(2);
  });

  it("reports 0 when the anchored month holds no logs", () => {
    const view = practiceMonthView([makeLog("2026-09-02")], makePractice(), "2026-08-15");

    expect(view.startDate).toBe("2026-08-01");
    expect(view.done).toBe(0);
  });

  it("the anchored month and the current month disagree, as the UI asserts", () => {
    const practice = makePractice();
    const logs = [makeLog("2026-09-02"), makeLog("2026-09-03")];

    const past = practiceMonthView(logs, practice, "2026-09-15");
    const current = practiceMonthView(logs, practice, "2026-10-05");

    expect(past.done).toBe(2);
    expect(current.done).toBe(0);
  });

  it("closes the window at the reference date, so a partial month shrinks its target", () => {
    const view = practiceMonthView([], makePractice({ weeklyTargetCount: 7 }), "2026-10-05");

    // 1st..5th October is 5 elapsed days -> round(7 * 5 / 7) = 5.
    expect(view.endDate).toBe("2026-10-05");
    expect(view.target).toBe(5);
  });

  it("a full month's target scales to the month length, not a fixed 4 weeks", () => {
    const practice = makePractice({ weeklyTargetCount: 7 });

    // Reference on the last day of each month: 31-day March -> 31; 30-day
    // April -> 30. A fixed 4-week target would read 28 for both.
    expect(practiceMonthView([], practice, "2026-03-31").target).toBe(31);
    expect(practiceMonthView([], practice, "2026-04-30").target).toBe(30);
    expect(practiceMonthView([], practice, "2026-02-28").target).toBe(28);
  });

  it("stays consistent with practiceWeekView on the same logs when both windows cover them", () => {
    const practice = makePractice({ weeklyTargetCount: 5 });
    const logs = [makeLog("2026-09-02"), makeLog("2026-09-03")];

    // Both windows start on/after the 1st and end before either log, so the two
    // scales must agree on the count for the same data.
    const week = practiceWeekView(logs, practice, mondayOf("2026-09-03"));
    const month = practiceMonthView(logs, practice, "2026-09-03");

    expect(week.startDate).toBe("2026-08-31");
    expect(week.done).toBe(2);
    expect(month.done).toBe(2);
  });

  it("the week window legitimately reaches back further than the month window", () => {
    const practice = makePractice({ weeklyTargetCount: 5 });
    const logs = [makeLog("2026-08-31"), makeLog("2026-09-02")];

    // 2026-08-31 is the Monday of the week holding 2026-09-03, but it belongs to
    // the August month window — so the week scale counts it and the month scale
    // must not. This is exactly why the two scales can disagree.
    const week = practiceWeekView(logs, practice, mondayOf("2026-09-03"));
    const month = practiceMonthView(logs, practice, "2026-09-03");

    expect(week.startDate).toBe("2026-08-31");
    expect(week.done).toBe(2);
    expect(month.startDate).toBe("2026-09-01");
    expect(month.done).toBe(1);
  });
});

describe("practiceWeekView reflects the anchored week, not today", () => {
  it("an empty past week reads 0 / N and does not throw", () => {
    const practice = makePractice({ weeklyTargetCount: 5 });

    const view = practiceWeekView([], practice, stepWeek("2026-10-01", -1));

    expect(view.done).toBe(0);
    expect(view.target).toBe(5);
    expect(view.days).toHaveLength(7);
    expect(view.days.every((d) => d.done === false)).toBe(true);
  });

  it("marks the past week's own log days and ignores today's", () => {
    const practice = makePractice({ weeklyTargetCount: 5 });
    const logs = [makeLog("2026-09-23"), makeLog("2026-09-25"), makeLog("2026-10-01")];

    const pastWeek = practiceWeekView(logs, practice, mondayOf("2026-09-23"));
    const currentWeek = practiceWeekView(logs, practice, mondayOf("2026-10-01"));

    expect(pastWeek.startDate).toBe("2026-09-21");
    expect(pastWeek.done).toBe(2);
    expect(currentWeek.done).toBe(1);
    expect(pastWeek.days.filter((d) => d.done).map((d) => d.date)).toEqual([
      "2026-09-23",
      "2026-09-25"
    ]);
  });
});

/** In-memory Storage stub. Same shape as the one in `src/store/practiceSync.e2e.test.ts`. */
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

describe("setPracticeHistoryScale (the remembered scale)", () => {
  beforeEach(() => {
    // Node has no localStorage; the store's persist adapter needs one.
    Object.defineProperty(globalThis, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
      writable: true
    });
    useMonkStore.getState().resetApp();
  });

  it("defaults to unset, which the card reads as 'week'", () => {
    // `scale` in the component is `appSettings.practiceHistoryScale ?? "week"`.
    expect(useMonkStore.getState().appSettings.practiceHistoryScale).toBeUndefined();
  });

  it('writes "month" and bumps updatedAt with a fresh nowIso()', async () => {
    const before = useMonkStore.getState().appSettings.updatedAt;

    // nowIso() has millisecond resolution; a same-tick write must still be
    // seen as a new value, so let the clock move.
    await new Promise((resolve) => setTimeout(resolve, 5));
    useMonkStore.getState().setPracticeHistoryScale("month");

    const after = useMonkStore.getState().appSettings;
    expect(after.practiceHistoryScale).toBe("month");
    expect(after.updatedAt).not.toBe(before);
    expect(new Date(after.updatedAt).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it('writes "season" and "week" back, so a remembered choice is reversible', () => {
    const store = useMonkStore.getState();

    store.setPracticeHistoryScale("season");
    expect(useMonkStore.getState().appSettings.practiceHistoryScale).toBe("season");

    store.setPracticeHistoryScale("week");
    expect(useMonkStore.getState().appSettings.practiceHistoryScale).toBe("week");
  });

  it("leaves the rest of appSettings intact", () => {
    const before = useMonkStore.getState().appSettings;

    useMonkStore.getState().setPracticeHistoryScale("month");

    const after = useMonkStore.getState().appSettings;
    expect(after.id).toBe(before.id);
    expect(after.language).toBe(before.language);
    expect(after.theme).toBe(before.theme);
    expect(after.createdAt).toBe(before.createdAt);
  });

  it("resets back to unset on resetApp", () => {
    useMonkStore.getState().setPracticeHistoryScale("month");
    useMonkStore.getState().resetApp();

    expect(useMonkStore.getState().appSettings.practiceHistoryScale).toBeUndefined();
  });
});
