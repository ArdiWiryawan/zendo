import type { MonkMVPState } from "../types/app";

/**
 * Merge two states last-write-wins by updatedAt.
 *
 * The previous sync used `{ ...local, ...remote }`, which let a STALE or
 * partially-empty remote snapshot silently overwrite newer local data
 * (goals/sessions/journal disappeared). This merge unions record arrays by id,
 * keeping whichever record is newer (updatedAt). Scalars (activeSeason,
 * userProfile, appSettings) also resolve to the newer of the two.
 *
 * Idempotent and order-independent: merging (A,B) === merging (B,A).
 */

type HasId = { id: string; updatedAt?: string };
type HasUpdatedAt = { updatedAt?: string };

function isNewer(a: HasUpdatedAt | undefined | null, b: HasUpdatedAt | undefined | null): boolean {
  const ta = a?.updatedAt ?? "";
  const tb = b?.updatedAt ?? "";
  if (!ta) return false; // a has no timestamp -> prefer b
  if (!tb) return true;  // b has no timestamp -> prefer a
  return ta > tb;
}

/** Union two id-keyed arrays, keeping the newer record per id. */
function mergeById<T extends HasId>(local: T[] | undefined, remote: T[] | undefined): T[] {
  const map = new Map<string, T>();
  for (const rec of local ?? []) map.set(rec.id, rec);
  for (const rec of remote ?? []) {
    const existing = map.get(rec.id);
    if (!existing || isNewer(rec, existing)) map.set(rec.id, rec);
  }
  return [...map.values()];
}

/** Keep the newer of two scalar objects (by updatedAt), preferring whichever exists. */
function mergeScalar<T extends HasUpdatedAt | null>(local: T, remote: T): T {
  if (!local) return remote;
  if (!remote) return local;
  return isNewer(remote, local) ? remote : local;
}

/** Array fields that carry `id` + `updatedAt` — unioned by id, newer wins. */
const ARRAY_KEYS: (keyof MonkMVPState)[] = [
  "goals",
  "badHabits",
  "weeklyPlans",
  "dayPlans",
  "focusSessions",
  "learningSessions",
  "learningEntries",
  "journalEntries",
  "relapseLogs",
  "timelineDays",
  "timelineEvents",
  "notebookCategories",
  "notebookEntries",
  "journalPacks",
  "journalPackSessions",
  "energyLogs",
  "releasedSeasonGoals",
] as const;

/** Scalar/state fields — newer updatedAt wins. */
const SCALAR_KEYS: (keyof MonkMVPState)[] = [
  "activeSeason",
  "userProfile",
  "onboarding",
] as const;

/**
 * Merge remote into local without clobbering newer local data.
 * Returns a NEW state object; never mutates inputs.
 */
export function mergeRemoteState(local: MonkMVPState, remote: Partial<MonkMVPState>): MonkMVPState {
  const out: MonkMVPState = { ...local };

  for (const key of ARRAY_KEYS) {
    const l = local[key];
    const r = remote[key];
    if (Array.isArray(r)) {
      // @ts-expect-error - Dynamic assignment of mapped array types
      out[key] = mergeById(l as HasId[], r as HasId[]);
    }
  }

  for (const key of SCALAR_KEYS) {
    const l = local[key];
    const r = remote[key];
    if (r !== undefined) out[key] = mergeScalar(l as never, r as never);
  }

  return out;
}
