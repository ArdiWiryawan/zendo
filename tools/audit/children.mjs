import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const SCREENS = { today: "/today", focus: "/focus", week: "/week", learn: "/learn" };
const name = process.argv[2] || "focus";
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto("http://localhost:5173/");
await page.evaluate((s) => {
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
  localStorage.setItem("learningSessions", "[]");
  localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, state);
await page.goto("http://localhost:5173" + SCREENS[name]);
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const main = document.querySelector("main");
  const nav = document.querySelector("nav");
  const navTop = nav ? Math.round(nav.getBoundingClientRect().top) : null;
  const out = [];
  for (const c of main.children) {
    const b = c.getBoundingClientRect();
    out.push({
      top: Math.round(b.top + window.scrollY),
      h: Math.round(b.height),
      tag: c.tagName.toLowerCase(),
      cls: typeof c.className === "string" ? c.className.split(" ").slice(0, 5).join(" ") : "",
      first: (c.innerText || "").trim().split("\n")[0].slice(0, 40)
    });
  }
  return { count: main.children.length, navTop, docH: document.documentElement.scrollHeight, out };
});
console.log(`=== ${name} @390 navTop=${r.navTop} docH=${r.docH} main.children=${r.count} ===`);
for (const o of r.out) {
  const mark = o.top >= r.navTop ? "  <<< BELOW/UNDER NAV" : (o.top + o.h) > r.navTop ? "  <<< CROSSES NAV" : "";
  console.log(`top=${String(o.top).padStart(4)} h=${String(o.h).padStart(4)}  ${o.tag}.${o.cls}\n        "${o.first}"${mark}`);
}
await browser.close();
