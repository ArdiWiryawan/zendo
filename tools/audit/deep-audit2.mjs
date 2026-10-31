// Second probe: primary-action position vs nav, alpha-aware contrast, target sizes.
// Run: node tools/audit/deep-audit2.mjs
import { chromium } from "playwright";
import { state } from "./seed-fresh.mjs";

const ROUTES = ["/today", "/focus", "/week", "/timeline", "/journal", "/library", "/notebook", "/packs", "/seasons", "/settings", "/season-end"];
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

const out = {};
for (const path of ROUTES) {
  await page.goto("http://localhost:5173" + path);
  await page.waitForTimeout(1000);
  out[path] = await page.evaluate(() => {
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
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c.a > 0.85) return c;
        n = n.parentElement;
      }
      return parse(getComputedStyle(document.body).backgroundColor) || { r: 8, g: 9, b: 8, a: 1 };
    };
    const blend = (fg, bg) => ({
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a)
    });

    const fails = [];
    for (const el of document.querySelectorAll("main *")) {
      if (!(el instanceof HTMLElement)) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
      if (!own) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const fg = parse(cs.color);
      if (!fg) continue;
      const bg = bgOf(el);
      const eff = fg.a < 1 ? blend(fg, bg) : fg;
      const L1 = lum(eff), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const fs = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const large = fs >= 24 || (fs >= 18.66 && bold);
      const floor = large ? 3 : 4.5;
      if (ratio < floor) fails.push({ ratio: Math.round(ratio * 100) / 100, fs, text: own.slice(0, 40), color: cs.color });
    }

    const nav = document.querySelector("nav");
    const navTop = nav?.getBoundingClientRect().top ?? 0;
    const ctas = [...document.querySelectorAll("main button, main a")].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.height >= 40 && r.width >= 120;
    }).map((b) => {
      const r = b.getBoundingClientRect();
      return { label: (b.textContent || "").trim().slice(0, 32), top: Math.round(r.top), bottom: Math.round(r.bottom) };
    });

    const small = [];
    for (const el of document.querySelectorAll("main button, main a, main input, main textarea, main [role=button]")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < 24 || r.height < 24) small.push({ w: Math.round(r.width), h: Math.round(r.height), label: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30) });
    }
    return { contrastFails: fails.length, worst: fails.slice(0, 8), navTop, ctas, sub24: small.length, sub24sample: small.slice(0, 5) };
  });
}
await browser.close();
console.log(JSON.stringify(out, null, 2));
