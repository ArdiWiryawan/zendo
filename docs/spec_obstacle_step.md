# Spec — Obstacle + Mitigation Step (WOOP)

Auto-if-then from obstacle → plan B. Highest-leverage research finding (F2) from `docs/research_foundation.md`.

## Evidence

- WOOP / mental contrasting with implementation intentions: **g=.336** (pub-bias-corrected ~.24), works self-administered (Wang, Wang & Gai 2021, meta 21 studies / N=15,907; Kizilcec & Cohen 2017 PNAS).
- Implementation intentions: **d=.27–.66**, contingent if-then > schedule (Sheeran, Listrom & Gollwitzer 2025, 642 tests).
- Task aversiveness = #1 procrastination predictor (Steel 2007). Eliciting the obstacle at goal setup pre-binds a response, so the aversive moment is already answered.

**Mechanism:** contrasting desired future against the inner obstacle energizes action *only when* the obstacle is surmountable; the if-then binds the response ("when X happens, I will do Y") — automating initiation and offloading deliberation at the moment of choice.

## Existing codebase assets (reuse, don't create)

| Asset | Location | State |
|-------|----------|-------|
| `routes.onboardingObstacleMitigation = "/onboarding/obstacle-mitigation"` | `src/constants/routes.ts:31` | defined, **unused** |
| `OnboardingState.obstacleMitigations: Record<string, string>` | `src/types/app.ts:453` | defined, **never written** |
| `createDefaultOnboarding` seeds `obstacleMitigations: {}` | `src/constants/defaultData.ts:98` | present |
| `onboarding.obstacles: string[]` | season-level, from `PastObstacles` step | distinct — do NOT conflate |
| Per-goal `Record<goalId,string>` pattern: `goalWhys`, `keystoneActions` | `KeystoneSetup.tsx` | mirror this exactly |

**Semantic separation (important):**
- `onboarding.obstacles` = season-level, from `PastObstacles` (general "what usually kills momentum") → persists to `season.obstacles`.
- **New** per-goal obstacle + mitigation = the WOOP step → persists to `Goal` fields. Different granularity, different lifecycle (per-goal, follows the goal into future seasons).

## Data model changes

### 1. `src/types/app.ts` — Goal type

Add two optional fields after `why` (line ~77):

```ts
export type Goal = {
  // ...existing
  /** Biggest inner obstacle expected for this goal. */
  obstacle?: string;
  /** If-then response: "when [obstacle], I will [plan B]". */
  obstacleMitigation?: string;
  // ...
};
```

### 2. `src/types/app.ts` — OnboardingState

`obstacleMitigations: Record<string, string>` **already exists** (line 453). Reuse. No change.

## Onboarding flow

### 3. New store action — `src/store/useMonkStore.ts`

Mirror `setKeystoneAction` (line 637). Add after it:

```ts
setObstacleMitigation: (goalId, mitigation) => {
  const state = get();
  set({
    onboarding: {
      ...state.onboarding,
      obstacleMitigations: { ...state.onboarding.obstacleMitigations, [goalId]: mitigation }
    }
  });
},
```

### 4. New step component — `src/screens/OnboardingSteps.tsx`

Name: `ObstacleStep`. Mirror `KeystoneSetup` structure exactly (per-goal Card, iterate `selectedFocusGoalIds`, `ScreenIntro` + bottom `PrimaryButton`).

Behavior:
- For each focus goal, two inputs:
  1. **"What might get in the way?"** — placeholder: "Feeling tired / no time / bored / unsure where to start…"
  2. **"When that happens, I will…"** — placeholder: "do just 5 minutes / start the smallest step / pause and reset". Auto-generated if-then preview rendered live under the inputs: `"When [obstacle], I will [mitigation]."`
- Optional (no validation gate — do not block progression). Research: MCII still works partially-complete; blocking onboarding over optional fields increases abandonment risk (context: 3.9% median 15-day retention).
- Save shape: `{ [goalId]: formatIntention(obstacle, mitigation) }` — reuse `formatIntention` so it parses back via `parseIntention` consistently with keystone actions.
- Subtle copy (autonomy-supportive, per F3): never "if you don't fill this you'll fail." Title: "What could get in the way?" Subtitle: "Naming it once makes the hard day easier. Optional."

### 5. Wire routing — `src/app/App.tsx`

Two edits in `OnboardingScreen`:
1. Add render branch after KeystoneSetup (line 380):
   ```tsx
   {path === routes.onboardingObstacleMitigation ? <ObstacleStep onNext={goNext} /> : null}
   ```
2. Add to `phaseForStep` "Focus" group (line 363):
   ```ts
   if (stepPath === routes.onboardingVision || stepPath === routes.onboardingNarrow || stepPath === routes.onboardingKeystone || stepPath === routes.onboardingObstacleMitigation || stepPath === routes.onboardingWeekSetup) return "Focus";
   ```

### 6. Insert into order — `src/constants/routes.ts`

`onboardingOrder`: after `onboardingKeystone`, before `onboardingWeekSetup` (line 61–62). Rationale: keystone defines the daily action, then obstacle hardens it, then weekly allocation schedules it. Sequence: keystone → obstacle-mitigation → week-setup.

### 7. Persist — `src/store/useMonkStore.ts`, `createSeasonFromOnboarding` (line ~679)

In the `goals` map, after `why`:

```ts
obstacle: parseObstacle(onboarding.obstacleMitigations[draft.id])?.obstacle || undefined,
obstacleMitigation: parseObstacle(onboarding.obstacleMitigations[draft.id])?.mitigation || undefined,
```

Add a small parser alongside `parseIntention` (in `src/lib/implementationIntention.ts`) — `parseObstacle` splits `"When X, I will Y"` back into `{ obstacle, mitigation }`. **If a single-token separator is already available** (formatIntention's existing delimiter), reuse it instead of a new parser — prefer the edge-case-correct option, no duplication.

Also append mitigation to the `goalCreatedEvents` timeline description when present (optional, low effort): `"…obstacle: "X", plan B: "Y"`.

## Validation

- `src/lib/validation.ts` — **no new validator.** Step is optional. Do not add a hard gate (research: optional WOOP still helps; forcing adds friction + guilt, contradicts F3).
- Existing `scorePlan` untouched.

## Testing

- `src/constants/routes.test.ts` — existing test asserts `onboardingOrder`; update expected array to include the new step.
- New small unit test: `parseObstacle` round-trips `formatIntention` output (assert-based, no framework needed).
- No E2E needed for a single optional onboarding step (guard: keep it out of scope unless build fails).

## Ship scope (ponytail ceiling)

In v1: **onboarding only.** The Goal fields persist but are not yet surfaced post-onboarding.
- **Skipped:** surfacing obstacle + mitigation on Today/Week cards, editing after setup, re-WOOP at season end.
- **Add when:** research-foundation F6 loop matures — show the mitigation at the low-energy moment (TodayScreen low-energy branch is the natural anchor). That is where the if-then pays off: exactly when the obstacle cue fires.

## Success metrics (from foundation §9–10)

- % focus goals with obstacle+mitigation answered (adoption).
- % users reaching preview (funnel drop, guard against regression).
- Season goal survival; miss-day re-engagement (downstream, later).

## Risks

- **Conflating with `onboarding.obstacles`** — keep separate. Season-level vs goal-level.
- **Forcing completion** — violates autonomy principle (Kim & Seo 2026: controlled framing → delay). Must be optional, skippable, non-shaming.
- **Punishing low quality** — a weak mitigation is fine; the act of naming the obstacle is the intervention.
