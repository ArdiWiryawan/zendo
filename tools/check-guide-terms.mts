// Guard: runnable as a CI/local check. Two failure modes, both exit 1:
//
//   1. TERM DRIFT — the guide teaches a concept under a different name than
//      the screen the user actually visits. A guide that teaches a synonym is
//      worse than no guide.
//   2. DEAD GROUND TRUTH — a UI key named below is never rendered anywhere.
//      This guard originally used `today.highlightHeading` as the source of
//      truth and that key is dead, so the check was green while comparing
//      against a string no user has ever seen. A guard that measures a dead
//      key is not a guard. Hence the liveness pass.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function loadCatalog(lang: string): Record<string, string> {
  const s = readFileSync(`src/i18n/messages/${lang}.ts`, "utf8");
  const out: Record<string, string> = {};
  const re = new RegExp('"([a-zA-Z0-9_.]+)":\\s*"((?:[^"\\\\]|\\\\.)*)"', "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out[m[1]] = m[2];
  return out;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
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
  // Loose match: the source may qualify the term or wrap it in a sentence.
  const okId = gi.includes(ui) || ui.includes(gi);
  const okEn = ge.toLowerCase().includes(ue.toLowerCase()) || ue.toLowerCase().includes(ge.toLowerCase());
  const ok = okId && okEn;
  if (!ok) mismatches += 1;
  console.log(g.replace(/^guide\.|^onboarding\.preview\./, "").padEnd(20), gi.padEnd(18), ui.padEnd(18), ge.padEnd(16), ue.padEnd(16), ok ? "ok" : "MISMATCH");
}

// --- Liveness: every UI key named above must actually be rendered somewhere.
// A dead key makes its row meaningless: it compares the guide against a string
// no screen shows. This is the check that would have caught the original bug.
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

const KEY_TAKING_HELPERS = ["t", "tUI", "translate", "splitPh", "tr"];
const sourceFiles = walk("src")
  .filter((p) => !p.includes("/i18n/messages/"))
  .filter((p) => !p.endsWith("catalog.test.ts"));

const rendered = new Set<string>();
for (const file of sourceFiles) {
  const src = stripComments(readFileSync(file, "utf8"));
  const helperAlt = KEY_TAKING_HELPERS.join("|");
  for (const m of src.matchAll(new RegExp(`\\b(?:${helperAlt})\\(\\s*(?:[A-Za-z_$][\\w$]*\\s*,\\s*)?"([a-zA-Z0-9_.]+)"`, "g"))) rendered.add(m[1]);
  for (const m of src.matchAll(/\b[a-zA-Z]*[Kk]ey:\s*"([a-zA-Z0-9_.]+)"/g)) rendered.add(m[1]);
  for (const m of src.matchAll(/\b(?:title|body|example|heading|label|cta|dismiss|hint)\s*:\s*"([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)"/g)) rendered.add(m[1]);
}

const deadGroundTruth = [...new Set(pairs.map(([, u]) => u))].filter((u) => !rendered.has(u));

if (deadGroundTruth.length > 0) {
  console.error(`\n${deadGroundTruth.length} UI key(s) this guard compares against are never rendered:`);
  for (const k of deadGroundTruth) console.error(`  ${k} = ${JSON.stringify(en[k] ?? "(missing)")}`);
  console.error("A dead key cannot be ground truth. Either render it, or point the row at the key the screen actually uses.");
}

if (mismatches > 0) {
  console.error(`\n${mismatches} MISMATCH row(s): a concept is taught under a different name than the UI shows.`);
}

if (mismatches > 0 || deadGroundTruth.length > 0) process.exit(1);
