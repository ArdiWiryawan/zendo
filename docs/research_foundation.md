# Zendo Research Foundation

Evidence-based human productivity research → translated into product principles and interventions for Zendo.

**Purpose.** Not "how do we make people do more?" But: how do we help people consistently spend their limited time, attention, and energy on what actually matters — without productivity becoming obsession, guilt, dependency, or burnout?

**Method.** Deep-research harness: 5 search angles (broad primary evidence, academic mechanisms, focus/energy, contrarian/skeptical, practitioner/product) → 24 sources fetched → 118 claims extracted → top 25 adversarially verified by 3 independent voters (kill on ≥2 refutes) → 23 confirmed, 2 refuted → synthesized.

**Evidence hierarchy used.** Meta-analyses / systematic reviews / RCTs first; academic books; expert frameworks; blogs last. Every major claim below carries source, year, type, key finding, limitation, confidence. Contradictory evidence is surfaced explicitly, not hidden.

---

## 1. Executive Summary — the 20 findings that matter most

| # | Finding | Confidence | Source |
|---|---------|-----------|--------|
| 1 | Goals have a small but real unique effect on behavior change (d=.34, RCTs only). Effect is stronger when goals are **difficult, public, group-set**. | high | Epton, Currie & Armitage 2017 (meta, 141 papers, N=16,523) |
| 2 | Goals alone are weak. **Planning techniques** (if-then implementation intentions, WOOP/MCII) add a small-to-medium effect on top. | high | Wang et al. 2021; Sheeran et al. 2025; Gollwitzer & Sheeran 2006 |
| 3 | Implementation intentions work across cognitive/affective/behavioral outcomes (d=.27–.66); **contingent "when X → then Y" beats schedule-format** (d=.43 vs .29). | high | Sheeran, Listrom & Gollwitzer 2025 (642 tests) |
| 4 | The true effect of MCII is likely ~0.24 after publication-bias correction, not 0.34. Treat effect sizes as **upper bounds**. | high | Wang et al. 2021 |
| 5 | MCII works better with live interaction (g=.465) than self-administered (g=.277) — but self-administered **still works** (Kizilcec & Cohen 2017, PNAS, two RCTs N=17,963). App scaffolding matters. | high | Wang et al. 2021 |
| 6 | Procrastination is **self-regulatory failure**, not laziness or time management. Predictors: task aversiveness, task delay, low self-efficacy, impulsiveness. | high | Steel 2007 (meta, 691 correlations) |
| 7 | Procrastinators discount the future (r=−.45 with future time perspective); **stress + low positive affect partially mediate** → procrastination is mood repair. | high | Sirois 2014 (meta, 14 samples, N=4,312) |
| 8 | Engagement-contingent rewards **undermine free-choice intrinsic motivation** (d=−.40). Verbal/competence feedback *enhances* it (d=+.33). | high | Deci, Koestner & Ryan 1999 (128 studies) |
| 9 | BUT: the claim "all rewards undermine intrinsic motivation" is **false** — additive cases exist. Reward design is not categorically prohibited, only rewarding already-valued behavior is risky. | high | Cerasoli, Nicklin & Ford 2014; Cameron & Pierce 1994 |
| 10 | Intrinsic motivation is the strongest predictor of well-being/attitudes (10 of 13 outcomes). **Meaning-based (identified) regulation beats intrinsic for performance** on tedious tasks. | high | Van den Broeck et al. 2021 (meta, 124 samples) |
| 11 | Introjected self-pressure (guilt, ego) "performs well at a well-being cost" — the **Janus face**. External regulation is least potent with well-being costs. | high | Van den Broeck et al. 2021 |
| 12 | Autonomous/intrinsic motivation is negatively associated with delay; controlled motivation and amotivation positively associated. **Autonomy-supporting framing is the anti-procrastination lever.** | high | Kim & Seo 2026 (meta, 64 studies, N=28,019) |
| 13 | Ego-depletion ("willpower as depletable resource") **failed to replicate** in a 23-lab preregistered RRR (d=.04). Willpower isn't a battery that empties. | high | Hagger et al. 2016 |
| 14 | Multitasking hurts individual task performance (d=−.62); **task complexity magnifies the damage**. Context switching is expensive. | high | Meta-analysis, 40 studies, 296 effect sizes |
| 15 | Time management is moderately associated with performance and wellbeing and negatively with distress (meta, 158 studies). | medium | Academic meta |
| 16 | Most-used behavior-change techniques in digital interventions: **self-monitoring, goal setting, prompts/cues**. | high | DBCI reviews |
| 17 | Real-world mental-health-app retention: **median 15-day retention 3.9%**. Most users abandon within 2 weeks. | high | Baumel et al. 2019 (NPJ) |
| 18 | Streak metrics **misrepresent compliance** (28/30 days with scattered misses = streak 3; 20/30 consecutive = streak 20). Streaks reward luck over behavior. | medium | Practitioner analysis |
| 19 | Continuous self-tracking can cause **anxiety that worsens the outcome** (orthosomnia). Tracking the metric changes the metric — badly. | medium | Baron et al. 2017, JCSM |
| 20 | Gamification (points/badges/leaderboards) raises engagement but can **undermine the activity itself** (Hanus & Fox: gamified students scored *lower*). | high | Hanus & Fox 2022 |
| 21 | "Engagement–Efficacy Gap": high app engagement does **not** translate to outcomes when design only optimizes momentary adherence. | high | Mental-health app literature |
| 22 | Ego-depletion has a boundary: intense 30–40 min demanding tasks DO show depletion (d=.31–.35). The model isn't dead; it's intensity-dependent. | medium | Dang et al. / replication literature |
| 23 | 12-week cycles operationalize **goal partitioning** (small remaining gap → higher effort), Cheema & Soman 2008. | medium | Cheema & Soman 2008 (JMR) |

