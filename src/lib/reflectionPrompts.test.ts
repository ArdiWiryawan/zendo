import { describe, expect, it } from "vitest";
import {
  REFLECTION_PROMPTS,
  computeReflectionPhase,
  getReflectionPromptText,
  selectReflectionPrompt,
} from "./reflectionPrompts";
import type {
  ReflectionCategory,
  ReflectionContext,
  ReflectionSelectionInput,
} from "./reflectionPrompts";

const CATEGORY_IDS: Record<ReflectionCategory, string> = {
  awareness: "A",
  progress: "B",
  energy: "C",
  learning: "D",
  identity: "E",
};

function byId(id: string) {
  const prompt = REFLECTION_PROMPTS.find((candidate) => candidate.id === id);
  if (!prompt) throw new Error(`unknown prompt ${id}`);
  return prompt;
}

function select(overrides: Partial<ReflectionSelectionInput>) {
  return selectReflectionPrompt({
    seasonId: "season-1",
    date: "2026-10-11",
    season: { startDate: "2026-10-01", durationDays: 30 },
    usedPromptIdsInSeason: [],
    recentPromptIds: [],
    context: ["universal"],
    ...overrides,
  });
}

describe("REFLECTION_PROMPTS bank", () => {
  it("has exactly 50 prompts", () => {
    expect(REFLECTION_PROMPTS).toHaveLength(50);
  });

  it("has 10 prompts per category with complete ids", () => {
    for (const [category, letter] of Object.entries(CATEGORY_IDS) as [
      ReflectionCategory,
      string,
    ][]) {
      const ids = REFLECTION_PROMPTS.filter(
        (prompt) => prompt.category === category,
      ).map((prompt) => prompt.id);
      expect(ids).toHaveLength(10);
      expect(ids).toEqual(
        Array.from({ length: 10 }, (_, i) => `${letter}${String(i + 1).padStart(2, "0")}`),
      );
    }
  });

  it("has unique ids covering A01..E10", () => {
    const ids = REFLECTION_PROMPTS.map((prompt) => prompt.id);
    expect(new Set(ids).size).toBe(50);
    expect(new Set(ids)).toEqual(
      new Set([
        ...Array.from({ length: 10 }, (_, i) => `A${String(i + 1).padStart(2, "0")}`),
        ...Array.from({ length: 10 }, (_, i) => `B${String(i + 1).padStart(2, "0")}`),
        ...Array.from({ length: 10 }, (_, i) => `C${String(i + 1).padStart(2, "0")}`),
        ...Array.from({ length: 10 }, (_, i) => `D${String(i + 1).padStart(2, "0")}`),
        ...Array.from({ length: 10 }, (_, i) => `E${String(i + 1).padStart(2, "0")}`),
      ]),
    );
  });

  it("has non-empty en and id text, one sentence, universal tag, active v1", () => {
    for (const prompt of REFLECTION_PROMPTS) {
      expect(prompt.text.en.trim().length).toBeGreaterThan(0);
      expect(prompt.text.id.trim().length).toBeGreaterThan(0);
      expect(prompt.text.en.split("?").length - 1).toBeLessThanOrEqual(1);
      expect(prompt.text.id.split("?").length - 1).toBeLessThanOrEqual(1);
      expect(prompt.contextTags).toContain("universal");
      expect(prompt.isActive).toBe(true);
      expect(prompt.version).toBe(1);
    }
  });

  it("encodes phase eligibility per category", () => {
    expect(byId("A01").eligiblePhases).toEqual(["early"]);
    expect(byId("B01").eligiblePhases).toEqual(["middle"]);
    expect(byId("C01").eligiblePhases).toEqual(["middle"]);
    expect(byId("D01").eligiblePhases).toEqual(["middle", "late"]);
    expect(byId("E01").eligiblePhases).toEqual(["late"]);
  });
});

describe("computeReflectionPhase", () => {
  it("returns null for a null season", () => {
    expect(computeReflectionPhase(null, "2026-10-11")).toBeNull();
  });

  it("returns null for an invalid duration", () => {
    expect(
      computeReflectionPhase({ startDate: "2026-10-01", durationDays: 0 }, "2026-10-11"),
    ).toBeNull();
    expect(
      computeReflectionPhase({ startDate: "2026-10-01", durationDays: -3 }, "2026-10-11"),
    ).toBeNull();
  });

  it("works for a 7-day season", () => {
    const season = { startDate: "2026-10-01", durationDays: 7 };
    expect(computeReflectionPhase(season, "2026-10-01")).toBe("early"); // day 1
    expect(computeReflectionPhase(season, "2026-10-04")).toBe("middle"); // day 4
    expect(computeReflectionPhase(season, "2026-10-07")).toBe("late"); // day 7
  });

  it("works for a 90-day season", () => {
    const season = { startDate: "2026-01-01", durationDays: 90 };
    expect(computeReflectionPhase(season, "2026-01-01")).toBe("early"); // day 1
    expect(computeReflectionPhase(season, "2026-01-30")).toBe("early"); // day 30
    expect(computeReflectionPhase(season, "2026-03-01")).toBe("middle"); // day 60
    expect(computeReflectionPhase(season, "2026-03-31")).toBe("late"); // day 90
  });

  it("works for 14-day and 30-day seasons", () => {
    expect(
      computeReflectionPhase({ startDate: "2026-10-01", durationDays: 14 }, "2026-10-01"),
    ).toBe("early");
    expect(
      computeReflectionPhase({ startDate: "2026-10-01", durationDays: 14 }, "2026-10-10"),
    ).toBe("middle");
    expect(
      computeReflectionPhase({ startDate: "2026-10-01", durationDays: 30 }, "2026-10-01"),
    ).toBe("early");
    expect(
      computeReflectionPhase({ startDate: "2026-10-01", durationDays: 30 }, "2026-10-30"),
    ).toBe("late");
  });
});

