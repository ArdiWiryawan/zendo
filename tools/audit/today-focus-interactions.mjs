// Verify every control on the Today Focus card still does its job after the
// redesign: highlight edit, main-action edit, complete/uncomplete, 5-minute
// start, details disclosure — plus persistence into localStorage.
// Usage: node tools/audit/today-focus-interactions.mjs [port]
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const port = process.argv[2] || "5200";
const base = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const today = new Date().toISOString().slice(0, 10);

const protoPlan = (base.dayPlans || [])[0] || {};
const protoGoal = (base.goals || [])[0] || {};
const goal = {
  ...protoGoal,
  id: "g_audit",
  status: "active",
  title: "Menulis bab pertama",
  why: "Penulis yang menuntaskan satu bab setiap pagi",
  keystoneAction: "Tulis 500 kata pada bab pertama",
  obstacleMitigation: "Tulis 2 menit saja, baris pertama",
  desiredOutcome: "Naskah pertama selesai",
  tasks: []
};
const state = {
  ...base,
  dayPlans: [
    ...(base.dayPlans || []).filter((p) => p.date !== today),
    {
      ...protoPlan,
      id: "dp_audit",
      date: today,
      seasonId: (base.activeSeason || {}).id,
      dayType: "goal",
      goalId: goal.id,
      status: "active",
      mainAction: "Tulis 500 kata pada bab pertama",
      highlight: "Bab pertama punya alur jelas",
      planningCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  goals: [...(base.goals || []).filter((g) => g.id !== goal.id), goal],
  focusSessions: [],
  activeSeason: {
    ...(base.activeSeason || {}),
    startDate: new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 76 * 86400000).toISOString().slice(0, 10),
    status: "active"
  }
};

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 200)));
page.on("console", (m) => {
  if (m.type() === "error") errs.push(String(m.text()).slice(0, 200));
});

const reseed = async () => {
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
  await page.waitForTimeout(1200);
};

const storedPlan = () =>
  page.evaluate((d) => {
    const raw = JSON.parse(localStorage.getItem("monk_mode_pwa_state_v1") || "{}");
    return (raw.dayPlans || []).find((p) => p.date === d) || null;
  }, today);

await reseed();

// 1 — highlight edit opens the existing Morning Planning surface.
await page.locator('#today-primary button[aria-label="Ubah: Highlight"]').click();
await page.waitForTimeout(400);
const dialogVisible = await page.locator('[role="dialog"]').first().isVisible().catch(() => false);
check("Highlight 'Ubah' opens Morning Planning dialog", dialogVisible);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// 2 — main action edit form saves through the store.
await page.locator('#today-primary button[aria-label="Ubah: Main Action"]').click();
await page.waitForTimeout(300);
const formOpen = await page.locator("#today-time-input").isVisible();
check("Main Action 'Ubah' opens the edit form", formOpen);
check("Highlight block hides while the form is open", !(await page.locator('#today-primary section[aria-label="Highlight"]').count()));
const actionInput = page.locator('#today-primary input[placeholder]').last();
await actionInput.fill("Tulis 700 kata pada bab kedua");
await page.locator('#today-primary button:has-text("Simpan")').click();
await page.waitForTimeout(500);
let plan = await storedPlan();
check(
  "Saved action persists to storage",
  plan?.mainAction === "Tulis 700 kata pada bab kedua",
  `mainAction="${plan?.mainAction}"`
);
check("Edited action renders on the card", await page.locator('#today-primary p:has-text("Tulis 700 kata pada bab kedua")').first().isVisible());
check("Highlight survives the action edit", plan?.highlight === "Bab pertama punya alur jelas");

// 3 — complete / uncomplete.
const cta = page.locator('#today-primary button[aria-pressed]');
check("Primary CTA exposes aria-pressed", (await cta.getAttribute("aria-pressed")) === "false");
await cta.click();
await page.waitForTimeout(600);
plan = await storedPlan();
check("'Selesaikan' marks the day complete in storage", plan?.status === "completed", `status=${plan?.status}`);
check("CTA reports pressed state", (await cta.getAttribute("aria-pressed")) === "true");
check("Status pill follows the day state", (await page.locator("#today-primary").innerText()).includes("Selesai"));
check("Done note is announced", (await page.locator("#today-primary").innerText()).includes("Hari ini bergerak"));
await cta.click();
await page.waitForTimeout(500);
plan = await storedPlan();
check("Tapping again clears completion", plan?.status === "active", `status=${plan?.status}`);

// 4 — details disclosure.
const details = page.locator("#today-card-details");
check("Details start collapsed", (await details.getAttribute("hidden")) !== null);
const toggle = page.locator('[aria-controls="today-card-details"]');
await toggle.click();
await page.waitForTimeout(400);
check("RINCIAN opens the details region", (await details.getAttribute("hidden")) === null);
check("RINCIAN reports expanded", (await toggle.getAttribute("aria-expanded")) === "true");
const planBRendered = await page.locator("#today-card-details").innerText();
check("Plan B row renders its action text (no raw placeholder)", planBRendered.includes("Tulis 2 menit saja") && !planBRendered.includes("{action}"));
await toggle.click();
await page.waitForTimeout(300);
check("RINCIAN closes the details region", (await details.getAttribute("hidden")) !== null);

// 5 — five-minute quick start navigates into a real session.
await reseed();
await page.locator('#today-primary button:has-text("Coba 5 menit dulu")').click();
await page.waitForTimeout(900);
const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem("focusSessions") || "[]"));
check("5-minute start routes to the focus screen", /\/focus/.test(page.url()), page.url());
check(
  "5-minute start creates a 5-minute running session",
  sessions.length > 0 && sessions[0].plannedDurationMinutes === 5 && sessions[0].status === "running",
  JSON.stringify(sessions[0] ? { d: sessions[0].plannedDurationMinutes, s: sessions[0].status } : null)
);

check("No console errors during the run", errs.length === 0, errs.slice(0, 2).join(" | "));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
await browser.close();
process.exit(failed.length === 0 ? 0 : 1);
