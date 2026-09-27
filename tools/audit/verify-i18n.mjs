// Verify no raw i18n keys render, and the previously-hardcoded English is gone.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());

const CASES = [
  { name: "today-id", path: "/today", lang: "id" },
  { name: "today-en", path: "/today", lang: "en" },
  { name: "onboarding-id", path: "/onboarding", lang: "id" }
];

for (const c of CASES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5173/");
  await page.evaluate(({ s, lang }) => {
    const st = JSON.parse(JSON.stringify(s));
    st.appSettings = { ...st.appSettings, language: lang };
    localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(st));
    localStorage.setItem("focusSessions", JSON.stringify(st.focusSessions || []));
    localStorage.setItem("learningSessions", "[]");
    localStorage.setItem("timelineEvents", JSON.stringify(st.timelineEvents || []));
    localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
  }, { s: state, lang: c.lang });
  await page.goto("http://localhost:5173" + c.path);
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const text = document.body.innerText;
    // a raw unresolved key looks like  word.word.word  on its own
    const rawKeys = (text.match(/\b[a-z][a-zA-Z]{2,}\.[a-zA-Z]{2,}\.[a-zA-Z]{2,}\b/g) || []);
    const banned = [
      "Plan Tomorrow", "Decide your focus theme", "How full is the tank",
      "Choose your practical defenses", "Brain dump first", "One specific, repeatable action",
      "Quiet recovery"
    ].filter((s) => text.includes(s));
    return { rawKeys: [...new Set(rawKeys)], banned, sample: text.slice(0, 260) };
  });
  console.log(`\n=== ${c.name} (${c.path}, lang=${c.lang}) ===`);
  console.log("raw unresolved keys:", r.rawKeys.length ? r.rawKeys : "none");
  console.log("banned English still visible:", r.banned.length ? r.banned : "none");
  console.log("text sample:", JSON.stringify(r.sample.slice(0, 150)));
  await ctx.close();
}
await browser.close();
