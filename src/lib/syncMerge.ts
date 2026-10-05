import type { MonkMVPState, NotificationReminder } from "../types/app";
import { dedupeDayPlans } from "./dayPlans";

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

type MergeStrategy =
  | "array" // id-keyed array, unioned by id keeping the newer updatedAt
  | "scalar" // object carrying updatedAt, newer wins
  | "custom" // handled by bespoke code below (tombstones, reminders, purchases, reviews)
  | "local"; // deliberately local-only, never taken from remote

/**
 * How the merge treats each key of MonkMVPState. Typed as a Record over
 * `keyof MonkMVPState` on purpose: adding a field to the state without
 * classifying it here is a compile error. Twice now a new field silently fell
 * out of the merge (dayPlans tombstones, appSettings) and looked like data loss
 * on the next pull, because the lists below were hand-maintained.
 */
const MERGE_STRATEGY = {
  userProfile: "scalar",
  appSettings: "scalar",
  activeSeason: "scalar",
  pastSeasons: "array",
  goals: "array",
  goalTracks: "array",
  badHabits: "array",
  practices: "array",
  practiceLogs: "array",
  projects: "array",
  weeklyPlans: "array",
  dayPlans: "array",
  dayPlanDeletedAt: "custom",
  focusSessions: "array",
  journalEntries: "array",
  relapseLogs: "array",
  timelineDays: "array",
  notificationReminders: "array",
  onboarding: "scalar",
  learningSessions: "array",
  timelineEvents: "array",
  notebookCategories: "array",
  notebookEntries: "array",
  notebookDeletedAt: "custom",
  notebookCategoryDeletedAt: "custom",
  journalPacks: "array",
  journalPackSessions: "array",
  purchasedPackIds: "custom",
  energyLogs: "array",
  weeklyReviews: "custom",
  isPro: "local",
  proTier: "local",
  proExpiresAt: "local",
  proPurchasedAt: "local",
  releasedSeasonGoals: "array",
} satisfies Record<keyof MonkMVPState, MergeStrategy>;

/** Array fields that carry `id` + `updatedAt` — unioned by id, newer wins. */
const ARRAY_KEYS = (Object.keys(MERGE_STRATEGY) as (keyof MonkMVPState)[]).filter(
  (k) => MERGE_STRATEGY[k] === "array",
);

/** Scalar/state fields — newer updatedAt wins. */
const SCALAR_KEYS = (Object.keys(MERGE_STRATEGY) as (keyof MonkMVPState)[]).filter(
  (k) => MERGE_STRATEGY[k] === "scalar",
);

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

  // dayPlans is the one array read by a composite key (seasonId + date) rather
  // than by id, so the id-keyed union above can leave two records for one day —
  // one per device that created it independently. Collapse them here, keeping
  // the newer updatedAt, so both devices resolve the same record.
  out.dayPlans = dedupeDayPlans(out.dayPlans) ?? [];

  for (const key of SCALAR_KEYS) {
    const l = local[key];
    const r = remote[key];
    if (r !== undefined) out[key] = mergeScalar(l as never, r as never);
  }

  if (Array.isArray(out.notificationReminders)) {
    const map = new Map<string, NotificationReminder>();
    out.notificationReminders.forEach((rem) => {
      const existing = map.get(rem.type);
      if (!existing || (rem.updatedAt && (!existing.updatedAt || rem.updatedAt > existing.updatedAt))) {
        map.set(rem.type, { ...rem, id: `rem_${rem.type}` });
      }
    });
    out.notificationReminders = Array.from(map.values());
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

  // dayPlanDeletedAt is the same monotonic tombstone map for cleared day plans
  // (id → deletion ISO): a CLEARED day on ANY device must survive merges on
  // every other device, so union both sides. This runs AFTER the dedupeDayPlans
  // above — otherwise a tombstoned id could slip back in via the composite-key
  // union. Delete always wins over a stale resurrect.
  const ldt = local.dayPlanDeletedAt ?? {};
  const rdt = remote.dayPlanDeletedAt;
  if (rdt && typeof rdt === "object") out.dayPlanDeletedAt = { ...ldt, ...rdt };
  else if (Object.keys(ldt).length > 0) out.dayPlanDeletedAt = { ...ldt };
  const dayTombstoned = new Set(Object.keys(out.dayPlanDeletedAt ?? {}));
  if (dayTombstoned.size > 0) {
    out.dayPlans = (out.dayPlans ?? []).filter((p) => !dayTombstoned.has(p.id));
  }

  // notebookCategoryDeletedAt is a monotonic tombstone map for deleted categories:
  const lct = local.notebookCategoryDeletedAt ?? {};
  const rct = remote.notebookCategoryDeletedAt;
  if (rct && typeof rct === "object") out.notebookCategoryDeletedAt = { ...lct, ...rct };
  else if (Object.keys(lct).length > 0) out.notebookCategoryDeletedAt = { ...lct };
  const catTombstoned = new Set(Object.keys(out.notebookCategoryDeletedAt ?? {}));
  if (catTombstoned.size > 0) {
    out.notebookCategories = (out.notebookCategories ?? []).filter((c) => !catTombstoned.has(c.id));
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
