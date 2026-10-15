import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const out = process.argv[2] || "onboard";
mkdirSync(`audit/${out}`, { recursive: true });
const routes = [
  ["welcome", "/onboarding/welcome"],
  ["habits", "/onboarding/habits"],
  ["friction", "/onboarding/friction"],
  ["goals", "/onboarding/goals"],
  ["keystone", "/onboarding/keystone"],
  ["season", "/onboarding/season"],
  ["preview", "/onboarding/preview"]
];
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
for (const w of [390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const [name, path] of routes) {
    await page.goto("http://localhost:5173" + path);
    await page.waitForTimeout(1300);
    const final = new URL(page.url()).pathname;
    await page.screenshot({ path: `audit/${out}/${w}-${name}.png`, fullPage: true });
    console.log(`${name} -> ${final}`);
  }
  await ctx.close();
}
await browser.close();
