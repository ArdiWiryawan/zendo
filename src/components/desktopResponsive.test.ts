import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { en } from "../i18n/messages/en";
import { id } from "../i18n/messages/id";

function src(path: string): string {
  return readFileSync(path, "utf8");
}

const ui = () => src("src/components/ui.tsx");
const today = () => src("src/screens/TodayScreen.tsx");
const week = () => src("src/screens/WeekScreen.tsx");
const timeline = () => src("src/screens/TimelineScreen.tsx");
const css = () => src("src/styles/globals.css");

// Two-column desktop grid pattern used by Today/Week/Timeline.
const GRID = /lg:grid lg:grid-cols-\[minmax\(0,1fr\)_\d+px\]/g;
const GRID_XL = /xl:grid-cols-\[minmax\(0,1fr\)_\d+px\]/g;

describe("ScreenContainer desktop tier", () => {
  it("widens at lg/xl while keeping the mobile base", () => {
    const s = ui();
    expect(s).toContain("max-w-[430px]");
    expect(s).toContain("lg:max-w-3xl");
    expect(s).toContain("xl:max-w-5xl");
    expect(s).toContain("lg:px-8");
    // Mobile base padding untouched.
    expect(s).toContain("px-6 pt-[calc(env(safe-area-inset-top)+24px)]");
  });

  it("reserves bottom space >= nav pill height + inset", () => {
    const s = ui();
    // 58px pill + 12px inset = 70px minimum. NOTE: this padding only governs the
    // end of the page; it cannot stop mid-page content passing under the nav.
    expect(s).toContain("pb-[calc(env(safe-area-inset-bottom)+148px)]");
    expect(s).toContain("withBottomNavPadding ? BOTTOM_NAV_SAFE_SPACE : \"pb-8\"");
  });

  it("new width classes are lg: or larger only", () => {
    const s = ui();
    const wideners = s.match(/(sm|md):max-w-\S+/g) ?? [];
    expect(wideners).toEqual([]);
  });
});

describe("bottom nav overlay assumptions", () => {
  it("nav wrapper is fixed full-width with hide transform clearing the pill", () => {
    const s = ui();
    expect(s).toContain("fixed inset-x-0 bottom-0 z-50");
    expect(s).toContain("translate-y-[150%]");
    expect(s).toContain("translate-y-0");
  });

  it("BottomNav pill keeps its measured 58px height", () => {
    expect(ui()).toContain("h-[58px]");
  });

  it("toast sits above the reserved safe space, not under the pill", () => {
    expect(ui()).toContain("bottom-[calc(env(safe-area-inset-bottom)+148px)]");
  });

  it("repeating-list tail helper exists as an exported utility", () => {
    expect(ui()).toContain("export const LAST_ITEM_NAV_SAFE");
  });

  it("AppShell passes bottom padding through when the nav shows", () => {
    expect(ui()).toContain("withBottomNavPadding={showBottomNav}");
  });
});

describe.each([
  ["Today", today],
  ["Week", week],
  ["Timeline", timeline]
])("%s two-column layout", (_name, load) => {
  it("grids at lg with an xl widening, stacked below", () => {
    const s = load();
    expect(s.match(GRID)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(s.match(GRID_XL)?.length ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("stacks vertically on mobile (base space-y kept before lg:grid)", () => {
    const s = load();
    const stacked = s.match(/space-y-\d+ lg:grid/g) ?? [];
    expect(stacked.length).toBeGreaterThanOrEqual(1);
  });

  it("resets stack spacing when the grid takes over", () => {
    const s = load();
    const grids = s.match(GRID) ?? [];
    const resets = s.match(/lg:space-y-0/g) ?? [];
    expect(resets.length).toBeGreaterThanOrEqual(grids.length);
  });

  it("grid children can shrink (min-w-0 prevents overflow)", () => {
    const s = load();
    const grids = s.match(GRID) ?? [];
    const shrinkable = s.match(/min-w-0/g) ?? [];
    expect(shrinkable.length).toBeGreaterThanOrEqual(grids.length);
  });

  it("uses minmax(0,1fr) tracks, never bare 1fr at lg", () => {
    const s = load();
    const bare = s.match(/lg:grid-cols-\[1fr_/g) ?? [];
    expect(bare).toEqual([]);
  });

  it("no md: tier changes — mobile unchanged, desktop starts at lg", () => {
    expect(load()).not.toContain("md:");
  });

  it("no viewport-width overflow hazards", () => {
    const s = load();
    expect(s).not.toMatch(/w-screen|100vw|min-w-screen/);
  });
});

describe("no horizontal overflow (page level)", () => {
  it("html clips horizontal overflow", () => {
    expect(css()).toMatch(/html\s*{[^}]*overflow-x:\s*hidden/);
  });

  it("root caps width per breakpoint", () => {
    const s = css();
    expect(s).toContain("#root > *");
    expect(s).toContain("@media (min-width: 1024px)");
    expect(s).toContain("@media (min-width: 1280px)");
  });
});

describe("mobile base intact", () => {
  it("Week outer wrapper stays a plain stack", () => {
    expect(week()).toContain('<div className="space-y-5">');
  });

  it("Timeline filter row keeps mobile sizing with lg cap only", () => {
    expect(timeline()).toContain("lg:max-w-md");
  });
});

describe("touched i18n keys exist in both locales", () => {
  for (const key of ["focusPrep.breathRest", "today.energy.tank"] as const) {
    it(key, () => {
      expect(en[key]).toBeTruthy();
      expect(id[key]).toBeTruthy();
    });
  }
});
