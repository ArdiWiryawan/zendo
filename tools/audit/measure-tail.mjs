// For each blocked element: is it the LAST thing on the page (padding bug)
// or mid-page (scrollable, so a layout-priority question)?
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const VIEWPORTS = { 375: { width: 375, height: 812 }, 390: { width: 390, height: 844 } };
const SCREENS = { focus: "/focus", week: "/week", learn: "/learn", today: "/today" };

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5173/");
  await page.evaluate((s) => {
    localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
    localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
    localStorage.setItem("learningSessions", "[]");
    localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
    localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
  }, state);

  for (const [name, path] of Object.entries(SCREENS)) {
    await page.goto("http://localhost:5173" + path);
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const main = document.querySelector("main");
      const mainBox = main.getBoundingClientRect();
      const docH = document.documentElement.scrollHeight;
      const nav = document.querySelector("nav");
      const navTop = nav ? nav.getBoundingClientRect().top : window.innerHeight;
      // total scrollable content inside main
      const contentEnd = mainBox.bottom + window.scrollY;
      // find last real content child bottom
      const kids = [...main.children];
      const last = kids[kids.length - 1];
      const lastBottom = last ? Math.round(last.getBoundingClientRect().bottom + window.scrollY) : null;
      return {
        docH, navTop: Math.round(navTop), winH: window.innerHeight,
        mainBottom: Math.round(contentEnd),
        lastChildBottom: lastBottom,
        // distance from bottom of content to bottom of viewport at full scroll
        tailGap: lastBottom == null ? null : docH - lastBottom,
        mainPB: getComputedStyle(main).paddingBottom
      };
    });
    console.log(`${vpName} ${name.padEnd(6)} docH=${r.docH} mainBottom=${r.mainBottom} lastChild=${r.lastChildBottom} tailGap=${r.tailGap} mainPB=${r.mainPB}`);
  }
  await ctx.close();
}
await browser.close();
