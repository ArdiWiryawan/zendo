import { useEffect, useState } from "react";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

type Listener = (s: SyncStatus) => void;

let status: SyncStatus = "idle";
const listeners = new Set<Listener>();

export function getSyncStatus() {
  return status;
}

export function setSyncStatus(s: SyncStatus) {
  status = s;
  listeners.forEach((l) => l(s));
}

export function subscribeSyncStatus(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useSyncStatus(): SyncStatus {
  const [s, setS] = useState(status);
  useEffect(() => subscribeSyncStatus(setS), []);
  return s;
}
