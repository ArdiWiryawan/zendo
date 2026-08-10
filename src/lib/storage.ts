import type { MonkMVPState, JournalAnswers } from "../types/app";
import { normalizeFocusSessionRecord, normalizeFocusTimelineEvents } from "../constants/focusSessionStatus";

export const STORAGE_KEY = "monk_mode_pwa_state_v1";
export const JOURNAL_DRAFT_KEY = "monk_journal_draft_v1";

export type JournalDraft = { answers: JournalAnswers; tomorrow: string };

export function readJournalDraft(key: string): JournalDraft | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JournalDraft | JournalAnswers;
    // Legacy drafts stored answers directly (no wrapper object).
    return Array.isArray(parsed) || typeof parsed !== "object" || parsed === null
      ? null
      : "answers" in parsed
        ? { answers: parsed.answers ?? {}, tomorrow: parsed.tomorrow ?? "" }
        : { answers: parsed, tomorrow: "" };
  } catch {
    return null;
  }
}

export function writeJournalDraft(key: string, payload: JournalDraft): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export const NOTEBOOK_DRAFT_KEY = "monk_notebook_draft_v1";

/** Live editor state for a notebook entry, autosaved to localStorage so a
 *  tab close / accidental nav / crash never loses typed text. Mirror of the
 *  journal's draft pattern — the notebook has no per-save persistence until
 *  the user hits Save/Done. */
export type NotebookDraft = {
  entryId: string;
  title: string;
  pages: string[];
  categoryId: string;
  isPinned: boolean;
  createdAt?: string;
};

export function readNotebookDraft(key: string): NotebookDraft | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NotebookDraft;
    if (!parsed || typeof parsed !== "object" || typeof parsed.entryId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeNotebookDraft(key: string, payload: NotebookDraft): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function clearNotebookDraft(key: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

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

  state.focusSessions = (state.focusSessions ?? []).map((session) => normalizeFocusSessionRecord(session));
  state.timelineEvents = normalizeFocusTimelineEvents(state.timelineEvents ?? [], state.focusSessions);

  return state;
}

export function saveState(state: MonkMVPState): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  // Write to separate keys for Focus Sessions, Learning Sessions, and Timeline Events
  if (state.focusSessions) {
    localStorage.setItem("focusSessions", JSON.stringify(state.focusSessions.map((session) => normalizeFocusSessionRecord(session))));
  }
  if (state.learningSessions) {
    localStorage.setItem("learningSessions", JSON.stringify(state.learningSessions));
  } else {
    localStorage.setItem("learningSessions", JSON.stringify([]));
  }
  if (state.timelineEvents) {
    localStorage.setItem("timelineEvents", JSON.stringify(normalizeFocusTimelineEvents(state.timelineEvents, state.focusSessions)));
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

export const LAST_FOCUS_KEY = "zendo.focus.lastPreset";

export type LastFocusChoice = {
  preset: "deep_work" | "pomodoro" | "custom";
  customMinutes: number;
};

export function loadLastFocus(): LastFocusChoice | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_FOCUS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastFocusChoice;
    if (!parsed?.preset) return null;
    const customMinutes = Math.max(5, Math.round(Number(parsed.customMinutes) || 50));
    if (!["deep_work", "pomodoro", "custom"].includes(parsed.preset)) return null;
    return { preset: parsed.preset, customMinutes };
  } catch {
    return null;
  }
}

export function saveLastFocus(preset: LastFocusChoice["preset"], customMinutes: number) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      LAST_FOCUS_KEY,
      JSON.stringify({ preset, customMinutes: Math.max(5, Math.round(customMinutes || 50)) })
    );
  } catch {
    /* ignore */
  }
}
