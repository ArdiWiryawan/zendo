// Seed a realistic active-season state for UI/UX audit screenshots.
// Run: node tools/audit/seed-demo.mjs   (idempotent, regenerates from fixed dates)
import { readFileSync, writeFileSync } from "node:fs";

const file = "tools/audit/demo-state.json";
const st = JSON.parse(readFileSync(file, "utf8"));

const iso = (d) => new Date(d).toISOString();
const day = (d) => d.toISOString().slice(0, 10);
const D = (s) => new Date(s + "T09:00:00.000Z");

const TODAY = "2026-09-26";
const START = "2026-09-15";
const END = "2026-12-13";

st.userProfile = { ...st.userProfile, name: "Ardi", onboardingCompleted: true, activeSeasonId: "s_audit", updatedAt: iso(D(TODAY)) };
st.appSettings = { ...st.appSettings, theme: "light", language: "id", defaultFocusDuration: 25, weeklyMode: "flow", openCount: 150 };

st.activeSeason = {
  id: "s_audit", name: "Season Ketiga", startDate: START, endDate: END, durationDays: 90,
  status: "active", mode: "flow", goalIds: ["g_1", "g_2", "g_3"], badHabitIds: ["h_1", "h_2"],
  why: {
    identity: "Aku orang yang menepati janji ke diri sendiri.",
    consequenceOfInaction: "Kalau aku berhenti lagi, aku makin susah percaya sama komitmenku sendiri.",
    protectValues: ["Kesehatan", "Fokus", "Keluarga"],
    why: "Aku pengin jadi orang yang bisa diandalkan — dimulai dari diri sendiri.",
    desiredOutcome: "Bangun pagi terasa ringan, kerja selesai tanpa lembur.",
    antiWhy: "Kalau terus menunda, badan makin lelah dan kerjaan makin menumpuk."
  },
  createdAt: iso(D(START)), updatedAt: iso(D(TODAY))
};

st.goals = [
  { id: "g_1", seasonId: "s_audit", title: "Tidur sebelum jam 11", description: "Biologis dulu, baru produktivitas.", keystoneAction: "Matikan layar jam 22.15", why: "Badan pulih, pikiran jernih.", whenWhere: "Setiap hari 22.15 di meja kerja", definitionOfDone: "14 hari berturut-turut tidur sebelum jam 11", obstacle: "Masih kepikiran kerjaan", obstacleMitigation: "Kalau masih kepikiran kerjaan, aku tulis besok 3 menit lalu tutup laptop.", priority: 1, weeklyTargetCount: 7, status: "active", createdAt: iso(D(START)), updatedAt: iso(D(TODAY)) },
  { id: "g_2", seasonId: "s_audit", title: "Nulis 500 kata tiap hari kerja", description: "Konsisten dulu, kualitas nyusul.", keystoneAction: "Buka draft sebelum buka email", why: "Menulis bikin berpikir lebih rapi.", whenWhere: "Senin-Jumat 08.30 di meja", definitionOfDone: "20 hari menulis", priority: 2, weeklyTargetCount: 5, status: "active", createdAt: iso(D(START)), updatedAt: iso(D(TODAY)) },
  { id: "g_3", seasonId: "s_audit", title: "Olahraga 3x seminggu", keystoneAction: "Sepatu disiapkan malam", priority: 3, weeklyTargetCount: 3, status: "active", createdAt: iso(D(START)), updatedAt: iso(D(TODAY)) }
];

st.badHabits = [
  { id: "h_1", seasonId: "s_audit", name: "Scrolling sebelum tidur", category: "phone", keystoneAction: "HP di luar kamar", completed: false, createdAt: iso(D(START)), updatedAt: iso(D(TODAY)) },
  { id: "h_2", seasonId: "s_audit", name: "Ngopi larut", category: "other", customName: "Ngopi larut", keystoneAction: "Kopi terakhir jam 15", completed: false, createdAt: iso(D(START)), updatedAt: iso(D(TODAY)) }
];

