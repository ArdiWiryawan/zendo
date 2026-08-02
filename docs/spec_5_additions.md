# Spec — 5 Product Additions (Batch A/B/C)

**STATUS: IMPLEMENTED** (2026-08-02). F1–F6 all landed. tsc clean, 55/55 tests, prod build green. QC review found + fixed: streak counting (preceding-5), held-card null-guard, completed-day rest gate. Test updates in `restSuggestion.test.ts`.

Audit basis: `docs/research_foundation.md` §8–9. Audit workflow (7 agents) confirmed statuses. All five translate a research finding → mechanism → product intervention. **Order = leverage.**

---

## Feature 1 — Surface obstacle Plan B at failure point (WOOP close)
**Audit:** capture done (ObstacleStep → Goal.obstacleMitigation), surfacing dead. `goal.obstacle*` zero consumers.

**Research:** if-then contingent plans d=.43; the if-then pays off *when the cue fires* (obstacle moment), not at setup.

**Design:** render `When [obstacle], I will [mitigation]` in the ReEntryBanner (miss-state) as the recovery framing. Goal's mitigation closes the WOOP loop at the exact failure point.

**Files:** `TodayScreen.tsx` ReEntryBanner; i18n `en.ts`/`id.ts`.

**UX:** in ReEntryBanner, under the "Remember: {why}" line, if today's plan goal has `obstacleMitigation`, show: `"Plan B: When [obstacle], I will [mitigation]."` — using `parseIntention`.

---

## Feature 2 — Miss-state diagnostic in ReEntryBanner
**Audit:** ReEntryBanner non-shaming restart, ZERO diagnostic. RelapseScreen has trigger chips + note + recoveryAction, but siloed behind manual "Log drift gently" link.

**Research:** procrastination = mood repair (task aversiveness, stress). Diagnostic ("what got in the way") converts miss into data; shaming converts miss into abandonment.

**Design:** add a lightweight inline diagnostic to ReEntryBanner: "What pulled you away?" trigger chips (reuse `relapse.trigger.*` i18n) + optional one-line note. On select → `store.saveRelapseLog({ trigger, note, recoveryAction })` for the missed day. Keep it ONE tap to chip + optional note; not a full screen. Never blocks; dismiss stays.

**Files:** `TodayScreen.tsx` ReEntryBanner; reuse `saveRelapseLog`, `relapse.trigger.*` keys. New i18n: `today.reentry.whatPulled`, `today.reentry.why` already exists.

**UX:** banner shows trigger chips inline. Tapping chip saves log + shows calm confirmation. Note field is collapsed (optional).

---

## Feature 3 — Close-day competence feedback (echo words)
**Audit:** missing. Save → generic toast "Tersimpan." / "Day closed." User's `whatMovedToday` captured, never read back.

**Research:** verbal/competence feedback raises intrinsic motivation (d=+.33, Deci 1999). Echoing *their own words* = competence feedback grounded in their meaning (identified regulation, Van den Broeck 2021).

**Design:** after save, show their own line back as confirmation. Replace generic held-card with a line that quotes `whatMovedToday`.

**Files:** `TodayScreen.tsx` CloseDayCard saved-state + held branch; i18n new key `today.closeDay.echo` = `"Held: \"{text}\""` pattern.

**UX:** CloseDayCard after save: instead of `"Day closed."`, show `"Day closed. You held: \"{whatMovedToday}\"."` Held card (`primaryKind==="held"`): `"You moved: {whatMovedToday}"` when present.

---

## Feature 4 — Energy-prescriptive card
**Audit:** EnergyCheck = 3-level logger + trend, no prescription. Low energy → static banner text only; mainAction never adapts; user can still pick deep_work.

**Research:** time ≠ energy ≠ attention; matching task difficulty to energy reduces aversiveness + failure; rest is production.

**Design:** energy level adapts the focus-zone suggestion:
- **low** → banner CTA "Start small (5–10 min)" + suggested preset custom/10; show "Rest instead" secondary.
- **steady** → current behavior.
- **high** → suggest normal preset; no change.

**Files:** `TodayScreen.tsx` focus primary zone + lowEnergy banner; `FocusSession.tsx` starter default (keep). i18n.

**UX:** low-energy banner becomes actionable: PrimaryButton "Start with 10 min" (startFocusSession custom 10 + navigate focus), GhostButton "Rest instead" (createOrUpdateDayPlan rest). Keep existing wording tone.

---

## Feature 5 — Concrete intention trigger (when-cue)
**Audit:** placeholders are concrete cues, but `whenHints` (peakEnergyBlocks, time-bands "Morning · 6–9") override them in KeystoneSetup → ships bare clock time. Daily editor has zero helper text. `formatIntention("9am","X")` → "When 9am, I will X" (time-only accepted).

**Research:** contingent if-then works on *cues* (events/places), not clock times — schedule-format plans are weaker (d=.29 vs .43).

**Design:**
1. Drop time-band `whenHints` override in KeystoneSetup — use concrete cue placeholders only.
2. Add helper text to daily intention editor: "A cue works better than a clock: 'after coffee', 'at my desk'."
3. Add i18n keys; keep `timeAudit.peakEnergyBlocks` for the energy *time* question only (don't couple to intention trigger).

**Files:** `OnboardingSteps.tsx` KeystoneSetup whenHints; `TodayScreen.tsx` intention editor; i18n. No parser change (bare time still accepted — guard is guidance, not validation, per autonomy).

**Skipped (ponytail):** hard time-input guard in `parseIntention`. Add when analytics show time-only intentions underperform.

---

## Implementation order & coupling
1. **F3** first (isolated: CloseDayCard + held card only).
2. **F4** (focus zone + low-energy banner — touches TodayScreen focus branch).
3. **F1 + F2 together** (both ReEntryBanner; F1 adds Plan B line, F2 adds chips).
4. **F5** (KeystoneSetup + daily editor helper).

All in `TodayScreen.tsx` → **sequential, not parallel**, to avoid same-file conflicts. i18n in en.ts + id.ts (check language list). Verify tsc + vitest after each.
