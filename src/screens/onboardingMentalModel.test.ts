import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { en } from "../i18n/messages/en";
import { id } from "../i18n/messages/id";

/**
 * Onboarding has one job beyond collecting goals: it has to teach the mental
 * model and the vocabulary, so the first day does not feel like a different
 * product. These are source-level checks (no jsdom) — they guard the copy and
 * the handoff, not the pixels.
 */

const preview = readFileSync("src/screens/OnboardingSteps.tsx", "utf8");
const enCatalog = readFileSync("src/i18n/messages/en.ts", "utf8");
const idCatalog = readFileSync("src/i18n/messages/id.ts", "utf8");

const NEW_KEYS = [
  "onboarding.preview.body",
  "onboarding.preview.step1Label",
  "onboarding.preview.step1",
  "onboarding.preview.step1Body",
  "onboarding.preview.step2Label",
  "onboarding.preview.step2",
  "onboarding.preview.step2Body",
  "onboarding.preview.step3Label",
  "onboarding.preview.step3",
  "onboarding.preview.step3Body",
  "onboarding.preview.step4Label",
  "onboarding.preview.step4",
  "onboarding.preview.step4Body",
  "onboarding.preview.coreHeading",
  "onboarding.preview.coreBody",
  "onboarding.preview.optionalHeading",
  "onboarding.preview.optionalBody",
] as const;

describe("onboarding teaches the real vocabulary", () => {
  it("ships every preview key in both catalogs, non-empty and distinct", () => {
    for (const key of NEW_KEYS) {
      expect(en[key], `English ${key}`).toBeTruthy();
      expect(id[key], `Indonesian ${key}`).toBeTruthy();
      expect(id[key], `Indonesian ${key} must not leak English copy`).not.toBe(en[key]);
    }
  });

  it("names Highlight, Main Action, Agenda, and Focus in the English copy", () => {
    const copy = NEW_KEYS.map((key) => en[key]).join(" ");
    for (const term of ["Highlight", "Main Action", "Agenda", "Focus"]) {
      expect(copy, `preview copy must teach "${term}"`).toContain(term);
    }
  });

  it("names the same four concepts in Indonesian, using the terms the app shows", () => {
    // Highlight and Main Action are left untranslated in the UI itself
    // (today.highlightHeading, planning.mainActionTitle), so the preview must
    // use those exact terms rather than an Indonesian synonym.
    const copy = NEW_KEYS.map((key) => id[key]).join(" ");
    for (const term of ["Highlight", "Main Action", "Agenda", "Fokus"]) {
      expect(copy, `Indonesian preview copy must teach "${term}"`).toContain(term);
    }
  });

  it("names the loop phases Plan / Choose / Do / Reflect", () => {
    const copy = NEW_KEYS.map((key) => en[key]).join(" ");
    for (const phase of ["Plan", "Choose", "Do", "Reflect"]) {
      expect(copy, `preview copy must name the "${phase}" phase`).toContain(phase);
    }
  });

  it("draws the core vs optional line and says the optional parts are not required", () => {
    expect(en["onboarding.preview.coreBody"]).toContain("Highlight, Main Action, Agenda, Focus");
    expect(en["onboarding.preview.optionalBody"]).toMatch(/not required/);
    expect(en["onboarding.preview.optionalBody"]).toMatch(/never were/);
    expect(id["onboarding.preview.optionalBody"]).toMatch(/tidak wajib/);
  });
});

describe("the TodayPreviewStep handoff stays wired", () => {
  it("still creates the season from onboarding", () => {
    expect(preview).toContain("createSeasonFromOnboarding()");
  });

  it("still navigates to Today, replacing history", () => {
    expect(preview).toMatch(/navigate\(routes\.today,\s*\{\s*replace:\s*true\s*\}\)/);
  });

  it("renders the loop rows and the core/optional block from i18n keys", () => {
    for (const key of ["step1Label", "step2Label", "step3Label", "step4Label", "coreHeading", "optionalHeading"]) {
      expect(preview).toContain(`onboarding.preview.${key}`);
    }
  });
});

describe("both catalogs keep the same key set", () => {
  it("has identical key counts", () => {
    const count = (source: string) => (source.match(/^ {2}"/gm) ?? []).length;
    expect(count(idCatalog)).toBe(count(enCatalog));
  });
});
