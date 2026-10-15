import type { MonkMVPState, JournalAnswers, ParaType } from "../types/app";
import { normalizeFocusSessionRecord, normalizeFocusTimelineEvents } from "../constants/focusSessionStatus";
import { resolveActivityCategory } from "./activityCategory";

export const STORAGE_KEY = "monk_mode_pwa_state_v1";
/** Boot-time snapshot of the last state that carried real user data. Read only
 *  when the main key is missing/blank/corrupt, so one bad write cannot strand
 *  the app on onboarding while the user's season exists. */
export const BACKUP_KEY = "monk_mode_pwa_state_v1__last_good";
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
  paraType?: ParaType;
  goalId?: string;
  takeaway?: string;
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

/**
 * True when a state carries something a user would miss: an identity, a
 * season, or any record they created. Seed defaults alone (journal packs,
 * default notebook categories, habit reminders) do not count — every fresh
 * install has them, so they cannot distinguish "user data" from "blank state".
 *
 * Used by two safety nets: `saveState` refuses to write a blank state over a
 * stored one, and `loadState` heals from the last known-good snapshot.
 */
export function hasMeaningfulState(state: Partial<MonkMVPState> | null | undefined): boolean {
  if (!state || typeof state !== "object") return false;
  if (state.userProfile || state.activeSeason) return true;
  if ((state.pastSeasons?.length ?? 0) > 0) return true;
  if (Object.keys(state.weeklyReviews ?? {}).length > 0) return true;
  const collections: Array<unknown> = [
    state.goals,
    state.goalTracks,
    state.badHabits,
    state.practices,
    state.practiceLogs,
    state.projects,
    state.weeklyPlans,
    state.dayPlans,
    state.focusSessions,
    state.journalEntries,
    state.relapseLogs,
    state.timelineDays,
    state.learningSessions,
    state.timelineEvents,
    state.notebookEntries,
    state.journalPackSessions,
    state.energyLogs,
    state.releasedSeasonGoals
  ];
  return collections.some((collection) => Array.isArray(collection) && collection.length > 0);
}

function readRawState(key: string): MonkMVPState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as MonkMVPState;
  } catch {
    return null;
  }
}

/** Snapshot the last known-good state (called once per boot from `hydrate`).
 *  Blank states are never snapshotted — a snapshot must be worth restoring. */
export function saveBackupState(state: MonkMVPState): void {
  if (typeof localStorage === "undefined") return;
  if (!hasMeaningfulState(state)) return;
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(state));
  } catch {
    /* quota — the main write still carries the data */
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
      // Quarantine instead of returning null silently. `hydrate` no-ops on a
      // null, so the store keeps `createInitialState()` and the next write
      // persists that empty state over the user's data — a parse hiccup became
      // permanent, unrecoverable loss. Keeping the raw string means the app can
      // still be recovered by hand.
      try {
        localStorage.setItem(`${STORAGE_KEY}__corrupt_backup`, raw);
      } catch {
        /* quota — nothing more we can do */
      }
    }
  }

  // A blank or unreadable main key falls back to the last known-good snapshot
  // taken at boot (see saveBackupState). Without this, an emptied key made the
  // store keep `createInitialState()` and the gates showed onboarding even
  // though the user's season existed — and the next write made the loss real.
  if (!state || !hasMeaningfulState(state)) {
    const backup = readRawState(BACKUP_KEY);
    if (backup && hasMeaningfulState(backup)) {
      console.warn("[zendo] restored the last known-good state snapshot");
      state = backup;
    }
  }

  if (!state) return null;

  // Enforce separate key loading/fallback
  const focusSessionsRaw = localStorage.getItem("focusSessions");
  const learningSessionsRaw = localStorage.getItem("learningSessions");
  const timelineEventsRaw = localStorage.getItem("timelineEvents");

  // The main blob is written FIRST and carries these three arrays too
  // (`partialize` includes them), so it is the authoritative copy. The writer
  // then sets the three satellites with no transaction, so a write interrupted
  // between the two steps leaves a stale satellite — and letting a satellite
  // override unconditionally here made that stale copy win on the next load,
  // silently dropping the newest sessions. A satellite is now read only when the
  // main blob predates it (the array is absent); once the main blob parsed, its
  // copy wins. The satellites are still written and still read this way, so
  // older clients that only know the satellites keep working.
  if (!Array.isArray(state.focusSessions) && focusSessionsRaw) {
    try {
      state.focusSessions = JSON.parse(focusSessionsRaw);
    } catch (e) {
      console.error("Failed to load focusSessions from separate key", e);
    }
  }

  if (!Array.isArray(state.learningSessions)) {
    state.learningSessions = [];
    if (learningSessionsRaw) {
      try {
        state.learningSessions = JSON.parse(learningSessionsRaw);
      } catch (e) {
        console.error("Failed to load learningSessions from separate key", e);
      }
    }
  }

  if (!Array.isArray(state.timelineEvents)) {
    state.timelineEvents = [];
    if (timelineEventsRaw) {
      try {
        state.timelineEvents = JSON.parse(timelineEventsRaw);
      } catch (e) {
        console.error("Failed to load timelineEvents from separate key", e);
      }
    }
  }

  state.focusSessions = (state.focusSessions ?? []).map((session) => normalizeFocusSessionRecord(session));
  state.timelineEvents = normalizeFocusTimelineEvents(state.timelineEvents ?? [], state.focusSessions);

  // Resolve every persisted block's category at the single point where data
  // enters the app. `JSON.parse(...) as MonkMVPState` is an unchecked cast: a
  // category edited by hand, stored by a future build, or left behind by a
  // rename is otherwise carried straight to the renderers and the ICS exporter
  // as an id they cannot look up. Normalising here means every downstream
  // reader sees a valid id and none of them needs its own fallback. The value
  // is only corrected in memory; the stored record is left alone until the next
  // write, so nothing is rewritten behind the user's back.
  const plans = state.dayPlans;
  if (Array.isArray(plans)) {
    for (const plan of plans) {
      const blocks = plan?.timeBlocks;
      if (!Array.isArray(blocks)) continue;
      for (const block of blocks) {
        if (!block) continue;
        block.category = resolveActivityCategory(block.category);
      }
    }
  }

  return state;
}

export function saveState(state: MonkMVPState): void {
  if (typeof localStorage === "undefined") return;
  // A blank in-memory state must never erase stored data. Blank states have
  // reached this point through unknown boot-time paths (a wiped key + a no-op
  // hydrate + the next write made the loss permanent and the gates showed
  // onboarding). Refusing the write keeps the door open for loadState's
  // snapshot fallback on the next boot.
  if (!hasMeaningfulState(state)) {
    const stored = readRawState(STORAGE_KEY);
    if (stored && hasMeaningfulState(stored)) {
      console.warn("[zendo] skipped an empty-state write over stored data");
      return;
    }
  }
  try {
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
  } catch (err) {
    console.warn("Could not persist state to localStorage (quota or private mode)", err);
  }
}

export function clearState(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(BACKUP_KEY);
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
