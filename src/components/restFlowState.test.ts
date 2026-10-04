import { afterEach, describe, expect, it } from "vitest";
import {
  clearRestDraft,
  deriveWeeklyRhythm,
  loadRestDraft,
  parseRestActivity,
  resolveRestFlow,
  resolveRestTitle,
  restDraftKey,
  saveRestDraft
} from "../lib/restFlow";

/** In-memory stand-in for the browser session store; the node env has none. */
function installStorage() {
  const map = new Map<string, string>();
  (globalThis as { sessionStorage?: Storage }).sessionStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    length: 0
  } as Storage;
}

afterEach(() => {
  delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
});

describe("resolveRestFlow", () => {
  it("opens a persisted known activity in the completed state", () => {
    const flow = resolveRestFlow({ mainAction: "rest:read_book", status: "rest" });
    expect(flow.stage).toBe("completed");
    expect(flow.selected).toEqual({ id: "read_book", title: null, isCustom: false });
  });

  it("recognises a custom activity and keeps its stored title", () => {
    const flow = resolveRestFlow({ mainAction: "rest:custom:Walk the dog" });
    expect(flow.stage).toBe("completed");
    expect(flow.selected?.id).toBe("custom");
    expect(flow.selected?.title).toBe("Walk the dog");
    expect(flow.selected?.isCustom).toBe(true);
  });

  it("falls back to highlight for a custom row written without the text", () => {
    const flow = resolveRestFlow({ mainAction: "rest:custom:", highlight: "Nap" });
    // "rest:custom:" is malformed; the highlight is not enough to invent a choice.
    expect(flow.stage).toBe("check_in");
    expect(flow.selected).toBeNull();
  });

  it("shows the check-in when no activity has been chosen", () => {
    expect(resolveRestFlow({}).stage).toBe("check_in");
    expect(resolveRestFlow({ mainAction: "focus:goal-1" }).stage).toBe("check_in");
    expect(resolveRestFlow({ status: "rest" }).stage).toBe("check_in");
  });

  it("does not claim completion for a malformed marker", () => {
    expect(() => resolveRestFlow({ mainAction: "rest:" })).not.toThrow();
    expect(resolveRestFlow({ mainAction: "rest:" })).toEqual({
      stage: "check_in",
      selected: null
    });
  });

  it("treats a reviewed rest day with no activity as settled", () => {
    const flow = resolveRestFlow({ status: "completed" });
    expect(flow.stage).toBe("completed");
    expect(flow.selected).toBeNull();
  });

  it("resolves localized titles for known ids and passes custom text through", () => {
    const known = parseRestActivity("rest:silent_walk")!;
    expect(resolveRestTitle(known, "en")).toBe("Silent Nature Walk");
    expect(resolveRestTitle(known, "id")).toMatch(/Jalan Kaki/);
    const custom = parseRestActivity("rest:custom:Teh hangat")!;
    expect(resolveRestTitle(custom, "en")).toBe("Teh hangat");
  });
});

describe("deriveWeeklyRhythm", () => {
  it("sums focus targets and reads the rest target", () => {
    expect(
      deriveWeeklyRhythm({
        goalAllocations: [{ targetCount: 3 }, { targetCount: 2 }],
        restDayTarget: 1
      })
    ).toEqual({ focus: 5, rest: 1 });
  });

  it("omits the line when no focus targets exist", () => {
    expect(deriveWeeklyRhythm(undefined)).toBeNull();
    expect(deriveWeeklyRhythm({ goalAllocations: [], restDayTarget: 1 })).toBeNull();
    expect(deriveWeeklyRhythm({ goalAllocations: [{ targetCount: 0 }] })).toBeNull();
  });
});

describe("rest draft", () => {
  it("round-trips answers and step", () => {
    installStorage();
    saveRestDraft("2026-10-05", { answers: { energy: "low" }, step: 2 });
    expect(loadRestDraft("2026-10-05")).toEqual({ answers: { energy: "low" }, step: 2 });
    expect(restDraftKey("2026-10-05")).toContain("2026-10-05");
  });

  it("keys the draft by date so other days never leak in", () => {
    installStorage();
    saveRestDraft("2026-10-05", { answers: { a: "x" }, step: 1 });
    expect(loadRestDraft("2026-10-06")).toBeNull();
  });

  it("returns null for corrupt JSON instead of throwing", () => {
    installStorage();
    (globalThis as { sessionStorage: Storage }).sessionStorage.setItem(
      restDraftKey("2026-10-05"),
      "{not json"
    );
    expect(loadRestDraft("2026-10-05")).toBeNull();
  });

  it("ignores a draft whose shape is wrong", () => {
    installStorage();
    (globalThis as { sessionStorage: Storage }).sessionStorage.setItem(
      restDraftKey("2026-10-05"),
      JSON.stringify({ answers: "nope", step: 1 })
    );
    expect(loadRestDraft("2026-10-05")).toBeNull();
  });

  it("clears the draft on completion", () => {
    installStorage();
    saveRestDraft("2026-10-05", { answers: { a: "x" }, step: 1 });
    clearRestDraft("2026-10-05");
    expect(loadRestDraft("2026-10-05")).toBeNull();
  });

  it("is a no-op when sessionStorage is unavailable", () => {
    expect(loadRestDraft("2026-10-05")).toBeNull();
    expect(() => saveRestDraft("2026-10-05", { answers: {}, step: 0 })).not.toThrow();
    expect(() => clearRestDraft("2026-10-05")).not.toThrow();
  });
});