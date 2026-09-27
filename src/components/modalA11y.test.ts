import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function src(path: string): string {
  return readFileSync(path, "utf8");
}

// WCAG 2.1.2: a modal must not let keyboard focus walk behind it, and Escape
// must dismiss it. Every overlay in the app routes through the one hook, so a
// new modal that hand-rolls its own overlay is the regression to catch.
const MODALS = [
  "src/components/ui.tsx",
  "src/components/MorningPlanningModal.tsx",
  "src/components/WeeklyReviewModal.tsx",
  "src/components/FocusPrepModal.tsx",
  "src/components/GoalBlueprintModal.tsx",
  "src/components/ZendoProModal.tsx",
  "src/screens/JournalPacks.tsx"
] as const;

describe("every modal overlay uses the shared keyboard contract", () => {
  for (const path of MODALS) {
    const name = path.split("/").pop()!;

    it(`${name} wires useModalA11y`, () => {
      expect(src(path)).toContain("useModalA11y(");
    });

    it(`${name} marks its dialog for assistive tech`, () => {
      const s = src(path);
      const isOwner = path.endsWith("ui.tsx");
      if (isOwner) {
        // ui.tsx is where the contract is defined; the attributes live on
        // CalmDialog's panel.
        expect(s).toContain('role="dialog"');
        expect(s).toContain('aria-modal="true"');
      } else {
        expect(s).toContain('role="dialog"');
      }
    });

    it(`${name} can hold focus when it has no controls`, () => {
      expect(src(path)).toContain("tabIndex={-1}");
    });
  }
});

describe("the hook itself covers both directions and Escape", () => {
  const ui = () => src("src/components/ui.tsx");

  it("closes on Escape", () => {
    expect(ui()).toMatch(/e\.key === "Escape"[\s\S]{0,80}onClose\(\)/);
  });

  it("wraps Tab forward and backward", () => {
    const s = ui();
    expect(s).toMatch(/e\.shiftKey[\s\S]{0,120}last\.focus\(\)/);
    expect(s).toMatch(/!e\.shiftKey[\s\S]{0,120}first\.focus\(\)/);
  });

  it("restores focus to the opener on unmount", () => {
    expect(ui()).toMatch(/prev\?\.focus\?\.\(\)/);
  });

  it("parks focus on the dialog when nothing inside is focusable", () => {
    expect(ui()).toMatch(/root\?\.focus\(\)/);
  });
});

describe("no modal hand-rolls an untrapped overlay", () => {
  it("every fixed-inset overlay file is marked as a modal dialog", () => {
    const files = [
      "src/components/FocusPrepModal.tsx",
      "src/components/GoalBlueprintModal.tsx",
      "src/components/MorningPlanningModal.tsx",
      "src/components/WeeklyReviewModal.tsx",
      "src/components/ZendoProModal.tsx",
      "src/screens/JournalPacks.tsx"
    ];
    for (const f of files) {
      const s = src(f);
      expect(s).toContain('role="dialog"');
      expect(s).toContain('aria-modal="true"');
    }
  });

  it("no modal still listens for Escape on its own", () => {
    // Escape belongs to the shared hook; a local handler would double-fire it.
    const files = [
      "src/components/FocusPrepModal.tsx",
      "src/components/GoalBlueprintModal.tsx",
      "src/components/MorningPlanningModal.tsx",
      "src/components/WeeklyReviewModal.tsx",
      "src/components/ZendoProModal.tsx",
      "src/screens/JournalPacks.tsx"
    ];
    for (const f of files) {
      expect(src(f)).not.toMatch(/e\.key === "Escape"/);
    }
  });
});