// Seed the Today screen with the audit demo state, shifted to the real current date.
// Usage: node tools/audit/seed-today.mjs [port]
// Writes tools/audit/today-state.json (shifted) for reuse by other harnesses.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const port = process.argv[2] || "5200";
const BASE = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const DEMO_TODAY = "2026-09-26";

const day = (d) => new Date(d).toISOString().slice(0, 10);
const shiftDays = Math.round((new Date(day(new Date())) - new Date(DEMO_TODAY)) / 86400000);
const bump = (str) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + shiftDays);
    return d.toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const d = new Date(str);
    d.setUTCDate(d.getUTCDate() + shiftDays);
    return d.toISOString();
  }
  return str;
};
const walk = (o) => {
  if (Array.isArray(o)) return o.map(walk);
  if (o && typeof o === "object") {
    const out = {};
    for (const [k, v] of Object.entries(o)) out[k] = typeof v === "string" ? bump(v) : walk(v);
    return out;
  }
  return o;
};

const state = walk(BASE);
writeFileSync("tools/audit/today-state.json", JSON.stringify(state, null, 2));

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${port}/`);
await page.evaluate((s) => {
  for (const k of Object.keys(localStorage)) localStorage.removeItem(k);
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
  localStorage.setItem("learningSessions", "[]");
  localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, state);
await page.goto(`http://127.0.0.1:${port}/today`);
await page.waitForTimeout(1200);
console.log(JSON.stringify({ shiftDays, from: DEMO_TODAY, to: day(new Date()), url: page.url() }, null, 2));
await ctx.storageState({ path: "tools/audit/today-storage.json" });
await browser.close();
