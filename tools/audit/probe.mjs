import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto("http://localhost:5173/");
await page.evaluate((s) => {
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
  localStorage.setItem("learningSessions", "[]");
  localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
}, state);
await page.goto("http://localhost:5173/week");
await page.waitForTimeout(1200);
const r = await page.evaluate(() => {
  const pill = document.querySelector("nav > div");
  const cs = pill ? getComputedStyle(pill) : null;
  const chips = [...document.querySelectorAll("button")].filter(b => /Lanjutkan/.test(b.innerText));
  const chipCs = chips[0] ? getComputedStyle(chips[0]) : null;
  return {
    pillBg: cs?.backgroundColor,
    pillBackdrop: cs?.backdropFilter,
    chipBorder: chipCs?.borderColor,
    sample: document.documentElement.className
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
