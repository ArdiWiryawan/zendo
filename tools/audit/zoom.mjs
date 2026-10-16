// High-DPI crop of one screen region.
// Run: node tools/audit/zoom.mjs <route> <tag> [scrollY] [clipH] [width] [dsf]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { state } from "./seed-fresh.mjs";

const raw = process.argv[2] || "week";
const route = "/" + raw.split(/[\\/]/).filter(Boolean).pop();
const tag = process.argv[3] || "zoom";
const scrollY = Number(process.argv[4] || 0);
const clipH = Number(process.argv[5] || 700);
const width = Number(process.argv[6] || 390);
const dsf = Number(process.argv[7] || 2);

mkdirSync(`audit/${tag}`, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: dsf });
const page = await ctx.newPage();
await page.goto("http://localhost:5173/");
await page.evaluate((s) => {
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
  localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, state);
await page.goto("http://localhost:5173" + route);
await page.waitForTimeout(1400);

// Reveal anything that animates in on scroll, then settle at the crop offset.
await page.evaluate(async () => {
  const step = Math.round(window.innerHeight * 0.7);
  const H = document.documentElement.scrollHeight;
  for (let y = 0; y <= H; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 150));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 250));
});
await page.evaluate((y) => window.scrollTo(0, y), scrollY);
await page.waitForTimeout(400);

const name = `${raw.replace(/\//g, "_")}-${scrollY}${width === 390 ? "" : `-w${width}`}`;
await page.screenshot({
  path: `audit/${tag}/${name}.png`,
  clip: { x: 0, y: 0, width, height: clipH },
});
console.log(`audit/${tag}/${name}.png  ${width}x${clipH} @${dsf}x`);
await browser.close();
