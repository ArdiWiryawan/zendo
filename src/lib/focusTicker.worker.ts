import { createFocusPhases } from "../constants/focusPresets";
import type { FocusSession } from "../types/app";

export type FocusTickAction =
  | { type: "advance" }
  | { type: "tick"; elapsedSeconds: number }
  | { type: "complete" };

export type FocusTickBell = {
  title: string;
  body: string;
  vibrate: number | number[];
};

export type FocusTickPlan = {
  actions: FocusTickAction[];
  // Bell/notification payload for the phase the session settles into — at most
  // one even when a burst crosses several boundaries (no wall of bells).
  bell?: FocusTickBell;
};

/**
 * Pure decision logic for one focus-clock tick. Given a session snapshot and
 * "now", returns the state transitions the session must undergo:
 *   - in-phase: one { tick, elapsedSeconds } to refresh the countdown,
 *   - boundary: one { advance } per phase crossed (multi-phase catch-up after a
 *     long background spell produces several advances at once),
 *   - final phase: { complete }.
 * The session's own advanceFocusPhase/completeFocusSession idempotence guards
 * make repeated ticks safe; the caller re-reads fresh state between actions.
 */
export function planFocusTick(session: FocusSession, now: number): FocusTickPlan {
  if (session.status !== "running") return { actions: [] };
  const phases = session.phases?.length
    ? session.phases
    : createFocusPhases(session.preset ?? session.timerMode ?? "deep_work", session.durationMinutes);
  const currentIndex = session.currentPhaseIndex ?? 0;
  const elapsed = Math.max(0, Math.floor((now - new Date(session.startTime).getTime()) / 1000));

  let remaining = elapsed;
  let index = currentIndex;
  let crossed = 0;
  while (index < phases.length - 1 && remaining >= (phases[index]?.plannedMinutes ?? 0) * 60) {
    remaining -= (phases[index]?.plannedMinutes ?? 0) * 60;
    index++;
    crossed++;
  }

  if (remaining >= (phases[index]?.plannedMinutes ?? 0) * 60) {
    // The last phase has also elapsed: cross whatever remains, then complete.
    const advances = Array.from({ length: phases.length - 1 - currentIndex }, () => ({ type: "advance" as const }));
    return {
      actions: [...advances, { type: "complete" as const }],
      bell: { title: "Session complete", body: "You did the work. Rest well.", vibrate: 300 }
    };
  }

  if (crossed > 0) {
    const settled = phases[index];
    return {
      actions: Array.from({ length: crossed }, () => ({ type: "advance" as const })),
      bell: settled?.type === "break"
        ? { title: "Break time", body: "Step away and recharge.", vibrate: [200, 100, 200] }
        : { title: "Focus block", body: "Back to deep work. You've got this.", vibrate: [200, 100, 200] }
    };
  }

  return {
    actions: [{ type: "tick" as const, elapsedSeconds: Math.min(elapsed, (phases[currentIndex]?.plannedMinutes ?? 0) * 60) }]
  };
}

// Browser dedicated workers are NOT subject to hidden-tab timer throttling, so
// this 1s tick keeps the focus clock advancing while the tab/PWA is in the
// background. No logic beyond the timer — App.tsx decides what each tick does.
// Guard: `importScripts` exists ONLY on a WorkerGlobalScope, never on `window`
// or in node (vitest). This module is also imported by the app bundle (for
// planFocusTick), so without this guard the interval would auto-start on the
// MAIN thread and postMessage to a window "message" listener nobody attaches —
// which is exactly the frozen-timer bug this worker is meant to fix.
// `importScripts` is defined only on a WorkerGlobalScope, never on `window`.
if (typeof self !== "undefined" && typeof (self as unknown as { importScripts?: unknown }).importScripts === "function") {
  setInterval(() => {
    (self as unknown as { postMessage: (message: unknown) => void }).postMessage({
      type: "tick",
      now: Date.now()
    });
  }, 1000);
}
