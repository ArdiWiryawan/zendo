import { REST_ACTIVITIES } from "../constants/restActivities";

export type RestStage = "check_in" | "recommendation" | "completed";

export interface RestSelectedActivity {
  /** Recommendation id, `"custom"`, or null when the stored value is unusable. */
  id: string | null;
  title: string | null;
  isCustom: boolean;
}

export interface RestFlowDay {
  mainAction?: string;
  highlight?: string;
  status?: string;
}

export interface RestFlowState {
  stage: RestStage;
  selected: RestSelectedActivity | null;
}

export interface RestAnswersDraft {
  answers: Record<string, string>;
  step: number;
}

const PREFIX = "rest:";
const CUSTOM_PREFIX = "rest:custom:";

/**
 * Parses the persisted rest choice out of `dayPlan.mainAction`.
 *
 * The old read-back did `mainAction.replace("rest:", "")`, which turned
 * `"rest:custom:Walk"` into `"custom:Walk"` — matching no recommendation id, so
 * a custom choice silently read back as "nothing selected". The custom prefix is
 * therefore tested before the plain one.
 */
export function parseRestActivity(mainAction?: string): RestSelectedActivity | null {
  if (typeof mainAction !== "string" || !mainAction.startsWith(PREFIX)) return null;

  const rest = mainAction.slice(PREFIX.length);
  // Marker with no payload ("rest:") is a malformed write, not a choice.
  if (!rest) return null;

  if (rest.startsWith("custom:")) {
    const text = rest.slice("custom:".length).trim();
    // `"rest:custom:"` carries no title; the text is the only thing we could show.
    return text ? { id: "custom", title: text, isCustom: true } : null;
  }

  return { id: rest, title: null, isCustom: false };
}

/** A rest day whose weekly review already happened. */
export function isRestDayClosed(status?: string): boolean {
  return status === "completed";
}

/**
 * Resolves which stage of PLANNED → CHECK_IN → RECOMMENDATION → RESTING →
 * COMPLETED the rest flow is in, from today's plan alone. Nothing new is
 * persisted for this: the chosen activity is already the mainAction, and the
 * review completion is already the status.
 *
 * A chosen activity means COMPLETED — not RECOMMENDATION. Re-opening the
 * questionnaire after the user settled the day read as if nothing was decided,
 * and it forced them to answer the same four questions again.
 */
export function resolveRestFlow(day: RestFlowDay): RestFlowState {
  const selected = parseRestActivity(day.mainAction);

  if (selected) {
    // A custom entry stores its title in the mainAction itself; `highlight` is
    // the fallback for rows written by the older flow.
    if (selected.isCustom && !selected.title) {
      const fallback = day.highlight?.trim();
      if (fallback) selected.title = fallback;
    }
    return { stage: "completed", selected };
  }

  // Review finished without an activity recorded: the day is settled either way.
  if (isRestDayClosed(day.status)) return { stage: "completed", selected: null };

  return { stage: "check_in", selected: null };
}

/** Localized title for a known activity; custom and unknown ids keep their title. */
export function resolveRestTitle(
  selected: RestSelectedActivity,
  lang: "id" | "en"
): string {
  if (selected.isCustom || !selected.id) return selected.title ?? "";
  // A stored title is only ever used when the id is unknown (e.g. the activity
  // was renamed away). Known ids always show the current copy.
  return REST_ACTIVITIES.find((a) => a.id === selected.id)?.title[lang] ?? selected.title ?? "";
}

/**
 * Weekly rhythm, derived from the live plan rather than hardcoded. Returns null
 * when focus targets are unavailable, so the caller omits the line instead of
 * printing a misleading "0 focus days".
 */
export function deriveWeeklyRhythm(
  weeklyPlan?: { goalAllocations?: { targetCount?: number }[]; restDayTarget?: number }
): { focus: number; rest: number } | null {
  const allocations = weeklyPlan?.goalAllocations ?? [];
  const focus = allocations.reduce((sum, a) => sum + (a.targetCount ?? 0), 0);
  if (focus <= 0) return null;
  return { focus, rest: weeklyPlan?.restDayTarget ?? 0 };
}

function storage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    // Private mode can throw on access, not just on write.
    return null;
  }
}

/** A draft is keyed by date so yesterday's half-finished answers expire on their own. */
export function restDraftKey(today: string): string {
  return `zendo_rest_draft_${today}`;
}

export function loadRestDraft(today: string): RestAnswersDraft | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(restDraftKey(today));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const answers = (parsed as RestAnswersDraft).answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) return null;
    const step = Number((parsed as RestAnswersDraft).step);
    return { answers, step: Number.isFinite(step) && step >= 0 ? step : 0 };
  } catch {
    // Corrupt JSON, blocked storage: resume from the top rather than crash.
    return null;
  }
}

export function saveRestDraft(today: string, draft: RestAnswersDraft): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(restDraftKey(today), JSON.stringify(draft));
  } catch {
    // A full or blocked session store is not worth interrupting rest for.
  }
}

export function clearRestDraft(today: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(restDraftKey(today));
  } catch {
    // Same as above.
  }
}
