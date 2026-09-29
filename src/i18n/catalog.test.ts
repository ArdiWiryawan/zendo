import { describe, expect, it } from "vitest";
import { t } from "./index";
import { en } from "./messages/en";
import { id } from "./messages/id";

const keys = [
  "today.title",
  "today.restDay",
  "today.daysLeft",
  "today.seasonDay",
  "today.restRenewal.title",
  "rest.title",
  "rest.questionOf",
  "rest.resultsTitle",
  "season.streak",
  "season.streakPlural",
  "season.bestStreak",
  "onboarding.goals.hint",
  "onboarding.goals.dump.title",
  "onboarding.goals.dump.subtitle",
  "onboarding.goals.pick.title",
  "onboarding.goals.pick.subtitle",
  "onboarding.goals.add",
  "onboarding.goals.placeholder",
  "onboarding.goals.keepLabel",
  "onboarding.goals.needMin",
  "onboarding.goals.needOne",
  "onboarding.goals.duplicate",
  "onboarding.goals.max",
  "onboarding.continue",
  "onboarding.keystone.title",
  "onboarding.keystone.subtitle",
  "onboarding.keystone.why",
  "onboarding.keystone.whyPlaceholder",
  "onboarding.keystone.outcome",
  "onboarding.keystone.outcomePlaceholder",
  "blueprint.outcomeLabel",
  "blueprint.outcomePlaceholder",
  "today.outcomeLine",
  "onboarding.keystone.obstacleTitle",
  "onboarding.keystone.obstacleBody",
  "onboarding.keystone.obstacleLabel",
  "onboarding.keystone.mitigationLabel",
  "onboarding.keystone.mitigationPlaceholder",
  "onboarding.keystone.needAction",
  "onboarding.season.title",
  "onboarding.season.subtitle",
  "onboarding.season.capacityOver",
  "onboarding.season.capacityTight",
  "onboarding.season.d7Title",
  "onboarding.season.d30Title",
  "onboarding.season.d90Title",
  "onboarding.season.customTitle",
  "onboarding.season.customLabel",
  "onboarding.season.durationLabel",
  "onboarding.preview.highlight",
] as const;

describe("Today, rest, and streak translations", () => {
  it("provides nonempty, distinct Indonesian and English copy for representative user-facing messages", () => {
    for (const key of keys) {
      expect(en[key], `English ${key}`).toBeTruthy();
      expect(id[key], `Indonesian ${key}`).toBeTruthy();
      expect(t("en", key), `English ${key}`).toBe(en[key]);
      expect(t("id", key), `Indonesian ${key}`).toBe(id[key]);
      expect(t("id", key), `Indonesian ${key} must not leak English copy`).not.toBe(en[key]);
    }
  });

  it("interpolates both languages without leaving placeholder tokens", () => {
    for (const lang of ["en", "id"] as const) {
      for (const [key, vars] of [
        ["today.daysLeft", { n: 3 }],
        ["today.seasonDay", { day: 1, total: 7 }],
        ["rest.questionOf", { current: 2, total: 4 }],
        ["season.streakPlural", { n: 5 }],
        ["season.bestStreak", { n: 7 }],
        ["onboarding.goals.keepLabel", { n: 2 }],
        ["onboarding.season.capacityOver", { load: 12, available: 8 }],
        ["onboarding.season.capacityTight", { load: 9, available: 10 }],
        ["onboarding.season.startLabel", { date: "Sep 29" }],
        ["onboarding.season.durationLabel", { n: 30 }],
      ] as const) {
        const output = t(lang, key, vars);
        for (const value of Object.values(vars)) expect(output).toContain(String(value));
        expect(output).not.toMatch(/\{[^{}]+\}/);
      }
    }
  });
});
