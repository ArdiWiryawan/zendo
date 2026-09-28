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

// Phone-first: desktop is the mobile column, centred. Any desktop-tier
// widening utility would contradict that, so the screens must contain none at
// all. `sm:` is a phone-class tweak and is expected to remain.
const DESKTOP_TIER = /(?:^|[\s"'])(lg|xl|2xl):/g;

describe("ScreenContainer is a single phone column", () => {
  it("caps at the 480px mobile width and does not widen", () => {
    const s = ui();
    expect(s).toContain("max-w-[480px]");
    expect(s).not.toContain("lg:max-w-3xl");
    expect(s).not.toContain("xl:max-w-5xl");
    expect(s).not.toContain("lg:px-8");
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
])("%s stays a phone stack", (_name, load) => {
  it("has no desktop-tier widening utilities", () => {
    const found = load().match(DESKTOP_TIER) ?? [];
    expect(found).toEqual([]);
  });

  it("has no two-column grid tier", () => {
    const s = load();
    expect(s).not.toMatch(/lg:grid/);
    expect(s).not.toMatch(/grid-cols-\[minmax\(0,1fr\)_/);
    expect(s).not.toMatch(/lg:space-y-0/);
  });

  it("keeps a plain vertical stack between sections", () => {
    expect(load()).toMatch(/className="space-y-\d+"/);
  });

  it("still guards shrinkable children that once fed the grid track", () => {
    expect(load()).toMatch(/min-w-0/);
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

  it("root caps at the 480px phone width at every breakpoint", () => {
    const s = css();
    expect(s).toContain("#root > *");
    const caps = s.match(/max-width:\s*480px/g) ?? [];
    expect(caps.length).toBeGreaterThanOrEqual(1);
    // The old 1024/1280 widening media blocks must be gone.
    expect(s).not.toContain("max-width: 1024px");
    expect(s).not.toContain("max-width: 1280px");
  });
});

describe("mobile base intact", () => {
  it("Week outer wrapper stays a plain stack", () => {
    expect(week()).toContain('<div className="space-y-5">');
  });

  it("Timeline view switcher row is uncapped (no dangling lg: cap)", () => {
    expect(timeline()).not.toContain("lg:max-w-md");
  });
});

describe("launcher icons are distinct real files", () => {
  it("maskable icons are not copies of the any-purpose icons", () => {
    const read = (p: string) => readFileSync(p);
    expect(read("public/icons/maskable-512.png").equals(read("public/icons/icon-512.png"))).toBe(false);
    expect(read("public/icons/maskable-192.png").equals(read("public/icons/icon-192.png"))).toBe(false);
  });

  it("favicon.ico is a real ICO container, not a renamed PNG", () => {
    const head = readFileSync("public/favicon.ico").subarray(0, 4);
    // PNG magic is 89 50 4E 47; ICO reserves the first two bytes and uses 01 00.
    expect(head[0]).toBe(0x00);
    expect(head[1]).toBe(0x00);
    expect(head[2]).toBe(0x01);
    expect(head[3]).toBe(0x00);
  });
});

describe("touched i18n keys exist in both locales", () => {
  const keys = [
    "focusPrep.breathRest",
    "today.energy.tank",
    "timeline.streak.partial",
    "timeline.daily.blocksPlanned",
    "timeline.daily.editPlanCta",
    "timeline.daily.emptyHint",
    "timeline.noAction",
    "timeline.restDay",
    "timeline.streak.noMissed",
    "timeline.streak.best",
    "timeline.weekLabel",
    "timeline.weekRange",
    "timeline.todayLogTitle",
    "timeline.todayLogSubtitle",
    "timeline.todayLogEmpty",
    "timeline.month.title",
    "timeline.month.hint",
    "timeline.retroLog",
    "timeline.todayBadge"
  ] as const;
  for (const key of keys) {
    it(key, () => {
      expect(en[key]).toBeTruthy();
      expect(id[key]).toBeTruthy();
    });
  }
});