**Two claims were tested and killed — do not use them:**
1. "Implementation intentions alone have d=.65 across all domains" (0–3 vote). The 2006 estimate did not survive; corrected d≈.15–.27.
2. "All expected tangible rewards undermine intrinsic motivation" (0–3 vote). Additive cases exist (Cerasoli 2014).

---

## 2. Why People Succeed or Fail — the model

The single most important reframe from this research: **people differ in goal attainment less by willpower and more by two evidence-backed levers.**

```
             LEVER 1 (planning)                LEVER 2 (emotional mechanics)
  Meaningful, difficult goal ──────────┐   Task aversiveness ↑ → procrastination
  Converted to if-then plan  ──────────┤   Mood repair (stress, low positive affect) ↑
  Environmental friction ↓    ──────────┼→  Self-efficacy ↓
  Scheduled ritual            ──────────┘   Impulsiveness, delay discounting ↑
```

**Mechanisms behind failure (not "lack of discipline"):**
- **Task aversion** — the #1 predictor. People avoid tasks that are boring, frustrating, ambiguous, or painful (Steel 2007).
- **Emotion regulation** — procrastination is short-term mood repair, "giving in to feel good" (Sirois 2014; Tice & Bratslavsky). It's not a time problem; it's a feeling problem.
- **Temporal discounting** — future rewards are discounted; the distant goal loses to the present temptation (Steel & König TMT).
- **Motivation quality** — controlled motivation (guilt, "should", external pressure) predicts delay; autonomous motivation predicts action (Kim & Seo 2026).

**Mechanisms behind success:**
- **Meaning** — identified regulation (the goal connects to who I am / what matters) sustains effort where enjoyment fails (Van den Broeck 2021).
- **Concrete planning** — converting intention to if-then automates action initiation, offloading willpower (Sheeran 2025).
- **Friction reduction** — environment design beats self-control (context over character).
- **Competence feedback** — verbal/competence feedback (not rewards) increases intrinsic motivation (Deci 1999).