// 12 days of completed focus sessions
const sessions = [];
for (let i = 11; i >= 0; i--) {
  const d = new Date(Date.UTC(2026, 8, 26 - i));
  const dow = d.getUTCDay();
  const n = dow === 0 ? 1 : dow === 6 ? 2 : 3;
  for (let k = 0; k < n; k++) {
    const goalId = k === 0 ? "g_1" : k === 1 ? "g_2" : "g_3";
    const mins = k === 0 ? 50 : k === 1 ? 25 : 15;
    const start = new Date(d); start.setUTCHours(2 + k * 3, 10, 0, 0);
    const end = new Date(start.getTime() + mins * 60000);
    const phases = [];
    let acc = new Date(start);
    for (let p = 0; p < mins; p += 25) {
      const len = Math.min(25, mins - p);
      phases.push({ type: "focus", label: `Blok ${p / 25 + 1}`, plannedMinutes: len, startedAt: acc.toISOString(), endedAt: new Date(acc.getTime() + len * 60000).toISOString(), completed: true });
      acc = new Date(acc.getTime() + len * 60000);
    }
    const blocks = Math.ceil(mins / 25);
    sessions.push({
      id: `fs_${day(d)}_${k}`, seasonId: "s_audit", weeklyPlanId: "week_audit", dayPlanId: `dp_${day(d)}`, goalId,
      startTime: start.toISOString(), endTime: end.toISOString(), durationMinutes: mins, status: "completed",
      createdAt: start.toISOString(), updatedAt: end.toISOString(),
      startedAt: start.toISOString(), endedAt: end.toISOString(), completedAt: end.toISOString(),
      plannedDurationMinutes: mins, actualDurationSeconds: mins * 60, totalDurationSeconds: mins * 60,
      focusDurationSeconds: mins * 60, breakDurationSeconds: 0, segmentsCompleted: blocks,
      expectedTotalDurationSeconds: mins * 60, expectedFocusDurationSeconds: mins * 60,
      expectedBreakDurationSeconds: 0, expectedSegmentsCompleted: blocks,
      preset: mins === 25 ? "pomodoro" : mins === 50 ? "deep_work" : "custom", timerMode: mins === 25 ? "pomodoro" : "custom",
      completedDurationMinutes: mins, focusDurationMinutes: mins, breakDurationMinutes: 0,
      completedFocusBlocks: blocks, completedBreakBlocks: 0, totalFocusBlocks: blocks, totalBreakBlocks: 0,
      elapsedSeconds: mins * 60, timerState: "work", currentPhaseIndex: phases.length - 1, phases
    });
  }
}
st.focusSessions = sessions;

st.weeklyPlans = [{
  id: "week_audit", seasonId: "s_audit", weekNumber: 2, startDate: "2026-09-21", endDate: "2026-09-27",
  mode: "flow", status: "active",
  goalAllocations: [
    { goalId: "g_1", targetCount: 7 }, { goalId: "g_2", targetCount: 5 }, { goalId: "g_3", targetCount: 3 }
  ],
  restDayTarget: 1, createdAt: iso(D("2026-09-21")), updatedAt: iso(D(TODAY))
}];

const tb = [
  { id: "tb_1", startTime: "07:00", endTime: "08:00", title: "Bangun + jalan pagi", category: "personal", completed: true },
  { id: "tb_2", startTime: "08:30", endTime: "10:00", title: "Deep work: draft tulisan", category: "deep_work", goalId: "g_2", completed: true },
  { id: "tb_3", startTime: "10:15", endTime: "11:15", title: "Email + admin", category: "shallow", completed: false },
  { id: "tb_4", startTime: "13:00", endTime: "14:30", title: "Deep work: review data", category: "deep_work", goalId: "g_1", completed: false },
  { id: "tb_5", startTime: "16:00", endTime: "17:00", title: "Olahraga", category: "personal", goalId: "g_3", completed: false },
  { id: "tb_6", startTime: "21:00", endTime: "22:00", title: "Baca + jurnal", category: "rest", completed: false }
];

st.dayPlans = [
  { id: `dp_${TODAY}`, seasonId: "s_audit", weeklyPlanId: "week_audit", date: TODAY, dayType: "goal", goalId: "g_2", mainAction: "Tulis 500 kata bab 2", highlight: "Draft bab 2 selesai", energyLevel: "medium", status: "active", planningCompleted: true, timeBlocks: tb, createdAt: iso(D(TODAY)), updatedAt: iso(D(TODAY)) },
  { id: "dp_2026-09-25", seasonId: "s_audit", weeklyPlanId: "week_audit", date: "2026-09-25", dayType: "goal", goalId: "g_1", mainAction: "Matikan layar jam 22.15", highlight: "Tidur sebelum 11", status: "completed", planningCompleted: true, timeBlocks: [], createdAt: iso(D("2026-09-25")), updatedAt: iso(D("2026-09-25")) }
];

