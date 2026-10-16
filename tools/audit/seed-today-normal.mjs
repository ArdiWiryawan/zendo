// A "day in progress" variant of the fresh seed: nothing finished today and
// nothing reviewed yet.
//
// Why this exists: seed-fresh.mjs deliberately carries a journal entry for
// *today* (its `[0, 1, 2, 4]` list includes back=0) and three completed focus
// sessions ending today. That is the right seed for testing end-of-day
// surfaces, but it makes the Today screen read like a finished day — completed
// agenda blocks, a written reflection, a lived-in timeline.
//
// This seed keeps everything historical (previous days, the streak, the weekly
// plan) and neutralises only *today*: no focus sessions, no journal entry, no
// ticked time blocks. The day stays "active" — planned, not done.
//
// Run: SEED=today-normal node tools/audit/fullshot.mjs today today-normal 390 2
//
// Exports `state`, matching seed-fresh, so fullshot can pick either by name.
import { state as freshState } from "./seed-fresh.mjs";

// Same anchor seed-fresh uses, so the two agree on what "today" is.
const now = new Date();
const TODAY_D = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
const TODAY = TODAY_D.toISOString().slice(0, 10);
const todayPlanId = `dp_${TODAY}`;

const st = structuredClone(freshState);

// 1. No reflection written today → the close-day section renders its prompt
//    rather than a saved echo.
st.journalEntries = (st.journalEntries || []).filter((e) => e.date !== TODAY);

// 2. No focus session completed today → the day has not been "done" yet.
st.focusSessions = (st.focusSessions || []).filter(
  (s) => s.dayPlanId !== todayPlanId && !String(s.startTime || "").startsWith(TODAY)
);

// 3. Today's agenda is planned but nothing is ticked off.
st.dayPlans = (st.dayPlans || []).map((p) =>
  p.date === TODAY
    ? {
        ...p,
        status: "active",
        timeBlocks: (p.timeBlocks || []).map((b) => ({ ...b, completed: false })),
        updatedAt: new Date().toISOString()
      }
    : p
);

// 4. Drop today's timeline events too, so the timeline agrees with the rest.
st.timelineEvents = (st.timelineEvents || []).filter(
  (e) => !String(e.occurredAt || "").startsWith(TODAY)
);

// 5. The energy check-in is an end-of-day thing; leave it unanswered.
st.energyLogs = [];

// 6. The fresh seed ends a 12-day unbroken run of focus sessions, which makes
//    shouldSuggestRest() fire — it looks for 5 consecutive goal-days before
//    today, and the store backfills dayPlans from focusSessions, so a day with
//    sessions counts as a goal-day even when dayPlans has no entry for it.
//    That "maybe rest today" banner is a conditional nudge, not the ordinary
//    view, so break the run by clearing two of the last five days. Removing the
//    *sessions* is what actually removes the goal-day, hence all three lists.
const GAP_OFFSETS = [3, 5]; // days before today
const gapDates = new Set(
  GAP_OFFSETS.map((back) => new Date(TODAY_D.getTime() - back * 86400000).toISOString().slice(0, 10))
);
st.focusSessions = st.focusSessions.filter((s) => !gapDates.has(String(s.startTime || "").slice(0, 10)));
st.journalEntries = st.journalEntries.filter((e) => !gapDates.has(e.date));
st.timelineEvents = st.timelineEvents.filter((e) => !gapDates.has(String(e.occurredAt || "").slice(0, 10)));

// 7. The demo goals ship partly unclarified (g_2 has no `obstacle`, g_3 has
//    neither `why` nor `obstacle`), and TodayScreen raises the "sharpen your
//    goal blueprint" banner for any active goal missing either field. That is a
//    real onboarding-ish nudge, but it is not the ordinary view of a user who
//    has been running the season for a month — so complete the fields here.
const GOAL_CLARITY = {
  g_2: { why: "Menulis bikin berpikir lebih rapi.", obstacle: "Sering nunggu mood baru mulai." },
  g_3: { why: "Badan kuat bikin kerja nggak gampang capek.", obstacle: "Jadwal pagi sering kepotong." }
};
st.goals = (st.goals || []).map((g) => (GOAL_CLARITY[g.id] ? { ...g, ...GOAL_CLARITY[g.id] } : g));

export const state = st;

// 8. The coach card is the last thing standing in the way of a clean page, and
//    it is not state — it is a first-encounter flag in its own localStorage key
//    (src/lib/coach.ts). The three concept steps (Highlight / Main Action /
//    Agenda) are "shown once, ever", and the four day steps only apply inside
//    the season's first week. Someone 32 days into a season has seen all of
//    them, so a settled account has them dismissed. Set the app's own key
//    rather than hiding the card in the capture.
//
//    Applied by fullshot.mjs when the seed exports it.
export const extraLocalStorage = {
  zendo_coach_v1: JSON.stringify({ pickTheme: true, intention: true, focus: true, close: true, highlight: true, mainAction: true, agenda: true })
};

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed-today-normal.mjs")) {
  process.stdout.write(
    JSON.stringify(
      {
        today: TODAY,
        journalEntriesToday: st.journalEntries.filter((e) => e.date === TODAY).length,
        focusSessionsToday: st.focusSessions.filter((s) => String(s.startTime || "").startsWith(TODAY)).length,
        todayPlanStatus: st.dayPlans.find((p) => p.date === TODAY)?.status,
        todayTimeBlocks: st.dayPlans.find((p) => p.date === TODAY)?.timeBlocks.length,
        tickedBlocks: st.dayPlans.find((p) => p.date === TODAY)?.timeBlocks.filter((b) => b.completed).length
      },
      null,
      2
    )
  );
}
