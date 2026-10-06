import type { DayPlan, FocusSession, LearningSession, MonkMVPState, RelapseLog, TimelineStatus } from "../types/app";
import { addDaysToDate, getTodayDateString, parseLocalDateKey } from "./date";
import { differenceInCalendarDays } from "date-fns";
import { resolveDailyActivityStatus, getDailyStatusHelper } from "../constants/dailyActivityStatus";
import { FOCUS_PRESETS } from "../constants/focusPresets";
import {
  formatFocusSessionTimelineDescription,
  normalizeFocusSessionRecord
} from "../constants/focusSessionStatus";

export function getDailyActivity(store: MonkMVPState, date: string) {
  // Scope to the active season — a shared calendar date must not pull in a
  // previous season's day plans/sessions.
  const seasonId = store.activeSeason?.id;
  const dayPlanIds = store.dayPlans
    .filter((plan) => plan.date === date && (!seasonId || plan.seasonId === seasonId))
    .map((plan) => plan.id);
  const focusSessions = store.focusSessions.filter((session) => {
    const sameSeason = !seasonId || session.seasonId === seasonId;
    if (!sameSeason) return false;
    if (!["completed", "ended_early"].includes(session.status)) return false;

    if (session.dayPlanId) {
      const boundPlan = store.dayPlans.find((p) => p.id === session.dayPlanId);
      if (boundPlan) return boundPlan.date === date;
      return dayPlanIds.includes(session.dayPlanId);
    }

    const raw = session.startedAt || session.createdAt || session.startTime || session.endedAt || session.endTime;
    if (!raw) return false;
    const sessionDate = getTodayDateString(new Date(raw));
    return sessionDate === date || raw.slice(0, 10) === date;
  });
  const learningSessions = store.learningSessions.filter((session) => {
    const sameSeason = !seasonId || session.seasonId === seasonId;
    if (!sameSeason) return false;
    if (session.status !== "completed") return false;

    if (session.dayPlanId) {
      const boundPlan = store.dayPlans.find((p) => p.id === session.dayPlanId);
      if (boundPlan) return boundPlan.date === date;
      return dayPlanIds.includes(session.dayPlanId);
    }

    const raw = session.startedAt || session.createdAt || session.endedAt;
    if (!raw) return false;
    const sessionDate = getTodayDateString(new Date(raw));
    return sessionDate === date || raw.slice(0, 10) === date;
  });
  return { focusSessions, learningSessions };
}

export function getDailyStatusForDate(store: MonkMVPState, date: string): TimelineStatus {
  const seasonId = store.activeSeason?.id;
  // Minimal/older snapshots may omit arrays; read every one defensively.
  const day = (store.timelineDays ?? []).find((item) => item.date === date && (!seasonId || item.seasonId === seasonId));
  // A retro-logged relapse is authoritative: it is data nobody can recompute
  // from sessions, so it wins outright.
  if (day?.status === "relapse") return "relapse";

  const plan = store.dayPlans.find((p) => p.date === date && (!seasonId || p.seasonId === seasonId));
  const activity = getDailyActivity(store, date);

  // Everything else — rest, completed, partial, missed — goes through the one
  // shared resolver whose core rule is: evidence outranks the schedule.
  const outcome = resolveDayOutcome({
    plan,
    focusSessions: activity.focusSessions,
    learningSessions: activity.learningSessions,
    relapseCount: (store.relapseLogs ?? []).filter((log) => log.date === date).length
  });
  if (outcome !== "not_started") return outcome;

  // A persisted rest row with no evidence behind it is still rest — it just no
  // longer outranks evidence, which the resolver already applied above.
  if (day?.status === "rest") return "rest";
  // A day the store explicitly recorded as completed or partial with no session
  // to recompute from (retro "Focus Goal" logs no session) is still real.
  if (day?.status === "completed") return "completed";
  if (day?.status === "partial") return "partial";

  const today = getTodayDateString();
  if (date < today) {
    return "missed";
  }
  return "not_started";
}

/**
 * The single rule for "how did this day actually go?".
 *
 * Precedence, highest first: a logged relapse; the evidence itself
 * (`resolveDailyActivityStatus` over the completed/ended-early sessions); then
 * the schedule (`DayPlan`). Evidence outranking the schedule is the whole
 * point — a day planned as Rest that really produced a focus session is a focus
 * day, not a rest day.
 */
