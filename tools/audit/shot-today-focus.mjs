// Screenshot the Today focus card for TODAY's real date, at mobile width.
// Usage: node tools/audit/shot-today-focus.mjs [port] [variant]
//   variant: goal (default) | done | rest | bare
// Prereq: dev server running on `port` (default 5200).
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const port = process.argv[2] || "5200";
const variant = process.argv[3] || "goal";
const base = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const today = new Date().toISOString().slice(0, 10);

// Clone a REAL plan from the demo state onto today. selectTodayPlan requires
// `plan.seasonId === activeSeason.id`, so the clone must carry the season's id
// (a hand-built plan without it is silently ignored and the screen falls back
// to the "pick a theme" state).
const proto = (base.dayPlans || [])[0] || {};
const plan = {
  ...proto,
  id: "dp_today_audit",
  date: today,
  seasonId: (base.activeSeason || {}).id,
  dayType: variant === "rest" ? "rest" : "goal",
  goalId: variant === "rest" ? undefined : "g_2",
  status: variant === "done" ? "completed" : "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
if (variant === "bare") { delete plan.mainAction; delete plan.highlight; }

const state = {
  ...base,
  dayPlans: [...(base.dayPlans || []).filter((p) => p.date !== today), plan],
  goals: (base.goals || []).map((g) => ({ ...g, status: "active" })),
  activeSeason: {
    ...(base.activeSeason || {}),
    startDate: new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 76 * 86400000).toISOString().slice(0, 10),
    status: "active"
  }
};

mkdirSync("audit", { recursive: true });
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message.slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });

await page.goto(`http://127.0.0.1:${port}/`);
await page.evaluate((s) => {
  for (const k of Object.keys(localStorage)) localStorage.removeItem(k);
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
  localStorage.setItem("learningSessions", "[]");
  localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, state);

await page.goto(`http://127.0.0.1:${port}/today`);
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const card = document.getElementById("today-primary");
  if (!card) return { found: false, body: document.body.innerText.slice(0, 400) };
  const r = card.getBoundingClientRect();
  const details = document.getElementById("today-card-details");
  const controls = Array.from(card.querySelectorAll("button")).map((b) => {
    const br = b.getBoundingClientRect();
    return {
      label: (b.getAttribute("aria-label") || b.innerText || "").replace(/\s+/g, " ").trim().slice(0, 55),
      h: Math.round(br.height)
    };
  });
  return {
    found: true,
    card: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    detailsHidden: details ? details.hasAttribute("hidden") : null,
    controls,
    // Heading outline inside the card, for the semantic-headings check.
    headings: Array.from(card.querySelectorAll("h1,h2,h3,h4")).map((h) => h.tagName + ": " + h.innerText.slice(0, 50)),
    sections: Array.from(card.querySelectorAll("section")).map((s) => s.getAttribute("aria-label")),
    cardText: card.innerText.replace(/\n{2,}/g, "\n").slice(0, 600)
  };
});

console.log(JSON.stringify({ variant, ...info, errors: errs }, null, 2));
// Element crop, not fullPage: the fixed bottom nav paints over the card's lower
// rows in a fullPage capture, which reads as clipping that isn't there.
await page.locator("#today-primary").screenshot({ path: `audit/today-${variant}-card.png` });
await page.screenshot({ path: `audit/today-${variant}-collapsed.png`, fullPage: true });

const toggle = page.locator('[aria-controls="today-card-details"]');
if (await toggle.count()) {
  await toggle.first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `audit/today-${variant}-expanded.png`, fullPage: true });
}
await browser.close();
