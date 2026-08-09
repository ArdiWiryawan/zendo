import { beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "../constants/defaultData";
import { useMonkStore } from "./useMonkStore";
import type { NotebookEntry } from "../types/app";

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
    },
  } as Storage;
}

function entry(over: Partial<NotebookEntry> = {}): NotebookEntry {
  return {
    id: "nb1",
    title: "My Note",
    body: "Body text",
    categoryId: "cat_pribadi",
    tags: [],
    isPinned: false,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...over,
  };
}

describe("notebook store actions", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
    useMonkStore.setState(createInitialState(), false);
  });

  it("saveNotebookEntry adds a new entry with createdAt/updatedAt stamped", () => {
    useMonkStore.getState().saveNotebookEntry({ ...entry(), createdAt: undefined as unknown as string });
    const saved = useMonkStore.getState().notebookEntries[0];
    expect(useMonkStore.getState().notebookEntries.length).toBe(1);
    expect(saved.title).toBe("My Note");
    expect(saved.createdAt).toBeTruthy();
    expect(saved.updatedAt).toBeTruthy();
  });

  it("saveNotebookEntry updates an existing entry without duplicating", () => {
    const { saveNotebookEntry } = useMonkStore.getState();
    saveNotebookEntry(entry());
    saveNotebookEntry(entry({ body: "Updated body", isPinned: true }));
    const all = useMonkStore.getState().notebookEntries;
    expect(all.length).toBe(1);
    expect(all[0].body).toBe("Updated body");
    expect(all[0].isPinned).toBe(true);
  });

  it("deleteNotebookEntry removes only the target and tombstones its id", () => {
    const { saveNotebookEntry, deleteNotebookEntry } = useMonkStore.getState();
    saveNotebookEntry(entry());
    saveNotebookEntry(entry({ id: "nb2", title: "Other" }));
    deleteNotebookEntry("nb1");
    const s = useMonkStore.getState();
    expect(s.notebookEntries.map((e) => e.id)).toEqual(["nb2"]);
    expect(s.notebookDeletedAt.nb1).toBeTruthy();
  });

  it("deleting a tombstoned id again keeps a single tombstone", () => {
    const { saveNotebookEntry, deleteNotebookEntry } = useMonkStore.getState();
    saveNotebookEntry(entry());
    deleteNotebookEntry("nb1");
    deleteNotebookEntry("nb1");
    const s = useMonkStore.getState();
    expect(s.notebookEntries).toHaveLength(0);
    expect(Object.keys(s.notebookDeletedAt)).toEqual(["nb1"]);
  });

  it("togglePinNotebookEntry flips isPinned and stamps updatedAt only on target", () => {
    const { saveNotebookEntry, togglePinNotebookEntry } = useMonkStore.getState();
    saveNotebookEntry(entry());
    saveNotebookEntry(entry({ id: "nb2", title: "Other" }));
    togglePinNotebookEntry("nb1");
    const all = useMonkStore.getState().notebookEntries;
    expect(all.find((e) => e.id === "nb1")?.isPinned).toBe(true);
    expect(all.find((e) => e.id === "nb2")?.isPinned).toBe(false);
  });

  it("deleteNotebookCategory removes the category and reassigns its entries to the fallback", () => {
    const { saveNotebookEntry, deleteNotebookCategory } = useMonkStore.getState();
    saveNotebookEntry(entry());
    saveNotebookEntry(entry({ id: "nb2", categoryId: "cat_karier" }));
    deleteNotebookCategory("cat_pribadi");
    const s = useMonkStore.getState();
    expect(s.notebookCategories.find((c) => c.id === "cat_pribadi")).toBeUndefined();
    // Both entries survive; the one in the deleted category moves to Lainnya,
    // the one in another category is untouched.
    expect(s.notebookEntries.map((e) => e.id).sort()).toEqual(["nb1", "nb2"]);
    expect(s.notebookEntries.find((e) => e.id === "nb1")?.categoryId).toBe("cat_lainnya");
    expect(s.notebookEntries.find((e) => e.id === "nb2")?.categoryId).toBe("cat_karier");
  });

  it("deleting the fallback category itself reassigns to another live category", () => {
    const { saveNotebookEntry, deleteNotebookCategory } = useMonkStore.getState();
    saveNotebookEntry(entry({ id: "nb1", categoryId: "cat_lainnya" }));
    deleteNotebookCategory("cat_lainnya");
    const s = useMonkStore.getState();
    expect(s.notebookCategories.find((c) => c.id === "cat_lainnya")).toBeUndefined();
    expect(s.notebookEntries).toHaveLength(1);
    // Reassigned to a real, surviving category — never a dangling id.
    expect(s.notebookCategories.some((c) => c.id === s.notebookEntries[0].categoryId)).toBe(true);
  });

  it("deleteNotebookCategory is a no-op when only one category remains", () => {
    const { addNotebookCategory, deleteNotebookCategory } = useMonkStore.getState();
    // Keep only "cat_lainnya": delete every other default category.
    for (const c of useMonkStore.getState().notebookCategories.slice()) {
      if (c.id !== "cat_lainnya") deleteNotebookCategory(c.id);
    }
    expect(useMonkStore.getState().notebookCategories).toHaveLength(1);
    const before = useMonkStore.getState().notebookCategories.map((c) => c.id);
    deleteNotebookCategory("cat_lainnya"); // last remaining — must not delete
    expect(useMonkStore.getState().notebookCategories.map((c) => c.id)).toEqual(before);
  });

  it("addNotebookCategory appends with max+1 sortOrder and isBuiltIn false", () => {
    const { addNotebookCategory } = useMonkStore.getState();
    addNotebookCategory("Baru");
    const cats = useMonkStore.getState().notebookCategories;
    const added = cats[cats.length - 1];
    expect(added.name).toBe("Baru");
    expect(added.isBuiltIn).toBe(false);
    expect(added.sortOrder).toBeGreaterThanOrEqual(
      useMonkStore.getState().notebookCategories.length - 1
    );
  });

  it("renameNotebookCategory changes only the name", () => {
    const { renameNotebookCategory } = useMonkStore.getState();
    renameNotebookCategory("cat_karier", "Karier Baru");
    const cat = useMonkStore
      .getState()
      .notebookCategories.find((c) => c.id === "cat_karier");
    expect(cat?.name).toBe("Karier Baru");
  });
});
