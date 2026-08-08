# Zendo

A calm, season-based focus app. One theme a day, one action per theme, rest protected, relapse treated as data — not failure. Make space for what matters.

Zendo is not a task manager and not a streak-chasing habit tracker. It is a place to commit to a few goals for a season, show up for one thing each day, and be honest with yourself about how it went — without guilt when it doesn't.

## What it does

- **Season & goals** — pick one to three goals per 12-week season, each with a "why", a one-line vision, and a release step (what you will *not* do).
- **One-theme Today** — each day holds one focus theme and one main action. Not a list.
- **Focus blocks** — timed focus sessions with ambient soundscapes and a quiet close (a bell, not confetti).
- **Journal & morning pages** — brain-dump capture, daily close-day reflection ("what moved, what blocked"), optional journal packs.
- **Rest days** — one rest day per week by default, first-class in the calendar. Rest is part of the plan, not a fallback.
- **Timeline** — a visual history of the season: days held, rest days, focus and reflection events.
- **Optional cloud sync** — local-first by default; sync to Supabase is opt-in.

Honest framing: this is a **local-first, mobile-first PWA**. It works offline. Your journal lives on your device first; cloud sync is optional and explicit.

## Who it's for

People who keep fighting their phone for attention, who scatter goals across a dozen apps and finish none of them, and who want *fewer commitments done deeper* rather than more commitments half-started. If you're tired of streak guilt — the day you miss silently breaking the chain and the app telling you to "get back on track" — Zendo deliberately does not do that. Streaks were reframed as **returns**: a miss is a return point, not a reset. The app's job is to help you diagnose why you stalled, never to tell you to try harder.

## Evidence base

Zendo's design is grounded in verified research — meta-analyses, RCTs, and systematic reviews first. Full report: [docs/research_foundation.md](docs/research_foundation.md). The most load-bearing findings:

1. **Implementation intentions** — contingent "when X → then Y" plans are the strongest known action trigger (d ≈ .43 for contingent vs .29 for schedule format; 642 tests). Zendo's daily plan is a trigger + one action.
2. **Procrastination is mood repair, not laziness** — task aversiveness is the #1 predictor of delay, and procrastination functions as short-term mood regulation (Steel 2007; Sirois 2014). So the app reduces task size and treats a skip diagnostically, not as a character flaw.
3. **Rest is production** — burnout is the failure mode of productivity systems; recovery is part of the mechanism. Rest days are structural, not a reward for finishing.
4. **Anti-guilt framing** — engagement-contingent rewards and introjected "should" pressure measurably undermine intrinsic motivation (Deci 1999; Van den Broeck 2021), and streaks misrepresent real compliance. Hence: no streaks, no XP, no badges, no points. Competence feedback and calm language instead.

## Tech stack

React 18 + TypeScript, Vite, Zustand, Tailwind CSS, PWA (offline-first via `vite-plugin-pwa`), Supabase for optional sync, Vercel for hosting. Music handled client-side; payments via Mayar for optional journal packs.

```bash
npm install       # install dependencies
npm run dev       # local dev server (vite)
npm run build     # type-check + production build
npm run lint      # type-check only (tsc --noEmit)
npm test          # run the vitest suite
npm run preview   # preview the production build locally
```

Deploy: `npx vercel --prod --yes`.

## Project status & roadmap

**Built** — core loop: onboarding → season setup (goals, release, obstacle) → daily Today screen (theme, one action, energy check) → focus blocks with soundscapes → close-day reflection → weekly review → rest days → season reflection → re-decide. Timeline, journal, morning pages, focus presets, optional Supabase sync, and local-first storage are all working.

**Next** — contingent-trigger suggestions, energy-prescriptive day card, proactive rest suggestions, reflection-to-plan feedback, journal packs polish and checkout reliability.

**Known limitations**

- Mobile-first PWA; desktop is functional but not the primary target.
- Local-first by default — cloud sync is optional and must be enabled; no cross-device realtime yet.
- No streak/XP/gamification by design (see Evidence base) — if you're optimizing for engagement metrics, this is not it.
- Monetization is intentionally light: optional paid journal packs only. The core focus loop stays free.

---

Made with a quiet bell, not confetti.
