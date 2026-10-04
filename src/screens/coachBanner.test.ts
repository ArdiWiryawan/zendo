import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function src(path: string): string {
  return readFileSync(path, "utf8");
}

// The coach hint is the lowest-priority banner on Today. A concept hint must
// never be able to suppress the safety and re-entry banners, so the priority
// chain is asserted at the source level: all six original kinds still present,
// and the coach check still last before the null fallthrough.
describe("Today's active banner keeps the coach slot last", () => {
  const today = () => src("src/screens/TodayScreen.tsx");

  it("contains every original banner kind", () => {
    const s = today();
    for (const kind of [
      "nmt2",
      "reentry",
      "sixDays",
      "restSuggestion",
      "unclarifiedGoal",
      "coach"
    ]) {
      expect(s).toContain(`return "${kind}"`);
    }
  });

  it("checks the coach step after every other banner and before null", () => {
    const s = today();
    const chain = s.match(
      /const activeBanner[\s\S]*?if \(coachStep\) return "coach";\s*return null;/
    );
    expect(chain, "coach is the final guard before null").not.toBeNull();
    const body = chain![0];
    for (const kind of ["nmt2", "reentry", "sixDays", "restSuggestion", "unclarifiedGoal"]) {
      expect(body.indexOf(`return "${kind}"`)).toBeLessThan(body.indexOf('return "coach"'));
    }
  });

  it("does not open a second banner slot for the coach", () => {
    const s = today();
    // Exactly one place routes on activeBanner === "coach".
    expect(s.match(/activeBanner === "coach"/g)?.length ?? 0).toBe(1);
  });
});
