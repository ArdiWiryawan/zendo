import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function src(path: string): string {
  return readFileSync(path, "utf8");
}

/**
 * D7: Season and Goal are the two core domain entities, but the Season view
 * showed a goal's title as inert text — the goal's own blueprint (where its
 * type, rhythm, and outcome target actually live) could not be opened from the
 * screen that displays goal tracks. These assertions pin the wiring that fixes
 * it, and pin that the fallback is not a dead button.
 */
describe("a goal is reachable from the Season view", () => {
  const widgets = src("src/components/SeasonWidgets.tsx");

  it("SeasonProgressCard accepts an onOpenGoal handler", () => {
    expect(widgets).toContain("onOpenGoal?: (goalId: string) => void");
  });

  it("goal chips are real buttons, not inert spans", () => {
    // The chip that renders a goal's title must be the interactive element.
    expect(widgets).toContain("onClick={() => onOpenGoal?.(goal.id)}");
    expect(widgets).toContain('type="button"');
    // No handler -> disabled (and visibly so), rather than a button that
    // silently does nothing when clicked.
    expect(widgets).toContain("disabled={!onOpenGoal}");
  });

  it("the Timeline season view supplies the handler and hosts the modal", () => {
    const timeline = src("src/screens/TimelineScreen.tsx");
    expect(timeline).toContain("onOpenGoal={setBlueprintGoalId}");
    expect(timeline).toContain("<GoalBlueprintModal");
    expect(timeline).toContain('import { GoalBlueprintModal }');
  });
});

/**
 * D8: GoalBlueprintModal shipped three user-visible English strings inside an
 * Indonesian-default app — the subtitle, the advanced disclosure label, and the
 * Cancel button. These pin them to i18n so they cannot silently revert.
 */
describe("GoalBlueprintModal has no hardcoded English UI chrome", () => {
  const modal = src("src/components/GoalBlueprintModal.tsx");

  it("the pillars subtitle goes through i18n", () => {
    expect(modal).not.toContain("4 Essential Pillars for Flawless Execution");
    expect(modal).toContain('t("blueprint.pillarsSubtitle")');
  });

  it("the advanced disclosure label goes through i18n", () => {
    expect(modal).not.toContain("Target Days & 2-Minute Plan B");
    expect(modal).toContain('t("blueprint.advancedLabel")');
  });

  it("the Cancel button reuses the shared dialog.cancel key", () => {
    expect(modal).not.toMatch(/>\s*Cancel\s*</);
    expect(modal).toContain('t("dialog.cancel")');
  });

  it("both locales define the new keys", () => {
    for (const path of ["src/i18n/messages/en.ts", "src/i18n/messages/id.ts"]) {
      const catalog = src(path);
      expect(catalog).toContain('"blueprint.pillarsSubtitle"');
      expect(catalog).toContain('"blueprint.advancedLabel"');
    }
  });
});
