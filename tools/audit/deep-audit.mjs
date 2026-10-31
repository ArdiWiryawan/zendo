// Deep UI audit probe: typography scale, contrast, layout width, nav occlusion.
// Run: node tools/audit/deep-audit.mjs <tag>
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { state } from "./seed-fresh.mjs";

const tag = process.argv[2] || "deep";
const ROUTES = ["/today", "/focus", "/week", "/timeline", "/journal", "/library", "/notebook", "/packs", "/seasons", "/settings", "/season-end"];
const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 }
];

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const report = {};

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5173/");
  await page.evaluate((s) => {
    localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
    localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
    localStorage.setItem("learningSessions", "[]");
    localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
    localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
  }, state);

  report[vp.name] = {};
  for (const path of ROUTES) {
    await page.goto("http://localhost:5173" + path);
    await page.waitForTimeout(900);
    const data = await page.evaluate(() => {
      const main = document.querySelector("main");
      const mainRect = main?.getBoundingClientRect();
      const nav = document.querySelector("nav");
      const navRect = nav?.getBoundingClientRect();

      // text nodes with computed font size
      const sizes = {};
      const tiny = [];
      const els = document.querySelectorAll("main *");
      for (const el of els) {
        if (!(el instanceof HTMLElement)) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const fs = Math.round(parseFloat(cs.fontSize) * 10) / 10;
        sizes[fs] = (sizes[fs] || 0) + 1;
        if (fs < 12) {
          const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
          if (own) tiny.push({ fs, text: own.slice(0, 60), cls: (el.className || "").toString().slice(0, 70) });
        }
      }

      // contrast of every visible text element against its effective background
      const parse = (c) => {
        const m = c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      };
      const lum = ({ r, g, b }) => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const bgOf = (el) => {
        let n = el;
        while (n && n !== document.documentElement) {
          const cs = getComputedStyle(n);
          const c = parse(cs.backgroundColor);
          if (c && c.a > 0.85) return c;
          n = n.parentElement;
        }
        const body = getComputedStyle(document.body).backgroundColor;
        return parse(body) || { r: 8, g: 9, b: 8, a: 1 };
      };
      const low = [];
      for (const el of els) {
        if (!(el instanceof HTMLElement)) continue;
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
        if (!own) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.5) continue;
        const fg = parse(cs.color);
        if (!fg) continue;
        const bg = bgOf(el);
        const L1 = lum(fg), L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const fs = parseFloat(cs.fontSize);
        const bold = parseInt(cs.fontWeight, 10) >= 700;
        const large = fs >= 24 || (fs >= 18.66 && bold);
        const floor = large ? 3 : 4.5;
        if (ratio < floor) low.push({ ratio: Math.round(ratio * 100) / 100, fs, text: own.slice(0, 50), color: cs.color, bg: `rgb(${bg.r} ${bg.g} ${bg.b})` });
      }

      // elements sitting inside the nav band
      let underNav = 0;
      if (navRect) {
        for (const el of document.querySelectorAll("main button, main a, main input, main textarea")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          if (r.bottom > navRect.top && r.top < navRect.bottom) underNav++;
        }
      }

      return {
        columnWidth: mainRect ? Math.round(mainRect.width) : null,
        docHeight: document.documentElement.scrollHeight,
        fontSizeHistogram: sizes,
        tinyCount: tiny.length,
        tinySample: tiny.slice(0, 12),
        lowContrastCount: low.length,
        lowContrastSample: low.slice(0, 10),
        controlsUnderNav: underNav,
        hOverflow: document.documentElement.scrollWidth > window.innerWidth
      };
    });
    report[vp.name][path] = data;
  }
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
