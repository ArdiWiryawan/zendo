# Settings page redesign — 2026-10-16

Second pass, matched to a supplied reference screenshot. Supersedes the first
pass documented earlier the same day.

## Scope

Visual + information-architecture redesign of `src/screens/SettingsScreen.tsx`,
using the supplied reference for its visual language and row grammar. No storage,
schema, or API changes. Every existing handler, store action, and dialog was
preserved.

## Design context

- **Audience** — people building focus habits, mostly on a phone, often in low
  light. Zendo is framed as a calm "digital temple", not a productivity dashboard.
- **Job of this page** — tune the app (theme, language), set cues (reminders),
  move data (export/import), manage the account, read the legal pages.
- **Tone** — calm, intentional, restrained. Muted gold on charcoal, thin strokes,
  generous spacing, nothing competing for attention.
- **Reference** — the supplied screenshot. Its language: one flat card per group,
  a small uppercase group label, ~52px rows of *icon · title · short description ·
  one control*, hairline dividers, and a quiet value readout (a status or a count)
  before the chevron.

## What was taken from the reference

| Reference idea | Implementation |
| --- | --- |
| Plain uppercase group labels, no rule or icon chip | `GroupLabel` — small caps, letter-spaced, muted |
| Uniform row grammar: icon · title · optional description · one control | `SettingsRow` rebuilt; description may be a node (the reminder time lives there) |
| Current value shown as a quiet readout | `value` prop — "2 active", "Not active" |
| Theme shown as inline swatches instead of a grid of cards | One row: "Theme" + current palette name + 6 swatch dots, selected one ringed |
| Reminder time reads as text, not a boxed input | `<input type="time">` styled borderless/muted in the description slot — still fully editable |
| Reminders collapsed behind one row that reports a count | "Reminder schedule · 4 active" disclosure holding all five rows (`aria-expanded` + `aria-controls`) |
| Section names | Appearance · Reminders · Data & backup · Calendar · Account · Season · About & privacy |
| Reset on its own, red only here | Standalone red-bordered card, no group label |
| Support last and secondary | Standalone row with a heart, opening the existing QRIS modal |

Progressive disclosure cut the page from **3506px to 2854px** at 390px — the
collapsed palette grid was most of it. Collapsing the reminder schedule (below)
took it to **2534px**, and expanding that section again measures **2996px**, i.e.
the hidden block is 462px of the page.

## Collapsing the reminder schedule

The Reminders group was the single longest block on the page: a master toggle
plus one row per reminder, each with its own toggle and time input (five rows in
the seeded state; the list is data-driven off `notificationReminders`). Most
visits do not change a reminder time, so the group now renders as one summary row.

- The row is a full-width `<button>` carrying `aria-expanded` and
  `aria-controls="settings-reminder-schedule"`, with a chevron that rotates 90°
  when open. The rows and the Test/Reset actions live in a following `div` that
  is only mounted while open — the same disclosure pattern already used elsewhere
  in the file.
- **The count is only shown when it is true.** The row reads
  `"{n} active"` when the master notification switch is on, and `"Off"` when it
  is off. An earlier draft always showed a live count of enabled reminders, which
  meant the collapsed row claimed "5 active" while notifications were disabled —
  nothing would actually fire. Caught by reading the smoke-test output, not by
  the type checker.
- Collapsing does not hide the times from someone who wants them: one tap opens
  the section, and the inputs remain fully editable. Nothing was removed.
- `PRIMARY_REMINDER_TYPES` and the `otherReminders` split (which existed only to
  separate two "seasonal" rows for the old partial collapse) were deleted.

New i18n keys: `settings.remindersSchedule`, `settings.remindersActive`
(`"{n} active"` / `"{n} aktif"`), `settings.remindersOff` (`"Off"` / `"Mati"`).

## What was deliberately NOT taken from the reference

The brief said to use the reference as visual inspiration, not as licence to
invent functionality. Four reference elements would have done exactly that:

1. **"Tampilan minimalis" toggle.** No such setting exists. `appSettings` has
   `reducedMotion`, but nothing reads it — the app uses
   `<MotionConfig reducedMotion="user">`, i.e. the OS preference. Adding this
   switch would be a control that changes nothing.
2. **"Kalender terhubung · Pilih kalender yang digunakan".** Zendo has no calendar
   integration; it downloads an `.ics` file you import yourself. The row keeps the
   honest label "Calendar reminder" and its real description.
3. **Back arrow in the header.** Settings is a bottom-nav tab root. A back arrow
   there implies a parent screen that does not exist.
4. **One merged "Privasi & ketentuan" row.** `settingsLegal.test.tsx` requires
   both a Terms link and a Privacy link in this file, and readers reasonably want
   them separately. Two rows, both real anchors.

Also skipped: the reference shows both a download icon *and* a chevron on the
export rows. One action, one affordance — the chevron was dropped.

## Bug fixed

The palette row resolved its label with
`PALETTES.find(p => p.id === appSettings.theme)`. `AppTheme` includes `"system"`,
and stored states can carry a legacy `"light"`; for those values the lookup
returned `undefined`, so the row rendered **no current-theme name and no selected
swatch**. `App.tsx` already treats any unknown value as the dark palette, so the
row now resolves the same way. Caught because the audit seed deliberately uses
`theme: "light"`.

