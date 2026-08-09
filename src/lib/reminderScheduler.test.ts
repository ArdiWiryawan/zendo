import { describe, expect, it } from "vitest";
import type { NotificationReminder } from "../types/app";
import {
  computeNextFireTime,
  interpolateReminderMessage,
  selectEnabledReminders,
  selectNextFire
} from "./reminderScheduler";
import type { MonkMVPState } from "../types/app";

function reminder(overrides: Partial<NotificationReminder> = {}): NotificationReminder {
  return {
    id: "rem_1",
    type: "daily_start",
    enabled: true,
    time: "07:00",
    message: "reminder.daily_startMsg",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

// Local-time dates are chosen to land on known weekdays regardless of the TZ
// the test runner runs in: we only assert on *relative* differences and the
// weekday of the computed timestamp.
const WED = "2026-08-05"; // a Wednesday (day 3)
const WED_MORNING = new Date(WED + "T06:00:00");

describe("computeNextFireTime", () => {
  it("daily_start fires later today when time is ahead of now", () => {
    const r = reminder({ type: "daily_start", time: "07:00" });
    const next = computeNextFireTime(r, { now: WED_MORNING, today: WED })!;
    expect(new Date(next).toISOString().slice(0, 10)).toBe(WED);
    expect(new Date(next).getHours()).toBe(7);
    expect(new Date(next).getMinutes()).toBe(0);
  });

  it("daily_start rolls to tomorrow when time already passed", () => {
    const r = reminder({ type: "daily_start", time: "07:00" });
    const next = computeNextFireTime(r, { now: new Date(WED + "T09:00:00"), today: WED })!;
    expect(next).toBe(new Date(WED + "T07:00:00").getTime() + 86_400_000);
  });

  it("weekly_review lands on the configured weekday", () => {
    const r = reminder({ type: "weekly_review", time: "18:00", dayOfWeek: 0 }); // Sunday
    const next = computeNextFireTime(r, { now: WED_MORNING, today: WED })!;
    expect(new Date(next).getDay()).toBe(0); // Sunday
    expect(new Date(next).getHours()).toBe(18);
    expect(next).toBeGreaterThan(WED_MORNING.getTime());
  });

  it("season_countdown fires daysBeforeSeasonEnd before season end", () => {
    const seasonEnd = "2026-08-31";
    const r = reminder({ type: "season_countdown", time: "08:00", daysBeforeSeasonEnd: 3 });
    const next = computeNextFireTime(r, { now: new Date("2026-08-10T07:00:00"), today: "2026-08-10", seasonEnd })!;
    // end - 3 days = Aug 28, 08:00
    expect(new Date(next).toISOString().slice(0, 10)).toBe("2026-08-28");
    expect(new Date(next).getHours()).toBe(8);
  });

  it("season_end fires on the end date", () => {
    const seasonEnd = "2026-08-31";
    const r = reminder({ type: "season_end", time: "08:00" });
    const next = computeNextFireTime(r, { now: new Date("2026-08-10T07:00:00"), today: "2026-08-10", seasonEnd })!;
    expect(new Date(next).toISOString().slice(0, 10)).toBe("2026-08-31");
  });

  it("season types are skipped without an active season", () => {
    expect(computeNextFireTime(reminder({ type: "season_end", time: "08:00" }), { now: WED_MORNING, today: WED })).toBeNull();
    expect(computeNextFireTime(reminder({ type: "season_countdown" }), { now: WED_MORNING, today: WED })).toBeNull();
  });

  it("season types return null after the end date passed", () => {
    const seasonEnd = "2026-08-31";
    expect(computeNextFireTime(reminder({ type: "season_end", time: "08:00" }), { now: new Date("2026-09-01T09:00:00"), today: "2026-09-01", seasonEnd })).toBeNull();
  });

  it("disabled reminders are skipped", () => {
    expect(computeNextFireTime(reminder({ enabled: false, time: "07:00" }), { now: WED_MORNING, today: WED })).toBeNull();
  });
});

describe("rest-day skip for focus cues", () => {
  it("daily_start on a rest day today rolls to tomorrow at the same time", () => {
    const r = reminder({ type: "daily_start", time: "07:00" });
    const next = computeNextFireTime(r, {
      now: WED_MORNING,
      today: WED,
      isRest: (d) => d === WED
    })!;
    expect(new Date(next).toISOString().slice(0, 10)).toBe("2026-08-06");
    expect(new Date(next).getHours()).toBe(7);
    expect(new Date(next).getMinutes()).toBe(0);
  });

  it("daily_start rolls past consecutive rest days", () => {
    const r = reminder({ type: "daily_start", time: "07:00" });
    const next = computeNextFireTime(r, {
      now: WED_MORNING,
      today: WED,
      isRest: (d) => d === WED || d === "2026-08-06"
    })!;
    expect(new Date(next).toISOString().slice(0, 10)).toBe("2026-08-07");
    expect(new Date(next).getHours()).toBe(7);
  });

  it("daily_reflection skips a rest day too", () => {
    const r = reminder({ type: "daily_reflection", time: "20:00" });
    const next = computeNextFireTime(r, {
      now: WED_MORNING,
      today: WED,
      isRest: (d) => d === WED
    })!;
    expect(new Date(next).toISOString().slice(0, 10)).toBe("2026-08-06");
    expect(new Date(next).getHours()).toBe(20);
  });

  it("weekly_review is not skipped on a rest day", () => {
    const r = reminder({ type: "weekly_review", time: "18:00", dayOfWeek: 0 });
    const next = computeNextFireTime(r, {
      now: WED_MORNING,
      today: WED,
      isRest: () => true
    })!;
    expect(new Date(next).getDay()).toBe(0); // Sunday
    expect(new Date(next).getHours()).toBe(18);
  });

  it("rolls a passed-time target past a rest tomorrow", () => {
    const r = reminder({ type: "daily_start", time: "07:00" });
    const next = computeNextFireTime(r, {
      now: new Date(WED + "T09:00:00"),
      today: WED,
      isRest: (d) => d === "2026-08-06"
    })!;
    expect(new Date(next).toISOString().slice(0, 10)).toBe("2026-08-07");
    expect(new Date(next).getHours()).toBe(7);
  });
});

describe("selectNextFire", () => {
  it("picks the earliest fire across enabled reminders", () => {
    const r1 = reminder({ id: "a", type: "daily_start", time: "09:00" });
    const r2 = reminder({ id: "b", type: "daily_reflection", time: "20:00" });
    expect(selectNextFire([r1, r2], { now: WED_MORNING, today: WED })).toBe(new Date(WED + "T09:00:00").getTime());
  });

  it("returns null when nothing is enabled", () => {
    expect(selectNextFire([reminder({ enabled: false }), reminder({ enabled: false, id: "b" })], { now: WED_MORNING, today: WED })).toBeNull();
  });
});

describe("interpolateReminderMessage", () => {
  it("substitutes the {n} day countdown", () => {
    const end = "2026-08-31";
    const msg = interpolateReminderMessage("T-{n} days", new Date("2026-08-28T06:00:00"), end);
    expect(msg).toBe("T-3 days");
  });

  it("leaves messages without a template untouched", () => {
    expect(interpolateReminderMessage("Just a nudge", new Date(), "2026-08-31")).toBe("Just a nudge");
  });
});

describe("selectEnabledReminders", () => {
  const base: MonkMVPState = {
    userProfile: null,
    appSettings: {} as MonkMVPState["appSettings"],
    activeSeason: null,
    pastSeasons: [],
    goals: [],
    badHabits: [],
    weeklyPlans: [],
    dayPlans: [],
    focusSessions: [],
    journalEntries: [],
    relapseLogs: [],
    timelineDays: [],
    notificationReminders: [],
    onboarding: {} as MonkMVPState["onboarding"],
    learningSessions: [],
    timelineEvents: [],
    notebookCategories: [],
    notebookEntries: [],
    journalPacks: [],
    journalPackSessions: [],
    purchasedPackIds: [],
    energyLogs: [],
    weeklyReviews: {},
    releasedSeasonGoals: []
  };

  it("drops season reminders when no active season", () => {
    const state = {
      ...base,
      notificationReminders: [
        reminder({ id: "a", type: "daily_start" }),
        reminder({ id: "b", type: "season_end" })
      ]
    };
    const selected = selectEnabledReminders(state);
    expect(selected.map((r) => r.type)).toEqual(["daily_start"]);
  });

  it("keeps season reminders with an active season", () => {
    const state = {
      ...base,
      activeSeason: { status: "active" } as MonkMVPState["activeSeason"],
      notificationReminders: [reminder({ id: "b", type: "season_end" })]
    };
    expect(selectEnabledReminders(state).map((r) => r.type)).toEqual(["season_end"]);
  });

  it("excludes disabled reminders", () => {
    const state = {
      ...base,
      notificationReminders: [reminder({ id: "a", enabled: false })]
    };
    expect(selectEnabledReminders(state)).toEqual([]);
  });
});