st.journalEntries = [0, 1, 2, 4].map((back) => {
  const d = new Date(Date.UTC(2026, 8, 26 - back));
  return {
    id: `je_${day(d)}`, seasonId: "s_audit", weeklyPlanId: "week_audit", dayPlanId: `dp_${day(d)}`, date: day(d),
    answers: {
      wins: "Fokus 50 menit tanpa buka HP.",
      friction: back === 2 ? "Kurang tidur bikin sesi pagi berat." : "Notifikasi kerjaan nyempil.",
      tomorrow: "Mulai blok 25 menit pertama sebelum buka chat."
    },
    mood: back === 0 ? "clear" : back === 1 ? "calm" : "tired",
    createdAt: iso(new Date(d.getTime() + 12 * 3600000)), updatedAt: iso(new Date(d.getTime() + 12 * 3600000))
  };
});

st.notebookCategories = [
  { id: "nc_1", name: "Ide Produk", icon: "💡", isBuiltIn: false, sortOrder: 1 },
  { id: "nc_2", name: "Buku & Artikel", icon: "📚", isBuiltIn: false, sortOrder: 2 },
  { id: "nc_3", name: "Refleksi", icon: "🪷", isBuiltIn: false, sortOrder: 3 }
];
st.notebookEntries = [
  { id: "nb_1", categoryId: "nc_1", title: "Ide: sesi fokus tanpa HP", body: "Coba mode 'HP di luar kamar' — hitung berapa sesi yang bertahan tanpa gangguan.", tags: ["fokus", "eksperimen"], isPinned: true, takeaway: "Ukur gangguan, bukan cuma durasi.", createdAt: iso(D("2026-09-20")), updatedAt: iso(D("2026-09-25")) },
  { id: "nb_2", categoryId: "nc_2", title: "Deep Work — bab 3", body: "Shallow work itu menular. Jadwalkan blok, jangan tunggu mood.", tags: ["buku"], isPinned: false, createdAt: iso(D("2026-09-22")), updatedAt: iso(D("2026-09-22")) },
  { id: "nb_3", categoryId: "nc_3", title: "Kenapa minggu ini terasa berat", body: "Bukan kurang niat — kurang tidur. Perbaiki hulu, bukan hilir.", tags: ["refleksi"], isPinned: false, createdAt: iso(D("2026-09-24")), updatedAt: iso(D("2026-09-24")) }
];

const ev = [];
for (let i = 11; i >= 0; i--) {
  const d = new Date(Date.UTC(2026, 8, 26 - i));
  const n = d.getUTCDay() === 0 ? 1 : 2;
  for (let k = 0; k < n; k++) {
    ev.push({
      id: `ev_${day(d)}_${k}`, seasonId: "s_audit",
      type: k === 0 ? "focus_session" : "journal_entry",
      sourceId: k === 0 ? `fs_${day(d)}_0` : `je_${day(d)}`,
      title: k === 0 ? "Sesi fokus selesai" : "Jurnal harian",
      description: k === 0 ? "50 min focus" : "Menutup hari dengan refleksi.",
      occurredAt: iso(new Date(d.getTime() + (9 + k * 4) * 3600000)),
      createdAt: iso(d)
    });
  }
}
st.timelineEvents = ev;
st.timelineDays = [];

st.energyLogs = [];
st.relapseLogs = [];
st.weeklyReviews = [];
st.releasedSeasonGoals = [];
st.pastSeasons = [{
  id: "s_seed", name: "Season Kedua", startDate: "2026-05-01", endDate: "2026-06-29", durationDays: 60,
  status: "archived", mode: "flow", goalIds: [], badHabitIds: [], createdAt: iso(D("2026-05-01")), updatedAt: iso(D("2026-06-29"))
}];
st.purchasedPackIds = [];
st.journalPackSessions = [];
st.notificationReminders = [];

writeFileSync(file, JSON.stringify(st));
console.log("seeded. focusSessions:", sessions.length, "events:", ev.length, "dayPlans:", st.dayPlans.length);
