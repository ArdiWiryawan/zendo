// Detects elements that VISIBLY escape their frame.
//
// The old QA sweep only checked `documentElement.scrollWidth > innerWidth`.
// That catches document-level horizontal scroll, but misses an element that
// is painted outside the viewport while being anchored (fixed/absolute) so
// the document never grows.
//
// Rules, deliberately strict to avoid false positives:
//   - If ANY ancestor clips on the axis (overflow != visible), the element is
//     contained by design. Horizontal scroll rails and `overflow-hidden`
//     decorative blobs land here and are NOT reported.
//   - Otherwise, a rect outside the viewport is painted outside the frame.
//
// Usage: node tools/audit/frame.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:5173";
const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));

const SCREENS = {
  today: "/today", focus: "/focus", week: "/week", timeline: "/timeline",
  journal: "/journal", learn: "/learn", library: "/library",
  notebook: "/notebook", packs: "/packs", seasons: "/seasons",
  settings: "/settings", "season-end": "/season-end"
};
const VIEWPORTS = {
  375: { width: 375, height: 812 }, 390: { width: 390, height: 844 },
  768: { width: 768, height: 1024 }, 1440: { width: 1440, height: 900 },
  1920: { width: 1920, height: 1080 }
};

const PROBE = () => {
  const vw = window.innerWidth;
  const out = [];

  const label = (el) => {
    const cls = typeof el.className === "string" && el.className
      ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
      : "";
    const txt = (el.textContent || "").trim().slice(0, 36);
    return `${el.tagName.toLowerCase()}${cls}${txt ? ` :: "${txt}"` : ""}`;
  };

  const clipsOnX = (el) => {
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== "visible") return p;
      p = p.parentElement;
    }
    return null;
  };

  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0")
      continue;
    // A transform-animated element mid-flight is not a layout defect.
    if (cs.transform !== "none") {
      const m = new DOMMatrixReadOnly(cs.transform);
      if (Math.abs(m.m41) > 0.5) continue;
    }

    const overRight = r.right - vw;
    const overLeft = -r.left;
    const escape = Math.max(overRight, overLeft);
    if (escape <= 1) continue;

    const clipper = clipsOnX(el);
    if (clipper) continue; // contained by design

    out.push({
      el: label(el),
      box: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(
        r.width
      )}x${Math.round(r.height)}`,
      escape: Math.round(escape),
      side: overRight > overLeft ? "right" : "left",
      pos: cs.position
    });
  }
  return out;
};

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext();
const page = await ctx.newPage();

const findings = [];
for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  await page.setViewportSize(vp);
  await page.goto(`${BASE}/`);
  await page.evaluate((s) => {
    localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
    localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
    localStorage.setItem("learningSessions", "[]");
    localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
    localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
  }, state);

  for (const [name, path] of Object.entries(SCREENS)) {
    await page.goto(BASE + path);
    await page.waitForTimeout(1100);
    const docOver = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    for (const h of await page.evaluate(PROBE)) {
      findings.push({ screen: name, vp: vpName, docOver, ...h });
    }
  }
}
await browser.close();

if (!findings.length) {
  console.log("FRAME: clean. No element paints outside the viewport unclipped.");
  process.exit(0);
}

const seen = new Map();
for (const f of findings) {
  const key = `${f.screen}|${f.el}|${f.box}`;
  if (!seen.has(key)) seen.set(key, { ...f, vps: [f.vp] });
  else seen.get(key).vps.push(f.vp);
}

const rows = [...seen.values()].sort((a, b) => b.escape - a.escape);
console.log(`FRAME ESCAPE REPORT (${rows.length} unique)\n`);
for (const r of rows) {
  console.log(
    `[${r.side} +${r.escape}px] ${r.screen} @${r.vps.join(",")}  pos=${r.pos}  docOverflow=${r.docOver}`
  );
  console.log(`   ${r.el}`);
  console.log(`   box ${r.box}\n`);
}