**Toxic productivity** is distinct from burnout but feeds it — internal pressure to be productive at all times, prioritizing the list over wellbeing, with reduced satisfaction from the work itself. The success model must *diagnose* failure (why?) not *command* effort (try harder!).

---

## 3. The Science of Productivity — what the evidence says

### 3.1 Goals

| Framework | Evidence | Verdict |
|-----------|----------|---------|
| **SMART** | Practitioner-derived. Specificity/measurability partially supported; achievability/relevance/time-bound weakly tested. | **Weak evidence, but specific goals work.** Don't claim SMART works; claim "specific + difficult goals work." |
| **OKR** | Corporate. No controlled evidence for the 3-mo cadence; goal-partitioning research (Cheema & Soman) supports the *cycle* idea. | Use the **cadence**, not the acronym. |
| **WOOP / MCII** | g=.336 (pub-bias-corrected ~.24); works self-administered, better live. | **Strongest goal technique.** |
| **Implementation intentions** | d=.27–.66 across outcomes; contingent > schedule; RoBMA-corrected d≈.15. | **Strongest planning technique.** |
| **Process vs outcome goals** | Outcome goals focus attention; process goals are what you actually control daily. | **Design insight:** hold outcome as meaning, act on process. |
| **Goal hierarchy** | Not directly tested, but hierarchy is the mechanism by which meaning (top) reaches action (bottom). | **Structural assumption**, supported by identified-regulation evidence. |

**Anti-goals / constraints / release.** Epton's moderator analysis (difficult, public, group) plus the "small area hypothesis" (Cheema & Soman) imply: **the fewer goals competing for attention, the larger the perceived gap-to-close on each** — which raises effort. Eliminating goals is not just mental hygiene; it's a lever on motivation. Supporting: Parkinson's-law-style deadline studies are mixed (Ariely & Wertenbroch failed replication), so use constraints as *scope reduction*, not manufactured deadlines.

### 3.2 Habits
- The habit loop (cue→routine→reward) is the popular frame; the **evidence-backed lever is environment design + implementation intentions**, not tracking.
- Self-monitoring is the single most-used BCT in effective digital interventions — but see Finding 19 (tracking can backfire into anxiety). **Monitor behavior, not outcomes; celebrate process, not streaks.**
- Habit formation time varies wildly (median ~66 days, range 18–254) — never promise "21 days." Zendo's season cadence is right; do not promise habit permanence.

