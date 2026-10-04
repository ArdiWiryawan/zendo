// Ad-hoc parity check: en/id key sets and interpolation placeholders must match.
// Not wired into CI; run manually via `node tools/parity-check.mjs`.
import fs from "node:fs";

function load(lang) {
  const src = fs.readFileSync(`src/i18n/messages/${lang}.ts`, "utf8");
  const out = {};
  const re = /"([a-zA-Z0-9_.]+)":\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src))) out[m[1]] = m[2];
  return out;
}

const en = load("en");
const id = load("id");
const enKeys = Object.keys(en);
const idKeys = Object.keys(id);
const idSet = new Set(idKeys);
const enSet = new Set(enKeys);

console.log(`en keys: ${enKeys.length}  id keys: ${idKeys.length}`);

const enOnly = enKeys.filter((k) => !idSet.has(k));
const idOnly = idKeys.filter((k) => !enSet.has(k));
if (enOnly.length) console.log("in en but not id:", enOnly);
if (idOnly.length) console.log("in id but not en:", idOnly);

const placeholders = (s) => ((s || "").match(/\{[^}]+\}/g) || []).sort().join(",");
let bad = 0;
for (const k of enKeys) {
  const a = placeholders(en[k]);
  const b = placeholders(id[k]);
  if (a !== b) {
    console.log(`PLACEHOLDER MISMATCH ${k}: en=${JSON.stringify(a)} id=${JSON.stringify(b)}`);
    bad += 1;
  }
}

console.log(
  enOnly.length || idOnly.length || bad
    ? `FAIL — ${enOnly.length + idOnly.length} key drift, ${bad} placeholder drift`
    : "OK — key sets and placeholders match"
);
process.exit(enOnly.length || idOnly.length || bad ? 1 : 0);