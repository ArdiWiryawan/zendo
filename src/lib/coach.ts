import { getDayNumber } from "./date";

export const COACH_STORAGE_KEY = "zendo_coach_v1";

/** The four steps that walk a new user through their first day. Situational:
 *  each applies only while the thing it points at is still missing. */
export type CoachDayStepId = "pickTheme" | "intention" | "focus" | "close";

/** Concept steps. These teach the vocabulary the app assumes — Highlight, Main
 *  Action, Agenda — and are gated on first encounter rather than on a season
 *  day, so a user who onboarded long ago but has never been shown one still
 *  gets it. Once. */
export type CoachConceptStepId = "highlight" | "mainAction" | "agenda";

export type CoachStepId = CoachDayStepId | CoachConceptStepId;

/** The day steps in preference order. */
export const COACH_DAY_STEP_ORDER: readonly CoachDayStepId[] = [
  "pickTheme",
  "intention",
  "focus",
  "close"
];

/** The concept steps in preference order. */
export const COACH_CONCEPT_STEP_ORDER: readonly CoachConceptStepId[] = [
  "highlight",
  "mainAction",
  "agenda"
];

/** Every step in preference order. Day steps lead; concepts follow. */
export const COACH_STEP_ORDER: readonly CoachStepId[] = [
  ...COACH_DAY_STEP_ORDER,
  ...COACH_CONCEPT_STEP_ORDER
];

type CoachDismissMap = Partial<Record<CoachStepId, true>>;

function loadDismissed(): CoachDismissMap {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(COACH_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CoachDismissMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function isCoachStepDismissed(step: CoachStepId): boolean {
  return loadDismissed()[step] === true;
}

export function dismissCoachStep(step: CoachStepId): void {
  if (typeof localStorage === "undefined") return;
  try {
    const next = { ...loadDismissed(), [step]: true as const };
    localStorage.setItem(COACH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export type CoachContext = {
  seasonStartDate: string;
  seasonStatus: string;
  today: string;
  hasPlan: boolean;
  hasIntention: boolean;
  hasFocus: boolean;
  dayClosed: boolean;
};

/**
 * Highest-priority coach step, or null when none applies.
 *
 * Two kinds of step, two gates:
 *  - the four first-day steps are situational and keep their first-week window,
 *    so a brand-new user still gets the same walkthrough in the same order;
 *  - the concept steps are gated on FIRST ENCOUNTER, not on the season day, so
 *    a user who onboarded long ago but has never seen Highlight / Main Action /
 *    Agenda still gets each one — once.
 *
 * Two hard stops for both kinds: a season that is not active (or has not begun)
 * never coaches, and a dismissed step never returns.
 */
export function getCoachStep(ctx: CoachContext): CoachStepId | null {
  if (ctx.seasonStatus !== "active") return null;
  if (!ctx.seasonStartDate) return null;

  const day = getDayNumber(ctx.today, ctx.seasonStartDate);
  if (day < 1) return null;

  const candidates: CoachStepId[] = [];

  if (day <= 7) {
    if (!ctx.hasPlan) candidates.push("pickTheme");
    else if (!ctx.hasIntention) candidates.push("intention");
    else if (!ctx.hasFocus) candidates.push("focus");
    else if (!ctx.dayClosed) candidates.push("close");
  }

  candidates.push(...COACH_CONCEPT_STEP_ORDER);

  const dismissed = loadDismissed();
  return candidates.find((id) => !dismissed[id]) ?? null;
}