export function resolveDayOutcome(input: {
  plan?: DayPlan;
  focusSessions: FocusSession[];   // already filtered to completed + ended_early
  learningSessions: LearningSession[];
  relapseCount: number;
}): TimelineStatus {
  const { plan, focusSessions, learningSessions, relapseCount } = input;

  if (relapseCount > 0) return "relapse";

  const core = resolveDailyActivityStatus({ focusSessions, learningSessions });
  if (core !== "not_started") return core;

  if (plan?.dayType === "rest" || plan?.status === "rest") return "rest";
  if (plan?.status === "completed") return "completed";
  if (plan?.status === "partial") return "partial";
  if (plan?.status === "missed") return "missed";
  return "not_started";
}

export function getCoreDailyStatusForDate(store: MonkMVPState, date: string) {
  const activity = getDailyActivity(store, date);
  return resolveDailyActivityStatus(activity);
}

export function getDailyHelperForDate(store: MonkMVPState, date: string) {
  const activity = getDailyActivity(store, date);
  return getDailyStatusHelper(activity);
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

export function isReentryAnswered(date: string): boolean {
  try {
    return localStorage.getItem(`zendo.reentry.answered.${date}`) === "1";
  } catch {
    return false;
  }
}

export function markReentryAnswered(date: string) {
  try {
    localStorage.setItem(`zendo.reentry.answered.${date}`, "1");
  } catch {
    /* ignore */
  }
}

export function getRelapseForDate(store: Pick<MonkMVPState, "relapseLogs">, date: string): RelapseLog | undefined {
  return store.relapseLogs.find((log) => log.date === date);
}

export function isNmt2Dismissed(date: string): boolean {
  try {
    return localStorage.getItem(`zendo.nmt2.dismissed.${date}`) === "1";
  } catch {
    return false;
  }
}

export function dismissNmt2(date: string) {
  try {
    localStorage.setItem(`zendo.nmt2.dismissed.${date}`, "1");
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

export function isReflectionThreadDismissed(date: string): boolean {
  try {
    return localStorage.getItem(`zendo.thread.dismissed.${date}`) === "1";
  } catch {
    return false;
  }
}

export function dismissReflectionThread(date: string) {
  try {
    localStorage.setItem(`zendo.thread.dismissed.${date}`, "1");
  } catch {
    /* ignore */
  }
}

export function shouldOfferReentry(
  store: {
    dayPlans: MonkMVPState["dayPlans"];
    activeSeason: MonkMVPState["activeSeason"];
    focusSessions?: MonkMVPState["focusSessions"];
    journalEntries?: MonkMVPState["journalEntries"];
    timelineDays?: MonkMVPState["timelineDays"];
  },
  seasonStart: string,
  today: string
): boolean {
  const yesterday = addDaysToDate(today, -1);
  if (yesterday < seasonStart) return false;
  const fullStore = store as unknown as MonkMVPState;
  const yPlan = store.dayPlans.find((plan) => plan.date === yesterday);
  const yDay = fullStore.timelineDays?.find((d) => d.date === yesterday);

  // If yesterday was completed or rest, not slipped!
  if (
    yPlan?.status === "completed" ||
    yDay?.status === "completed" ||
    yDay?.status === "rest" ||
    yPlan?.dayType === "rest"
  ) {
    return false;
  }

  // If yesterday had ANY focus session or journal reflection, the user worked! Not slipped!
  const yesterdayActivity = getDailyActivity(fullStore, yesterday);
  const hadFocus = (yesterdayActivity.focusSessions ?? []).length > 0;
  const hadLearning = (yesterdayActivity.learningSessions ?? []).length > 0;
  const hadJournal = (fullStore.journalEntries ?? []).some(
    (j) =>
      j.date === yesterday &&
      (j.answers.whatMovedToday?.trim() ||
        j.answers.whatDistractedMe?.trim() ||
        j.answers.whatDidILearn?.trim() ||
        j.answers.morningPages?.trim())
  );

  if (hadFocus || hadLearning || hadJournal) {
    return false;
  }

  const yStatus = getDailyStatusForDate(fullStore, yesterday);
  const softMiss = yStatus === "not_started" && !!yPlan;
  return yStatus === "missed" || yStatus === "relapse" || softMiss;
}
