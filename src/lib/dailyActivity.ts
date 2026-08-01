import type { MonkMVPState, TimelineStatus } from "../types/app";
import { addDaysToDate, getTodayDateString, parseLocalDateKey } from "./date";
import { differenceInCalendarDays } from "date-fns";
import { resolveDailyActivityStatus, getDailyStatusHelper } from "../constants/dailyActivityStatus";
import { FOCUS_PRESETS } from "../constants/focusPresets";
import {
  formatFocusSessionTimelineDescription,
  normalizeFocusSessionRecord
} from "../constants/focusSessionStatus";

export function getDailyActivity(store: MonkMVPState, date: string) {
  const dayPlanIds = store.dayPlans.filter((plan) => plan.date === date).map((plan) => plan.id);
  const focusSessions = store.focusSessions.filter((session) => {
    const sessionDate = (session.endedAt ?? session.endTime ?? session.startedAt ?? session.startTime).slice(0, 10);
    return (dayPlanIds.includes(session.dayPlanId) || sessionDate === date) && ["completed", "ended_early"].includes(session.status);
  });
  const learningSessions = store.learningSessions.filter(
    (session) => (session.endedAt ?? session.startedAt).slice(0, 10) === date && session.status === "completed"
  );
  const legacyLearningEntries = store.learningEntries.filter((entry) => dayPlanIds.includes(entry.dayPlanId));
  return { focusSessions, learningSessions, legacyLearningEntries };
}

export function getDailyStatusForDate(store: MonkMVPState, date: string): TimelineStatus {
  const day = store.timelineDays.find((item) => item.date === date);
  // Retro/plan-only states are authoritative: relapse, rest, and an explicitly
  // logged-but-sessionless day (retro "Focus Goal" resolves 'partial' in the
  // store, but no session exists to recompute from). Honor them verbatim.
  if (day?.status === "relapse" || day?.status === "rest") return day.status;
  const core = getCoreDailyStatusForDate(store, date);
  if (core === "not_started" && day?.status === "partial") return "partial";
  return core;
}

export function getCoreDailyStatusForDate(store: MonkMVPState, date: string) {
  const activity = getDailyActivity(store, date);
  return resolveDailyActivityStatus({
    focusSessions: activity.focusSessions,
    learningSessions: activity.learningSessions.length > 0
      ? activity.learningSessions
      : activity.legacyLearningEntries.map((entry) => ({ id: entry.id }))
  });
}

export function getDailyHelperForDate(store: MonkMVPState, date: string) {
  const activity = getDailyActivity(store, date);
  return getDailyStatusHelper({
    focusSessions: activity.focusSessions,
    learningSessions: activity.learningSessions.length > 0
      ? activity.learningSessions
      : activity.legacyLearningEntries.map((entry) => ({ id: entry.id }))
  });
}

export function getFocusSummaryForDate(store: MonkMVPState, date: string) {
  const session = getDailyActivity(store, date).focusSessions[0];
  if (!session) return "Not done yet";
  const preset = FOCUS_PRESETS[session.preset ?? session.timerMode ?? "deep_work"].shortLabel;
  return `${formatFocusSessionTimelineDescription(normalizeFocusSessionRecord(session))} · ${preset}`;
}

export function getLearningSummaryForDate(store: MonkMVPState, date: string) {
  const activity = getDailyActivity(store, date);
  const session = activity.learningSessions[0];
  if (session) {
    const minutes = Math.round(session.actualDurationSeconds / 60);
    const sourceType = session.sourceType.replace("_", " ");
    return `${minutes} min · ${sourceType} · ${session.sourceTitle || "External Source"}`;
  }
  const entry = activity.legacyLearningEntries[0];
  if (entry) return `${entry.durationMinutes ?? 0} min · ${entry.title}`;
  return "Not done yet";
}

export function isRetroEligible(date: string, status: TimelineStatus, today?: string): boolean {
  const todayKey = today ?? getTodayDateString();
  if (date >= todayKey) return false;
  if (status !== "not_started" && status !== "missed") return false;
  return differenceInCalendarDays(parseLocalDateKey(todayKey), parseLocalDateKey(date)) <= 3;
}

export function isCloseDaySkipped(date: string) {
  try {
    return localStorage.getItem(`zendo.closeday.skipped.${date}`) === "1";
  } catch {
    return false;
  }
}

export function skipCloseDay(date: string) {
  try {
    localStorage.setItem(`zendo.closeday.skipped.${date}`, "1");
  } catch {
    /* ignore */
  }
}

export function getDayPart(now = new Date()): "morning" | "afternoon" | "evening" {
  const h = now.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export function isReentryDismissed(date: string): boolean {
  try {
    const raw = localStorage.getItem(`zendo.reentry.dismissed.${date}`);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    return Date.now() < until;
  } catch {
    return false;
  }
}

export function dismissReentry(date: string) {
  try {
    localStorage.setItem(`zendo.reentry.dismissed.${date}`, String(Date.now() + 24 * 60 * 60 * 1000));
  } catch {
    /* ignore */
  }
}

export function isReentryChipHidden(date: string): boolean {
  try {
    return localStorage.getItem(`zendo.reentry.chipHidden.${date}`) === "1";
  } catch {
    return false;
  }
}

export function hideReentryChip(date: string) {
  try {
    localStorage.setItem(`zendo.reentry.chipHidden.${date}`, "1");
  } catch {
    /* ignore */
  }
}

export function shouldOfferReentry(store: { dayPlans: MonkMVPState["dayPlans"]; activeSeason: MonkMVPState["activeSeason"] }, seasonStart: string, today: string): boolean {
  const yesterday = addDaysToDate(today, -1);
  if (yesterday < seasonStart) return false;
  const yStatus = getDailyStatusForDate(store as unknown as MonkMVPState, yesterday);
  const yPlan = store.dayPlans.find((plan) => plan.date === yesterday);
  const softMiss = yStatus === "not_started" && !!yPlan;
  return yStatus === "missed" || yStatus === "relapse" || softMiss;
}
