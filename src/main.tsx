import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./app/App";
import "./styles/globals.css";
import { registerSW } from "virtual:pwa-register";
import { getState, setState } from "./lib/supabase";
import { useMonkStore } from "./store/useMonkStore";
import { setSyncStatus } from "./lib/syncStatus";

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
async function initSync(): Promise<void> {
  const onOnline = () => setSyncStatus("synced");
  const onOffline = () => setSyncStatus("offline");
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  if (!navigator.onLine) {
    setSyncStatus("offline");
    return;
  }

  try {
    setSyncStatus("syncing");
    const remote = await Promise.race([
      getState(),
      new Promise<null>((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))
    ]);

    if (remote && Object.keys(remote).length > 0) {
      useMonkStore.setState((state) => ({ ...state, ...remote }));
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    useMonkStore.subscribe((next) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!navigator.onLine) {
          setSyncStatus("offline");
          return;
        }
        setSyncStatus("syncing");
        void setState(next)
          .then(() => setSyncStatus("synced"))
          .catch(() => setSyncStatus(navigator.onLine ? "error" : "offline"));
      }, 800);
    });
    setSyncStatus("synced");
  } catch (err) {
    console.warn("[supabase] offline mode", err);
    setSyncStatus("offline");
  }
}

initSync();
