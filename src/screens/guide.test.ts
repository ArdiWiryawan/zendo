import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function src(path: string): string {
  return readFileSync(path, "utf8");
}

// The guide is a user-facing page that teaches the product as it actually is.
// These assertions pin the wiring (route, registration, entry point) and the
// feel-good guardrail, since there is no jsdom to render the page in.
describe("the How-Zendo-works guide is wired end to end", () => {
  it("declares a /guide route", () => {
    expect(src("src/constants/routes.ts")).toMatch(/guide:\s*"\/guide"/);
  });

  it("registers the guide inside a ProtectedMain", () => {
    const app = src("src/app/App.tsx");
    expect(app).toMatch(/routes\.guide[\s\S]{0,160}ProtectedMain/);
    expect(app).toMatch(/GuideScreen/);
  });

  it("opens the guide from a Settings row", () => {
    const settings = src("src/screens/SettingsScreen.tsx");
    expect(settings).toContain("settings.guideRow");
    expect(settings).toMatch(/navigate\(routes\.guide\)/);
  });

  it("keeps the guide behind authentication like every other main screen", () => {
    // showNav={false} makes it a focused full-screen view, matching /notebook.
    const app = src("src/app/App.tsx");
    expect(app).toMatch(/routes\.guide[\s\S]{0,80}showNav=\{false\}/);
  });
});

describe("the guide mentions every core concept", () => {
  const guide = () => src("src/screens/GuideScreen.tsx");

  for (const concept of [
    "guide.highlightTitle",
    "guide.mainActionTitle",
    "guide.agendaTitle",
    "guide.seasonTitle",
    "guide.goalsTitle",
    "guide.practicesTitle",
    "guide.projectsTitle",
    "guide.focusTitle",
    "guide.notebookTitle",
    "guide.morningTitle",
    "guide.reflectionTitle",
    "guide.timelineTitle",
    "guide.weeklyTitle",
  ]) {
    it(`names ${concept}`, () => {
      expect(guide()).toContain(concept);
    });
  }

  it("separates Core from Optional and says Optional is not required", () => {
    const s = guide();
    expect(s).toContain("guide.coreList");
    expect(s).toContain("guide.optionalBody");
    expect(s).toContain("guide.optionalNote");
    // The Optional line must not be rendered twice.
    expect(s.match(/guide\.optionalBody/g)?.length ?? 0).toBe(1);
  });

  it("walks PLAN -> CHOOSE -> DO -> REFLECT", () => {
    const s = guide();
    expect(s).toContain("guide.flowPlan");
    expect(s).toContain("guide.flowChoose");
    expect(s).toContain("guide.flowDo");
    expect(s).toContain("guide.flowReflect");
  });

  it("does not use forbidden feel-bad vocabulary in the catalog copy", () => {
    // Streaks, XP, badges and scores are banned by the product principles.
    // GuideScreen.tsx holds only t("...") calls, so scanning it proves nothing;
    // the words that reach a user live in the en/id catalogs. Scan only the
    // guide.* string VALUES, not key names, and skip unrelated features'
    // copy (blueprint.* legitimately keeps words like "streak"). Word
    // boundaries keep "export" from matching "xp".
    const catalogValue = /^\s*"(guide\.[a-zA-Z0-9_.]+)":\s*"((?:[^"\\]|\\.)*)"/gm;
    for (const lang of ["en", "id"]) {
      const source = src(`src/i18n/messages/${lang}.ts`);
      let count = 0;
      for (const [, , value] of source.matchAll(catalogValue)) {
        count += 1;
        for (const word of ["streak", "xp", "badge", "score"]) {
          expect(value).not.toMatch(new RegExp(`\\b${word}\\b`, "i"));
        }
      }
      expect(count).toBeGreaterThan(0);
    }
  });

  it("keeps the intro, the Core block and the footer free of scoring language", () => {
    // The guide must never imply the user is being measured. "scored" is the
    // honest negative form; a bare "score" in guide copy would be the smell.
    for (const lang of ["en", "id"]) {
      const source = src(`src/i18n/messages/${lang}.ts`);
      const scoped = source.match(/^\s*"(guide\.[a-zA-Z0-9_.]+)":\s*"((?:[^"\\]|\\.)*)"/gm) ?? [];
      const values = scoped.join("\n");
      expect(values).not.toMatch(/\bscore[sd]?\b(?<!\bscored)/i);
    }
  });
});
