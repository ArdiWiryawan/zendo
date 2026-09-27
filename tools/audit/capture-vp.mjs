// Viewport (not fullPage) captures — fixed elements render correctly.
// Usage: node tmp/capture-vp.mjs [tag] [screens] [viewports]
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const tag = process.argv[2] || "vp";
const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));

const VIEWPORTS = {
  375: { width: 375, height: 812 },
  390: { width: 390, height: 844 },
  768: { width: 768, height: 1024 },
  1440: { width: 1440, height: 900 },
  1920: { width: 1920, height: 1080 }
};

const SCREENS = {
  today: "/today", focus: "/focus", week: "/week", timeline: "/timeline",
  journal: "/journal", learn: "/learn", library: "/library", notebook: "/notebook",
  packs: "/packs", seasons: "/seasons", settings: "/settings", "season-end": "/season-end"
};

const vps = (process.argv[4] || "390").split(",");
const screens = (process.argv[3] || Object.keys(SCREENS).join(",")).split(",");

mkdirSync(`audit/${tag}`, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());

for (const vpName of vps) {
  const vp = VIEWPORTS[vpName];
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5173/");
  await page.evaluate((s) => {
    localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
    localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
    localStorage.setItem("learningSessions", "[]");
    localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
    localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
  }, state);

  for (const name of screens) {
    const path = SCREENS[name];
    if (!path) continue;
    await page.goto("http://localhost:5173" + path);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `audit/${tag}/${vpName}-${name}.png` });
    const m = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      docW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
      scrollH: document.documentElement.scrollHeight,
      winH: window.innerHeight
    }));
    console.log(`${vpName} ${name}${m.overflowX ? ` OVERFLOW ${m.docW}>${m.winW}` : ""} scroll=${m.scrollH}/${m.winH}`);
  }
  await ctx.close();
}
await browser.close();
console.log("->", `audit/${tag}`);
