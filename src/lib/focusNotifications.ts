import { createFocusPhases } from "../constants/focusPresets";
import { useMonkStore } from "../store/useMonkStore";
import type { FocusSession } from "../types/app";

/**
 * OS-level focus phase notifications (Notification.showTrigger/TimestampTrigger).
 *
 * Why: the 1s web worker keeps the clock live while the tab is open, but a web
 * worker dies with its tab — so when the tab/PWA is CLOSED, nothing advances the
 * session and the timer "sticks" until reopen (catch-up in App.tsx runTick).
 * Scheduled OS notifications are the only mechanism that fires a phase boundary
 * while the tab is closed.
 *
 * Design: the schedule is a PURE recompute from a session snapshot + "now" —
 * never stored state. It mirrors planFocusTick's boundary math (same ground
 * truth), so reopen/catch-up and notifications stay consistent and repeated
 * syncs never duplicate (dedupe key = triggerTime).
 */

export type FocusScheduledNotification = {
  triggerTime: number;
  title: string;
  body: string;
};

/** Future phase-boundary instants planFocusTick will traverse while `session` stays running at its CURRENT startTime. */
export function computeFocusNotificationSchedule(
  session: FocusSession,
  now = Date.now()
): FocusScheduledNotification[] {
  if (session.status !== "running") return [];
  const phases = session.phases?.length
    ? session.phases
    : createFocusPhases(session.preset ?? session.timerMode ?? "deep_work", session.durationMinutes);
  const start = new Date(session.startTime).getTime();
  if (Number.isNaN(start)) return [];

  const out: FocusScheduledNotification[] = [];
  let elapsedSeconds = 0;
  for (let i = 0; i < phases.length; i++) {
    elapsedSeconds += (phases[i]?.plannedMinutes ?? 0) * 60;
    const boundary = start + elapsedSeconds * 1000;
    if (boundary <= now) continue; // already crossed at this startTime — runTick catch-up handles it
    const nextPhase = phases[i + 1];
    out.push(
      i === phases.length - 1
        ? { triggerTime: boundary, title: "Session complete", body: "You did the work. Rest well." }
        : nextPhase?.type === "break"
          ? { triggerTime: boundary, title: "Break time", body: "Step away and recharge." }
          : { triggerTime: boundary, title: "Focus block", body: "Back to deep work. You've got this." }
    );
  }
  return out;
}

const NOTIFICATION_TAG = "zendo-focus";

function supportsTimestampTrigger(): boolean {
  return (
    typeof Notification !== "undefined" &&
    "showTrigger" in Notification.prototype &&
    typeof NotificationTrigger !== "undefined"
  );
}

/**
 * Reconcile scheduled OS notifications to the session's expected schedule.
 * Cancels stale triggers, schedules missing ones, dedupes by triggerTime.
 * No-op when permission is not granted, the master toggle is off, or the
 * browser doesn't support TimestampTrigger (falls back to the in-tab worker).
 */
export async function syncFocusNotifications(session: FocusSession | undefined): Promise<void> {
  if (typeof window === "undefined") return;
  if (!session) return;
  // Master toggle (same guard reminderScheduler uses); denied = silent skip.
  if (!useMonkStore.getState().appSettings.notificationEnabled) return;
  if (Notification.permission !== "granted") return;
  if (!supportsTimestampTrigger()) return;
  if (!navigator.serviceWorker?.ready) return;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.getNotifications({ tag: NOTIFICATION_TAG });
  const expected = computeFocusNotificationSchedule(session);
  const expectedTimes = new Set(expected.map((n) => n.triggerTime));

  // Cancel stale (paused / ended / boundary already rescheduled / moved).
  for (const notification of existing) {
    const triggerTime = notification.data?.triggerTime as number | undefined;
    if (triggerTime === undefined || !expectedTimes.has(triggerTime)) notification.close();
  }

  // Schedule missing future boundaries.
  for (const item of expected) {
    const already = existing.some((n) => n.data?.triggerTime === item.triggerTime);
    if (already) continue;
    void reg.showNotification(item.title, {
      tag: NOTIFICATION_TAG,
      body: item.body,
      icon: "/apple-touch-icon.png",
      silent: true,
      requireInteraction: false,
      showTrigger: new NotificationTrigger(String(item.triggerTime)),
      data: { triggerTime: item.triggerTime }
    });
  }
}
