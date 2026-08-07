// src/lib/reminderScheduler.ts
// Habit cues while the app is open. The PWA's service worker only precaches —
// there is no push server, so reminders are scheduled in-page:
//   * a `setTimeout` per enabled reminder, capped at MAX_DELAY_MS (clamped to
//     next 30s re-check boundary so a 25-day timer can't exceed the browser's
//     ~24h setTimeout limit),
//   * a 30s interval re-check that catches timezone/clock changes and
//     visibility returns.
// Pure next-fire computation lives in `computeNextFireTime` so it is testable
// without timers.

import { getTodayDateString } from "./date";
import { createDefaultReminders } from "../constants/defaultData";
import { useMonkStore } from "../store/useMonkStore";
import { t } from "../i18n";
import type { MonkMVPState, NotificationReminder } from "../types/app";

export const CHECK_INTERVAL_MS = 30_000;
/** Hard ceiling for a single setTimeout (browsers clamp ~24h). */
const MAX_DELAY_MS = 24 * 60 * 60 * 1000;

export type ReminderContext = {
  now?: Date;
  today?: string;
  seasonEnd?: string;
};

function parseTime(time: string | undefined): { h: number; m: number } | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

/** Local-time target for a reminder on a given day. */
function targetTime(day: string, time: string | undefined): number {
  const parsed = parseTime(time);
  const base = parsed ? new Date(day + "T00:00:00") : new Date(day + "T12:00:00");
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    parsed?.h ?? 12,
    parsed?.m ?? 0
  ).getTime();
}

/**
 * Pure: next fire timestamp (ms epoch) for one reminder, or null when it
 * should not fire again.
 *
 * Daily types: next occurrence of `time` at/after `now` (today if not passed,
 * else tomorrow). Weekly: same, restricted to `dayOfWeek`. Season types: only
 * when an active season exists — countdown fires at `time` on
 * end - daysBeforeSeasonEnd; season_end at `time` on the end date. Season
 * types return null once the end date is past.
 */
export function computeNextFireTime(
  reminder: NotificationReminder,
  ctx: ReminderContext = {}
): number | null {
  if (!reminder.enabled) return null;
  const now = ctx.now ?? new Date();
  const today = ctx.today ?? getTodayDateString(now);
  const time = reminder.time;

  switch (reminder.type) {
    case "daily_start":
    case "daily_reflection": {
      const todayTarget = targetTime(today, time);
      return todayTarget > now.getTime() ? todayTarget : todayTarget + 86_400_000;
    }
    case "weekly_review": {
      const target = targetTime(today, time);
      const t = target > now.getTime() ? target : target + 86_400_000;
      const day = (reminder.dayOfWeek ?? 0) % 7;
      const diff = (day - new Date(t).getDay() + 7) % 7;
      return t + diff * 86_400_000;
    }
    case "season_countdown":
    case "season_end": {
      if (!ctx.seasonEnd) return null;
      const end = targetTime(ctx.seasonEnd, time);
      if (end <= now.getTime()) return null;
      return reminder.type === "season_end"
        ? end
        : end - (reminder.daysBeforeSeasonEnd ?? 3) * 86_400_000;
    }
  }
}

/** Any enabled, scheduleable reminder for a state snapshot. */
export function selectEnabledReminders(state: MonkMVPState): NotificationReminder[] {
  const season = state.activeSeason;
  if (!season || season.status !== "active") {
    // Season reminders need an active season; daily/weekly still apply.
    return state.notificationReminders.filter(
      (r) => r.enabled && r.type !== "season_countdown" && r.type !== "season_end"
    );
  }
  return state.notificationReminders.filter((r) => r.enabled);
}

/** Best next fire across all enabled reminders — earliest wins. */
export function selectNextFire(
  reminders: NotificationReminder[],
  ctx: ReminderContext = {}
): number | null {
  let next: number | null = null;
  for (const r of reminders) {
    const t = computeNextFireTime(r, ctx);
    if (t !== null && (next === null || t < next)) next = t;
  }
  return next;
}

/** Interpolate the {n}-day countdown into a reminder message. */
export function interpolateReminderMessage(
  message: string,
  now = new Date(),
  seasonEnd?: string
): string {
  if (!seasonEnd) return message;
  const end = new Date(seasonEnd + "T00:00:00");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const n = Math.max(0, Math.round((end.getTime() - today.getTime()) / 86_400_000));
  return message.split("{n}").join(String(n));
}

