// Verifikasi perilaku notebook: pewarisan konteks PARA/kategori + scroll stabil.
// Jalankan: BASE=http://localhost:5199 node tools/audit/notebook-context-scroll.mjs
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const BASE = process.env.BASE ?? "http://localhost:5199";

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/** Halaman baru dengan state tersuntik, supaya tiap skenario bersih. */
async function freshPage() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept().catch(() => {}));
  await page.goto(`${BASE}/`);
  await page.evaluate((s) => {
    localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
    localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
    localStorage.setItem("learningSessions", "[]");
    localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
  }, state);
  await page.goto(`${BASE}/notebook`);
  await page.waitForTimeout(900);
  return { ctx, page };
}

async function openBlankFrom(page) {
  await page.getByRole("button", { name: /^(Baru|New)$/ }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /Halaman Kosong|Blank Page/i }).first().click();
  await page.waitForTimeout(700);
}

// ── 1. Tab Projects → note baru mewarisi PARA "project" ──
{
  const { ctx, page } = await freshPage();
  await page.getByRole("button", { name: /^(Projects|Proyek)$/ }).first().click();
  await page.waitForTimeout(300);
  await openBlankFrom(page);

  const paraBadge = await page.evaluate(() => {
    const els = [...document.querySelectorAll("span, div")];
    const hit = els.find(
      (el) => el.children.length === 0 && /^(Projects|Proyek)$/.test(el.textContent?.trim() ?? "")
    );
    return hit ? hit.textContent.trim() : null;
  });
  check("tab Projects → chip PARA note baru = Projects/Proyek", Boolean(paraBadge), `ditemukan: ${paraBadge}`);
  await ctx.close();
}

// ── 2. Tab Area → note baru mewarisi PARA "area" (bukan sekadar Projects) ──
{
  const { ctx, page } = await freshPage();
  await page.getByRole("button", { name: /^(Areas|Area)$/ }).first().click();
  await page.waitForTimeout(300);
  await openBlankFrom(page);

  const areaBadge = await page.evaluate(() => {
    const els = [...document.querySelectorAll("span, div")];
    const hit = els.find((el) => el.children.length === 0 && /^Area$/.test(el.textContent?.trim() ?? ""));
    return hit ? hit.textContent.trim() : null;
  });
  check("tab Area → chip PARA note baru = Area", Boolean(areaBadge), `ditemukan: ${areaBadge}`);
  await ctx.close();
}

// ── 3. Tab Arsip → note baru TIDAK berlabel Arsip ──
{
  const { ctx, page } = await freshPage();
  await page.getByRole("button", { name: /^(Archives|Arsip)$/ }).first().click();
  await page.waitForTimeout(300);
  await openBlankFrom(page);

  const labels = await page.evaluate(() =>
    [...document.querySelectorAll("span")]
      .map((el) => el.textContent?.trim() ?? "")
      .filter((t) => /^(Projects|Proyek|Area|Resources|Sumber|Archives|Arsip)$/.test(t))
  );
  check("tab Arsip tidak menandai note baru sebagai arsip", labels.length === 0, `label: ${labels.join(",") || "-"}`);
  await ctx.close();
}

// ── 4. Chip kategori pertama → note baru mewarisi kategori itu ──
{
  const { ctx, page } = await freshPage();
  // State demo memakai kategori buatan user; ambil chip pertama setelah "Semua".
  const catName = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => {
      const t = b.textContent?.trim() ?? "";
      return t && !/^(Semua|All|Baru|New)$/.test(t) && b.querySelector("span.h-1\\.5");
    });
    return btn ? btn.textContent.trim().replace(/\d+$/, "").trim() : null;
  });
  if (!catName) {
    check("chip kategori → kategori note baru", false, "chip kategori tidak ditemukan");
  } else {
    await page.getByRole("button", { name: new RegExp(`^${catName}`) }).first().click();
    await page.waitForTimeout(300);
    await openBlankFrom(page);

    const catBadge = await page.evaluate((expected) => {
      const els = [...document.querySelectorAll("button span")];
      const hit = els.find((el) => el.textContent?.trim() === expected);
      return hit ? hit.textContent.trim() : null;
    }, catName);
    check(`chip ${catName} → kategori note baru = ${catName}`, catBadge === catName, `ditemukan: ${catBadge}`);
  }
  await ctx.close();
}

