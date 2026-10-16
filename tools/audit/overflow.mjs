// Horizontal-overflow + clipped-text probe across routes and widths.
// Run: node tools/audit/overflow.mjs [route ...]
import { chromium } from "playwright";
import { state } from "./seed-fresh.mjs";

const routes = process.argv.slice(2).length
  ? process.argv.slice(2).map((r) => "/" + r.split(/[\\/]/).filter(Boolean).pop())
  : ["/settings", "/today", "/week", "/timeline", "/journal", "/library", "/notebook", "/packs", "/seasons"];
const widths = [320, 390, 430, 768, 1440];

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
let problems = 0;

for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5173/");
  await page.evaluate((s) => {
    localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
    localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
    localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
    localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
  }, state);

  for (const route of routes) {
    await page.goto("http://localhost:5173" + route);
    await page.waitForTimeout(1100);
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const scrollW = de.scrollWidth;
      const clientW = de.clientWidth;
      // Elements whose content is wider than their own box (clipped or scrolled).
      const clipped = [];
      for (const el of document.querySelectorAll("main *")) {
        if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
          const cs = getComputedStyle(el);
          if (cs.overflowX === "hidden" || cs.overflowX === "clip") {
            clipped.push({ tag: el.tagName, cls: (el.className || "").toString().slice(0, 55), over: el.scrollWidth - el.clientWidth });
          }
        }
      }
      return { scrollW, clientW, clipped: clipped.slice(0, 5) };
    });
    const overflow = r.scrollW - r.clientW;
    if (overflow > 1 || r.clipped.length) {
      problems++;
      console.log(`${String(width).padStart(4)}px ${route.padEnd(12)} overflow=${overflow}px clipped=${r.clipped.length}`);
      for (const c of r.clipped) console.log(`        <${c.tag}> +${c.over}px .${c.cls}`);
    }
  }
  await ctx.close();
}
console.log(problems ? `\n${problems} problem(s)` : "\nno horizontal overflow, no clipped text");
await browser.close();
