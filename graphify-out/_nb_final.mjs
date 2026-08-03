import { chromium } from "playwright";
const state = {
  version: 1,
  userProfile: { id: "u1", name: "T", onboardingCompleted: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  activeSeason: { id: "s1", name: "S", startDate: "2026-01-01", endDate: "2026-12-31", durationDays: 365, status: "active", mode: "planning", goalIds: [], badHabitIds: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  appSettings: { id: "a1", theme: "dark", language: "id", reducedMotion: false, notificationEnabled: false, greyModeGuideCompleted: false, weeklyMode: "planning", defaultFocusDuration: 25, openCount: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  onboarding: {}, goals: [], badHabits: [],
  notebookCategories: [
    { id: "cat_pribadi", name: "Pribadi", icon: "User", isBuiltIn: true, sortOrder: 1 },
    { id: "cat_karier", name: "Karier", icon: "Briefcase", isBuiltIn: true, sortOrder: 2 },
    { id: "cat_lainnya", name: "Lainnya", icon: "MoreHorizontal", isBuiltIn: true, sortOrder: 99 },
  ],
  notebookEntries: [
    { id: "nb1", title: "Refleksi pagi", body: "Pagi ini tenang.\n- Menulis\n- Meditasi", categoryId: "cat_pribadi", tags: [], isPinned: true, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-03T10:00:00.000Z" },
    { id: "nb2", title: "Karier", body: "Selesaikan proyek.", categoryId: "cat_karier", tags: [], isPinned: false, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-30T09:00:00.000Z" },
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
await page.waitForTimeout(900);
await page.screenshot({ path: "graphify-out/final_list.png" });
await page.locator("article.nb-sheet").first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: "graphify-out/final_edit.png" });
await browser.close();
console.log("done");
