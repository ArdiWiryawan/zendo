import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import "./styles/globals.css";
import { registerSW } from "virtual:pwa-register";
import { getState, setState } from "./lib/supabase";
import { useMonkStore } from "./store/useMonkStore";

// Always render first, then try Supabase sync in background
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Initialize Supabase sync after app renders (non-blocking)
async function initSync(): Promise<void> {
  try {
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
      timer = setTimeout(() => setState(next), 800);
    });
  } catch (err) {
    console.warn("[supabase] offline mode", err);
  }
}

initSync();