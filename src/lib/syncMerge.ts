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
    if (!existing || isNewer(rec, existing)) {
      // Preserve local-only images field for NotebookEntry when remote record is newer but lacks images
      if (existing && 'images' in existing && !('images' in rec && rec.images)) {
        map.set(rec.id, { ...rec, images: (existing as any).images } as T);
      } else {
        map.set(rec.id, rec);
      }
    }
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
  "notificationReminders",
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

  // notebookDeletedAt is a monotonic tombstone map (id → deletion ISO): a
  // delete on ANY device must survive merges on every other device, so union
  // both sides (local tombstones always survive even when an older client sends
  // no tombstone field). Tombs never "expire" here — only the hydrate path
  // prunes >30d.
  const lt = local.notebookDeletedAt ?? {};
  const rt = remote.notebookDeletedAt;
  if (rt && typeof rt === "object") out.notebookDeletedAt = { ...lt, ...rt };
  else if (Object.keys(lt).length > 0) out.notebookDeletedAt = { ...lt };
  // Delete always wins over a stale resurrect: drop any entry whose id is
  // tombstoned (from either side), regardless of updatedAt recency.
  const tombstoned = new Set(Object.keys(out.notebookDeletedAt ?? {}));
  if (tombstoned.size > 0) {
    out.notebookEntries = (out.notebookEntries ?? []).filter((e) => !tombstoned.has(e.id));
  }

  // purchasedPackIds is a monotonic string set (no per-id updatedAt) — a
  // purchase on ANY device must never vanish, so union both sides.
  const lp = local.purchasedPackIds ?? [];
  const rp = remote.purchasedPackIds;
  if (Array.isArray(rp)) out.purchasedPackIds = Array.from(new Set([...lp, ...rp]));

  // weeklyReviews is a Record keyed by weekId; WeeklyReview.date is the write
  // timestamp, so per-week keep the later write (order-independent).
  const lr = local.weeklyReviews ?? {};
  const rr = remote.weeklyReviews;
  if (rr && typeof rr === "object") {
    const merged = { ...lr };
    for (const [k, rv] of Object.entries(rr)) {
      const lv = merged[k];
      if (!lv || !rv || String(rv.date) >= String(lv.date)) {
        (merged as Record<string, unknown>)[k] = rv;
      }
    }
    out.weeklyReviews = merged as MonkMVPState["weeklyReviews"];
  }

  return out;
}
