# Zendo — Time Block Color System & ICS Export Audit

**Date:** 2026-10-11
**Scope:** Planning → Time Block Creation → Activity Category → Stored Data → ICS Export → External Calendar
**Principle:** Color communicates **activity type** — never productivity, performance, or completion status. A block is colored by what kind of work it is, not by whether it was done or how well it went.

---

## A. Current Architecture (as found)

| Layer | File | Role |
|---|---|---|
| Category type | `src/types/app.ts` | `TimeBlockCategory` union; `TimeBlock.category` |
| UI color config | `src/components/MorningPlanningModal.tsx` | `CATEGORY_CONFIG` — per-category Tailwind classes |
| UI color config | `src/components/DayTimeBlockVisualizer.tsx` | `CATEGORY_STYLES` — second, independent map |
| Design tokens | `src/styles/globals.css` | `--color-cat-*` RGB triplets (base + 5 themes) |
| Tailwind bridge | `tailwind.config.*` | `"cat-deep": "rgb(var(--color-cat-deep) / <alpha-value>)"` |
| Export | `src/lib/ical.ts` | `generateIcsContent()` → `.ics` |
| Import | `src/lib/icsParser.ts` | `parseIcsForDate()`, `inferCategory()` |
| Persistence | `src/lib/storage.ts` | `loadState()` / save |

**Finding A1 — two duplicated color maps.** `CATEGORY_CONFIG` (modal) and `CATEGORY_STYLES` (visualizer) were separate hand-maintained records of the same five categories. Two sources of truth, free to drift. This is the structural cause of the UI/export inconsistency class below.

**Finding A2 — the exporter had no category concept at all.** `ical.ts` wrote `CATEGORIES:` but never consulted any color mapping. External calendars could not distinguish activity types.

---

## B. Current Behavior (before this change)

1. A block is created in the planning modal with a category.
2. UI colors the block from one of the two maps above.
3. `generateIcsContent()` emits `VEVENT`s with `SUMMARY`, `DESCRIPTION`, `CATEGORIES`, `STATUS`, `TRANSP`.
4. **No color property is written.** Every exported event renders identically in every external calendar.
5. On import, `CATEGORIES` was parsed out of the file and thrown away.

---

## C. Identified Problems

### P0 — export produces an unreadable file in two ways

**P0-1 · Doubled property prefix.** The field table emitted `foldLine(\`${name}:${value}\`)` where the value already began with its own name — `DTSTART;TZID=Asia/Jakarta:…`. Output: `DTSTART:DTSTART;TZID=Asia/Jakarta:20261011T090000`. Strict parsers reject or misread this; the event has no valid start. **Present in the pre-existing code path and latent until a TZID was introduced.**

**P0-2 · Doubled UTC designator.** `DTSTAMP` was built with `.concat("Z")` on a string that `toISOString()` already terminated in `Z` → `DTSTAMP:20261011T013908ZZ`. Invalid; some clients drop the whole event.

**P0-3 · Export aborts on one malformed block.** `block.category.replace(...)` threw on `undefined`/unknown categories, killing the export of *every other block in the day* over one bad value. A single legacy block could make a full day unexportable.

**P0-4 · Unknown category fell back to deep work.** The wrong direction: an unrecognized block was labeled and colored as *deep work* — the most flattering category — so a day of errands exported as a day of focus. Deep work must be *named* to be claimed, per the principle already documented in `icsParser.ts`.

### P1 — data loss and inconsistency

**P1-1 · `CATEGORIES` dropped on import.** `ParsedCalendar.items` had no `categories` field, so the file's own explicit declaration never reached `inferCategory()`. Its `icsCategories` parameter was always `undefined` — the declared-category branch was dead code, and every import was re-guessed from the title alone.

**P1-2 · No color in export.** No `COLOR`, no `X-APPLE-CALENDAR-COLOR`. External calendars cannot distinguish activity types (the core user request).

**P1-3 · No timezone qualifier.** `DTSTART`/`DTEND` were RFC 5545 *floating* times — interpreted as "whatever zone the importing client is in." An exporter in Jakarta and a client in UTC silently disagreed by seven hours.

**P1-4 · No line folding.** Titles/descriptions past 75 octets produced lines violating RFC 5545 §3.1. Long titles were mangled or rejected on import.

**P1-5 · Non-deterministic UID.** Re-exporting the same day produced different UIDs, so a re-import duplicated every event instead of updating it.

**P1-6 · Fallback divergence risk.** With two independent maps, the modal and the visualizer could resolve an unknown category differently.

### P2 — polish

- Selector pills conveyed category by **label text and icon only**; color was used on the block but not at the point of choosing.
- No single place documented which categories exist.

---

## D. Compatibility Findings

Split explicitly into **verified** and **assumed**, per the requirement not to over-claim.

### Verified

| Property | Spec | Value form | Verified how |
|---|---|---|---|
| `COLOR` | RFC 7986 §5.9 | CSS3 color **name** only (not hex) | Spec text; unit-tested that a *name*, not a hex, is emitted |
| `X-APPLE-CALENDAR-COLOR` | Apple vendor extension | Hex `#RRGGBB` | Unit-tested; documented as honored by Apple Calendar |
| `CATEGORIES` | RFC 5545 §3.8.1.2 | Comma-separated TEXT | Round-trip parsed by our own parser |
| Line folding | RFC 5545 §3.1 | 75 **octets** (UTF-8), continuation = `CRLF` + single space | Test unfolds the output and recovers the original string exactly |
| `TZID` | RFC 5545 §3.2.19 | `DTSTART;TZID=<IANA zone>:<local>` | Device zone read via `Intl`; matches existing precedent in `icsParser` |
| Google Calendar per-event color | — | **Not honored on ICS import** | Documented, well-known limitation |