type FireHandler = {
  osNotify: (title: string, body: string) => void;
  toast: (message: string) => void;
};

function buildNotification(reminder: NotificationReminder, state: MonkMVPState, now: Date) {
  const lang = state.appSettings.language ?? "id";
  const seasonEnd = state.activeSeason?.endDate;
  const key = reminder.message;
  const translated = key.startsWith("reminder.") ? t(lang, key as never) : key;
  const body = interpolateReminderMessage(translated, now, seasonEnd);
  const title = t(lang, `reminder.${reminder.type}Title` as never);
  return { title, body };
}

function canUseNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
}

function fireReminder(
  reminder: NotificationReminder,
  state: MonkMVPState,
  now: Date,
  handler: FireHandler
): void {
  // Respect the master toggle: suppress the OS notification when off, but keep
  // a subtle in-app nudge for the two daily habit cues.
  const osOn = state.appSettings.notificationEnabled;
  const { title, body } = buildNotification(reminder, state, now);
  if (osOn && canUseNotifications()) {
    try {
      handler.osNotify(title, body);
    } catch {
      /* notification constructor can throw (permission revoked) — fall back to toast */
    }
  }
  const nudgable = reminder.type === "daily_start" || reminder.type === "daily_reflection";
  if (osOn || nudgable) handler.toast(body);
}

/**
 * Mount-once. Seeds default reminders (back-compat with persisted empty array),
 * schedules the next fire, and re-schedules whenever reminders, settings, or
 * the active season change. Returns an unsubscribe/dispose function.
 */
export function initReminderScheduler(handler: FireHandler): () => void {
  if (typeof window === "undefined") return () => undefined;

  const seedIfEmpty = () => {
    const state = useMonkStore.getState();
    if (!Array.isArray(state.notificationReminders) || state.notificationReminders.length === 0) {
      useMonkStore.setState({ notificationReminders: createDefaultReminders() });
    }
  };

  const ensureReminders = () => {
    const state = useMonkStore.getState();
    if (state.notificationReminders.length === 0) seedIfEmpty();
  };

  let firedAt = new Date(0).getTime();
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastKey = "";

  const clearTimer = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  const schedule = () => {
    clearTimer();
    ensureReminders();
    const reminders = selectEnabledReminders(useMonkStore.getState());
    const now = new Date();
    const next = selectNextFire(reminders, { now, seasonEnd: useMonkStore.getState().activeSeason?.endDate });
    if (next === null) return;
    const delay = Math.min(Math.max(next - now.getTime(), 0), MAX_DELAY_MS);
    timeout = setTimeout(() => {
      timeout = null;
      const fresh = useMonkStore.getState();
      const fireNow = new Date();
      // guard: skip firing when within 500ms of the last fire (re-entrancy)
      if (fireNow.getTime() - firedAt >= 500) {
        const due = selectEnabledReminders(fresh).filter((r) => {
          const t = computeNextFireTime(r, { now: fireNow, seasonEnd: fresh.activeSeason?.endDate });
          return t !== null && t <= fireNow.getTime() + 500;
        });
        for (const r of due) {
          firedAt = fireNow.getTime();
          fireReminder(r, fresh, fireNow, handler);
        }
      }
      schedule(); // always reschedule for the next occurrence
    }, delay);
  };

  const reschedule = () => {
    const key = JSON.stringify({
      reminders: useMonkStore.getState().notificationReminders.map((r) => [r.id, r.enabled, r.time, r.dayOfWeek, r.daysBeforeSeasonEnd]),
      notif: useMonkStore.getState().appSettings.notificationEnabled,
      season: useMonkStore.getState().activeSeason?.endDate ?? null
    });
    if (key === lastKey) return;
    lastKey = key;
    schedule();
  };

  seedIfEmpty();
  reschedule();
  const interval = window.setInterval(reschedule, CHECK_INTERVAL_MS);
  const onVis = () => {
    if (document.visibilityState === "visible") reschedule();
  };
  document.addEventListener("visibilitychange", onVis);
  const unsubscribe = useMonkStore.subscribe(reschedule);

  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVis);
    unsubscribe();
    clearTimer();
  };
}
