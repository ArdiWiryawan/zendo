// Measure bottom-nav occlusion of primary actions + stray toast bar.
// Usage: node tmp/measure-nav.mjs [tag]
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const tag = process.argv[2] || "after";
const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));

const VIEWPORTS = { 375: { width: 375, height: 812 }, 390: { width: 390, height: 844 }, 768: { width: 768, height: 1024 } };
const SCREENS = { today: "/today", focus: "/focus", week: "/week", timeline: "/timeline", learn: "/learn", journal: "/journal" };

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());

for (const vpName of Object.keys(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[vpName], deviceScaleFactor: 1 });
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
      const nav = document.querySelector('nav[aria-label], nav');
      const navBox = nav ? nav.getBoundingClientRect() : null;
      const navTop = navBox ? navBox.top : null;
      // any element that is fixed/absolute and sits in the toast band while idle
      const strays = [...document.querySelectorAll("body *")]
        .filter((el) => {
          const cs = getComputedStyle(el);
          if (cs.position !== "fixed") return false;
          const b = el.getBoundingClientRect();
          return b.height > 0 && b.height < 20 && b.width > 40 && b.top > window.innerHeight * 0.7;
        })
        .map((el) => {
          const b = el.getBoundingClientRect();
          return { h: Math.round(b.height), w: Math.round(b.width), top: Math.round(b.top), cls: el.className.slice(0, 70) };
        });
      // interactive actions sitting under the nav band
      const blocked = [];
      const target = navTop == null ? window.innerHeight : navTop;
      document.querySelectorAll("button, a, textarea, input, select, [role=button]").forEach((el) => {
        if (nav && nav.contains(el)) return;
        const b = el.getBoundingClientRect();
        if (b.height === 0 || b.width === 0) return;
        if (b.top >= target && b.top < window.innerHeight) {
          const label = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.tagName).trim().slice(0, 42);
          blocked.push({ top: Math.round(b.top), label });
        }
      });
      return { navTop: navTop == null ? null : Math.round(navTop), strays, blocked: blocked.slice(0, 6), scrollH: document.documentElement.scrollHeight };
    });
    const flag = r.blocked.length ? `BLOCKED ${r.blocked.length}` : "clear";
    console.log(`${vpName} ${name.padEnd(9)} navTop=${r.navTop} ${flag} scroll=${r.scrollH}`);
    if (r.strays.length) console.log(`    STRAY: ${JSON.stringify(r.strays)}`);
    for (const b of r.blocked) console.log(`    under nav: "${b.label}" top=${b.top}`);
  }
  await ctx.close();
}
await browser.close();
