// Capture + measure the Today Focus card across states, widths and themes.
// Usage: node tools/audit/today-focus-redesign.mjs [port] [outDir]
//   outDir defaults to "audit/after"; use "audit/before" for a baseline run.
// Writes <outDir>/<variant>-<width>[-theme].png plus <outDir>/report.json.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const port = process.argv[2] || "5200";
const outDir = process.argv[3] || "audit/after";
const base = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const today = new Date().toISOString().slice(0, 10);
const seasonId = (base.activeSeason || {}).id;

mkdirSync(outDir, { recursive: true });

const protoPlan = (base.dayPlans || [])[0] || {};
const protoGoal = (base.goals || [])[0] || {};

function stateFor(variant) {
  const long = variant === "long";
  const goal = {
    ...protoGoal,
    id: "g_audit",
    status: "active",
    title: long
      ? "Menyelesaikan bab pertama yang menjelaskan seluruh sistem, tanpa kehilangan detail penting di dalamnya"
      : "Menulis bab pertama",
    why: long
      ? "Penulis yang menyelesaikan satu bab setiap pagi, bukan penulis yang menunggu suasana sempurna datang"
      : "Penulis yang menuntaskan satu bab setiap pagi",
    keystoneAction: "Tulis 500 kata pada bab pertama",
    obstacleMitigation: "Tulis 2 menit saja, baris pertama",
    desiredOutcome: long
      ? "Naskah pertama selesai sebelum musim berakhir sehingga bisa dibaca ulang dan diperbaiki"
      : "Naskah pertama selesai",
    tasks: []
  };
  const plan = {
    ...protoPlan,
    id: "dp_audit",
    date: today,
    seasonId,
    dayType: variant === "rest" ? "rest" : "goal",
    goalId: variant === "rest" ? undefined : goal.id,
    status: variant === "done" ? "completed" : "active",
    mainAction: "",
    highlight: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (variant === "rest") {
    plan.highlight = "Jalan pagi tanpa tujuan";
    delete plan.mainAction;
  }
  if (["start", "done", "long", "editing", "expanded"].includes(variant)) {
    plan.mainAction = long
      ? "Menyusun kerangka argumen utama, menuliskan kutipan pendukung, lalu merapikan transisi antar paragraf"
      : "Tulis 500 kata pada bab pertama";
    plan.highlight = long
      ? "Bab pertama punya alur yang jelas dari pembukaan sampai penutup sehingga pembaca mengerti arahnya"
      : "Bab pertama punya alur jelas";
  }
  return {
    ...base,
    dayPlans: [...(base.dayPlans || []).filter((p) => p.date !== today), plan],
    goals: [...(base.goals || []).filter((g) => g.id !== goal.id), goal],
    activeSeason: {
      ...(base.activeSeason || {}),
      startDate: new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 76 * 86400000).toISOString().slice(0, 10),
      status: "active"
    },
    focusSessions: variant === "done" || variant === "start" ? [] : base.focusSessions || []
  };
}

