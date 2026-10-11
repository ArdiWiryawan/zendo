import { describe, expect, it } from "vitest";
import { REFLECTION_PROMPTS } from "../lib/reflectionPrompts";
import { resolveReflectionPrompt, resolveReflectionPromptText } from "./prompts";
import type { MonkStore } from "../store/useMonkStore";

const A01 = REFLECTION_PROMPTS.find((p) => p.id === "A01")!;

/** Minimal store surface the resolver reads. Cast once, not per assertion. */
function storeWith(entries: unknown[]): MonkStore {
  return {
    activeSeason: { id: "s1", startDate: "2026-08-20", durationDays: 90, endDate: "2026-11-17", status: "active" },
    journalEntries: entries,
    dayPlans: [],
    focusSessions: [],
    learningSessions: [],
    timelineDays: [],
    energyLogs: [],
    appSettings: { language: "en" },
  } as unknown as MonkStore;
}

describe("resolveReflectionPrompt language handling", () => {
  it("follows the stored id into the current language while the day is unanswered", () => {
    const store = storeWith([
      { id: "j1", seasonId: "s1", date: "2026-10-11", answers: {}, promptId: "A01", promptText: A01.text.en, reflectionStatus: "prompt_assigned" },
    ]);
    expect(resolveReflectionPrompt(store, "2026-10-11", "en")?.text).toBe(A01.text.en);
    expect(resolveReflectionPrompt(store, "2026-10-11", "id")?.text).toBe(A01.text.id);
  });

  it("freezes the answered wording so history survives a language switch", () => {
    const store = storeWith([
      { id: "j1", seasonId: "s1", date: "2026-10-11", answers: { whatMovedToday: "something honest" }, promptId: "A01", promptText: A01.text.en, reflectionStatus: "submitted" },
    ]);
    expect(resolveReflectionPrompt(store, "2026-10-11", "id")?.text).toBe(A01.text.en);
  });

  it("falls back to the calendar prompt rather than throwing when nothing is stored", () => {
    expect(typeof resolveReflectionPromptText(storeWith([]), "2026-10-11", "en")).toBe("string");
  });
});
