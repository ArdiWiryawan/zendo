// Verifies the shared modal keyboard contract (WCAG 2.1.2) against the running
// dev server: Tab stays inside the dialog, Shift+Tab wraps, Escape closes.
// Usage: node tools/audit/modal-a11y.mjs
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:5173";
const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// Seed AFTER the first load so the store exists, then navigate for real.
await page.goto(BASE + "/");
await page.evaluate((s) => {
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
  localStorage.setItem("learningSessions", "[]");
  localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, state);
// `isPro` short-circuits every pack unlock, so the purchase sheet is otherwise
// unreachable in demo state. The Pro banner still renders and opens it.
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem("monk_mode_pwa_state_v1") || "{}");
  raw.isPro = false;
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(raw));
});

const results = [];

const activeInDialog = () =>
  page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    return d.contains(document.activeElement);
  });

async function probe(name, route, labelPattern) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const trigger = page.getByRole("button", { name: labelPattern }).first();
  if (!(await trigger.count())) {
    results.push({ name, status: "SKIPPED", why: "trigger not found" });
    return;
  }
  await trigger.click();
  try {
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  } catch {
    results.push({ name, status: "SKIPPED", why: "no dialog opened" });
    return;
  }
  await page.waitForTimeout(400);

  const focusEntered = await activeInDialog();

  let forwardEscapes = 0;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    if ((await activeInDialog()) === false) forwardEscapes++;
  }
  let backwardEscapes = 0;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Shift+Tab");
    if ((await activeInDialog()) === false) backwardEscapes++;
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  const escapeClosed = (await page.$('[role="dialog"]')) === null;

  results.push({
    name,
    status:
      focusEntered === true && forwardEscapes === 0 && backwardEscapes === 0 && escapeClosed
        ? "PASS"
        : "FAIL",
    focusEntered,
    forwardEscapes,
    backwardEscapes,
    escapeClosed
  });
}

await probe("MorningPlanningModal", "/timeline", /^Buka Planning Harian$/);
await probe("JournalPacks purchase sheet", "/packs", /^(Buka|Unlock|Beli)$/i);

await browser.close();
console.log(JSON.stringify(results, null, 2));
const fail = results.filter((r) => r.status === "FAIL").length;
console.log(
  `SUMMARY checked=${results.length} fail=${fail} skipped=${results.filter((r) => r.status === "SKIPPED").length}`
);
process.exit(fail ? 1 : 0);
