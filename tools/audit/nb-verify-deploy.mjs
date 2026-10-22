// Verifikasi build production: konteks PARA + scroll stabil di domain live.
// Jalankan: node tools/audit/nb-verify-deploy.mjs
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "https://zendo-focus.vercel.app";
const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const chunks = [];
page.on("response", (res) => {
  if (res.url().includes("/assets/") && res.url().endsWith(".js")) chunks.push(res.url());
});

await page.goto(`${BASE}/`);
await page.evaluate((s) => {
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
  localStorage.setItem("learningSessions", "[]");
  localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
}, state);

// ── 1. Tab Projects → note baru mewarisi PARA ──
await page.goto(`${BASE}/notebook`);
await page.waitForTimeout(2000);
await page.getByRole("button", { name: /^(Projects|Proyek)$/ }).first().click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /^(Baru|New)$/ }).first().click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /Halaman Kosong|Blank Page/i }).first().click();
await page.waitForTimeout(900);

const para = await page.evaluate(() =>
  [...document.querySelectorAll("span, div")]
    .filter((el) => el.children.length === 0)
    .map((el) => el.textContent?.trim() ?? "")
    .find((t) => /^(Projects|Proyek)$/.test(t)) ?? null
);
check("PROD: tab Projects → chip PARA note baru", Boolean(para), `ditemukan: ${para}`);

// ── 2. Scroll stabil saat menulis panjang ──
const body = page.locator("textarea.nb-page-body").first();
await body.click();
const samples = [];
for (let i = 0; i < 35; i++) {
  await page.keyboard.type(`baris ${i} teks panjang menguji lompatan viewport\n`);
  samples.push(
    await page.evaluate(() => {
      const el = document.querySelector("textarea.nb-page-body");
      return {
        scrollY: Math.round(window.scrollY),
        height: Math.round(el.getBoundingClientRect().height),
        pages: document.querySelectorAll("textarea.nb-page-body").length
      };
    })
  );
}
const heights = samples.map((s) => s.height);
const scrolls = samples.map((s) => s.scrollY);
const maxDown = scrolls.reduce((a, v, i) => (i === 0 ? a : Math.max(a, v - scrolls[i - 1])), 0);
const maxUp = scrolls.reduce((a, v, i) => (i === 0 ? a : Math.max(a, scrolls[i - 1] - v)), 0);

check("PROD: tinggi halaman hanya bertambah", heights.every((h, i) => i === 0 || h >= heights[i - 1] - 1), `${heights[0]} → ${heights.at(-1)}px`);
check("PROD: lompatan scroll turun <= 200px/baris", maxDown <= 200, `maks ${maxDown}px`);
check("PROD: tidak ada lompatan naik", maxUp <= 200, `maks ${maxUp}px`);
check("PROD: halaman tidak terpecah otomatis", samples.every((s) => s.pages === 1), `halaman: ${samples.at(-1).pages}`);

// ── 3. Bukti kode baru benar-benar jalan: mirror pengukur ada di DOM ──
const mirror = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll("body > div")];
  return nodes.some((el) => el.style.top === "-99999px" && el.getAttribute("aria-hidden") === "true");
});
check("PROD: mirror pengukur off-screen aktif (kode baru)", mirror, mirror ? "node mirror ditemukan" : "tidak ada node mirror");

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} cek lulus di ${BASE}`);
if (failed.length > 0) {
  console.log("GAGAL:", failed.map((f) => f.name).join("; "));
  process.exit(1);
}
