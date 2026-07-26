import { getTodayDateString } from "./date";
import {
  selectJournalEntryForToday,
  selectTodayPlan,
  selectTotalFocusSecondsForDate,
} from "../store/selectors";
import { useMonkStore } from "../store/useMonkStore";
import { t } from "../i18n";

const NUDGE_KEY = "zendo_evening_nudge_v1";
const EVENING_HOUR = 19;
const CHECK_MS = 20 * 60 * 1000;

function isCloseDaySkipped(date: string): boolean {
  try {
    return localStorage.getItem(`zendo.closeday.skipped.${date}`) === "1";
  } catch {
    return false;
  }
}

function wasNudgedToday(date: string): boolean {
  try {
    return localStorage.getItem(NUDGE_KEY) === date;
  } catch {
    return false;
  }
}

function markNudged(date: string): void {
  try {
    localStorage.setItem(NUDGE_KEY, date);
  } catch {
    /* ignore */
  }
}

export function shouldEveningNudge(now = new Date()): boolean {
  if (typeof window === "undefined" || typeof Notification === "undefined") return false;
  if (Notification.permission !== "granted") return false;
  if (now.getHours() < EVENING_HOUR) return false;

  const today = getTodayDateString(now);
  if (wasNudgedToday(today)) return false;
  if (isCloseDaySkipped(today)) return false;

  const state = useMonkStore.getState();
  if (!state.appSettings.notificationEnabled) return false;
  if (!state.activeSeason || state.activeSeason.status !== "active") return false;

  const plan = selectTodayPlan(state, today);
  const focusSeconds = selectTotalFocusSecondsForDate(state, today);
  const hasActivity = !!plan || focusSeconds > 0;
  if (!hasActivity) return false;

  const entry = selectJournalEntryForToday(state, today);
  const hasReflection = !!entry?.answers.whatMovedToday?.trim();
  if (hasReflection) return false;

  return true;
}

export function fireEveningNudge(now = new Date()): boolean {
  if (!shouldEveningNudge(now)) return false;
  const today = getTodayDateString(now);
  const lang = useMonkStore.getState().appSettings.language ?? "id";
  try {
    new Notification(t(lang, "nudge.evening.title"), {
      body: t(lang, "nudge.evening.body"),
      icon: "/apple-touch-icon.png",
      silent: true,
    });
    markNudged(today);
    return true;
  } catch {
    return false;
  }
}

/** Mount-once: check now + every ~20 min while app open. */
export function startEveningNudgeWatcher(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const check = () => {
    fireEveningNudge();
  };

  check();
  const id = window.setInterval(check, CHECK_MS);
  const onVis = () => {
    if (document.visibilityState === "visible") check();
  };
  document.addEventListener("visibilitychange", onVis);

  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onVis);
  };
}
