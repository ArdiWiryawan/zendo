// Full-length screenshot of a single screen (no slicing) at high DPI.
// Run: [SEED=<name>] node tools/audit/fullshot.mjs <route> <tag> [width] [dsf] [expand]
//
// `expand` clicks every collapsed disclosure row (aria-expanded="false") before
// capturing, so the expanded state of a collapsible section can be documented.
//
// `SEED` picks the state module (`tools/audit/seed-<name>.mjs`, default `fresh`).
// Use `SEED=today-normal` for a day that is planned but not started — no
// completed focus sessions, no journal entry, no ticked agenda blocks.
//
// Two things a naive fullPage capture gets wrong on this app:
//  1. Sections below the fold are revealed by an in-view animation, so they are
//     still at opacity:0 when the shot is taken. We scroll the whole page once
//     to trigger every reveal, then return to the top.
//  2. Chromium paints position:fixed elements at their viewport offset, so the
//     bottom nav lands in the middle of a full-length image. We re-anchor fixed
//     boxes to the document bottom for the duration of the capture.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

// Route may arrive mangled by the shell's path conversion; keep only the last segment.
const rawRoute = process.argv[2] || "settings";
const route = "/" + rawRoute.split(/[\\/]/).filter(Boolean).pop().replace(/^\/+/, "");
const tag = process.argv[3] || "fullshot";
const width = Number(process.argv[4] || 390);
const dsf = Number(process.argv[5] || 2);
const expand = (process.argv[6] || "") === "expand";
const seedName = process.env.SEED || "fresh";
const { state, extraLocalStorage } = await import(`./seed-${seedName}.mjs`);

mkdirSync(`audit/${tag}`, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({
  viewport: { width, height: 844 },
  deviceScaleFactor: dsf
});
const page = await ctx.newPage();
await page.goto("http://localhost:5173/");
await page.evaluate(
  ({ s, extra }) => {
    localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
    localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
    localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
    localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
    // Seeds may ship their own auxiliary keys (e.g. the coach dismiss flags),
    // so a "settled account" state is expressed through the app's real storage
    // instead of being hidden at capture time.
    for (const [k, v] of Object.entries(extra || {})) localStorage.setItem(k, v);
  },
  { s: state, extra: extraLocalStorage }
);
await page.goto("http://localhost:5173" + route);
await page.waitForTimeout(1600);

// Expand every collapsed <details> so hidden content is in the shot.
const opened = await page.evaluate(() => {
  const ds = [...document.querySelectorAll("details")];
  for (const d of ds) d.open = true;
  return ds.length;
});
if (opened) await page.waitForTimeout(500);

// Optionally open every collapsed disclosure row so the expanded state is
// captured too.
let disclosures = 0;
if (expand) {
  disclosures = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[aria-expanded="false"]')];
    for (const r of rows) r.click();
    return rows.length;
  });
  if (disclosures) await page.waitForTimeout(700);
}

// 1) Scroll pass — trigger every in-view reveal, then come back to the top.
await page.evaluate(async () => {
  const step = Math.round(window.innerHeight * 0.7);
  const H = document.documentElement.scrollHeight;
  for (let y = 0; y <= H; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 220));
  }
  window.scrollTo(0, H);
  await new Promise((r) => setTimeout(r, 300));
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 500));
});
await page.waitForTimeout(600);

// Verify nothing is still hidden, and report it if so.
const hidden = await page.evaluate(() => {
  let n = 0;
  for (const el of document.querySelectorAll("main *")) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.height > 40 && Number(cs.opacity) < 0.05) n++;
  }
  return n;
});

// 2) Re-anchor fixed elements to the document bottom so they don't land mid-image.
await page.addStyleTag({
  content: `
    [data-fullshot-fixed] { position: absolute !important; }
  `
});
const fixedCount = await page.evaluate(() => {
  const H = document.documentElement.scrollHeight;
  let n = 0;
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.height === 0 || r.height > window.innerHeight) continue;
    el.setAttribute("data-fullshot-fixed", "1");
    el.style.setProperty("top", `${H - r.height}px`, "important");
    el.style.setProperty("bottom", "auto", "important");
    el.style.setProperty("left", `${r.left}px`, "important");
    el.style.setProperty("width", `${r.width}px`, "important");
    n++;
  }
  return n;
});
await page.waitForTimeout(400);

const total = await page.evaluate(() => document.documentElement.scrollHeight);
const name = route.replace(/\//g, "_").replace(/^_+/, "") || "root";
const out = `audit/${tag}/${name}-full@${dsf}x.png`;
await page.screenshot({ path: out, fullPage: true });
console.log(
  `${out}  css=${width}x${total}  px=${width * dsf}x${total * dsf}  seed=${seedName}  ` +
    `details=${opened}  disclosures=${disclosures}  fixed=${fixedCount}  stillHidden=${hidden}`
);
await browser.close();
