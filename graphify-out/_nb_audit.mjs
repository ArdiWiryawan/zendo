import { chromium } from "playwright";
const state = {
  version: 1,
  userProfile: { id: "u1", name: "Test", onboardingCompleted: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  activeSeason: { id: "s1", name: "Season I", startDate: "2026-01-01", endDate: "2026-12-31", durationDays: 365, status: "active", mode: "planning", goalIds: [], badHabitIds: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  appSettings: { id: "a1", theme: "dark", language: "id", reducedMotion: false, notificationEnabled: false, greyModeGuideCompleted: false, weeklyMode: "planning", defaultFocusDuration: 25, openCount: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  onboarding: {}, goals: [], badHabits: [],
  notebookCategories: [
    { id: "cat_pribadi", name: "Pribadi", icon: "User", isBuiltIn: true, sortOrder: 1 },
    { id: "cat_karier", name: "Karier", icon: "Briefcase", isBuiltIn: true, sortOrder: 2 },
    { id: "cat_keuangan", name: "Keuangan", icon: "Wallet", isBuiltIn: true, sortOrder: 3 },
    { id: "cat_kesehatan", name: "Kesehatan", icon: "Heart", isBuiltIn: true, sortOrder: 4 },
    { id: "cat_hubungan", name: "Hubungan", icon: "Users", isBuiltIn: true, sortOrder: 5 },
    { id: "cat_spiritual", name: "Spiritual", icon: "Sparkles", isBuiltIn: true, sortOrder: 6 },
    { id: "cat_perjalanan", name: "Perjalanan", icon: "Compass", isBuiltIn: true, sortOrder: 7 },
    { id: "cat_kreatif", name: "Kreatif", icon: "Pen", isBuiltIn: true, sortOrder: 8 },
    { id: "cat_lainnya", name: "Lainnya", icon: "MoreHorizontal", isBuiltIn: true, sortOrder: 99 },
  ],
  notebookEntries: [
    { id: "nb1", title: "Refleksi pagi ini", body: "Pagi ini saya merasa tenang.\n- Menulis jurnal\n- Meditasi 10 menit\nBekerja dengan fokus.", categoryId: "cat_pribadi", tags: [], isPinned: true, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-03T10:00:00.000Z" },
    { id: "nb2", title: "Target karier", body: "Selesaikan proyek besar.", categoryId: "cat_karier", tags: [], isPinned: false, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-30T09:00:00.000Z" },
    { id: "nb3", title: "Catatan keuangan", body: "Evaluasi bulanan.", categoryId: "cat_keuangan", tags: [], isPinned: false, createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-20T18:30:00.000Z" },
  ],
  journalPacks: [], journalPackSessions: [], purchasedPackIds: [],
  focusSessions: [], learningSessions: [], timelineEvents: [], timelineDays: [], dayPlans: [],
  energyLogs: [], weeklyReviews: {}, releasedSeasonGoals: [], relapseLogs: [], notificationReminders: [],
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 880 }, deviceScaleFactor: 2 });
await page.addInitScript((s) => {
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
  localStorage.setItem("focusSessions", "[]");
  localStorage.setItem("learningSessions", "[]");
  localStorage.setItem("timelineEvents", "[]");
}, state);
await page.goto("http://localhost:5173/notebook", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.screenshot({ path: "graphify-out/audit_list.png", fullPage: false });
await page.locator("article.nb-sheet").first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: "graphify-out/audit_edit.png" });
// empty state
await page.goto("http://localhost:5173/notebook", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("monk_mode_pwa_state_v1"));
  s.notebookEntries = [];
  localStorage.setItem("monk_mode_pwa_state_v1", JSON.stringify(s));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: "graphify-out/audit_empty.png" });
await browser.close();
console.log("done");
