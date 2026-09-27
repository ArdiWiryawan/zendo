import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const SCREENS = { today: "/today", focus: "/focus", week: "/week", learn: "/learn" };
const name = process.argv[2] || "today";
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
    const rows = [];
    for (const g of c.children) {
      const gb = g.getBoundingClientRect();
      rows.push({ top: Math.round(gb.top + window.scrollY), h: Math.round(gb.height), first: (g.innerText || "").trim().split("\n")[0].slice(0, 34) });
    }
    out.push({ top: Math.round(b.top + window.scrollY), h: Math.round(b.height), first: (c.innerText || "").trim().split("\n")[0].slice(0, 40), kids: rows });
  }
  return { navTop, docH: document.documentElement.scrollHeight, out };
});
console.log(`=== ${name} @390 navTop=${r.navTop} docH=${r.docH} ===`);
for (const o of r.out) {
  const mark = o.top >= r.navTop ? " <<<UNDER" : (o.top + o.h) > r.navTop ? " <<<CROSSES" : "";
  console.log(`\n[top=${o.top} h=${o.h}] "${o.first}"${mark}`);
  for (const k of o.kids) {
    const m2 = k.top >= r.navTop ? " <<<UNDER" : (k.top + k.h) > r.navTop ? " <<<CROSSES" : "";
    console.log(`   top=${String(k.top).padStart(4)} h=${String(k.h).padStart(4)} "${k.first}"${m2}`);
  }
}
await browser.close();
