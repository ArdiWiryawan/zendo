// Measure the Today focus card geometry at mobile width.
// Usage: node tools/audit/measure-focus-card.mjs [port] [outFile]
// Prereq: dev server running (see package.json "dev"). Default port 5200.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const port = process.argv[2] || "5200";
const outFile = process.argv[3] || "audit/measure.focus-card.json";
const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message.slice(0, 200)));
page.on("console", (m) => {
  if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200));
});

// Prefer the shifted state written by seed-today.mjs; fall back to the raw demo
// state (which only renders the Today card when the demo date is "today").
const statePath = "tools/audit/today-state.json";
const seeded = (() => {
  try { return JSON.parse(readFileSync(statePath, "utf8")); } catch { return state; }
})();

await page.goto(`http://127.0.0.1:${port}/`);
await page.evaluate((s) => {
  for (const k of Object.keys(localStorage)) localStorage.removeItem(k);
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
  localStorage.setItem("learningSessions", "[]");
  localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, seeded);

await page.goto(`http://127.0.0.1:${port}/today`);
await page.waitForTimeout(1200);
if (!/\/today/.test(page.url())) {
  throw new Error(
    `Expected /today but landed on ${page.url()}. Run: node tools/audit/seed-today.mjs ${port}`
  );
}

const measurement = await page.evaluate(() => {
  const round = (n) => Math.round(n * 10) / 10;

  // The focus card is the element that owns the details disclosure.
  const details = document.getElementById("today-card-details");
  let card = details;
  while (card && card.parentElement) {
    card = card.parentElement;
    const cls = card.className || "";
    if (typeof cls === "string" && cls.includes("rounded-monk-lg")) break;
  }

  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height) };
  };

  const regionOf = (root) => {
    if (!root) return [];
    return Array.from(root.children).map((child) => {
      const r = child.getBoundingClientRect();
      const text = (child.textContent || "").replace(/\s+/g, " ").trim().slice(0, 90);
      const cs = getComputedStyle(child);
      return {
        tag: child.tagName.toLowerCase(),
        h: round(r.height),
        w: round(r.width),
        top: round(r.top),
        y: round(r.top + window.scrollY),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        letterSpacing: cs.letterSpacing,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        text,
        childCount: child.children.length
      };
    });
  };

  const cs = card ? getComputedStyle(card) : null;
  const cardRect = rect(card);

  // Find the rows inside the card that actually paint a background/border,
  // i.e. nested "cards within a card".
  const nestedBoxes = card
    ? Array.from(card.querySelectorAll("*"))
        .filter((el) => {
          const s = getComputedStyle(el);
          const hasBorder = s.borderTopWidth !== "0px" || s.borderBottomWidth !== "0px";
          const hasBg = s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent";
          const rounded = parseFloat(s.borderTopLeftRadius) > 0;
          return (hasBorder || (hasBg && rounded)) && el.getBoundingClientRect().height > 8;
        })
        .slice(0, 24)
        .map((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return {
            cls: String(el.className || "").slice(0, 200),
            h: round(r.height),
            borderTop: s.borderTopWidth + " " + s.borderTopColor,
            bg: s.backgroundColor,
            radius: s.borderTopLeftRadius,
            text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70)
          };
        })
    : [];

  return {
    url: location.pathname,
    card: cardRect,
    cardStyle: cs
      ? {
          padding: cs.padding,
          borderRadius: cs.borderTopLeftRadius,
          background: cs.backgroundImage !== "none" ? cs.backgroundImage.slice(0, 160) : cs.backgroundColor,
          border: cs.borderTopWidth + " " + cs.borderTopColor,
          boxShadow: cs.boxShadow === "none" ? null : cs.boxShadow.slice(0, 200)
        }
      : null,
    regions: regionOf(card),
    nestedBoxes,
    detailsOpen: !document.getElementById("today-card-details")?.hasAttribute("hidden"),
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    vh: window.innerHeight
  };
});

// Also capture the expanded measurement for comparison.
await page.evaluate(() => {
  const btn = document.querySelector('[aria-controls="today-card-details"]');
  if (btn) btn.click();
});
await page.waitForTimeout(450);
const expanded = await page.evaluate(() => {
  const details = document.getElementById("today-card-details");
  let card = details;
  while (card && card.parentElement) {
    card = card.parentElement;
    const cls = card.className || "";
    if (typeof cls === "string" && cls.includes("rounded-monk-lg")) break;
  }
  const r = card ? card.getBoundingClientRect() : null;
  return {
    cardHeight: r ? Math.round(r.height * 10) / 10 : null,
    detailsHeight: details ? Math.round(details.getBoundingClientRect().height * 10) / 10 : null
  };
});

await page.screenshot({ path: "audit/focus-card-collapsed.png", fullPage: true });

writeFileSync(outFile, JSON.stringify({ collapsed: measurement, expanded, errors: errs }, null, 2));
console.log(JSON.stringify({ collapsedCard: measurement.card, expanded, errors: errs }, null, 2));

await browser.close();
