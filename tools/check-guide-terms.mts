// Guard: runnable as a CI/local check. Compares the guide's concept names and
// the onboarding preview copy against the term each screen actually shows.
// Prints the whole table, then exits 1 when any row is a MISMATCH so a synonym
// drift fails the run instead of scrolling by unnoticed.
import { readFileSync } from "node:fs";

function loadCatalog(lang: string): Record<string, string> {
  const s = readFileSync(`src/i18n/messages/${lang}.ts`, "utf8");
  const out: Record<string, string> = {};
  const re = new RegExp('"([a-zA-Z0-9_.]+)":\\s*"((?:[^"\\\\]|\\\\.)*)"', "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out[m[1]] = m[2];
  return out;
}

const en = loadCatalog("en");
const id = loadCatalog("id");

// Each guide concept must call the thing what the screen the user actually
// visits calls it. A guide that teaches a synonym is worse than no guide.
// The onboarding preview teaches the same concepts, so it is held to the same
// bar. There is no single UI term for the step-4 close-the-day action, so it
// is intentionally not paired here.
const pairs: [string, string][] = [
  ["guide.highlightTitle", "today.highlightLabel"],
  ["guide.mainActionTitle", "planning.mainActionTitle"],
  ["guide.agendaTitle", "today.agendaHeading"],
  ["guide.notebookTitle", "notebook.title"],
  ["guide.morningTitle", "journal.morningLabel"],
  ["guide.practicesTitle", "practice.heading"],
  ["guide.weeklyTitle", "week.review.title"],
  ["guide.timelineTitle", "timeline.title"],
  ["guide.focusTitle", "today.todaysFocus"],
  ["guide.seasonTitle", "settings.season"],
  ["guide.reflectionTitle", "journal.tabReflection"],
  ["guide.focusModesTitle", "planning.catDeep"],
  ["onboarding.preview.step2", "today.highlightLabel"],
  ["onboarding.preview.step3", "planning.mainActionTitle"],
  ["onboarding.preview.step1", "today.agendaHeading"],
];

console.log("concept".padEnd(20), "guide(id)".padEnd(18), "ui(id)".padEnd(18), "guide(en)".padEnd(16), "ui(en)".padEnd(16), "verdict");
let mismatches = 0;
for (const [g, u] of pairs) {
  const gi = id[g] ?? "(missing)";
  const ui = id[u] ?? "(missing)";
  const ge = en[g] ?? "(missing)";
  const ue = en[u] ?? "(missing)";
  // Loose match: the source may qualify the term ("Agenda (Time Blocks)") or
  // wrap it in a sentence ("Pick one Daily Highlight"). Either direction.
  const okId = gi.includes(ui) || ui.includes(gi);
  const okEn = ge.toLowerCase().includes(ue.toLowerCase()) || ue.toLowerCase().includes(ge.toLowerCase());
  const ok = okId && okEn;
  if (!ok) mismatches += 1;
  console.log(g.replace(/^guide\.|^onboarding\.preview\./, "").padEnd(20), gi.padEnd(18), ui.padEnd(18), ge.padEnd(16), ue.padEnd(16), ok ? "ok" : "MISMATCH");
}

if (mismatches > 0) {
  console.error(`\n${mismatches} MISMATCH row(s): a concept is taught under a different name than the UI shows.`);
  process.exit(1);
}
