// Screenshot the nav band region of problem screens so the defect can be SEEN.
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const state = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));
const VIEWPORTS = { 375: { width: 375, height: 812 }, 390: { width: 390, height: 844 } };
const SCREENS = { focus: "/focus", week: "/week", learn: "/learn" };

mkdirSync("audit/nav", { recursive: true });
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5173/");
  await page.evaluate((s) => {
    localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
    localStorage.setItem("focusSessions", JSON.stringify(s.focusSessions || []));
    localStorage.setItem("learningSessions", "[]");
    localStorage.setItem("timelineEvents", JSON.stringify(s.timelineEvents || []));
    localStorage.setItem("zendo_pwa_install_dismissed_v1", "1");
  }, state);

  for (const [name, path] of Object.entries(SCREENS)) {
    await page.goto("http://localhost:5173" + path);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `audit/nav/${vpName}-${name}-rest.png` });

    // Where does the blocked element live in the document, and what is it inside?
    const info = await page.evaluate(() => {
      const nav = document.querySelector("nav");
      const navTop = nav ? nav.getBoundingClientRect().top : null;
      const out = [];
      document.querySelectorAll("button, a, textarea, input, select, [role=button]").forEach((el) => {
        if (nav && nav.contains(el)) return;
        const b = el.getBoundingClientRect();
        if (b.height === 0 || b.width === 0) return;
        if (b.top >= navTop && b.top < window.innerHeight) {
          const path = [];
          let n = el;
          for (let i = 0; i < 6 && n; i++) {
            path.push(`${n.tagName.toLowerCase()}${n.className && typeof n.className === "string" ? "." + n.className.split(" ").slice(0, 3).join(".") : ""}`);
            n = n.parentElement;
          }
          out.push({
            label: (el.innerText || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").trim().slice(0, 40),
            docTop: Math.round(b.top + window.scrollY),
            inViewportTop: Math.round(b.top),
            path: path.slice(0, 4)
          });
        }
      });
      return out;
    });
    console.log(`\n${vpName} ${name}`);
    for (const i of info) console.log(`  "${i.label}" docY=${i.docTop} vpY=${i.inViewportTop}\n     ${i.path.join(" < ")}`);
    await page.screenshot({ path: `audit/nav/${vpName}-${name}-scrolled.png`, clip: { x: 0, y: vp.height * 0.55, width: vp.width, height: vp.height * 0.45 } });
  }
  await ctx.close();
}
await browser.close();
