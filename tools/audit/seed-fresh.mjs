// Build a realistic active-season Zendo state anchored to *today*, so the
// audit screenshots show live dates (the committed demo-state.json is pinned
// to 2026-09-26 and drifts out of the current week).
//
// Run: node tools/audit/seed-fresh.mjs > tools/audit/fresh-state.json
import { readFileSync } from "node:fs";

const base = JSON.parse(readFileSync("tools/audit/demo-state.json", "utf8"));

const iso = (d) => new Date(d).toISOString();
const day = (d) => d.toISOString().slice(0, 10);

// Anchor on today, noon UTC to dodge timezone edges.
const now = new Date();
const TODAY_D = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
const START = day(new Date(TODAY_D.getTime() - 31 * 86400000));
const END = day(new Date(TODAY_D.getTime() + 58 * 86400000));
const TODAY = day(TODAY_D);
const D = (s) => new Date(s + "T09:00:00.000Z");

const st = structuredClone(base);

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

st.goals = base.goals.map((g) => ({ ...g, createdAt: iso(D(START)), updatedAt: iso(D(TODAY)) }));
st.badHabits = base.badHabits.map((h) => ({ ...h, createdAt: iso(D(START)), updatedAt: iso(D(TODAY)) }));

// 12 days of completed focus sessions ending today.
const sessions = [];
for (let i = 11; i >= 0; i--) {
  const d = new Date(TODAY_D.getTime() - i * 86400000);
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

// Current week (Mon..Sun) containing today.
const dowNow = (TODAY_D.getUTCDay() + 6) % 7; // Mon=0
const weekStart = new Date(TODAY_D.getTime() - dowNow * 86400000);
const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
st.weeklyPlans = [{
  id: "week_audit", seasonId: "s_audit", weekNumber: 5, startDate: day(weekStart), endDate: day(weekEnd),
  mode: "flow", status: "active",
  goalAllocations: [
    { goalId: "g_1", targetCount: 7 }, { goalId: "g_2", targetCount: 5 }, { goalId: "g_3", targetCount: 3 }
  ],
  restDayTarget: 1, createdAt: iso(D(day(weekStart))), updatedAt: iso(D(TODAY))
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
  { id: `dp_${day(new Date(TODAY_D.getTime() - 86400000))}`, seasonId: "s_audit", weeklyPlanId: "week_audit", date: day(new Date(TODAY_D.getTime() - 86400000)), dayType: "goal", goalId: "g_1", mainAction: "Matikan layar jam 22.15", highlight: "Tidur sebelum 11", status: "completed", planningCompleted: true, timeBlocks: [], createdAt: iso(D(day(new Date(TODAY_D.getTime() - 86400000)))), updatedAt: iso(D(day(new Date(TODAY_D.getTime() - 86400000)))) }
];

st.journalEntries = [0, 1, 2, 4].map((back) => {
  const d = new Date(TODAY_D.getTime() - back * 86400000);
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

const ev = [];
for (let i = 11; i >= 0; i--) {
  const d = new Date(TODAY_D.getTime() - i * 86400000);
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
st.purchasedPackIds = [];
st.journalPackSessions = [];
st.notificationReminders = [];

export const state = st;

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed-fresh.mjs")) {
  process.stdout.write(JSON.stringify(st));
}
