# Product vocabulary — one name per concept

Living reference. Covers the terms Zendo teaches and the terms its screens show.
Last updated: 2026-10-04, alongside commit `dd30521`.

## The rule

A concept has exactly **one** name across every surface — Today, the planning
modal, the guide, onboarding, Settings, notifications. Nothing teaches a synonym
for something the user will later meet under a different word.

The reason is the guide itself. Its whole job is to make the app's vocabulary
learnable. A guide that says "Sorotan Harian" while Today says "Highlight" has
taught the user a word they will never see again — strictly worse than teaching
nothing, because it costs attention and leaves a false belief behind.

`tools/check-guide-terms.mts` enforces this. It exits non-zero on a mismatch.

## Untranslated product terms (Indonesian)

Indonesian is the default language and the UI is otherwise fully Indonesian.
These terms are deliberately **left in English**, because they are the product's
own nouns and the Indonesian UI already showed them that way:

| Term | Why not translated |
|---|---|
| Highlight | The concept name. `Sorotan Harian` was tried and reverted — nothing else in the app ever said it. |
| Main Action | Same. Indonesian renders the *verb* naturally, but the noun is the product's. |
| Agenda | Loanword, identical in both languages. |
| Season | An established brand noun. Indonesian copy elsewhere mixes this ("musim" in onboarding, "Season" in Settings) — see the open question below. |
| Notebook | The screen is titled Notebook. |
| Focus / Fokus | Indonesian "Fokus" is effectively the same word. |
| Deep Work | The shipped category label in the planning modal. |

**This is a product decision, not a technical one.** It is defensible because it
matches existing convention and keeps one name per concept, but it does mean an
Indonesian user sees some English nouns. If that is ever judged wrong, the fix is
to translate the term *everywhere at once* — including the screens — not to
translate it in the guide only. Translating only the guide is what caused the bug
this document exists to prevent.

## Open question — "Season" vs "musim"

Indonesian copy is currently inconsistent about this one term:

- `settings.season` → **"Season"**
- `ui.yourSeason` → **"Season-Mu"**
- `seasonEnd.startNew` → **"Mulai Season Baru"**
- `seasons.title` → **"Season yang lalu"**
- `onboarding.season.title` → **"Pilih panjang musimmu"** ← "musim"
- `onboarding.season.customBody` → **"…yang cocok dengan musimmu."** ← "musim"
- `guide.seasonTitle` → **"Season"** (was "Musim", changed to match Settings)
- `guide.goalsBody` → **"…sepanjang musim itu."** ← "musim", in the same card as `guide.seasonTitle` = "Season"

The guide card now reads "Season" as the heading and "musim" in the sentence
underneath it. That is the exact drift class this document is about, surviving in
prose because the guard only checks *titles*.

Not fixed here because it needs a native-speaker call, not a mechanical one:
"musim" is the natural Indonesian word and reads warmer; "Season" matches the
brand and the other six keys. Pick one, then apply it to all eight.

## Known dead keys

`tools/audit-dead-keys.mts` reports keys nothing renders. Baseline at the time of
writing: **196 of 1553**. Most are harmless leftovers from renamed features.
Note `today.highlightHeading` — dead, and it was the original drift guard's
ground truth, which is why the guard was green while comparing against a string
no user ever saw. The guard now checks liveness, so that cannot recur.

## Checklist when renaming a concept

1. Grep the concept name across `src/` — screens, modals, notifications, tests.
2. Rename in **both** `src/i18n/messages/en.ts` and `id.ts`.
3. Run `node --import tsx tools/check-guide-terms.mts` — exit 0 required.
4. Run `node --import tsx tools/audit-dead-keys.mts` and confirm the new key is
   not listed as dead.
5. `npx vitest run` — `src/i18n/catalog.test.ts` pins guide-vs-UI term equality.
