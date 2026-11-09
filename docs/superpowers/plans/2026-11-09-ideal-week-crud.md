# Ideal Week activity management

Goal: Make adding, editing, shortening, reducing repeat days, and deleting routines discoverable without squeezing overlapping calendar labels.

Direction: Keep the calendar and existing design tokens. Add a saved-activity list with explicit edit/delete actions, inline deletion confirmation, and persistent form actions. Keep a single editor. Use horizontal calendar scrolling with readable overlap lanes and single-line labels. Prevent identical activities from being saved twice; preserve existing records until explicitly edited/deleted. Reuse the existing durable planning store; no dependencies or data migration.

Alternatives considered: calendar-only contextual menus hide management actions; a separate management screen interrupts calendar editing. An adjacent activity list keeps both tasks visible.

- [x] Add tested durable upsert/delete operations and duplicate prevention.
- [x] Add activity list and inline confirmation; reuse existing form for duration/day edits.
- [x] Improve calendar label layout, preview distinction, form action visibility, and narrow-screen flow.
- [x] Verify CRUD persistence, cancellation, duplicate handling, overnight weekdays/weekends, keyboard controls, 360/768/1280 widths, build, and tests.

Loading does not apply to synchronous local writes. Storage failures keep the draft/confirmation open. Destructive changes require explicit confirmation. No automatic removal of old duplicates.

Verification: 989 tests passed; production build and TypeScript checks passed. Ego-browser checks created a routine, edited duration and days without changing identity, canceled deletion, removed two seeded duplicate records, rejected an identical save, and reloaded both remaining activities. Editor inputs and save actions fit 360/768/1280px viewports without page-level horizontal overflow. Calendar keyboard arrow navigation retained visible focus. Impeccable source layout scan reported no primary findings; this was a source scan, not a full rendered accessibility audit.