describe("selectReflectionPrompt", () => {
  it("is deterministic across repeated calls", () => {
    const input = { date: "2026-10-11" };
    const first = select(input).id;
    const second = select(input).id;
    const third = select(input).id;
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it("differs across consecutive dates when alternatives exist", () => {
    const first = select({ date: "2026-10-11", usedPromptIdsInSeason: [], recentPromptIds: [] });
    const second = select({
      date: "2026-10-12",
      usedPromptIdsInSeason: [],
      recentPromptIds: [],
    });
    expect(first.id).not.toBe(second.id);
  });

  it("honors the consecutive-day exclusion", () => {
    const previous = select({ date: "2026-10-11" });
    const next = select({
      date: "2026-10-12",
      recentPromptIds: [previous.id],
    });
    expect(next.id).not.toBe(previous.id);
  });

  it("prefers an unused id over a used one", () => {
    const phase = computeReflectionPhase(
      { startDate: "2026-10-01", durationDays: 30 },
      "2026-10-11",
    );
    const eligible = REFLECTION_PROMPTS.filter((prompt) =>
      phase === null ? true : prompt.eligiblePhases.includes(phase),
    );
    expect(eligible.length).toBeGreaterThan(1);

    const withAllUsed = select({
      date: "2026-10-11",
      usedPromptIdsInSeason: eligible.map((prompt) => prompt.id),
    });
    const freeIds = eligible
      .map((prompt) => prompt.id)
      .filter((id) => id !== withAllUsed.id);
    const withOneFree = select({
      date: "2026-10-11",
      usedPromptIdsInSeason: eligible
        .map((prompt) => prompt.id)
        .filter((id) => id !== freeIds[0]),
    });
    expect(withOneFree.id).toBe(freeIds[0]);
  });

  it("still returns a prompt when the pool is exhausted", () => {
    const exhausted = select({
      date: "2026-10-11",
      usedPromptIdsInSeason: REFLECTION_PROMPTS.map((prompt) => prompt.id),
      recentPromptIds: REFLECTION_PROMPTS.map((prompt) => prompt.id),
    });
    expect(exhausted).toBeDefined();
    expect(exhausted.id).toMatch(/^[A-E]\d{2}$/);
  });

  it("never returns a late-only prompt during the early phase", () => {
    const season = { startDate: "2026-10-01", durationDays: 90 };
    for (let day = 1; day <= 30; day += 1) {
      const date = `2026-10-${String(day).padStart(2, "0")}`;
      const picked = select({ date, season, recentPromptIds: [], usedPromptIdsInSeason: [] });
      expect(picked.eligiblePhases).not.toEqual(["late"]);
      expect(picked.eligiblePhases).toContain("early");
    }
  });

  it("falls back gracefully with unknown context", () => {
    const contexts: ReflectionContext[][] = [
      [],
      ["universal"],
      ["rest_day"],
      ["focus_day", "season_ending"],
    ];
    for (const context of contexts) {
      const picked = select({ date: "2026-10-11", context });
      expect(picked.text.en.length).toBeGreaterThan(0);
      expect(picked.text.id.length).toBeGreaterThan(0);
    }
  });

  it("returns a valid prompt with a null season", () => {
    const picked = select({ season: null, seasonId: null, date: "2026-10-11" });
    expect(picked.id).toMatch(/^[A-E]\d{2}$/);
  });

  it("returns a prompt for a season ending context", () => {
    const picked = select({
      date: "2026-10-30",
      season: { startDate: "2026-10-01", durationDays: 30 },
      context: ["season_ending"],
    });
    expect(picked.contextTags).toContain("season_ending");
  });
});

describe("getReflectionPromptText", () => {
  it("returns english and indonesian text for a known id", () => {
    expect(getReflectionPromptText("A01", "en")).toBe(
      "What did you manage to begin today?",
    );
    expect(getReflectionPromptText("A01", "id")).toContain("hari ini");
  });

  it("returns null for an unknown id", () => {
    expect(getReflectionPromptText("Z99", "en")).toBeNull();
  });
});
