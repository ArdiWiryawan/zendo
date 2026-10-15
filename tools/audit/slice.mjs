// Capture a single screen as viewport-sized slices so tall pages are readable.
// Run: node tools/audit/slice.mjs <route> <tag> [slices] [width]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { state } from "./seed-fresh.mjs";

// Route may arrive mangled by the shell's path conversion; keep only the last segment.
const rawRoute = process.argv[2] || "settings";
const route = "/" + rawRoute.split(/[\\/]/).filter(Boolean).pop().replace(/^\/+/, "");
const tag = process.argv[3] || "slice";
const slices = Number(process.argv[4] || 6);
const width = Number(process.argv[5] || 390);
const height = 844;

mkdirSync(`audit/${tag}`, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto("http://localhost:5173/");
await page.evaluate((s) => {
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
  localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, state);
await page.goto("http://localhost:5173" + route);
await page.waitForTimeout(1200);

const total = await page.evaluate(() => document.documentElement.scrollHeight);
const name = route.replace(/\//g, "_") || "_root";
for (let i = 0; i < slices; i++) {
  const y = Math.round((i * (total - height)) / Math.max(1, slices - 1));
  await page.evaluate((yy) => window.scrollTo(0, yy), Math.max(0, y));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `audit/${tag}/${name}-${String(i).padStart(2, "0")}.png` });
}
console.log(`height=${total} slices=${slices} -> audit/${tag}`);
await browser.close();
