// Functional smoke test for the redesigned Settings page: proves the controls
// still mutate + persist state after the layout rewrite.
// Run: node tools/audit/settings-smoke.mjs
import { chromium } from "playwright";
import { state } from "./seed-fresh.mjs";

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
// The notifications toggle awaits Notification.requestPermission() before it
// writes. Headless Chrome has no prompt to answer, so pre-grant it — otherwise
// the await never settles and the toggle looks broken for the wrong reason.
await ctx.grantPermissions(["notifications"], { origin: "http://localhost:5173" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://localhost:5173/");
await page.evaluate((s) => {
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
  localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
  localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
}, state);
await page.goto("http://localhost:5173/settings");
await page.waitForTimeout(1500);

const readState = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("monk_mode_pwa_state_v1") || "{}"));

// 1. Palette picker → theme + data-theme + persistence
await page.getByRole("radio", { name: /Temple Gold/i }).click();
await page.waitForTimeout(500);
const afterTheme = await readState();
const domTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
check("palette sets appSettings.theme", afterTheme.appSettings?.theme === "temple_gold", `theme=${afterTheme.appSettings?.theme}`);
check("palette applies data-theme to <html>", domTheme === "temple_gold", `data-theme=${domTheme}`);
check("active palette is announced", (await page.getByRole("radio", { name: /Temple Gold/i }).getAttribute("aria-checked")) === "true");
check("theme row names the current palette", await page.getByText("Temple Gold", { exact: true }).first().isVisible());


// 2. Language switch → catalog + <html lang> + persistence
await page.getByRole("button", { name: "EN", exact: true }).click();
await page.waitForTimeout(600);
const afterLang = await readState();
const htmlLang = await page.evaluate(() => document.documentElement.lang);
check("language switch persists", afterLang.appSettings?.language === "en", `language=${afterLang.appSettings?.language}`);
check("<html lang> follows the UI language", htmlLang === "en", `lang=${htmlLang}`);
check("copy re-renders in English", await page.getByText("Appearance", { exact: true }).isVisible());

// 2a. The Calendar group was removed on purpose: the agenda already exports the
// real day plan as .ics (MorningPlanningModal / DayTimeBlockVisualizer), so the
// Settings row was a second, weaker export of the same idea. This guards the
// decision against a silent re-introduction.
const icsCopy = await page.getByText("Download a .ics file for Google, Apple, or Outlook.", { exact: true }).count();
const icsButton = await page.getByRole("button", { name: "Download .ics", exact: true }).count();
check("calendar reminder row is gone", icsCopy === 0, `copy matches=${icsCopy}`);
check("no orphaned .ics download button", icsButton === 0, `button matches=${icsButton}`);

// 2b. Progressive disclosure: the whole reminder schedule is one summary row.
// It is left expanded afterwards so the reminder-toggle check below can reach
// the rows it needs.
const schedule = page.getByRole("button", { name: "Reminder schedule", exact: true });
check("schedule starts collapsed", (await schedule.getAttribute("aria-expanded")) === "false");
check("collapsed schedule hides the reminder rows", (await page.getByText("Morning plan", { exact: true }).count()) === 0);
check("schedule row reports Off while the master switch is off", (await schedule.innerText()).includes("Off"), (await schedule.innerText()).replace(/\s+/g, " "));

await schedule.click();
await page.waitForTimeout(500);
check("schedule expands", (await schedule.getAttribute("aria-expanded")) === "true");
check("expanding reveals every reminder", (await page.getByText("Morning plan", { exact: true }).count()) === 1);
check("expanding reveals the seasonal reminders too", (await page.getByText("Season countdown", { exact: true }).count()) === 1);
check("expanding reveals the test/reset actions", await page.getByRole("button", { name: "Test Reminder", exact: true }).isVisible());

// 3. Reminder toggle + time persist
const reminderToggle = page.getByRole("switch", { name: "Morning plan", exact: true });
const before = await reminderToggle.getAttribute("aria-checked");
await reminderToggle.click();
await page.waitForTimeout(400);
const afterToggle = await readState();
const row = (afterToggle.notificationReminders || []).find((r) => r.type === "daily_start");
check(
  "reminder toggle persists",
  row && String(row.enabled) === String(before !== "true"),
  `before=${before} now=${row?.enabled}`
);

// 4. Notification master toggle persists
const notif = page.getByRole("switch", { name: "Notifications", exact: true });
const notifBefore = (await notif.getAttribute("aria-checked")) === "true";
await notif.click();
await page.waitForTimeout(400);
const notifAfter = (await readState()).appSettings?.notificationEnabled;
check("notification toggle persists", notifAfter === !notifBefore, `before=${notifBefore} now=${notifAfter}`);
check("schedule row switches to a count once notifications are on", /\d+ active/.test(await schedule.innerText()), (await schedule.innerText()).replace(/\s+/g, " "));

// 5. JSON export renders the panel
await page.getByRole("button", { name: "Export JSON", exact: true }).click();
await page.waitForTimeout(500);
const panel = await page.locator("textarea").first().inputValue().catch(() => "");
check("JSON export fills the panel", panel.includes('"appSettings"'), `${panel.length} chars`);

// 6. Import confirm dialog opens and cancels cleanly
await page.locator('input[type="file"][aria-label="Choose a Zendo backup file to import"]').setInputFiles({
  name: "backup.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify({ userProfile: { name: "x" }, goals: [] })),
});
await page.waitForTimeout(600);
const dialogOpen = await page.getByRole("dialog").isVisible().catch(() => false);
check("import opens a confirmation dialog", dialogOpen);
await page.locator("button").filter({ hasText: /^Cancel$/ }).first().click();
await page.waitForTimeout(400);

// 7. Support row opens the donation modal (no fake status, real modal)
await page.getByRole("button", { name: "Open support and donation options", exact: true }).click();
await page.waitForTimeout(700);
const supportOpen = await page.getByText(/QRIS/i).first().isVisible().catch(() => false);
check("support row opens the QRIS modal", supportOpen);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// 8. Danger zone still confirms before wiping
await page.getByRole("button", { name: "Wipe all data", exact: true }).click();
await page.waitForTimeout(500);
const wipeDialog = await page.getByText(/Wipe all data\?/i).isVisible().catch(() => false);
check("wipe still requires confirmation", wipeDialog);
await page.locator("button").filter({ hasText: /^Cancel$/ }).first().click();
await page.waitForTimeout(300);
const stillHasData = await page.evaluate(() => !!localStorage.getItem("monk_mode_pwa_state_v1"));
check("cancelling wipe keeps data", stillHasData);

// 9. Navigation rows still route
await page.getByRole("button").filter({ hasText: "How Zendo works" }).first().click();
await page.waitForTimeout(900);
check("guide row routes to /guide", new URL(page.url()).pathname === "/guide", page.url());

check("no console/page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
