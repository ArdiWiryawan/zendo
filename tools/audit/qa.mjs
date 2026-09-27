// Final QA: console errors + overflow + focus rings across all screens/viewports.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));

const VIEWPORTS = {
  375: { width: 375, height: 812 }, 390: { width: 390, height: 844 },
  768: { width: 768, height: 1024 }, 1440: { width: 1440, height: 900 }, 1920: { width: 1920, height: 1080 }
};
const SCREENS = {
  today: "/today", focus: "/focus", week: "/week", timeline: "/timeline", journal: "/journal",
  learn: "/learn", library: "/library", notebook: "/notebook", packs: "/packs",
  seasons: "/seasons", settings: "/settings", "season-end": "/season-end"
};

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
let overflow = 0, errs = 0, badFocus = 0;

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleErrs = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text().slice(0, 110)); });
  page.on("pageerror", (e) => consoleErrs.push("PAGEERROR " + String(e).slice(0, 110)));

  await page.goto("http://localhost:5173/");
  await page.evaluate((s) => {
    localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
    localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
    localStorage.setItem("learningSessions", "[]");
    localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
    localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
  }, state);

  for (const [name, path] of Object.entries(SCREENS)) {
    consoleErrs.length = 0;
    await page.goto("http://localhost:5173" + path);
    await page.waitForTimeout(1100);
    const m = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      docW: document.documentElement.scrollWidth, winW: window.innerWidth,
      hasNestedBtn: document.querySelectorAll("button button").length
    }));
    if (m.overflowX) { overflow++; console.log(`OVERFLOW ${vpName} ${name} ${m.docW}>${m.winW}`); }
    if (m.hasNestedBtn) console.log(`NESTED-BUTTON ${vpName} ${name} x${m.hasNestedBtn}`);
    const real = consoleErrs.filter((e) => !/favicon|Download the React DevTools|autoplay/i.test(e));
    if (real.length) { errs++; console.log(`CONSOLE ${vpName} ${name}: ${real.slice(0, 2).join(" | ")}`); }
  }

  // focus-ring check on /today
  await page.goto("http://localhost:5173/today");
  await page.waitForTimeout(900);
  const fr = await page.evaluate(() => {
    const out = [];
    const els = [...document.querySelectorAll("button, a, input, textarea, select")].filter(e => e.offsetParent !== null);
    for (const el of els.slice(0, 25)) {
      el.focus();
      const cs = getComputedStyle(el);
      const visible = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
      if (!visible) out.push(el.tagName + ":" + (el.innerText || "").trim().slice(0, 24));
    }
    return out;
  });
  if (fr.length) { badFocus += fr.length; console.log(`NO-FOCUS-RING ${vpName}: ${fr.slice(0, 5).join(", ")}`); }
  await ctx.close();
}
await browser.close();
console.log(`\nSUMMARY overflow=${overflow} consoleErrors=${errs} missingFocusRing=${badFocus}`);
