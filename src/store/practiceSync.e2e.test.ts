import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore } from "./useMonkStore";
import { createInitialState } from "../constants/defaultData";
import { loadState, STORAGE_KEY } from "../lib/storage";
import { mergeRemoteState } from "../lib/syncMerge";
import { nowIso } from "../lib/date";
import type { MonkMVPState } from "../types/app";

/**
 * End-to-end regression: a practice created through the REAL store must survive
 * persist -> reload -> cloud-merge.
 *
 * Two regressions are locked down here at once:
 *
 * 1. `partialize` once omitted `practices` / `practiceLogs`. A practice made via
 *    `addPractice` then lived only in memory: it never reached the persisted
 *    blob, and hydrate's `stored.practices ?? []` wiped it on the next reload.
 *    `src/store/useMonkStore.persist.test.ts` pins the partialize keys; this file
 *    drives the real adapter + reload path end to end.
 *
 * 2. The debounced cloud push in `src/main.tsx` was armed before the initial
 *    pull, so boot shipped an unreconciled state over the cloud row. If the local
 *    snapshot that gets merged/pushed is built from a state where practices were
 *    already lost, the newer remote revision carries no practices and the phone's
 *    copy disappears. Step 5 below reproduces the exact "phone had no practices,
 *    laptop reloaded, practice vanished" ordering.
 *
 * No non-test source file is modified; every write goes through the real store
 * actions and the real persist adapter.
 */

/** In-memory Storage stub. Mirrors the one in `src/lib/storage.test.ts`; that
 *  helper is not exported, so it is reproduced here verbatim in shape. */
function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    }
  };
}

/** The store hook carries the persist API in zustand v5 — same access idiom as
 *  `src/store/useMonkStore.persist.test.ts`. */
function persistOptions(): {
  setItem: (name: string, value: unknown) => void;
} {
  return (useMonkStore as any).persist.getOptions().storage;
}

/** Drive the code the app actually runs on a state change: zustand's persist
 *  wrapper serializes with `partialize` and hands the result to the adapter's
 *  `setItem`. Going through `persist.setOptions`' setItem (not a hand-rolled
 *  object) is what makes this an e2e check of `partialize`. */
function writeThroughRealPersistPath(): void {
  const options = (useMonkStore as any).persist.getOptions();
  const partialized = options.partialize(useMonkStore.getState());
  persistOptions().setItem(options.name, { state: partialized, version: options.version });
}

describe("practice persist -> reload -> cloud-merge (e2e)", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
      writable: true
    });
    // No leaked state across tests.
    useMonkStore.getState().resetApp();
  });

  it("a practice created via addPractice survives persist, reload and a merge with an older practice-less remote", () => {
    // ── 1. Establish a season. `addPractice` returns `undefined` without one. ──
    useMonkStore.setState({
      activeSeason: {
        id: "season_e2e",
        name: "Season E2E",
        startDate: "2026-08-01",
        endDate: "2026-08-30",
        durationDays: 30,
        status: "active",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z"
      }
    } as unknown as Partial<MonkMVPState>);
    expect(
      useMonkStore.getState().activeSeason,
      "season setup failed — every assertion below depends on it"
    ).not.toBeNull();

    // ── 2. Create the practice through the real action. ──
    const created = useMonkStore.getState().addPractice({ name: "Membaca" });
    expect(
      created,
      "addPractice returned undefined — season setup is wrong, so this test proves nothing"
    ).toBeDefined();
    expect(created?.name).toBe("Membaca");

    // ── 6a. Log one completion through the real action. ──
    useMonkStore.getState().togglePracticeLog(created!.id, "2026-08-02");
    expect(useMonkStore.getState().practiceLogs).toHaveLength(1);

    // ── 3. Write through the REAL persist path (exercises `partialize`). ──
    writeThroughRealPersistPath();

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw, "nothing was written under the storage key").not.toBeNull();
    // The blobs are written unwrapped by the adapter; a stray `{ state: ... }`
    // wrapper here would mean the reload below reads a different shape than the app.
    expect(JSON.parse(raw!)).not.toHaveProperty("state");

    // ── 4. Reload: read back what the app's own loader reads. ──
    const reloaded = loadState();
    expect(reloaded, "loadState returned null after a successful persist").not.toBeNull();

    const reloadedPractice = reloaded!.practices?.find((p) => p.id === created!.id);
    expect(
      reloadedPractice,
      "practice was dropped by the persist reload — partialize is omitting `practices` again"
    ).toBeDefined();
    expect(reloadedPractice!.name).toBe("Membaca");

    // ── 6b. practiceLogs survives the same round-trip. ──
    expect(
      reloaded!.practiceLogs,
      "practiceLogs was dropped by the persist reload"
    ).toHaveLength(1);
    expect(reloaded!.practiceLogs[0].practiceId).toBe(created!.id);
    expect(reloaded!.practiceLogs[0].date).toBe("2026-08-02");

    // ── 5. Merge against an OLDER, practice-less remote. ──
    // "Phone had no practices, laptop reloaded": the incoming snapshot predates
    // every practice and must not be able to erase the reloaded local ones.
    const local = reloaded!;
    const remote = createInitialState();
    expect(remote.practices, "the fixture remote should carry no practices").toHaveLength(0);

    const merged = mergeRemoteState(local, remote);

    const mergedPractice = merged.practices.find((p) => p.id === created!.id);
    expect(
      mergedPractice,
      "practice vanished in the cloud merge — mergeRemoteState let a stale online snapshot win"
    ).toBeDefined();
    expect(mergedPractice!.name).toBe("Membaca");
    expect(merged.practiceLogs).toHaveLength(1);
    expect(merged.practiceLogs[0].practiceId).toBe(created!.id);
  });

  it("does not persist a practice when there is no season (guard stays honest)", () => {
    // No season: addPractice must refuse rather than half-write. This keeps the
    // first test's season step meaningful — it would otherwise be untested glue.
    expect(useMonkStore.getState().activeSeason).toBeNull();
    expect(useMonkStore.getState().addPractice({ name: "Membaca" })).toBeUndefined();
    expect(useMonkStore.getState().practices).toHaveLength(0);

    writeThroughRealPersistPath();
    const reloaded = loadState();
    expect(reloaded!.practices ?? []).toHaveLength(0);
  });

  it("persists the practice across a second write so a later edit cannot drop it", () => {
    // A second persist cycle is the realistic path: the debounced cloud push and
    // any unrelated state change re-serialize everything. A partialize regression
    // that only manifests when practices are non-empty would also be caught here.
    useMonkStore.setState({
      activeSeason: {
        id: "season_e2e",
        name: "Season E2E",
        startDate: "2026-08-01",
        endDate: "2026-08-30",
        durationDays: 30,
        status: "active",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z"
      }
    } as unknown as Partial<MonkMVPState>);

    const created = useMonkStore.getState().addPractice({ name: "Membaca" })!;
    expect(created).toBeDefined();

    const stamp = nowIso();
    useMonkStore.setState({ appSettings: { ...useMonkStore.getState().appSettings, updatedAt: stamp } });
    writeThroughRealPersistPath();

    const reloaded = loadState()!;
    expect(reloaded.practices.map((p) => p.name)).toContain("Membaca");
    expect(reloaded.appSettings.updatedAt).toBe(stamp);
  });
});
