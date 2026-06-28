import type { MonkMVPState } from "../types/app";

export const STORAGE_KEY = "monk_mode_pwa_state_v1";
export const JOURNAL_DRAFT_KEY = "monk_journal_draft_v1";

export function loadState(): MonkMVPState | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  let state: MonkMVPState | null = null;
  
  if (raw) {
    try {
      state = JSON.parse(raw) as MonkMVPState;
    } catch (error) {
      console.error("Failed to parse Zendo state", error);
    }
  }

  if (!state) return null;

  // Enforce separate key loading/fallback
  const focusSessionsRaw = localStorage.getItem("focusSessions");
  const learningSessionsRaw = localStorage.getItem("learningSessions");
  const timelineEventsRaw = localStorage.getItem("timelineEvents");

  if (focusSessionsRaw) {
    try {
      state.focusSessions = JSON.parse(focusSessionsRaw);
    } catch (e) {
      console.error("Failed to load focusSessions from separate key", e);
    }
  }

  state.learningSessions = [];
  if (learningSessionsRaw) {
    try {
      state.learningSessions = JSON.parse(learningSessionsRaw);
    } catch (e) {
      console.error("Failed to load learningSessions from separate key", e);
    }
  }

  state.timelineEvents = [];
  if (timelineEventsRaw) {
    try {
      state.timelineEvents = JSON.parse(timelineEventsRaw);
    } catch (e) {
      console.error("Failed to load timelineEvents from separate key", e);
    }
  }

  return state;
}

export function saveState(state: MonkMVPState): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  // Write to separate keys for Focus Sessions, Learning Sessions, and Timeline Events
  if (state.focusSessions) {
    localStorage.setItem("focusSessions", JSON.stringify(state.focusSessions));
  }
  if (state.learningSessions) {
    localStorage.setItem("learningSessions", JSON.stringify(state.learningSessions));
  } else {
    localStorage.setItem("learningSessions", JSON.stringify([]));
  }
  if (state.timelineEvents) {
    localStorage.setItem("timelineEvents", JSON.stringify(state.timelineEvents));
  } else {
    localStorage.setItem("timelineEvents", JSON.stringify([]));
  }
}

export function clearState(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("focusSessions");
  localStorage.removeItem("learningSessions");
  localStorage.removeItem("timelineEvents");
}

export function exportStateAsJson(): string {
  const state = loadState();
  return JSON.stringify(state, null, 2);
}