### Assumed / not verifiable in this environment

- **That any given client actually renders `COLOR`.** We write the standards-compliant property; whether a specific app honors it is that app's choice. No universal claim is made.
- **Test 8 — import into a live external calendar application.** Cannot be automated here. The `.ics` output is asserted well-formed at the text level; actual render in Apple/Google/Outlook is **unverified**.
- Google assigns color **per calendar**, not per event, on import. This is a platform limitation a file cannot work around. `CATEGORIES` is written alongside so clients that surface category text still have it.

**Net position:** two properties written additively per event, one standards-compliant (name) and one vendor (hex), with the limitation documented rather than papered over. If a client honors neither, the file is still valid and the event still carries its category — nothing regresses.

---

## E. Implementation

### E1 — Single source of truth: `src/lib/activityCategory.ts` (new)

One `CATEGORY_META` record holds every fact about a category: `hex` (default-theme, for the static `.ics`), `colorName` (CSS3, for RFC 7986), `darkText`, `labelKey`. All readers go through `resolveActivityCategory()` / `activityCategoryMeta()` / `activityCategoryHex()` / `activityCategoryColorName()`.

`DEFAULT_ACTIVITY_CATEGORY = "personal"` — unknown resolves to personal, **never** deep work.

Palette reuses the existing `--color-cat-*` tokens. The `.ics` uses the **default-theme** hex deliberately: an `.ics` is a static, theme-independent file, so it must not vary with the viewer's UI theme. The 6-theme system is preserved untouched for the UI.

| Category | Hex (default theme) | CSS3 name |
|---|---|---|
| `deep_work` | `#C46A5B` | `indianred` |
| `learning` | `#8B9DC4` | `cornflowerblue` |
| `shallow` | `#6B9AC4` | `steelblue` |
| `rest` | `#6BB48B` | `mediumseagreen` |
| `personal` | `#C48BB4` | `orchid` |

### E2 — Export: `src/lib/ical.ts`

- Emits `COLOR:<name>` + `X-APPLE-CALENDAR-COLOR:<hex>` per event.
- `TZID` from the device zone, read per call; falls back to floating only if the zone is unknown.
- RFC 5545 §3.1 folding on a **UTF-8 byte** budget (multibyte titles never split mid-codepoint); the leading space is supplied by the join so the final continuation keeps it.
- Deterministic UID (`{id}-{date}@zendo.app`), so re-export updates rather than duplicates.
- Category resolved *before* any read — one bad block can no longer abort the day.

### E3 — Import: `src/lib/icsParser.ts`

`ParsedCalendar.items` gained `categories?: string`; `collectEvent` propagates the file's `CATEGORIES`. The key is **omitted when empty**, so files without the property keep their previous item shape exactly. This is what makes the declared-category branch of `inferCategory()` reachable.

### E4 — UI: modal + visualizer

Both maps' unknown-category fallbacks route through `resolveActivityCategory()`, so they can no longer disagree. Category pills gained a colored dot (`<span aria-hidden="true" />`) — the row now reads as color + icon + label, and category is distinguishable without relying on text alone. `aria-hidden` because the label already names the category.

### E5 — Persistence: `src/lib/storage.ts`

`loadState()` normalizes every block's category on read (`resolveActivityCategory`), so legacy blocks with missing or unknown categories render and export correctly instead of reaching a fallback path at render time.

---

## F. Verification

**Automated — passing:**

- `npx tsc --noEmit` — clean.
- `npx vitest run` — **836 passed / 79 files**.
- `ical.test.ts` — 5 distinct colors; per-event color for all categories; unknown block → `CATEGORIES:PERSONAL` + `#C48BB4` and **not** `#C46A5B`; whole-line regex on `DTSTART`/`DTEND`/`DTSTAMP` (guards P0-1 and P0-2); fold/unfold round-trip proves no character lost; undefined category does not throw; deterministic UID.
- Real `.ics` generated via `tools/audit/ics-color-check.mts` and inspected line by line — well-formed.

**Visual — Playwright, live at 390px and desktop:**

| Check | Result |
|---|---|
| 5 distinct dot colors, dark (default) | `rgb(196,106,91)` `rgb(139,157,196)` `rgb(107,154,196)` `rgb(107,180,139)` `rgb(196,139,180)` |
| Theme switch (`temple_gold`) re-tints dots from tokens | Confirmed — dots shift to that theme's `--color-cat-*` |
| Responsive @390px | Pills wrap 2-up, all 5 dots visible, no horizontal overflow |
| Exported `.ics` unaffected by UI theme | By construction — fixed default-theme hex |

**Not verified:** actual render inside Apple Calendar / Google Calendar / Outlook (Test 8). See D.

---

## G. Deliberately not done

- No category color picker — out of scope and contrary to "one canonical color per category."
- No new dependencies.
- No change to unrelated parts of Zendo.
- Palette not hardcoded to the spec's proposed hexes — existing tokens reused instead, preserving the 6-theme system.
