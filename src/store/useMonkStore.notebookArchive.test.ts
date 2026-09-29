import { beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "../constants/defaultData";
import { useMonkStore } from "./useMonkStore";

/**
 * Regression: duplicating an ARCHIVED note must not carry archivedAt onto the
 * copy. The copy was created already-hidden — absent from "All" and from its
 * PARA tab — so it read as data loss and was routinely deleted.
 */
describe("duplicateNotebookEntry — archive state does not propagate", () => {
  beforeEach(() => {
    useMonkStore.setState(createInitialState(), false);
  });

  const create = () => {
    const now = new Date().toISOString();
    const entry = {
      id: `nb_entry_test_${Math.random().toString(36).slice(2, 10)}`,
      title: "Orig",
      body: "hello",
      categoryId: "",
      tags: [],
      isPinned: false,
      paraType: "project" as const,
      createdAt: now,
      updatedAt: now
    };
    useMonkStore.getState().saveNotebookEntry(entry);
    return entry;
  };

  it("a copy of a live note is live", () => {
    const e = create();
    const copy = useMonkStore.getState().duplicateNotebookEntry(e.id)!;
    expect(copy.archivedAt).toBeUndefined();
    expect(copy.title).toMatch(/Orig/);
  });

  it("a copy of an archived note is visible, not born-archived", () => {
    const e = create();
    useMonkStore.getState().archiveNotebookEntry(e.id);
    const archived = useMonkStore.getState().notebookEntries.find((n) => n.id === e.id)!;
    expect(archived.archivedAt).toBeTruthy();

    const copy = useMonkStore.getState().duplicateNotebookEntry(e.id)!;
    expect(copy.archivedAt).toBeUndefined();

    // And it is really present on the live surface the UI filters from.
    const live = useMonkStore.getState().notebookEntries.filter((n) => !n.archivedAt);
    expect(live.some((n) => n.id === copy.id)).toBe(true);
  });

  it("duplicating preserves paraType so the copy lands in the right tab", () => {
    const e = create();
    useMonkStore.getState().archiveNotebookEntry(e.id);
    const copy = useMonkStore.getState().duplicateNotebookEntry(e.id)!;
    expect(copy.paraType).toBe("project");
  });

  it("the archived original is untouched by duplicating it", () => {
    const e = create();
    useMonkStore.getState().archiveNotebookEntry(e.id);
    useMonkStore.getState().duplicateNotebookEntry(e.id);
    const original = useMonkStore.getState().notebookEntries.find((n) => n.id === e.id)!;
    expect(original.archivedAt).toBeTruthy();
  });
});
