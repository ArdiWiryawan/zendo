import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore } from "./useMonkStore";
import { createInitialState } from "../constants/defaultData";

describe("Zendo Pro & Support Store", () => {
  beforeEach(() => {
    useMonkStore.setState(createInitialState(), false);
  });

  it("initial state has all features unlocked for free", () => {
    const state = useMonkStore.getState();
    expect(state.isPro).toBe(true);
    expect(state.proTier).toBe("lifetime");
    expect(state.purchasedPackIds.length).toBeGreaterThan(0);
  });

  it("unlockPro unlocks all packs and sets lifetime tier", () => {
    const state = useMonkStore.getState();
    state.unlockPro("lifetime");

    const updated = useMonkStore.getState();
    expect(updated.isPro).toBe(true);
    expect(updated.proTier).toBe("lifetime");
    expect(updated.proPurchasedAt).toBeDefined();
    expect(updated.proExpiresAt).toBeNull();

    // All packs should be added to purchasedPackIds
    const allPackIds = updated.journalPacks.map((p) => p.id);
    expect(updated.purchasedPackIds).toEqual(expect.arrayContaining(allPackIds));
  });

  it("unlockPro with season tier sets 30-day expiration", () => {
    const state = useMonkStore.getState();
    state.unlockPro("season");

    const updated = useMonkStore.getState();
    expect(updated.isPro).toBe(true);
    expect(updated.proTier).toBe("season");
    expect(updated.proExpiresAt).toBeDefined();
  });

  it("updateSettings persists custom Zen aesthetic theme", () => {
    const state = useMonkStore.getState();
    state.updateSettings({ theme: "kyoto_moss" });

    const updated = useMonkStore.getState();
    expect(updated.appSettings.theme).toBe("kyoto_moss");
  });

  it("purchasePack unlocks a single pack", () => {
    const state = useMonkStore.getState();
    state.purchasePack("pack_shadow_self");

    const updated = useMonkStore.getState();
    expect(updated.purchasedPackIds).toContain("pack_shadow_self");
    expect(updated.isPro).toBe(true);
  });
});
