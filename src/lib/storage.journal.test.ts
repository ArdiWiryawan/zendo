import { beforeEach, describe, expect, it } from "vitest";
import { JOURNAL_DRAFT_KEY, readJournalDraft, writeJournalDraft } from "./storage";

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

describe("journal draft", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
      writable: true
    });
  });

  it("write then read round-trips answers and tomorrow", () => {
    writeJournalDraft(JOURNAL_DRAFT_KEY, {
      answers: { whatMovedToday: "shipped retro tests" },
      tomorrow: "2026-08-02"
    });
    expect(readJournalDraft(JOURNAL_DRAFT_KEY)).toEqual({
      answers: { whatMovedToday: "shipped retro tests" },
      tomorrow: "2026-08-02"
    });
  });

  it("legacy answers-only payload reads with tomorrow undefined", () => {
    localStorage.setItem(JOURNAL_DRAFT_KEY, JSON.stringify({ whatMovedToday: "old draft" }));
    const draft = readJournalDraft(JOURNAL_DRAFT_KEY);
    expect(draft?.answers).toEqual({ whatMovedToday: "old draft" });
    expect(draft?.tomorrow).toBe("");
  });

  it("returns null for missing key, invalid JSON, and array payloads", () => {
    expect(readJournalDraft("zendo.does.not.exist")).toBeNull();
    localStorage.setItem(JOURNAL_DRAFT_KEY, "{not-json");
    expect(readJournalDraft(JOURNAL_DRAFT_KEY)).toBeNull();
    localStorage.setItem(JOURNAL_DRAFT_KEY, JSON.stringify(["not", "an", "object"]));
    expect(readJournalDraft(JOURNAL_DRAFT_KEY)).toBeNull();
    localStorage.setItem(JOURNAL_DRAFT_KEY, JSON.stringify("plain string"));
    expect(readJournalDraft(JOURNAL_DRAFT_KEY)).toBeNull();
  });
});
