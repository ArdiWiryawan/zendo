import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import "./styles/globals.css";
import { registerSW } from "virtual:pwa-register";
import { getState, setState } from "./lib/supabase";
import { useMonkStore } from "./store/useMonkStore";

registerSW({ immediate: true });

async function bootstrap(): Promise<void> {
  try {
    // Load existing state from Supabase
    const remote = await getState();
    if (remote && Object.keys(remote).length > 0) {
      // Merge remote state into Zustand
      useMonkStore.setState((state) => ({ ...state, ...remote }));
    }

    // Subscribe to Zustand changes and push to Supabase (debounced)
    let timer: ReturnType<typeof setTimeout> | null = null;
    useMonkStore.subscribe((next) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setState(next);
      }, 800);
    });
  } catch (err) {
    console.warn("[supabase] init failed – offline mode", err);
  }
}

bootstrap().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
});