// Clicks through the Timeline sub-views and screenshots each.
// Usage: node tools/audit/timeline-views.mjs [vpWidth]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const w = Number(process.argv[2] || 390);
const h = w >= 1440 ? 900 : 844;

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.goto("http://localhost:5173/");
await page.evaluate((s) => {
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
  localStorage.setItem("learningSessions", "[]");
  localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, state);

await page.goto("http://localhost:5173/timeline");
await page.waitForTimeout(1200);

const tabs = ["Harian", "Mingguan", "Bulanan", "Musim"];
for (const label of tabs) {
  const btn = page.locator(`button:has-text("${label}")`).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(900);
  }
  const file = `audit/timeline/${w}-${label}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log("saved", file);
}

await browser.close();
