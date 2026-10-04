/**
 * Dead-key audit: find i18n catalog keys that the app never actually reads.
 *
 * Why: the guide drift guard originally used `today.highlightHeading` as its
 * ground truth, and that key is never rendered — so the guard was green while
 * measuring a key no user ever sees. A catalog rots the same way code does:
 * refactors orphan keys and nobody notices.
 *
 *   node --import tsx tools/audit-dead-keys.mts
 *
 * Reports only; exits 0. The gate lives in src/i18n/catalog.test.ts.
 *
 * Method: strip comments (a key named in a comment is documentation, not a
 * read), then look ONLY at call sites that actually resolve a message —
 * `t("...")`, `tUI("...")`, `t(lang, "...")`, and the `labelKey: "..."` /
 * `placeholderKey` / `titleKey` data-driven patterns. A raw string match
 * anywhere in the tree is too loose: it counts the key lists in the i18n
 * tests and the comments explaining them.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

/** Remove // line comments and block comments so a key named in prose does not count. */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function loadCatalog(lang: string): Record<string, string> {
  const s = readFileSync(`src/i18n/messages/${lang}.ts`, "utf8");
  const out: Record<string, string> = {};
  const re = new RegExp('"([a-zA-Z0-9_.]+)":\\s*"((?:[^"\\\\]|\\\\.)*)"', "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out[m[1]] = m[2];
  return out;
}

const en = loadCatalog("en");

const files = walk("src")
  .filter((p) => !p.includes("/i18n/messages/"))
  // Tests are excluded. A test that lists a key asserts the key EXISTS (the
  // translation-parity checks), which is not the same as the app READING it.
  // Counting test references would mark genuinely dead keys alive and defeat
  // the audit's whole purpose: telling you what is safe to delete.
  .filter((p) => !p.endsWith(".test.ts") && !p.endsWith(".test.tsx"));

const refs = new Set<string>();

// Any helper that takes a message key as its argument. Kept as a list so a new
// accessor is a one-word addition rather than a silent blind spot: a key that
// is read through an unlisted helper would be reported dead.
const KEY_TAKING_HELPERS = ["t", "tUI", "translate", "splitPh", "tr"];

for (const file of files) {
  const src = stripComments(readFileSync(file, "utf8"));

  // helper("key"), helper(lang, "key") where lang is any identifier, and
  // helper(cond ? "a" : "b").
  const helperAlt = KEY_TAKING_HELPERS.join("|");
  for (const m of src.matchAll(new RegExp(`\\b(?:${helperAlt})\\(\\s*(?:[A-Za-z_$][\\w$]*\\s*,\\s*)?"([a-zA-Z0-9_.]+)"`, "g"))) refs.add(m[1]);
  // Ternary / inline branch form: ? "ns.a" : "ns.b"
  for (const m of src.matchAll(new RegExp(`(?:${helperAlt})\\([^)]*\\?\\s*"([a-zA-Z0-9_]+(?:\\.[a-zA-Z0-9_]+)+)"\\s*:\\s*"([a-zA-Z0-9_]+(?:\\.[a-zA-Z0-9_]+)+)"`, "g"))) {
    refs.add(m[1]);
    refs.add(m[2]);
  }

  // Data-driven config objects: labelKey/titleKey/placeholderKey/bodyKey: "key"
  for (const m of src.matchAll(/\b[a-zA-Z]*[Kk]ey:\s*"([a-zA-Z0-9_.]+)"/g)) refs.add(m[1]);

  // MessageKey-typed literal lists: a bare "ns.thing" inside an array whose
  // declaration is annotated `... : MessageKey[]` or `: Concept[]` where the
  // record fields are MessageKey. Simplest reliable form: any array literal
  // assigned to a name annotated with a type that mentions the identifier
  // `MessageKey` or a local type whose fields are MessageKey.
  for (const m of src.matchAll(/\[\s*"([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)"[^\]]*\]\s*(?:as const\s*)?(?:satisfies|:)\s*(?:readonly\s*)?[A-Za-z]*MessageKey[A-Za-z]*\b/g)) refs.add(m[1]);
  // Arrays of records whose field values are key strings, e.g. `title: "guide.x"`.
  for (const m of src.matchAll(/\b(?:title|body|example|heading|label|cta|dismiss|hint)\s*:\s*"([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)"/g)) refs.add(m[1]);
}

