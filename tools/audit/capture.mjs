// Capture audit screenshots across screens + viewports.
// Usage: node tmp/capture.mjs [tag]
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const tag = process.argv[2] || "before";
const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));

const VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 1080 }
];

const SCREENS = [
  ["today", "/today"],
  ["focus", "/focus"],
  ["week", "/week"],
  ["timeline", "/timeline"],
  ["journal", "/journal"],
  ["learn", "/learn"],
  ["library", "/library"],
  ["notebook", "/notebook"],
  ["packs", "/packs"],
  ["seasons", "/seasons"],
  ["settings", "/settings"],
  ["season-end", "/season-end"]
];

const only = process.argv[3] ? process.argv[3].split(",") : null;
const onlyVp = process.argv[4] ? process.argv[4].split(",") : null;

mkdirSync(`audit/${tag}`, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());

for (const vp of VIEWPORTS) {
  if (onlyVp && !onlyVp.includes(vp.name)) continue;
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
  page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160)); });

  await page.goto("http://localhost:5173/");
  await page.evaluate((s) => {
    localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
    localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
    localStorage.setItem("learningSessions", "[]");
    localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
    localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
  }, state);

  for (const [name, path] of SCREENS) {
    if (only && !only.includes(name)) continue;
    await page.goto("http://localhost:5173" + path);
    await page.waitForTimeout(1400);
    const finalUrl = new URL(page.url()).pathname;
    await page.screenshot({ path: `audit/${tag}/${vp.name}-${name}.png`, fullPage: true });
    const metrics = await page.evaluate(() => ({
      docW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1
    }));
    console.log(`${vp.name} ${name} -> ${finalUrl}${metrics.overflow ? ` OVERFLOW ${metrics.docW}>${metrics.winW}` : ""}`);
  }
  if (errs.length) console.log(`  errors@${vp.name}:`, [...new Set(errs)].slice(0, 5));
  await ctx.close();
}

await browser.close();
console.log("done ->", `audit/${tag}`);
