import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./app/App";
import "./styles/globals.css";
import { registerSW } from "virtual:pwa-register";
import { getState, isSyncActive, setState } from "./lib/supabase";
import { useMonkStore } from "./store/useMonkStore";
import { setSyncStatus } from "./lib/syncStatus";
import { mergeRemoteState } from "./lib/syncMerge";

// Batch C: actually register the service worker (import alone is a no-op)
registerSW({ immediate: true });

// Data router — required for useBlocker (unsaved-draft guard in JournalEntryScreen).
// App keeps its internal declarative <Routes>; this single route just hosts it.
const router = createBrowserRouter([{ path: "*", element: <App /> }]);

// Always render first, then try Supabase sync in background
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

// Initialize Supabase sync after app renders (non-blocking)
let lastPushState: ReturnType<typeof useMonkStore.getState> | null = null;

async function initSync(): Promise<void> {
  const pushState = async () => {
    const state = useMonkStore.getState();
    lastPushState = state;
    if (!navigator.onLine) {
      setSyncStatus("offline");
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
      setSyncStatus(navigator.onLine ? "error" : "offline");
    }
  };

  const onOnline = () => {
    void isSyncActive().then((active) => {
      setSyncStatus(active ? "synced" : "offline");
      // Reconnect may have accumulated offline edits; push them now (the
      // debounced subscriber also fires on the next store change, but if the
      // offline edits were already saved locally no change fires on reconnect).
      if (active && lastPushState) void pushState();
    });
  };
  const onOffline = () => setSyncStatus("offline");
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  // Register the debounced push BEFORE the initial pull so offline edits are
  // never stranded: even if the pull below fails (offline boot), any later
  // store change pushes to the cloud as soon as sync is possible.
  let timer: ReturnType<typeof setTimeout> | null = null;
  useMonkStore.subscribe((next) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void pushState(), 800);
  });

  if (!navigator.onLine) {
    setSyncStatus("offline");
    return;
  }

  try {
    if (!(await isSyncActive())) {
      setSyncStatus("offline");
      return;
    }
    setSyncStatus("syncing");
    const remote = await Promise.race([
      getState(),
      new Promise<null>((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))
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
    if (await isSyncActive()) setSyncStatus("synced");
  } catch (err) {
    console.warn("[supabase] offline mode", err);
    setSyncStatus("offline");
  }
}

initSync();
