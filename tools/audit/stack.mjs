// Dump the vertical stack of a screen so we can see what pushes actions under the nav.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const SCREENS = { today: "/today", focus: "/focus", week: "/week", learn: "/learn", timeline: "/timeline", journal: "/journal" };
const target = SCREENS[process.argv[2]] || "/focus";
const vp = { width: Number(process.argv[3]) || 390, height: Number(process.argv[3]) === 375 ? 812 : 844 };

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
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
await page.goto("http://localhost:5173" + target);
await page.waitForTimeout(1500);

const r = await page.evaluate(() => {
  const main = document.querySelector("main");
  const nav = document.querySelector("nav");
  const navTop = nav ? Math.round(nav.getBoundingClientRect().top) : null;
  const rows = [];
  // direct children of main + their first meaningful descendant text
  const walk = (el, depth) => {
    if (depth > 3) return;
    for (const c of el.children) {
      const b = c.getBoundingClientRect();
      if (b.height < 8) continue;
      const txt = (c.innerText || "").trim().split("\n")[0].slice(0, 46);
      rows.push({
        d: depth,
        top: Math.round(b.top),
        h: Math.round(b.height),
        tag: c.tagName.toLowerCase(),
        cls: typeof c.className === "string" ? c.className.split(" ").slice(0, 4).join(".") : "",
        txt
      });
      walk(c, depth + 1);
    }
  };
  walk(main, 0);
  return { navTop, docH: document.documentElement.scrollHeight, rows };
});

console.log(`=== ${target} @390  navTop=${r.navTop} docH=${r.docH} viewport=844 ===`);
for (const row of r.rows) {
  const marker = row.top >= r.navTop ? " <<< UNDER NAV" : row.top + row.h > r.navTop ? " <<< SLICED" : "";
  console.log(`${"  ".repeat(row.d)}top=${String(row.top).padStart(4)} h=${String(row.h).padStart(4)} ${row.tag}.${row.cls}  "${row.txt}"${marker}`);
}
await browser.close();
