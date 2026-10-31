import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./app/App";
import "./styles/globals.css";
import { registerSW } from "virtual:pwa-register";
import { startCloudSync } from "./lib/cloudSync";
import { startCrossTabSync } from "./lib/crossTabSync";

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

startCrossTabSync();
startCloudSync();