## Files changed

| File | Change |
| --- | --- |
| `src/screens/SettingsScreen.tsx` | Rebuilt: 7 groups, flat rows, collapsible reminder schedule, swatch row; all handlers unchanged |
| `src/i18n/messages/en.ts` | +23 keys; shortened `subtitle`, `reset`, `resetDesc`, `backupDesc`, `dataJsonDesc` |
| `src/i18n/messages/id.ts` | Same keys in Indonesian; same copy shortened |
| `tools/audit/fullshot.mjs` | Full-length single-image capture, with an `expand` mode that opens collapsed disclosures |
| `tools/audit/overflow.mjs` | Horizontal-overflow + clipped-text probe |
| `tools/audit/settings-smoke.mjs` | 24-check functional test of the Settings controls |
| `tools/audit/zoom.mjs` | Now takes a viewport width (was hardcoded to 390) |

Dead code removed while in the file: `getDailyJournalPromptForDate` and
`getJournalQuestionLabels` imports, an unused `labels` binding, the now-unused
`Check` / `Scale` icon imports, and — with the full schedule collapse —
`PRIMARY_REMINDER_TYPES` plus the `otherReminders` split.

One test-harness note: `settings-smoke.mjs` must call
`ctx.grantPermissions(["notifications"], { origin: "http://localhost:5173" })`
before creating the page. The notifications handler `await`s
`Notification.requestPermission()`, and headless Chrome has no prompt, so without
the grant the toggle reads back unchanged and looks broken. That was a harness
bug, not an app bug.

## Verification

- `npx tsc -b --noEmit` — clean (`npm run lint` runs the same command).
- `npm test` — **892 passed / 84 files**. (Was 894 before this work: the
  `settingsLegal.test.tsx` suite generates 2 tests per `settings.legal*` key found
  in the source, and the standalone "Legal & Privacy" heading was replaced by
  group labels, so `settings.legal` is no longer referenced. The Terms/Privacy
  links, `legalHref` helper and version pin are untouched and still tested.)
- `npm run build` — succeeds; PWA service worker regenerated.
- `tools/audit/settings-smoke.mjs` — **24/24**: palette sets and persists `theme`
  + `data-theme`; the row names the current palette; language switch persists and
  updates `<html lang>`; the reminder schedule starts collapsed and hides its rows;
  it reports **"Off"** while the master switch is off and a live count
  (`"4 active"`) once it is on; expanding reveals every reminder, the seasonal
  rows, and the test/reset actions; reminder toggle persists; notifications toggle
  persists; JSON export fills the panel; import opens a confirm dialog; support
  opens the QRIS modal; wipe requires confirmation and cancel keeps data; guide
  row routes; zero console/page errors.
- `tools/audit/overflow.mjs` — **no horizontal overflow and no clipped text on
  `/settings` at 320 / 390 / 430 / 768 / 1440 px.**
- `tools/audit/touch-audit.mjs` — **0 controls below the WCAG 2.2 24px minimum**
  across all routes. On `/settings`, the only controls under the 44px
  recommendation are the six swatches, at **28×44** (28px wide because the dots
  sit 2px apart — a wider target would overlap its neighbour; 44px tall via
  `min-h-11 -my-2`, which does not grow the row). The collapsed schedule row and
  every reminder row clear 44px.

## Unresolved

1. **`/notebook` overflows horizontally by 18px at 320px.** Pre-existing and
   outside this scope, so it was left alone.
2. **Desktop is a 480px column.** The app shell caps `main` at `max-w-[480px]`, so
   at 1440px Settings is a centred mobile column. That is the shared PWA shell,
   not a decision this page can make alone.
3. **`archiveSeason` has no confirmation dialog.** It preserves all progress, so
   it is not destructive and was left as-is; flagged because it ends the active
   season in one tap.
4. **`settings.prefs`, `settings.data`, `settings.reminders`, `settings.legal`,
   `settings.group.other`, `settings.exportSection`, `settings.exportSectionDesc`,
   `settings.importSection`, `settings.importSectionDesc` are now unreferenced.**
   Left in the catalog rather than deleted so nothing else that reads it breaks;
   they can be pruned separately.
5. **`"system"` is still in `AppTheme`** but is not one of the six swatches. With
   the new resolution it now falls back to showing "Dark Monk" selected, which is
   what actually renders — but the stored value stays `"system"` until the user
   picks a palette.

## Screenshots

- `audit/settings-collapsed/settings-full@2x.png` — 390px, full length, 2x, reminder schedule **collapsed** (2534px tall)
- `audit/settings-expanded/settings-full@2x.png` — 390px, full length, 2x, reminder schedule **expanded** (2996px tall)
- `audit/settings-ref/settings-full@2x.png` — 390px, full length, 2x
- `audit/settings-ref/settings-full@1x.png` — 390px, full length
- `audit/settings-ref-desktop/settings-full@1x.png` — 1440px
- `audit/settings-ref-320/settings-full@1x.png` — 320px (smallest phone)

Reproduce the collapsed/expanded pair with:

```
node tools/audit/fullshot.mjs settings settings-collapsed 390 2
node tools/audit/fullshot.mjs settings settings-expanded  390 2 expand
```
