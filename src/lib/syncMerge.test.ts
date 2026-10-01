import { describe, expect, it } from "vitest";
import { mergeRemoteState } from "./syncMerge";
import type { MonkMVPState, Goal } from "../types/app";
import { createInitialState, createDefaultOnboarding } from "../constants/defaultData";

function mkState(goals: Partial<Goal>[] = []): MonkMVPState {
  const st = createInitialState();
  st.goals = goals as Goal[];
  return st;
}

describe("mergeRemoteState", () => {
  it("keeps newer local scalar over stale remote", () => {
    const local = mkState();
    local.userProfile = { id: "u1", updatedAt: "2026-08-02T10:00:00Z" } as any;
    const remote = mkState();
    remote.userProfile = { id: "u1", updatedAt: "2026-08-01T10:00:00Z" } as any;

    const merged = mergeRemoteState(local, remote);
    expect(merged.userProfile?.updatedAt).toBe("2026-08-02T10:00:00Z");
  });

  it("takes newer remote scalar over older local", () => {
    const local = mkState();
    local.userProfile = { id: "u1", updatedAt: "2026-08-01T10:00:00Z" } as any;
    const remote = mkState();
    remote.userProfile = { id: "u1", updatedAt: "2026-08-02T10:00:00Z" } as any;

    const merged = mergeRemoteState(local, remote);
    expect(merged.userProfile?.updatedAt).toBe("2026-08-02T10:00:00Z");
  });

  it("unions arrays and keeps newer records", () => {
    const local = mkState([
      { id: "g1", title: "Local G1", updatedAt: "2026-08-02" },
      { id: "g2", title: "Local G2", updatedAt: "2026-08-01" }, // Older
    ]);
    const remote = mkState([
      { id: "g2", title: "Remote G2", updatedAt: "2026-08-02" }, // Newer
      { id: "g3", title: "Remote G3", updatedAt: "2026-08-01" }, // New record
    ]);

    const merged = mergeRemoteState(local, remote);
    expect(merged.goals).toHaveLength(3);

    const g1 = merged.goals.find((g) => g.id === "g1");
    expect(g1?.title).toBe("Local G1");

    const g2 = merged.goals.find((g) => g.id === "g2");
    expect(g2?.title).toBe("Remote G2"); // Took remote because newer

    const g3 = merged.goals.find((g) => g.id === "g3");
    expect(g3?.title).toBe("Remote G3");
  });

  it("handles missing/undefined remote gracefully", () => {
    const local = mkState([{ id: "g1", updatedAt: "2026-08-02" }]);
    const remote = {} as Partial<MonkMVPState>; // Empty remote

    const merged = mergeRemoteState(local, remote);
    expect(merged.goals).toHaveLength(1); // Local survived!
  });

  it("drops a tombstoned notebook entry regardless of updatedAt recency", () => {
    const local = mkState();
    local.notebookEntries = [
      { id: "nb1", title: "Local", body: "", categoryId: "cat_lainnya", tags: [], isPinned: false, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-05T00:00:00.000Z" },
    ];
    const remote: Partial<MonkMVPState> = {
      notebookDeletedAt: { nb1: "2026-08-02T00:00:00.000Z" }, // older than the entry update
    };

    const merged = mergeRemoteState(local, remote);
    expect(merged.notebookDeletedAt).toEqual({ nb1: "2026-08-02T00:00:00.000Z" });
    expect(merged.notebookEntries.map((e) => e.id)).not.toContain("nb1");
  });

  it("unions tombstones from both sides so a delete never resurrects", () => {
    const local = mkState();
    local.notebookDeletedAt = { nb1: "2026-08-02T00:00:00.000Z" };
    const remote: Partial<MonkMVPState> = {
      notebookDeletedAt: { nb2: "2026-08-03T00:00:00.000Z" },
      notebookEntries: [
        { id: "nb1", title: "Resurrected", body: "", categoryId: "cat_lainnya", tags: [], isPinned: false, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-06T00:00:00.000Z" },
      ],
    };

    const merged = mergeRemoteState(local, remote);
    expect(merged.notebookDeletedAt).toEqual({
      nb1: "2026-08-02T00:00:00.000Z",
      nb2: "2026-08-03T00:00:00.000Z",
    });
    expect(merged.notebookEntries).toHaveLength(0);
  });

  it("keeps a non-tombstoned notebook entry", () => {
    const local = mkState();
    local.notebookEntries = [
      { id: "nb1", title: "Keep", body: "", categoryId: "cat_lainnya", tags: [], isPinned: false, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" },
    ];
    const remote: Partial<MonkMVPState> = { notebookDeletedAt: { nb2: "2026-08-02T00:00:00.000Z" } };

    const merged = mergeRemoteState(local, remote);
    expect(merged.notebookEntries.map((e) => e.id)).toEqual(["nb1"]);
  });

  it("local tombstones survive a remote from an older client with no tombstone field", () => {
    const local = mkState();
    local.notebookDeletedAt = { nb1: "2026-08-02T00:00:00.000Z" };
    // Older client re-uploads the deleted entry and knows nothing of tombstones.
    const remote: Partial<MonkMVPState> = {
      notebookEntries: [
        { id: "nb1", title: "Resurrected", body: "", categoryId: "cat_lainnya", tags: [], isPinned: false, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-06T00:00:00.000Z" },
      ],
    };

    const merged = mergeRemoteState(local, remote);
    expect(merged.notebookDeletedAt.nb1).toBe("2026-08-02T00:00:00.000Z");
    expect(merged.notebookEntries).toHaveLength(0);
  });

  it("drops deleted categories if tombstoned in notebookCategoryDeletedAt", () => {
    const local = mkState();
    local.notebookCategoryDeletedAt = { cat_spiritual: "2026-08-02T00:00:00.000Z" };
    const remote: Partial<MonkMVPState> = {
      notebookCategories: [
        { id: "cat_spiritual", name: "Spiritual", icon: "Sun", isBuiltIn: true, sortOrder: 5 },
        { id: "cat_karier", name: "Karier", icon: "Briefcase", isBuiltIn: true, sortOrder: 1 }
      ],
    };

    const merged = mergeRemoteState(local, remote);
    expect(merged.notebookCategoryDeletedAt?.cat_spiritual).toBe("2026-08-02T00:00:00.000Z");
    expect(merged.notebookCategories.map((c) => c.id)).not.toContain("cat_spiritual");
    expect(merged.notebookCategories.map((c) => c.id)).toContain("cat_karier");
  });

  describe("onboarding (magang-vs-youtube)", () => {
    function mkOnboarding(selectedFocusGoalIds: string[], updatedAt?: string) {
      const ob = createDefaultOnboarding();
      ob.selectedFocusGoalIds = selectedFocusGoalIds;
      if (updatedAt !== undefined) ob.updatedAt = updatedAt;
      return ob;
    }

    it("adopts newer remote selectedFocusGoalIds", () => {
      const local = mkState();
      local.onboarding = mkOnboarding(["youtube"], "2026-08-01T10:00:00Z");
      const remote = mkState();
      remote.onboarding = mkOnboarding(["magang"], "2026-08-02T10:00:00Z");

      const merged = mergeRemoteState(local, remote);
      expect(merged.onboarding.selectedFocusGoalIds).toEqual(["magang"]);
    });

    it("does not clobber a newer local selection with an older remote", () => {
      const local = mkState();
      local.onboarding = mkOnboarding(["magang"], "2026-08-02T10:00:00Z");
      const remote = mkState();
      remote.onboarding = mkOnboarding(["youtube"], "2026-08-01T10:00:00Z");

      const merged = mergeRemoteState(local, remote);
      expect(merged.onboarding.selectedFocusGoalIds).toEqual(["magang"]);
    });

    it("leaves local unchanged when neither side has updatedAt", () => {
      const local = mkState();
      local.onboarding = mkOnboarding(["magang"]);
      const remote = mkState();
      remote.onboarding = mkOnboarding(["youtube"]);

      const merged = mergeRemoteState(local, remote);
      expect(merged.onboarding.selectedFocusGoalIds).toEqual(["magang"]);
    });

    it("default onboarding (updatedAt undefined) loses to a dated remote", () => {
      const local = mkState();
      local.onboarding = createDefaultOnboarding();
      expect(local.onboarding.updatedAt).toBeUndefined();
      const remote = mkState();
      remote.onboarding = mkOnboarding(["magang"], "2026-08-02T10:00:00Z");

      const merged = mergeRemoteState(local, remote);
      expect(merged.onboarding.selectedFocusGoalIds).toEqual(["magang"]);
      expect(merged.onboarding.updatedAt).toBe("2026-08-02T10:00:00Z");
    });
  });
});
