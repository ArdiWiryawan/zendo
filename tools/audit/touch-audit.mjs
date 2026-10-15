// Runtime audit: every interactive element whose hit box is below the WCAG 2.2
// minimum (24x24, SC 2.5.8) or the 44x44 recommendation.
import { chromium } from "playwright";
import { state } from "./seed-fresh.mjs";

const routes = ["/today", "/week", "/timeline", "/journal", "/focus", "/settings", "/library", "/notebook", "/packs", "/seasons"];
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto("http://localhost:5173/");
await page.evaluate((s) => {
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
  localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, state);

let small = 0, tiny = 0;
for (const route of routes) {
  await page.goto("http://localhost:5173" + route);
  await page.waitForTimeout(1100);
  const rows = await page.evaluate(() => {
    const out = [];
    const els = document.querySelectorAll('button, a[href], [role="switch"], [role="button"], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const label = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 42);
      out.push({ w: Math.round(r.width), h: Math.round(r.height), tag: el.tagName.toLowerCase(), label });
    }
    return out;
  });
  const bad = rows.filter((r) => r.h < 44 || r.w < 44);
  const below24 = rows.filter((r) => r.h < 24 || r.w < 24);
  if (bad.length) {
    console.log(`\n${route}: ${bad.length} below 44px (${below24.length} below 24px)`);
    for (const r of bad.slice(0, 12)) console.log(`   ${r.w}x${r.h} <${r.tag}> ${r.label}`);
  }
  small += bad.length; tiny += below24.length;
}
console.log(`\nTOTAL: ${small} controls below 44px, ${tiny} below 24px`);
await browser.close();