// ── 5. Scroll stabil saat menulis panjang ──
{
  const { ctx, page } = await freshPage();
  await openBlankFrom(page);

  const body = page.locator("textarea.nb-page-body").first();
  await body.click();

  const samples = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.type(`baris ${i} teks panjang menguji lompatan viewport\n`);
    const snap = await page.evaluate(() => {
      const el = document.querySelector("textarea.nb-page-body");
      const rect = el.getBoundingClientRect();
      return { scrollY: Math.round(window.scrollY), height: Math.round(rect.height) };
    });
    samples.push(snap);
  }

  const heights = samples.map((s) => s.height);
  const scrolls = samples.map((s) => s.scrollY);
  const monotonicHeight = heights.every((h, i) => i === 0 || h >= heights[i - 1] - 1);
  const maxDown = scrolls.reduce((a, v, i) => (i === 0 ? a : Math.max(a, v - scrolls[i - 1])), 0);
  const maxUp = scrolls.reduce((a, v, i) => (i === 0 ? a : Math.max(a, scrolls[i - 1] - v)), 0);

  check("tinggi halaman hanya bertambah", monotonicHeight, `${heights[0]} → ${heights.at(-1)}px`);
  check("tidak ada lompatan scroll turun > 200px", maxDown <= 200, `maks turun ${maxDown}px`);
  check("tidak ada lompatan scroll naik > 200px", maxUp <= 200, `maks naik ${maxUp}px`);

  // Baris terakhir harus terlihat di atas toolbar bawah (160px).
  const caretVisible = await page.evaluate(() => {
    const el = document.querySelector("textarea.nb-page-body");
    const rect = el.getBoundingClientRect();
    return {
      visibleBottom: Math.min(rect.bottom, window.innerHeight),
      limit: window.innerHeight - 160,
      textareaBottom: Math.round(rect.bottom)
    };
  });
  check(
    "caret/akhir teks tetap di zona aman atas toolbar",
    caretVisible.textareaBottom <= caretVisible.limit + 40,
    `bottom ${caretVisible.textareaBottom}px, batas ${caretVisible.limit}px`
  );
  await ctx.close();
}

// ── 6. Note lama tanpa PARA tidak mendapat label PARA saat dibuka ──
{
  const { ctx, page } = await freshPage();
  // Tab "Semua" memuat note demo yang tidak punya paraType.
  const cards = page.locator("article");
  const count = await cards.count();
  if (count > 0) {
    await cards.first().click();
    await page.waitForTimeout(800);
    const editBtn = page.getByRole("button", { name: /^(Edit|Ubah)$/ }).first();
    if (await editBtn.count()) {
      await editBtn.click();
      await page.waitForTimeout(700);
    }
    const paraLabels = await page.evaluate(() =>
      [...document.querySelectorAll("span")]
        .map((el) => el.textContent?.trim() ?? "")
        .filter((t) => /^(Projects|Proyek|Area|Resources|Sumber|Archives|Arsip)$/.test(t))
    );
    check("note lama tanpa PARA tetap tanpa label PARA", paraLabels.length === 0, `label: ${paraLabels.join(",") || "-"}`);
  } else {
    check("note lama tanpa PARA tetap tanpa label PARA", false, "tidak ada note untuk diuji");
  }
  await ctx.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} cek lulus`);
if (failed.length > 0) {
  console.log("GAGAL:", failed.map((f) => f.name).join("; "));
  process.exit(1);
}
