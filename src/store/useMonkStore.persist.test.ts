import { describe, expect, it } from "vitest";
import { useMonkStore } from "./useMonkStore";
import { createInitialState } from "../constants/defaultData";
import type { MonkMVPState } from "../types/app";

/**
 * Regression: `partialize` once omitted `practices`, `practiceLogs` and
 * `projects`. hydrate's `stored.practices ?? []` then wiped those arrays from
 * the persisted snapshot on every reload — practice data only ever lived in
 * memory. These pin the keys into the persisted shape.
 *
 * Access idiom: zustand v5 attaches the persist API on the store hook as
 * `useMonkStore.persist`, so `(useMonkStore as any).persist.getOptions()` is
 * the correct accessor in this version.
 */
function partialize(state: MonkMVPState) {
  const options = (useMonkStore as any).persist.getOptions();
  return options.partialize(state) as Record<string, unknown>;
}

describe("useMonkStore persist partialize", () => {
  it("keeps practices, practiceLogs and projects in the persisted shape", () => {
    const state = createInitialState();
    const persisted = partialize(state);

    expect(persisted).toHaveProperty("practices");
    expect(persisted).toHaveProperty("practiceLogs");
    expect(persisted).toHaveProperty("projects");
    expect(persisted.practices).not.toBeUndefined();
    expect(persisted.practiceLogs).not.toBeUndefined();
    expect(persisted.projects).not.toBeUndefined();
  });

  it("passes practice arrays through partialize unchanged (same reference)", () => {
    const state = createInitialState();
    const practices = [{ id: "p1", name: "Meditate", status: "active" }] as unknown as MonkMVPState["practices"];
    const practiceLogs = [{ id: "l1", practiceId: "p1", date: "2026-09-01" }] as unknown as MonkMVPState["practiceLogs"];
    const projects = [{ id: "pr1", title: "Launch" }] as unknown as MonkMVPState["projects"];
    state.practices = practices;
    state.practiceLogs = practiceLogs;
    state.projects = projects;

    const persisted = partialize(state);

    expect(persisted.practices).toBe(practices);
    expect(persisted.practiceLogs).toBe(practiceLogs);
    expect(persisted.projects).toBe(projects);
  });
});