const MEASURE = () => {
  const round = (n) => Math.round(n * 10) / 10;
  const card = document.getElementById("today-primary");
  if (!card) return { found: false, body: document.body.innerText.slice(0, 300) };
  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const bg = parse(getComputedStyle(card).backgroundColor).slice(0, 3);
  const contrast = (el) => {
    if (!el) return null;
    const own = parse(getComputedStyle(el).backgroundColor);
    // A painted element (the gold CTA) is read against its own fill; a bare text
    // node sits on the card's surface.
    const backdrop = own.length >= 3 && (own[3] === undefined || own[3] > 0) ? own.slice(0, 3) : bg;
    const fg = parse(getComputedStyle(el).color).slice(0, 3);
    const a = lum(fg);
    const c = lum(backdrop);
    const ratio = (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05);
    return Math.round(ratio * 100) / 100;
  };
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { h: round(r.height), w: round(r.width), top: round(r.top), y: round(r.top + window.scrollY) };
  };
  const style = (el) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      size: s.fontSize,
      weight: s.fontWeight,
      color: s.color,
      tracking: s.letterSpacing,
      lineHeight: s.lineHeight,
      transform: s.textTransform
    };
  };
  const byText = (needle) => {
    const walk = (node) => {
      for (const el of node.querySelectorAll("*")) {
        if (el.children.length === 0 && (el.textContent || "").trim().startsWith(needle)) return el;
      }
      return null;
    };
    return walk(card);
  };
  const h2 = card.querySelector("h2");
  const identity = Array.from(card.querySelectorAll("p")).find((p) =>
    (p.textContent || "").startsWith("Menjadi:")
  );
  const highlightLabel = byText("Highlight") || byText("HIGHLIGHT");
  const actionLabel = byText("Main Action") || byText("MAIN ACTION");
  const actionText = card.querySelector("p.text-lg");
  const buttons = Array.from(card.querySelectorAll("button")).map((b) => {
    const r = b.getBoundingClientRect();
    const s = getComputedStyle(b);
    return {
      label: (b.getAttribute("aria-label") || b.innerText || "").replace(/\s+/g, " ").trim().slice(0, 48),
      h: round(r.height),
      w: round(r.width),
      bg: s.backgroundColor,
      color: s.color,
      border: s.borderTopWidth + " " + s.borderTopColor
    };
  });
  const cta = card.querySelector("button[aria-pressed]");
  const quick = Array.from(card.querySelectorAll("button")).find((b) =>
    /Coba 5 menit|Try 5 minutes/.test(b.innerText)
  );
  const ubah = buttons.find((b) => /^Ubah/.test(b.label));
  const rincian = buttons.find((b) => /Rincian/i.test(b.label));
  const closingLine = Array.from(card.querySelectorAll("span")).find((s) =>
    /Tetap di satu hal\.|Jaga pemulihan\./.test(s.textContent || "")
  );
  // Keyboard: every control the card exposes must be reachable and named.
  const reachable = Array.from(card.querySelectorAll("button, a[href], input, select, textarea")).filter(
    (el) => el.tabIndex >= 0 && !el.closest("[hidden]") && el.getBoundingClientRect().height > 0
  );
  const unnamed = reachable
    .filter((el) => !(el.getAttribute("aria-label") || el.innerText.trim()))
    .map((el) => el.tagName);
  return {
    found: true,
    cardBg: getComputedStyle(card).backgroundColor,
    card: { ...box(card), text: card.innerText.replace(/\n{2,}/g, "\n").slice(0, 700) },
    h2: { ...box(h2), ...style(h2), contrast: contrast(h2), text: (h2?.textContent || "").slice(0, 70) },
    identity: { ...box(identity), ...style(identity), contrast: contrast(identity) },
    highlightLabel: { ...box(highlightLabel), ...style(highlightLabel), contrast: contrast(highlightLabel) },
    highlightText: (() => {
      const el = card.querySelector("section p.mt-1") || byText("Bab pertama");
      return { ...style(el), contrast: contrast(el) };
    })(),
    actionLabel: { ...box(actionLabel), ...style(actionLabel), contrast: contrast(actionLabel) },
    actionText: { ...box(actionText), ...style(actionText), contrast: contrast(actionText) },
    cta: cta
      ? {
          label: (cta.innerText || "").replace(/\s+/g, " ").trim(),
          h: round(cta.getBoundingClientRect().height),
          bg: getComputedStyle(cta).backgroundColor,
          color: getComputedStyle(cta).color,
          contrast: contrast(cta)
        }
      : undefined,
    quick: quick
      ? {
          label: (quick.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40),
          h: round(quick.getBoundingClientRect().height),
          border: getComputedStyle(quick).borderTopWidth,
          contrast: contrast(quick.firstElementChild || quick)
        }
      : undefined,
    ubah,
    rincian,
    closingLineContrast: contrast(closingLine),
    buttons,
    a11y: { focusable: reachable.length, unnamed: unnamed.length },
    details: {
      hidden: document.getElementById("today-card-details")?.hasAttribute("hidden") ?? null,
      h: round(document.getElementById("today-card-details")?.getBoundingClientRect().height ?? 0),
      open: document.querySelector('[aria-controls="today-card-details"]')?.getAttribute("aria-expanded")
    },
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    cardOverflow: card.scrollWidth > card.clientWidth + 1,
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
    theme: document.documentElement.getAttribute("data-theme") || "dark"
  };
};

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const report = [];

for (const width of [360, 390, 768]) {
  for (const variant of ["start", "empty", "long", "done", "rest", "editing", "expanded"]) {
    const themes =
      width === 390 && variant === "start"
        ? ["dark", "sumi_ink", "kyoto_moss", "wabi_sabi", "kurogane", "temple_gold"]
        : ["dark"];
    for (const theme of themes) {
      const state = stateFor(variant);
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 160)));
      page.on("console", (m) => {
        if (m.type() === "error") errs.push(String(m.text()).slice(0, 160));
      });
      await page.goto(`http://127.0.0.1:${port}/`);
      await page.evaluate(
        ({ s, t }) => {
          for (const k of Object.keys(localStorage)) localStorage.removeItem(k);
          localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
          localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
          localStorage.setItem("learningSessions", "[]");
          localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
          localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
          if (t !== "dark") localStorage.setItem("monk_mode_theme", t);
        },
        { s: state, t: theme }
      );
      await page.goto(`http://127.0.0.1:${port}/today`);
      await page.waitForTimeout(1200);
      if (theme !== "dark") {
        // Applied twice with a beat in between: the app's own theme effect can
        // re-assert the stored theme while the screen is still settling.
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await page.waitForTimeout(300);
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await page.waitForTimeout(150);
      }
      if (variant === "editing" || variant === "expanded") {
        const target =
          variant === "editing"
            ? page.locator('#today-primary button[aria-label$="Main Action"]').first()
            : page.locator('[aria-controls="today-card-details"]').first();
        if (await target.count()) {
          await target.click();
          await page.waitForTimeout(350);
        }
      }
      const info = await page.evaluate(MEASURE);
      const name = `${variant}-${width}${theme === "dark" ? "" : "-" + theme}`;
      await page.locator("#today-primary").screenshot({ path: `${outDir}/${name}.png` });
      report.push({ variant, width, theme, ...info, errors: errs });
      await ctx.close();
      console.log(`captured ${name}: cardH=${info.card?.h ?? "-"} overflow=${info.overflow} errs=${errs.length}`);
    }
  }
}

writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
