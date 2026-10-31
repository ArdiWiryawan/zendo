// Cross-context state coherence (tabs / installed PWA window).
//
// When the same app runs in two browser contexts over the SAME localStorage,
// each holds its own in-memory zustand store and neither learns about the
// other's writes. Real failure this caused: pause the session in one tab, and
// the other tab's worker kept ticking the session it still believed was
// running — re-stamping `updatedAt` every second, persisting over the paused
// record, and pushing it to the cloud. The next state read (tab reopen, cloud
// pull) then resurrected the session as running from its old wall-clock
// startTime, and the countdown "resumed by itself" while dropping from the
// wall clock (44:00 → 34:00) as if the pause never happened.
//
// The `storage` event is the browser's only cross-context signal for
// localStorage writes — it fires in every OTHER context, never in the writer —
// so the fix is to re-read persisted state whenever another context writes.
// Every store write persists immediately, so the stored snapshot is always at
// least as new as this context's; adopting it is ordinary last-write-wins.

import { STORAGE_KEY } from "./storage";
import { useMonkStore } from "../store/useMonkStore";

const WATCHED_KEYS = new Set([STORAGE_KEY, "focusSessions", "learningSessions", "timelineEvents"]);

export function startCrossTabSync(): void {
  if (typeof window === "undefined") return;
  let timer: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener("storage", (event) => {
    if (!event.key || !WATCHED_KEYS.has(event.key)) return;
    // Debounce: one burst of writes in the writer context costs one re-read here.
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      // hydrate() re-reads storage, normalizes sessions, and replaces state.
      useMonkStore.getState().hydrate();
    }, 300);
  });
}
