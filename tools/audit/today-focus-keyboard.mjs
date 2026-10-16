// Keyboard + reduced-motion probe for the Today Focus card.
// Usage: node tools/audit/today-focus-keyboard.mjs [port]
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const port = process.argv[2] || "5200";
const base = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const today = new Date().toISOString().slice(0, 10);
const protoPlan = (base.dayPlans || [])[0] || {};
const protoGoal = (base.goals || [])[0] || {};
const goal = { ...protoGoal, id: "g_kbd", status: "active", title: "Menulis bab pertama", why: "Penulis yang menuntaskan satu bab setiap pagi", keystoneAction: "Tulis 500 kata", obstacleMitigation: "Tulis 2 menit saja", tasks: [] };
const state = {
  ...base,
  dayPlans: [
    ...(base.dayPlans || []).filter((p) => p.date !== today),
    { ...protoPlan, id: "dp_kbd", date: today, seasonId: (base.activeSeason || {}).id, dayType: "goal", goalId: goal.id, status: "active", mainAction: "Tulis 500 kata", highlight: "Alur jelas", planningCompleted: true }
  ],
  goals: [...(base.goals || []).filter((g) => g.id !== goal.id), goal],
  focusSessions: []
};

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());

// --- keyboard pass ---------------------------------------------------------
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${port}/`);
await page.evaluate((s) => {
  for (const k of Object.keys(localStorage)) localStorage.removeItem(k);
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", "[]");
  localStorage.setItem("learningSessions", "[]");
  localStorage.setItem("timelineEvents", "[]");
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, state);
await page.goto(`http://127.0.0.1:${port}/today`);
await page.waitForTimeout(1300);

// Focus the details toggle the way a keyboard user would reach it.
const toggle = page.locator('[aria-controls="today-card-details"]');
await toggle.focus();
const focusRing = await page.evaluate(() => {
  const el = document.activeElement;
  const s = getComputedStyle(el);
  return { tag: el.tagName, outline: s.outlineWidth, outlineColor: s.outlineColor, boxShadow: s.boxShadow };
});
check("Details toggle shows a focus indicator", parseFloat(focusRing.outline) >= 2, JSON.stringify(focusRing));

await page.keyboard.press("Enter");
await page.waitForTimeout(400);
check("Enter opens the details region", (await page.locator("#today-card-details").getAttribute("hidden")) === null);
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
check("Enter closes it again", (await page.locator("#today-card-details").getAttribute("hidden")) !== null);

// Walk every control inside the card with real Tab presses. Keyboard modality is
// already active from the checks above, so :focus-visible rings do apply.
await page.evaluate(() => {
  document.querySelector("#today-primary button")?.focus();
});
const order = [];
const ringless = [];
for (let i = 0; i < 16; i += 1) {
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    const card = document.getElementById("today-primary");
    const inside = !!(card && el && card.contains(el));
    const s = getComputedStyle(el);
    const outline = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2;
    const ring = s.boxShadow !== "none" && s.boxShadow.includes("rgb");
    return {
      inside,
      label: (el?.getAttribute("aria-label") || el?.innerText || el?.tagName || "").replace(/\s+/g, " ").trim().slice(0, 40),
      indicator: outline || ring,
      outline: s.outlineWidth + " " + s.outlineStyle
    };
  });
  if (!info.inside) break;
  order.push(info.label);
  if (!info.indicator) ringless.push(info.label + " (" + info.outline + ")");
  await page.keyboard.press("Tab");
}
check("Every control on the card is keyboard reachable", order.length >= 5, order.join(" → "));
check("No unnamed control in the tab order", !order.some((l) => l === ""), order.join(" → "));
check("Every reachable control paints a focus indicator", ringless.length === 0, ringless.join(" | "));
await ctx.close();

// --- reduced motion -------------------------------------------------------
const rmCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const rmPage = await rmCtx.newPage();
await rmPage.goto(`http://127.0.0.1:${port}/`);
await rmPage.evaluate((s) => {
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, state);
await rmPage.goto(`http://127.0.0.1:${port}/today`);
await rmPage.waitForTimeout(1200);
const durations = await rmPage.evaluate(() => {
  const card = document.getElementById("today-primary");
  return Array.from(card.querySelectorAll("*"))
    .map((el) => {
      const s = getComputedStyle(el);
      return { d: s.transitionDuration, a: s.animationDuration, cls: String(el.className).slice(0, 30) };
    })
    .filter((x) => (parseFloat(x.d) || 0) > 0.05 || (parseFloat(x.a) || 0) > 0.05)
    .slice(0, 5);
});
check("Reduced motion stops transitions inside the card", durations.length === 0, JSON.stringify(durations));
await rmCtx.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
await browser.close();
process.exit(failed.length === 0 ? 0 : 1);
