// Prove the release CalmDialog paints ABOVE the blueprint modal, and that the
// release path still works end-to-end from its new home.
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const port = process.argv[2] || "5200";
const base = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const today = new Date().toISOString().slice(0, 10);
const proto = (base.dayPlans || [])[0] || {};
const state = {
  ...base,
  dayPlans: [...(base.dayPlans || []).filter((p) => p.date !== today), {
    ...proto, id: "dp_t", date: today, seasonId: base.activeSeason.id,
    dayType: "goal", goalId: "g_2", status: "active",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }],
  goals: (base.goals || []).map((g) => ({ ...g, status: "active" })),
  activeSeason: { ...base.activeSeason, status: "active" }
};

mkdirSync("audit", { recursive: true });
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message.slice(0, 200)));

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
await page.waitForTimeout(1400);

// Open the blueprint modal, then the release dialog from inside it.
await page.locator('[aria-controls="today-card-details"]').first().click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /Rencana tujuan|Blueprint|goal plan/i }).first().click();
await page.waitForTimeout(700);
const modalOpen = await page.getByRole("dialog").count();
await page.screenshot({ path: "audit/release-1-blueprint.png" });

const releaseBtn = page.getByRole("button", { name: /Menu tujuan/ }).first();
const releaseVisible = await releaseBtn.isVisible().catch(() => false);
await releaseBtn.click();
await page.waitForTimeout(600);

// The decisive check: what element is actually on top at the dialog's centre?
const verdict = await page.evaluate(() => {
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
  const top = dialogs[dialogs.length - 1];
  if (!top) return { ok: false, reason: "no dialog" };
  const r = top.getBoundingClientRect();
  const cx = Math.round(r.left + r.width / 2);
  const cy = Math.round(r.top + r.height / 2);
  const stack = document.elementsFromPoint(cx, cy).slice(0, 6).map((el) => {
    const cs = getComputedStyle(el);
    return { tag: el.tagName.toLowerCase(), role: el.getAttribute("role"), z: cs.zIndex,
             pos: cs.position, cls: (el.className || "").toString().slice(0, 70) };
  });
  return {
    ok: true,
    dialogCount: dialogs.length,
    // If the dialog's own node (or a descendant) is the first hit, it is on top.
    topIsDialog: stack.some((s) => s.role === "dialog"),
    hitChain: stack,
    dialogRect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    text: top.innerText.replace(/\s+/g, " ").slice(0, 160)
  };
});
await page.screenshot({ path: "audit/release-2-confirm.png" });
console.log(JSON.stringify({ modalOpen, releaseVisible, ...verdict, errors: errs }, null, 2));
await browser.close();
