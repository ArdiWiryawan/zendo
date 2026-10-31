// Cloud sync orchestration (Supabase row sync) — extracted from main.tsx so the
// Settings screen can expose a manual "Sync now" and reuse the same guards.
//
// Flow: boot → pull remote into local (merge, last-write-wins by updatedAt) →
// arm a debounced push on every store change. Reliability rules learned the hard
// way:
//   * A pull that never succeeded this session BLOCKS blank-state pushes — a
//     fresh device must not overwrite the cloud row with its empty local state.
//   * Pull retries on reconnect and on returning to the tab; the phone on mobile
//     data used to lose its only chance at a 3-second boot-time timeout.

import { getState, isSyncActive, setState, subscribeAuthState } from "./supabase";
import { useMonkStore } from "../store/useMonkStore";
import { hasMeaningfulState } from "./storage";
import { setSyncStatus } from "./syncStatus";
import { mergeRemoteState } from "./syncMerge";

let lastPushState: ReturnType<typeof useMonkStore.getState> | null = null;
/** True only after a pull has merged (or confirmed an empty cloud row). */
let pullSucceeded = false;
let pullInFlight = false;
let started = false;

export async function pushLocalState(): Promise<void> {
  const state = useMonkStore.getState();
  lastPushState = state;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setSyncStatus("offline");
    return;
  }
  // Never let an un-synced blank state overwrite the cloud row. A device with
  // real local data may still push (its edits are worth uploading), but an
  // empty state can only be a boot that never pulled.
  if (!pullSucceeded && !hasMeaningfulState(state)) {
    setSyncStatus("idle");
    return;
  }
  try {
    if (!(await isSyncActive())) {
      // No account (or Supabase not configured) — sync is local-only.
      setSyncStatus("offline");
      return;
    }
    setSyncStatus("syncing");
    await setState(state);
    setSyncStatus("synced");
  } catch {
    setSyncStatus(typeof navigator !== "undefined" && navigator.onLine ? "error" : "offline");
  }
}

export async function pullRemoteState(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setSyncStatus("offline");
    return;
  }
  if (pullInFlight) return;
  pullInFlight = true;
  try {
    if (!(await isSyncActive())) {
      setSyncStatus("offline");
      return;
    }
    setSyncStatus("syncing");
    // 3s was optimistic for a phone on mobile data — the single boot-time pull
    // failed there, the phone kept its stale local state ("2/3 done",
    // onboarding again) and no retry ever ran. 10s covers a cold 3G handshake.
    const remote = await Promise.race([
      getState(),
      new Promise<null>((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000))
    ]);

    if (remote && Object.keys(remote).length > 0) {
      // Safety net: snapshot current local state before applying remote, so a
      // bad sync can never silently destroy newer local data without recovery.
      const before = useMonkStore.getState();
      localStorage.setItem("zendo_state_backup_v1", JSON.stringify(before));
      // Merge last-write-wins by updatedAt — a stale/empty remote must not
      // clobber newer local goals/sessions/journal (the old spread did).
      useMonkStore.setState((state) => mergeRemoteState(state, remote));
    }
    pullSucceeded = true;
    if (await isSyncActive()) setSyncStatus("synced");
  } catch (err) {
    console.warn("[supabase] offline mode", err);
    setSyncStatus("offline");
  } finally {
    pullInFlight = false;
  }
}

/** Manual reconcile: pull first (merge), then push local edits. */
export async function syncNow(): Promise<void> {
  await pullRemoteState();
  if (pullSucceeded) await pushLocalState();
}

export function startCloudSync(): void {
  if (started) return;
  started = true;

  const onOnline = () => {
    // Reconnect is a second chance for the boot pull: the phone that timed out
    // at boot gets its data here instead of staying stale until next launch.
    void isSyncActive().then((active) => {
      if (!active) {
        setSyncStatus("offline");
        return;
      }
      void pullRemoteState().then(() => {
        // Reconnect may have accumulated offline edits; push them now (the
        // debounced subscriber also fires on the next store change, but if the
        // offline edits were already saved locally no change fires on reconnect).
        if (lastPushState) void pushLocalState();
      });
    });
  };
  const onVisible = () => {
    // Returning to the tab/app is the natural moment to reconcile: sessions on
    // the laptop earlier the same day should appear on the phone without a
    // cold relaunch. Pull first (merge), the debounced push handles the rest.
    if (document.visibilityState === "visible") {
      void isSyncActive().then((active) => {
        if (active && navigator.onLine) void pullRemoteState();
      });
    }
  };
  const onOffline = () => setSyncStatus("offline");
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisible);

  // Arm the debounced push only AFTER the initial pull settles (success or
  // failure). Ordering matters: a store write during boot (e.g. recordOpen()
  // runs on every mount and does set({appSettings})) would otherwise fire
  // pushState 800ms later — shipping a state that hydrate() had not yet
  // reconciled with the cloud row, and wiping it. Nothing can push during the
  // pull window because the app has just started and holds no user edits yet.
  // A future reader moving this back above the initial pull reintroduces that bug.
  let timer: ReturnType<typeof setTimeout> | null = null;
  const armPush = () => {
    useMonkStore.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void pushLocalState(), 800);
    });
  };

  // Listen to Auth state changes to pull cloud data on login / reset on logout
  subscribeAuthState((_event, session) => {
    if (session?.user) {
      void pullRemoteState();
    } else {
      pullSucceeded = false;
      setSyncStatus("offline");
    }
  });

  void pullRemoteState().finally(armPush);
}
