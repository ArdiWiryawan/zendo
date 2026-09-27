// Locate the exact button-inside-button on /today via DOM walk.
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
await page.goto("http://localhost:5173/today");
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll("button button").forEach((inner) => {
    const outer = inner.closest("button");
    // closest() returns the inner itself if it matches; walk up manually
    let p = inner.parentElement, outerBtn = null;
    while (p) { if (p.tagName === "BUTTON") { outerBtn = p; break; } p = p.parentElement; }
    if (!outerBtn) return;
    const chain = [];
    let n = inner;
    for (let i = 0; i < 5 && n; i++) {
      chain.push(n.tagName.toLowerCase() + (typeof n.className === "string" && n.className ? "." + n.className.split(" ").slice(0, 3).join(".") : ""));
      n = n.parentElement;
    }
    out.push({
      inner: (inner.innerText || "").trim().slice(0, 40),
      outer: (outerBtn.innerText || "").trim().slice(0, 40),
      chain
    });
  });
  return out;
});
console.log(JSON.stringify(r, null, 2));
await browser.close();
