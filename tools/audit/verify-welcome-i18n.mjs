// Verify the localization fixes: the Welcome screen and the onboarding phase
// label now follow the language setting, and <html lang> tracks it.
//
// Run: node tools/audit/verify-welcome-i18n.mjs
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { state } from "./seed-fresh.mjs";

mkdirSync("audit/uiux-after", { recursive: true });
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// 1) Welcome with no stored state — default language is "id".
await page.goto("http://localhost:5173/onboarding/welcome");
await page.waitForTimeout(1500);
console.log("welcome lang  =", await page.evaluate(() => document.documentElement.lang));
console.log("welcome h1    =", await page.locator("h1").innerText());
await page.screenshot({ path: "audit/uiux-after/welcome-id.png", fullPage: true });

// 2) Onboarding phase label in the step header.
await page.goto("http://localhost:5173/onboarding/goals");
await page.waitForTimeout(1200);
console.log("goals header  =", (await page.locator("main p").first().innerText()).replace(/\n/g, " "));
await page.screenshot({ path: "audit/uiux-after/goals-id.png", fullPage: true });

// 3) Seeded app switched to English — <html lang> must follow.
await page.goto("http://localhost:5173/");
await page.evaluate((s) => {
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify({ ...s, appSettings: { ...s.appSettings, language: "en" } }));
  localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
  localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, state);
await page.goto("http://localhost:5173/today");
await page.waitForTimeout(1400);
console.log("today(EN) lang =", await page.evaluate(() => document.documentElement.lang));

// 4) Welcome in English.
await page.evaluate(() => localStorage.clear());
await page.goto("http://localhost:5173/");
await page.waitForTimeout(600);
await page.evaluate(() => localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify({ appSettings: { language: "en" } })));
await page.goto("http://localhost:5173/onboarding/welcome");
await page.waitForTimeout(1400);
console.log("welcome(EN) h1 =", await page.locator("h1").innerText());
await page.screenshot({ path: "audit/uiux-after/welcome-en.png", fullPage: true });

await browser.close();
