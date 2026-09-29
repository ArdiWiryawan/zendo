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
      ] as const) {
        const output = t(lang, key, vars);
        for (const value of Object.values(vars)) expect(output).toContain(String(value));
        expect(output).not.toMatch(/\{[^{}]+\}/);
      }
    }
  });
});
