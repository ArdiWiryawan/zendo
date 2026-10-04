import { readFileSync, readdirSync } from "node:fs";
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
  "settings.guide",
  "settings.guideRow",
  "settings.guideRowDesc",
  "settings.guideOpen",
  "guide.title",
  "guide.subtitle",
  "guide.back",
  "guide.introHeading",
  "guide.introBody",
  "guide.coreHeading",
  "guide.coreBody",
  "guide.coreList",
  "guide.optionalBody",
  "guide.optionalNote",
  "guide.flowHeading",
  "guide.flowPlan",
  "guide.flowPlanBody",
  "guide.flowChoose",
  "guide.flowChooseBody",
  "guide.flowDo",
  "guide.flowDoBody",
  "guide.flowReflect",
  "guide.flowReflectBody",
  "guide.exampleLabel",
  "guide.todayHeading",
  "guide.highlightTitle",
  "guide.highlightBody",
  "guide.highlightExample",
  "guide.mainActionTitle",
  "guide.mainActionBody",
  "guide.mainActionExample",
  "guide.agendaTitle",
  "guide.agendaBody",
  "guide.agendaExample",
  "guide.goalsHeading",
  "guide.seasonTitle",
  "guide.seasonBody",
  "guide.seasonExample",
  "guide.goalsTitle",
  "guide.goalsBody",
  "guide.goalsExample",
  "guide.practicesTitle",
  "guide.practicesBody",
  "guide.practicesExample",
  "guide.projectsHeading",
  "guide.projectsTitle",
  "guide.projectsBody",
  "guide.projectsExample",
  "guide.focusHeading",
  "guide.focusTitle",
  "guide.focusBody",
  "guide.focusExample",
  "guide.focusModesTitle",
  "guide.focusModesBody",
  "guide.focusModesExample",
  "guide.notebookHeading",
  "guide.notebookTitle",
  "guide.notebookBody",
  "guide.notebookExample",
  "guide.journalHeading",
  "guide.morningTitle",
  "guide.morningBody",
  "guide.morningExample",
  "guide.reflectionTitle",
  "guide.reflectionBody",
  "guide.reflectionExample",
  "guide.reviewHeading",
  "guide.timelineTitle",
  "guide.timelineBody",
  "guide.timelineExample",
  "guide.weeklyTitle",
  "guide.weeklyBody",
  "guide.weeklyExample",
  "guide.footer",
] as const;

describe("Today, rest, and streak translations", () => {
  it("provides nonempty, distinct Indonesian and English copy for representative user-facing messages", () => {
    // Product vocabulary is deliberately shared across languages: Highlight,
    // Main Action, Agenda, Season, Notebook and Focus appear untranslated in
    // the screens themselves, so a "translated" guide term would teach a
    // synonym the user never sees. These keys are allowed to be identical.
    const sharedTerms = new Set([
      "guide.highlightTitle",
      "guide.mainActionTitle",
      "guide.agendaTitle",
      "guide.seasonTitle",
      "guide.notebookHeading",
      "guide.notebookTitle",
      "guide.reviewHeading",
      "guide.focusTitle",
    ]);
    for (const key of keys) {
      expect(en[key], `English ${key}`).toBeTruthy();
      expect(id[key], `Indonesian ${key}`).toBeTruthy();
      expect(t("en", key), `English ${key}`).toBe(en[key]);
      expect(t("id", key), `Indonesian ${key}`).toBe(id[key]);
      if (!sharedTerms.has(key)) {
        expect(t("id", key), `Indonesian ${key} must not leak English copy`).not.toBe(en[key]);
      }
    }
  });

  it("interpolates both languages without leaving placeholder tokens", () => {
    for (const lang of ["en", "id"] as const) {
      for (const [key, vars] of [
        ["today.daysLeft", { n: 3 }],
        ["today.seasonDay", { day: 1, total: 7 }],
        ["rest.questionOf", { current: 2, total: 4 }],
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

  it("teaches one name per concept: the guide and Today agree on the term", () => {
    // The guide exists to teach the app's own vocabulary. When the two drift,
    // the user is taught a word they never see. Highlight and Main Action are
    // left untranslated in both languages and both surfaces must say the same.
    // tools/check-guide-terms.mts scans the source; this is the runtime half.
    for (const [concept, uiKey] of [
      ["guide.highlightTitle", "today.highlightLabel"],
      ["guide.mainActionTitle", "today.actionHeading"],
      ["guide.mainActionTitle", "planning.mainActionTitle"],
      ["guide.agendaTitle", "today.agendaHeading"],
    ] as const) {
      expect(id[concept], `Indonesian guide vs ${uiKey}`).toBe(id[uiKey]);
      expect(en[concept], `English guide vs ${uiKey}`).toBe(en[uiKey]);
    }
  });

  it("every UI key the guide is compared against is actually rendered", () => {
    // A dead key cannot be ground truth. This pins the specific bug already
    // found once: the drift guard used `today.highlightHeading`, which nothing
    // renders, so it stayed green while comparing the guide against a string no
    // user ever saw. If a key below stops being referenced, either point the
    // comparison at the live key or delete the row — do not leave it green.
    const uiKeys = [
      "today.highlightLabel",
      "today.actionHeading",
      "planning.mainActionTitle",
      "today.agendaHeading",
    ];
    const roots = ["src/screens", "src/components", "src/app"];
    const source = roots
      .flatMap((r) => readdirSync(r).map((f) => `${r}/${f}`))
      .filter((p) => /\.tsx?$/.test(p))
      .map((p) => readFileSync(p, "utf8"))
      .join("\n");

    for (const key of uiKeys) {
      expect(source, `${key} must be referenced by real UI code`).toContain(`"${key}"`);
    }
  });
});