### 3.3 Focus / Deep Work
- **Multitasking is a tax (d=−.62), complexity amplifies it.** Single-tasking per block is non-negotiable.
- **Ego-depletion largely failed replication** — so "save your willpower" narratives are wrong. The lever is *attention management* (reduce switches), not *willpower budgeting*.
- Attention residue (Leroy's switching costs) and the "start small, don't overschedule" insights favor **shorter focus blocks over heroic long ones**. Do NOT assume longer = better. Pomodoro-style segmentation is the safer default; longer blocks are an advanced user preference.
- No controlled evidence that any single block length (25/50/90/120 min) is optimal. Presets are a UX convenience, not a scientific claim.

### 3.4 Prioritization
- Pareto/80-20 is a **descriptive heuristic**, not a law. Its value: forces explicit opportunity-cost thinking. Its trap: users apply it to tasks when it applies to *outcomes*; and it can be used to rationalize avoidance of the important-but-hard 20%.
- The evidence-backed prioritization is **Eisenhower-style urgency/importance** only as a triage funnel, plus **opportunity cost framing** ("what will I NOT do?") — which Zendo's "release" step already does.

### 3.5 Energy vs Time vs Attention
- Time management helps (d≈.4, 158 studies), but **attention and energy are the scarce resources** for knowledge work.
- Task × energy matching (do deep work at peak, admin at trough) is supported by circadian-energetics literature — but only weakly tested in consumer apps. Zendo's energy check is directionally right; make it *prescriptive* (suggest task difficulty), not just *recorded*.

### 3.6 Procrastination → interventions ranked by evidence

| Intervention | Evidence | Strength |
|--------------|----------|----------|
| Implementation intentions | d=.27–.66; contingent best | ★★★ |
| Reduce task aversiveness (decompose, make it smaller, clearer) | Steel: aversiveness = #1 predictor | ★★★ (mechanism, indirect) |
| WOOP / MCII (mental contrasting) | g=.336 | ★★★ |
| Autonomy-supporting framing | Kim & Seo 2026 | ★★ |
| Environmental design / friction removal | Habit/context research | ★★ |
| External deadlines | Mixed; Ariely & Wertenbroch failed replication | ★ |
| Rewards for doing the task | Undermines intrinsic motivation when engagement-contingent | ✗ risky |
| Streaks | Misrepresent compliance; exploit intermittent reinforcement | ✗ avoid |

---

## 4. Philosophy of Productivity — with the evidence separated from the tradition

**Zen/Buddhism.** The operational findings in this research *converge* with classical insight, but the mechanisms differ — do not fuse them.

- *Non-attachment / impermanence* ↔ "outcome goals get you trapped; process is what you control." Evidence support: identified regulation (meaning) beats outcome-fixation; goals should be held lightly and re-decided (Zendo's season archiving). **Tradition provides the reframe; evidence provides the mechanism.**
- *Present-moment attention* ↔ attention management, flow, single-tasking. Mindfulness practice has an independent evidence base (MBSR reviews) but is **not** a productivity lever per se — it's a well-being lever that incidentally helps focus.
- *Right effort* ↔ "the effort that goes in the right direction and the right amount" — directly opposes toxic productivity's "more effort always." This is the philosophical home of Zendo's "moved quietly" language.
- *Simplicity / minimalism / essentialism* ↔ constraint and focus research. **What you release is as important as what you commit to.** This validates Zendo's elimination step philosophically AND behaviorally (fewer goals → larger perceived gap → more effort per goal).

**Risk to avoid:** don't sell Buddhism as a productivity hack. Use the *language* of intention, release, rest — the ritual framing Zendo already has — and let the *mechanisms* (implementation intentions, friction, autonomy) carry the behavior change. Where the tradition and evidence conflict (e.g., "effortless action" vs "implementation intentions require effort upfront"), state both honestly: the effort is *front-loaded* into planning so execution can be automatic — which is closer to Zen's "training then forgetting."

---

## 5. Framework Comparison — evidence-based

| Framework | Problem solved | Evidence | Strength | Weakness | Best context | Zendo opportunity |
|-----------|---------------|----------|----------|----------|--------------|-------------------|
| Implementation intentions | Intention→action gap | ★★★ meta, 642 tests | Contingent if-then is the single best-known action trigger | Effect shrinks under pub-bias correction; needs rehearsal | Every task, daily | **Already core** (`when` + `i will` fields). Make contingent explicit. |
| WOOP/MCII | Motivation + planning | ★★★ meta, 21 studies | Combines desirability check (motivation) with obstacle planning | Delivery matters; works better live | Season/goal setup | Onboarding + season restart: wish→obstacle→plan |
| Goal setting (difficult/public) | Direction + effort | ★★ meta, RCT-only | Small robust effect | Small; quasi-observational moderators | Season goals | Goals exist; add a "why/publish" nudge |
| Time management | Chaos | ★★ meta, 158 studies | Broad wellbeing link | Correlation; shallow | General | Zendo is ritual-based (time is secondary) — keep it |
| Pomodoro/focus blocks | Attention | ★★ (multitasking cost meta) | Bounded attention; the *blocks* are the evidence, the *25 min* is not | Arbitrary length | Deep work | Focus presets exist; present as "block," not dogma |
| GTD | Capture anxiety | ★ practitioner | Capture = cognitive offload (well-supported in cognition) | Complex; maintenance-heavy | Inbox overflow | Zendo's brain-dump step is the capture GTD gets right |
| Eisenhower | Prioritization | ★ heuristic | Forces triage | Binary; misused | Triaging | Weak fit; Zendo's release/anti-goal is stronger |
| Time blocking | Attention allocation | ★★ | Precommits attention; prevents switching | Rigid; fails on unexpected events | Predictable days | Week screen allocates goal days — good |
| Atomic Habits 4Laws | Habit formation | ★★ | Environment design is evidence-adjacent | Popular framing ≠ validation | Routine behaviors | Zendo's ritual framing aligns |
| 12-Week-Year | Goal cadence | ★★ (partitioning) | Cycle + urgency | No controlled trials of the *method* | Big goals | **Zendo IS this** (season). Drop the "year, but compressed" sales pitch |

**Complementary:** implementation intentions + WOOP + goal partitioning (all fit Zendo's season→intention→action chain).
**Overlapping/conflicting:** GTD's exhaustive capture vs Essentialism's ruthless elimination (Zendo picks elimination — correct per evidence).
**Outdated/unsupported:** "willpower budgeting" (ego-depletion failed RRR); "21-day habits" (false); "all rewards undermine motivation" (false).

---

## 6. Integrated Productivity Model — recommended for Zendo

Evidence supports, with modifications:

```
MEANING  (why this matters — identified regulation, sustains tedious effort)
   ↓
VISION   (light, re-decided — avoid outcome-fixation)
   ↓
GOALS    (few, difficult, specific, public-ish — Epton moderators)
   ↓
RELEASE  (anti-goals — scope reduction raises perceived gap → effort)
   ↓
CYCLE    (12-week season = goal partitioning, small-remaining-gap)
   ↓
NEXT ACTION (contingent if-then: "when X, I will do Y" — the action trigger)
   ↓
EXECUTE  (single-tasking focus blocks, task×energy matching)
   ↓
CLOSE    (reflect: what moved, what blocked, what's easier tomorrow)
   ↓
ADAPT    (weekly/monthly review → re-decide goals, not "try harder")
   ↓
REST     (first-class, not failure — recovery is production)
```

**Deliberate deviations from the naive chain (evidence-based):**
1. **Vision is lightweight.** Long vision documents are not evidence-backed and invite rumination. One sentence.
2. **Anti-goals between goal and priority** — yes. Elimination raises per-goal effort.
3. **Process > outcome at action layer.** Outcome belongs in the goal; the daily action must be a *process* you control.
4. **Rest is in the loop, not after it.** Recovery is part of the mechanism, not a reward for finishing.
5. **Reflection is bounded.** Daily close + weekly review, not continuous self-surveillance (see orthosomnia risk).

---

## 7. Failure Modes — what the system must prevent

| Failure | Cause | Mechanism | Symptom | Intervention | Product implication |
|---------|-------|-----------|---------|--------------|---------------------|
| Too many goals | No elimination | Divided attention; diluted perceived gap | Overwhelm | Enforce release step; cap focus goals | Keep the one-focus-goal mechanic |
| Streak anxiety | Streak UI | Missed day = identity failure; intermittent-reinforcement slot machine | Abandonment at first miss | **Never show streaks.** Show "held" / "released" | Already absent — keep absent |
| Productivity theater | Metrics count | Task-completion ≠ outcome | Fake progress | Track outcomes + reflection, not counts | Emphasize close-day journal over checkmarks |
| Gamification obsession | Points/XP/badges | Extrinsic substitutes intrinsic (deci: d=−.40 free-choice) | Chase points, not meaning | No XP. Feedback = competence, not score | Zen bell, not confetti |
| Metric fixation / orthosomnia | Over-tracking | Tracking anxiety worsens the metric | Burnout | Measure sparsely; make tracking optional | Energy check is 1 tap — good |
| Burnout | No recovery | Continuous load, no adaptation | Exhaustion | Rest days; energy-aware suggestions | Rest is first-class — good |
| Wrong metrics | Vanity KPIs | App measures engagement not outcomes | Self-deception | Measure meaning-retention + re-deciding | See §11 |
| App dependency | App becomes the will | Planning outsourced → no internal plan | Can't function without app | Teach the method; make rituals exportable | Offboarding/review language |
| Notification overload | Growth-team nudges | Attention residue; demand on user | Uninstall | Few, contextual, user-set | Sparse by design |

---

## 8. Product & UX Translation — the full bridge

### F1. Contingent intentions (highest leverage)
- **Finding:** if-then contingent plans (d=.43) beat schedule plans (d=.29); effect across 642 tests.
- **Behavioral mechanism:** if-then creates a situational cue → action link, automating initiation, offloading deliberation at the moment of choice.
- **Human problem:** "I know what to do, I don't start."
- **Design principle:** every day-plan should encode a *trigger* + *action*, not just an action.
- **Zendo today:** `parseIntention` splits "when" + "i will" — **already the right shape.** 
- **Gap:** the "when" is free-text and optional. Product opportunity: make the trigger concrete (place or event, not just time); if the user writes only "later," prompt with a specific cue.
- **UX pattern:** two-field intention editor (exists) + a one-tap "suggest a trigger" from the last focus time / energy.
- **Success metric:** % of day-plans with both a specific trigger and action; journaled close-days following intentions.

### F2. Mental contrasting at season setup
- **Finding:** WOOP/MCII g=.336; works self-administered, better with live interaction.
- **Mechanism:** contrasting the desired future with the inner obstacle energizes action only when the obstacle is surmountable; the if-then then binds the response.
- **Human problem:** goals set in enthusiasm die at the first obstacle.
- **Design principle:** at goal creation, elicit the *obstacle* — not just the dream.
- **Zendo today:** onboarding has goal brain-dump, release, focus-goal, why. **No obstacle step.**
- **Product opportunity:** add a short "What could get in the way?" field per focus goal, then auto-generate an if-then: "When [obstacle cue], I will [plan B]." This is the single highest-leverage missing step.
- **UX pattern:** after goal chosen, 2-question step (biggest obstacle → my response if it happens). ~20 seconds.
- **Success metric:** season goal survival rate; release->obstacle-answered rate.

### F3. Autonomy-supporting framing everywhere
- **Finding:** autonomous motivation negatively predicts delay (Kim & Seo 2026); controlled framing positively predicts it. Introjected guilt "works but costs wellbeing" (Van den Broeck 2021).
- **Mechanism:** internalized value (identified regulation) drives persistence where guilt depletes.
- **Human problem:** "should" language breeds guilt-driven action that collapses.
- **Design principle:** all copy must be autonomy-supportive — choice, not "should." Never guilt ("you missed 3 days").
- **Zendo today:** language is already "held," "moved quietly," "released." **Protect this fiercely** as the app scales.
- **Product opportunity:** error/empty states and re-engagement copy must never shame. When a user misses a day, the response is diagnostic ("what got in the way?") not corrective ("get back on track!").
- **UX pattern:** miss-day state = one question + rest suggestion.
- **Success metric:** sentiment of journal entries; re-engagement after misses (not after streaks).

### F4. Competence feedback, not rewards
- **Finding:** verbal/competence feedback raises intrinsic motivation (d=+.33); engagement-contingent rewards lower it (d=−.40).
- **Mechanism:** feedback satisfies competence need (SDT); rewards reattribute the cause of action to the reward.
- **Human problem:** apps turn meaning into points; users become point-chasers.
- **Design principle:** feedback on *competence and progress toward meaning*, never score.
- **Zendo today:** zen bell, calm toasts, "days on goal" allocation. **Right direction.**
- **Product opportunity:** after close-day, surface a competence sentence ("You chose and held your intention today") grounded in *their own journal*, not aggregate stats.
- **UX pattern:** post-close reflection summary quoting their words.
- **Success metric:** journal depth; free-choice return behavior without notifications.

### F5. Energy-aware task matching
- **Finding:** attention/energy ≠ time; task aversiveness predicts avoidance; mood repair drives procrastination.
- **Mechanism:** matching task difficulty to current energy reduces perceived aversiveness and failure.
- **Human problem:** users plan deep work for their lowest-energy hour, then quit and feel guilty.
- **Design principle:** energy check should *prescribe* not just record.
- **Zendo today:** energy check exists; the focus card shows a low-energy warning. 
- **Product opportunity:** low-energy → suggest a smaller action or rest, explicitly. Match "today's one action" difficulty to the logged energy.
- **UX pattern:** energy selection → card content adapts (deep work vs. small step vs. rest).
- **Success metric:** intention completion by energy; rest-day uptake on low energy.

### F6. Reflection with guardrails
- **Finding:** close-day and weekly review are the least evidence-tested surface (open question #2); over-tracking causes anxiety (orthosomnia).
- **Mechanism:** reflection enables plan–execute–adapt; but self-surveillance without adaptation becomes rumination.
- **Human problem:** users journal until it feels like homework, then quit entirely.
- **Design principle:** reflection must *change the next plan* or it's dead weight. Never add a prompt without a feedback path.
- **Zendo today:** close-day (whatMoved, tomorrow carry), weekly review card, journal packs. Strong base.
- **Product opportunity:** tie every reflection prompt to a downstream action ("your answer on X updated your week plan"). Skip = fine, never shamed.
- **UX pattern:** after close-day, show "tomorrow now planned with: [their words]."
- **Success metric:** % of reflections that produce a plan change; reflection drop-off at 2 weeks (benchmark 3.9% retention).

### F7. Rest as production (anti-burnout)
- **Finding:** burnout is the failure mode; toxic productivity is the pathology; recovery is mechanism.
- **Mechanism:** sustained load without adaptation → exhaustion → abandonment.
- **Human problem:** users feel resting = failing; the app must make rest *the plan*, not the fallback.
- **Zendo today:** rest days are first-class (rest dayType, quiet recovery card). **This is a differentiator.**
- **Product opportunity:** on low energy or after N consecutive goal-days, *suggest* a rest day proactively (user decides). Frame as protection, not laziness.
- **UX pattern:** gentle rest suggestion with autonomy (always dismissible).
- **Success metric:** rest-day quality (reflection present); burnout signals (skip-everything streaks).

---

## 9. Feature Opportunities — prioritized

**Must have (evidence-anchored, low effort):**
1. **Obstacle step in goal setup (F2)** — the highest-leverage missing step. 2 fields, auto-if-then.
2. **Contingent-trigger prompt (F1)** — make "when" concrete; suggest a trigger.
3. **Competence close-day summary (F4)** — quote their own journal, no stats.
4. **Autonomy-safe miss-state (F3)** — diagnostic question, not scolding.

**Should have:**
5. **Energy-prescriptive card (F5)** — adapt the day's action difficulty to logged energy.
6. **Rest suggestion on low-energy / goal-streak (F7)** — proactive, dismissible.
7. **Reflection→plan feedback loop (F6)** — show how their words changed tomorrow/week.
8. **Weekly review prompts that re-decide, not re-commit.**

**Could have:**
9. WOOP structure in season restart screen.
10. "Release" as a recurring ritual, not just onboarding.
11. Exportable ritual (teach the method → reduce dependency).

**Avoid (evidence says don't):**
- ❌ Streaks, XP, points, badges, leaderboards.
- ❌ "21-day habit" claims.
- ❌ Deadlines-as-punishment.
- ❌ Reward-toasts for completing tasks.
- ❌ Notification spam / engagement KPIs.

---

## 10. Measurement Framework

**The wrong metrics (vanity):** DAU, sessions, tasks completed, hours focused, streaks, XP, "engagement."

**The right metrics — measure meaning, adaptation, sustainability:**

| Layer | Metric | Why |
|-------|--------|-----|
| Setup | % goals with obstacle answered | F2 adoption |
| Planning | % plans with contingent trigger+action | F1 adoption |
| Action | Intention completion; task×energy match rate | Effectiveness |
| Reflection | Close-day completion; % reflections that changed a plan | Adaptation |
| Sustainability | Rest-day uptake on low energy; 30/60/90-day retention (benchmark: beat 3.9% 15-day) | Durability |
| Wellbeing | Burnout signal (skip-everything streaks, negative-journal sentiment) | Safety |
| Autonomy | % users who re-decide goals at season end (not abandon) | Healthy relationship |

**North-star guardrail for every metric:** does it improve meaningful outcomes, sustainable behavior, autonomy, and reduce cognitive load — or does it just make the app engaging?

---

## 11. Risks & Ethical Considerations

- **Burnout / toxic productivity** — the product must never incentivize more hours over better direction. Copy and mechanics must keep "rest is production."
- **Dependency** — if the app becomes the only place the plan lives, the user can't function without it. Design to teach the method (exportable, printable ritual).
- **Gamification** — engagement-contingent rewards measurably undermine intrinsic motivation (Deci 1999). No XP/streaks/badges. Feedback = competence, never score.
- **Privacy** — journal content is deeply personal. On-device-first, explicit sync, no behavioral ad data.
- **Manipulation** — notification nudges and "streak-saving" tactics are coercive by the evidence (controlled motivation → delay). Default to *user-set* reminders, sparse.
- **Measurement of mood/energy** — energy tracking can drift into self-surveillance. Keep it a 1-tap, optional, non-judgmental input; never turn it into a score.
- **Orthosomnia risk** — any self-tracking can breed anxiety. Reflection is bounded (daily close + weekly review), never continuous.

---

## 12. Research Gaps — what remains uncertain

1. **Reflection cadence** — no controlled evidence on optimal journal/review frequency. Zendo's close-day + weekly is a reasonable prior; test it. (open Q from harness)
2. **Streak anxiety** — the "streaks cause anxiety" claim is correlational/anecdotal; no longitudinal RCT of streak mechanics exists. The lab evidence (engagement-contingent reward undermining) is the closest proxy. Directionally safe to avoid streaks; claim is *plausible*, not proven.
3. **Meaning (identified regulation) in personal, non-work goals** — the intrinsic-vs-identified performance finding is workplace data; transfer to personal goals is extrapolation.
4. **WOOP delivery gap** — how much app scaffolding (guided prompts, ritual, recurrence) can close the live-interaction advantage? Unresolved.
5. **Task×energy matching in consumer apps** — circadian energetics support it in principle; no consumer-app RCT.
6. **Ego-depletion boundary** — RRR says null; intense-manipulation studies say real. The safe product takeaway (attention management over willpower budgeting) holds regardless.

---

## 13. Final Recommendations — highest-impact changes

1. **Add the obstacle step (WOOP) to goal setup.** Elicit obstacle + plan-B → auto-generate the if-then. Highest leverage, ~20s of onboarding, directly supported by MCII meta. *(F2)*
2. **Make the daily intention truly contingent.** The two-field "when/i will" is correct; require a concrete trigger (place/event) and offer a suggestion. *(F1)*
3. **Close-day: quote their words back as competence feedback.** Replace any aggregate stats with their own reflection echoed as confirmation. *(F4)*
4. **Make miss-states diagnostic, never shaming.** One question ("what got in the way?") + a rest suggestion. Autonomy-preserving copy everywhere. *(F3)*
5. **Energy check → prescriptive.** Low energy adapts the suggested action (deep work → small step → rest). *(F5)*
6. **Proactive rest suggestion** on low energy or N goal-days. Dismissible; rest stays the plan, not the fallback. *(F7)*
7. **Protect the anti-gamification stance as a feature.** No streaks/XP/badges. It's a differentiator against the streak-anxiety apps, and it's the evidence-supported position.
8. **Bound reflection.** Every prompt must feed a plan change or be skippable. Never let journaling become homework.

**North star:** Zendo's job is not to make people do more. It is to help people consistently spend their limited time, attention, and energy on what actually matters — and to make the miss, the low-energy day, and the rest day as legitimate as the held intention. The research says the app should diagnose *why* someone stalled, never tell them to "try harder."