// Template-literal keys built at runtime from an array of ids:
//   title: `coach.${step}.title`
// A static scan cannot see these, so expand every `${x}` in such a template
// against the string literals in the array that feeds it. Without this the
// whole `coach.*` namespace reads as dead when it is very much alive.
function expandTemplates(): void {
  // (a) coach steps — ids come from the arrays in coach.ts.
  const coachSrc = stripComments(readFileSync("src/lib/coach.ts", "utf8"));
  const coachIds = new Set<string>();
  for (const m of coachSrc.matchAll(/COACH_[A-Z_]*STEP_ORDER[^=]*=\s*\[([\s\S]*?)\]/g)) {
    for (const s of m[1].matchAll(/"([a-zA-Z0-9_]+)"/g)) coachIds.add(s[1]);
  }

  // (b) reminder types — ids come from the NotificationReminder["type"] union,
  // which is then used as `reminder.${type}Msg`. Read the union from the types
  // file rather than hardcoding the members, so a new reminder type is covered
  // automatically.
  const typesSrc = stripComments(readFileSync("src/types/app.ts", "utf8"));
  const reminderIds = new Set<string>();
  const union = typesSrc.match(/NotificationReminder[\s\S]{0,400}?\btype\s*:\s*([^;]+);/);
  if (union) for (const s of union[1].matchAll(/"([a-zA-Z0-9_]+)"/g)) reminderIds.add(s[1]);

  const feeds: { prefix: string; ids: Set<string> }[] = [
    { prefix: "coach.", ids: coachIds },
    { prefix: "reminder.", ids: reminderIds },
  ];

  for (const file of files) {
    const src = stripComments(readFileSync(file, "utf8"));
    for (const m of src.matchAll(/`([a-zA-Z0-9_.]*[a-zA-Z0-9_])\.\$\{[^}]+\}([a-zA-Z0-9_.]*)`/g)) {
      const prefix = `${m[0].slice(1).split("${")[0]}`;
      const suffix = m[2];
      for (const feed of feeds) {
        if (prefix !== feed.prefix) continue;
        for (const id of feed.ids) refs.add(`${prefix}${id}${suffix}`);
      }
    }
  }

  // (c) Keys reached through an IDENTIFIER, not a literal: `t(capacityKey)`,
  // `{t(key)}` over a WEEKDAY_KEYS-style array, etc. A scanner that only sees
  // string literals reports those keys dead, and a report that says "dead" is
  // an invitation to delete — deleting a live key breaks the screen.
  //
  // Resolution is deliberately per-file and conservative: find every array of
  // key literals, find every helper call whose argument is a bare identifier,
  // and if that identifier is one of those arrays (or is assigned from an
  // in-file ternary/const of literals), credit every element.
  for (const file of files) {
    const src = stripComments(readFileSync(file, "utf8"));

    // Local arrays whose elements look like message keys.
    const arrayVars = new Map<string, string[]>();
    for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*\[([\s\S]*?)\]\s*(?:as const\s*)?(?:satisfies\s+[^;\n]+)?;/g)) {
      const keys = [...m[2].matchAll(/"([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)"/g)].map((x) => x[1]);
      if (keys.length > 0) arrayVars.set(m[1], keys);
    }
    // Scalars assigned a key literal: `const capacityKey = ok ? "a" : "b";`
    const scalarVars = new Map<string, string[]>();
    for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=([\s\S]{0,300}?);\s*(?:\n|$)/g)) {
      const keys = [...m[2].matchAll(/"([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)"/g)].map((x) => x[1]);
      if (keys.length > 0 && !arrayVars.has(m[1])) scalarVars.set(m[1], keys);
    }

    const helperAlt = KEY_TAKING_HELPERS.join("|");
    for (const m of src.matchAll(new RegExp(`\\b(?:${helperAlt})\\(\\s*([A-Za-z_$][\\w$]*)`, "g"))) {
      const arg = m[1];
      for (const k of arrayVars.get(arg) ?? []) refs.add(k);
      for (const k of scalarVars.get(arg) ?? []) refs.add(k);
    }
    // The array iterated into the call: `{KEYS.map((key) => ... t(key) ...)}`
    for (const m of src.matchAll(/([A-Za-z_$][\w$]*)\.map\(/g)) {
      for (const k of arrayVars.get(m[1]) ?? []) refs.add(k);
    }
  }
}

expandTemplates();

const allKeys = Object.keys(en);
const dead = allKeys.filter((k) => !refs.has(k));

const byNs = new Map<string, string[]>();
for (const k of dead) {
  const ns = k.split(".")[0];
  if (!byNs.has(ns)) byNs.set(ns, []);
  byNs.get(ns)!.push(k);
}
const nsTotal = (ns: string) => allKeys.filter((k) => k.split(".")[0] === ns).length;
const fullyDead = [...byNs.entries()].filter(([ns, ks]) => ks.length === nsTotal(ns)).sort();
const partial = [...byNs.entries()].filter(([ns, ks]) => ks.length !== nsTotal(ns)).sort();

console.log(`catalog keys: ${allKeys.length}`);
console.log(`read by source: ${allKeys.length - dead.length}`);
console.log(`dead: ${dead.length}\n`);

console.log("=== namespaces where EVERY key is dead (orphaned feature) ===");
for (const [ns, ks] of fullyDead) console.log(`  ${ns}  (${ks.length} keys)`);

console.log("\n=== dead keys inside live namespaces ===");
for (const [ns, ks] of partial) {
  console.log(`\n  ${ns} (${ks.length}/${nsTotal(ns)} dead):`);
  for (const k of ks.sort()) console.log(`    ${k} = ${JSON.stringify(en[k]).slice(0, 100)}`);
}
