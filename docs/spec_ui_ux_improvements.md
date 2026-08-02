# Spec — UI/UX Improvements (audit-driven)

**Source:** tasteskill audit workflow (7 agents, 194 tool calls) on all zendo surfaces. 30 prioritized actions. **Design read:** ritual-first calm-Zen PWA, dark theme (brand-locked), monk tokens. Dials: VARIANCE 4 / MOTION 3 / DENSITY 4.

**Applied skill rules (product-app subset):** color consistency lock, shape consistency lock, WCAG contrast, focus-visible strength, empty/loading/error states, copy self-audit. Landing-page rules (hero/bento/marquee) explicitly out of scope — this is a product PWA.

---

## Batch 1 — AA Critical (cheap, broad, do first)
1. **Contrast tokens** — `globals.css`: `text-soft #68655E→#7A766D`, `danger #9E5649→#B5736A`, `warning #9B7846→#B08A54`. Remove `/90 /60 /80` alpha on semantic text call-sites (WeekScreen:131-134,208,213; TodayScreen:1096,1111).
2. **Focus-visible ring** — `ui.tsx` primitives: `ring-monk-accent/50` → `ring-monk-accent` (full strength). Delete redundant base `outline` rule (globals.css:89-92).

## Batch 2 — Core ritual / flow
3. **Onboarding gating** — relax 20-char floors → 10 (values:86, vision:180, reality:250); brain-dump min 5→3 (validation.ts:18). Add "Skip for now" per step.
4. **Focus End/Reset two-step arming** — first tap confirms, re-tap commits, timeout cancels (FocusSession.tsx:271-284).
5. **Journal save toggles day-checklist** — derive completed from answers so ritual completes on one screen (JournalEntryScreen.tsx:284-321).
6. **Music persists across navigation** — don't stop soundscape on Focus unmount while session runs (FocusScreen.tsx:41-43).
7. **Focus completion summary card** — duration/blocks/distractions/main-action instead of blank starter (FocusScreen.tsx:126).
8. **Auto-complete inflation cap** — clamp per-phase completedMinutes to actual elapsed (useMonkStore.ts:1171-1177).
9. **Week tap affordance + 44px targets** — dashed ring + glyph on tappable days, bump circles to min-h-11/w-11 (WeekScreen.tsx:207-267).

## Batch 3 — Consistency / cleanup
10. **i18n leakage** — SeasonEndScreen + LibraryScreen hardcoded English → en/id keys (SeasonEndScreen:31; LibraryScreen:378-647).
11. **Font mismatch** — `tailwind.config.ts` font-sans → Outfit (matches body); align mono.
12. **Dead code** — delete `getSessionLeftTitle`, unused routes/exports (GoalElimination/FocusGoals, validateGoalElimination).
13. **Sync error gate** — AppShell-level CalmAlert when syncStatus==='error'.
14. **Save feedback** — CalmToast on journal/notebook/pack save; drop 800ms auto-navigate.
15. **ARIA** — tab semantics on journal panels, aria-pressed on preset selector, aria-live on phase labels, localized time labels.

**Archived-season stranding (critical, from audit):** archiveSeason sets status='archived'; App only redirects on 'ended' → archived season unreachable + mis-tap re-runs onboarding. Fix: guard onboarding reset on archived status.

---

## Execution
- **Batch 1:** architect fixes directly (2 small token/ring edits, mechanical).
- **Batch 2+3:** 1 subagent per feature area, parallel where files don't collide.
- **Verify after each batch:** tsc + vitest.
- **Keep (do not regress):** calm toast a11y, focus rings, haptics, parchment palette on writing surfaces, journal autosave, empty states, phase-model design.
