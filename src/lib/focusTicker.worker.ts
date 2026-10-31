import { createFocusPhases } from "../constants/focusPresets";
import type { FocusSession } from "../types/app";

export type FocusTickAction =
  | { type: "advance"; /** Nominal wall-clock instant the boundary was crossed (startTime + elapsed planned phases). */ at?: string }
  | { type: "tick"; elapsedSeconds: number }
  | { type: "complete"; /** Nominal wall-clock instant the session finished. */ at?: string };

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
  // Wall-clock instant of each crossed boundary: startTime + every planned
  // phase before it. When boundary detection is late (frozen tab, suspended
  // worker, delayed catch-up), the advance must anchor the NEXT phase to this
  // nominal instant instead of the late "now", or the whole schedule shifts by
  // exactly the detection latency and every later bell rings late too.
  const startMs = new Date(session.startTime).getTime();
  let boundaryMs = startMs;
  const crossedAt: string[] = [];
  while (index < phases.length - 1 && remaining >= (phases[index]?.plannedMinutes ?? 0) * 60) {
    boundaryMs += (phases[index]?.plannedMinutes ?? 0) * 60 * 1000;
    crossedAt.push(new Date(boundaryMs).toISOString());
    remaining -= (phases[index]?.plannedMinutes ?? 0) * 60;
    index++;
    crossed++;
  }

  if (remaining >= (phases[index]?.plannedMinutes ?? 0) * 60) {
    // The last phase has also elapsed: cross whatever remains, then complete.
    boundaryMs += (phases[index]?.plannedMinutes ?? 0) * 60 * 1000;
    const advances = Array.from({ length: phases.length - 1 - currentIndex }, (_, i) => ({
      type: "advance" as const,
      at: crossedAt[i]
    }));
    return {
      actions: [...advances, { type: "complete" as const, at: new Date(boundaryMs).toISOString() }],
      bell: { title: "Session complete", body: "You did the work. Rest well.", vibrate: 300 }
    };
  }

  if (crossed > 0) {
    const settled = phases[index];
    return {
      actions: crossedAt.map((at) => ({ type: "advance" as const, at })),
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
// background.
const isDedicatedWorker =
  typeof window === "undefined" &&
  typeof document === "undefined" &&
  typeof self !== "undefined" &&
  typeof (self as any).postMessage === "function";

if (isDedicatedWorker) {
  setInterval(() => {
    (self as unknown as { postMessage: (message: unknown) => void }).postMessage({
      type: "tick",
      now: Date.now()
    });
  }, 1000);
}
