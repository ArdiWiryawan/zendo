// Range-slider redesign check: the volume slider on Focus plus the blueprint and
// practice sliders that share the global styling.
// Usage: node tools/audit/range-slider-check.mjs [port]
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const port = process.argv[2] || "5200";
const base = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const today = new Date().toISOString().slice(0, 10);
const protoPlan = (base.dayPlans || [])[0] || {};
const protoGoal = (base.goals || [])[0] || {};
const goal = { ...protoGoal, id: "g_rs", status: "active", title: "Menulis bab pertama", why: "Penulis yang menuntaskan satu bab setiap pagi", keystoneAction: "Tulis 500 kata", obstacleMitigation: "Tulis 2 menit saja", tasks: [] };
const state = {
  ...base,
  dayPlans: [
    ...(base.dayPlans || []).filter((p) => p.date !== today),
    { ...protoPlan, id: "dp_rs", date: today, seasonId: (base.activeSeason || {}).id, dayType: "goal", goalId: goal.id, status: "active", mainAction: "Tulis 500 kata", highlight: "Alur jelas", planningCompleted: true }
  ],
  goals: [...(base.goals || []).filter((g) => g.id !== goal.id), goal]
};

mkdirSync("audit/slider", { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/`);
await page.evaluate((s) => {
  for (const k of Object.keys(localStorage)) localStorage.removeItem(k);
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", "[]");
  localStorage.setItem("learningSessions", "[]");
  localStorage.setItem("timelineEvents", "[]");
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, state);

const measure = (el) =>
  el.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return {
      h: Math.round(box.height),
      w: Math.round(box.width),
      bg: getComputedStyle(node).backgroundColor,
      fill: getComputedStyle(node).getPropertyValue("--range-fill").trim(),
      value: node.value,
      appearance: getComputedStyle(node).appearance
    };
  });

// Chromium does not resolve vendor slider pseudos through
// getComputedStyle(el, "::-webkit-slider-thumb") — it hands back the element's
// own style. The drawn track/thumb is therefore asserted from the stylesheet
// rules themselves, and confirmed visually by the screenshots below.
const rangeRules = await page.evaluate(() => {
  const out = [];
  for (const sheet of document.styleSheets) {
    let list;
    try {
      list = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of list) {
      if (rule.selectorText && rule.selectorText.includes('input[type="range"]')) {
        out.push({ selector: rule.selectorText, css: rule.style.cssText });
      }
    }
  }
  return out;
});
const ruleFor = (needle) => rangeRules.find((r) => r.selector.includes(needle));

const shot = async (locator, path) => {
  try {
    // Element-level capture: Playwright scrolls it into view first, so nothing
    // has to be clipped by hand (manual clips broke on off-screen elements).
    await locator.screenshot({ path });
    return true;
  } catch {
    return false;
  }
};

// --- Focus volume slider ---------------------------------------------------
await page.goto(`http://127.0.0.1:${port}/focus`);
await page.waitForTimeout(1400);
const vol = page.locator('input[type="range"]').first();
const v = await measure(vol);
check("Volume slider keeps a 44px hit target", v.h === 44, JSON.stringify(v));
check("Volume slider box no longer paints a slab", v.bg === "rgba(0, 0, 0, 0)", v.bg);
const webkitTrack = ruleFor("::-webkit-slider-runnable-track");
check(
  "Track rule draws a 6px rounded groove with the fill gradient",
  !!webkitTrack && /height: 6px/.test(webkitTrack.css) && /border-radius: 9999px/.test(webkitTrack.css) && /linear-gradient/.test(webkitTrack.css) && /var\(--range-fill/.test(webkitTrack.css),
  webkitTrack ? webkitTrack.css.slice(0, 160) : "rule missing"
);
const webkitThumb = ruleFor("::-webkit-slider-thumb");
check(
  "Thumb rule draws a 20px accent circle ringed in the surface colour",
  !!webkitThumb && /width: 20px/.test(webkitThumb.css) && /height: 20px/.test(webkitThumb.css) && /border-radius: 9999px/.test(webkitThumb.css) && /--color-accent/.test(webkitThumb.css) && /--color-surface/.test(webkitThumb.css),
  webkitThumb ? webkitThumb.css.slice(0, 200) : "rule missing"
);
const mozSource = readFileSync("src/styles/globals.css", "utf8");
const mozProgress = /input\[type="range"\]::-moz-range-progress/.test(mozSource);
check(
  "Firefox equivalent rules exist",
  mozProgress && /input\[type="range"\]::-moz-range-track/.test(mozSource) && /input\[type="range"\]::-moz-range-thumb/.test(mozSource),
  // Chromium drops `-moz-*` pseudo rules at parse time, so this can only be
  // asserted from the source the browser is served, not from the parsed CSSOM.
  mozProgress ? "moz rules present in globals.css" : "moz rules missing from globals.css"
);
check("Volume fill var follows the value", v.fill === `${v.value}%`, `fill=${v.fill} value=${v.value}`);
const volCard = page.locator('input[type="range"]').first().locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
await shot(volCard, "audit/slider/after-volume-390.png");

// Keyboard still drives it, and the value persists.
await vol.focus();
const before = Number(await vol.inputValue());
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(200);
const after = Number(await vol.inputValue());
check("Arrow key still moves the volume by one step", after === Math.min(100, before + 5), `${before} -> ${after}`);
const stored = await page.evaluate(() => localStorage.getItem("zendo_ambient_volume"));
check("Volume change still persists", stored === String(after / 100), `stored=${stored}`);

// The two extremes, to see the fill and the thumb at their bounds.
await vol.focus();
await page.keyboard.press("Home");
await page.waitForTimeout(250);
const atMin = await measure(vol);
check("Volume 0 draws an empty groove", atMin.fill === "0%" && atMin.value === "0", JSON.stringify({ fill: atMin.fill, value: atMin.value }));
await shot(volCard, "audit/slider/after-volume-390-min.png");
await page.keyboard.press("End");
await page.waitForTimeout(250);
const atMax = await measure(vol);
check("Volume 100 fills the whole groove", atMax.fill === "100%" && atMax.value === "100", JSON.stringify({ fill: atMax.fill, value: atMax.value }));
await shot(volCard, "audit/slider/after-volume-390-max.png");
await page.keyboard.press("Home");
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(200);

// Same slider in a warm theme, to check the thumb ring against the fill.
await page.evaluate(() => {
  localStorage.setItem("monk_mode_theme", "temple_gold");
  document.documentElement.setAttribute("data-theme", "temple_gold");
});
await page.waitForTimeout(300);
await page.evaluate(() => document.documentElement.setAttribute("data-theme", "temple_gold"));
await page.waitForTimeout(200);
await shot(volCard, "audit/slider/after-volume-390-temple_gold.png");

// --- Practice target slider (Today) ---------------------------------------
await page.goto(`http://127.0.0.1:${port}/today`);
await page.waitForTimeout(1400);
// The practices card is a collapsed <details>; its add form is only rendered
// once the section is open.
const practiceSummary = page.locator("summary").filter({ hasText: /latihan/i }).first();
if (await practiceSummary.count()) {
  await practiceSummary.click();
  await page.waitForTimeout(500);
}
const addPractice = page.getByRole("button", { name: /tambah latihan/i }).first();
const hasAdd = await addPractice.count();
let practiceFound = false;
if (hasAdd) {
  await addPractice.click();
  await page.waitForTimeout(400);
  const p = page.locator('input[type="range"]').first();
  practiceFound = (await p.count()) > 0;
  if (practiceFound) {
    const pm = await measure(p);
    check("Practice target slider sets its own fill from the 1–7 value", pm.fill === `${((Number(pm.value) - 1) / 6) * 100}%`, `fill=${pm.fill} value=${pm.value}`);
    await shot(p.locator("xpath=ancestor::label[1]"), "audit/slider/after-practice-390.png");
  }
}
check("Practice target slider found on Today", practiceFound, practiceFound ? "range input rendered" : hasAdd ? "add form did not expose a range input" : "add button missing");

// --- Blueprint frequency slider (modal) ------------------------------------
// The link lives in the Today card's details region, so open it first.
const cardDetails = page.locator('[aria-controls="today-card-details"]').first();
if (await cardDetails.count()) {
  await cardDetails.click();
  await page.waitForTimeout(400);
}
const blueprintBtn = page.getByRole("button", { name: /rencana tujuan/i }).first();
if (await blueprintBtn.count()) {
  await blueprintBtn.click();
  await page.waitForTimeout(700);
  let found = false;
  // The frequency sliders only exist once a goal *type* is chosen, and the type
  // chips live further down this scrolling dialog, so select them if needed.
  const dialogRanges = page.locator('[role="dialog"] input[type="range"]');
  if ((await dialogRanges.count()) === 0) {
    const chips = page.locator('[role="dialog"] button[aria-pressed]');
    const chipCount = await chips.count();
    for (let i = 0; i < chipCount; i += 1) {
      await chips.nth(i).click();
      await page.waitForTimeout(350);
      if ((await dialogRanges.count()) > 0) break;
    }
  }
  found = (await dialogRanges.count()) > 0;
  if (found) {
    // Scope to the dialog: the practice add form behind it is still mounted and
    // would otherwise win the `.first()` match.
    const dialogRange = page.locator('[role="dialog"] input[type="range"]').first();
    const dialogFound = (await dialogRange.count()) > 0;
    if (!dialogFound) {
      console.log("SKIP  Blueprint sliders are behind a later step — not captured");
    } else {
      const bm = await measure(dialogRange);
      check(
        "Blueprint frequency slider sets its own fill from the 1–7 value",
        bm.fill === `${((Number(bm.value) - 1) / 6) * 100}%`,
        `fill=${bm.fill} value=${bm.value} visible=${await dialogRange.isVisible()}`
      );
      await dialogRange.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({ path: "audit/slider/after-blueprint-390.png" });
    }
  } else {
    console.log("SKIP  Blueprint sliders are behind a later step — not captured");
  }
}

check("No console errors during the run", errors.length === 0, errors.join(" | "));
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
