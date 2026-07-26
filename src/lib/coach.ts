import { getDayNumber } from "./date";

export const COACH_STORAGE_KEY = "zendo_coach_v1";

export type CoachStepId = "pickTheme" | "intention" | "focus" | "close";

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

/** Highest-priority first-week coach step, or null. */
export function getCoachStep(ctx: CoachContext): CoachStepId | null {
  if (ctx.seasonStatus !== "active") return null;
  const day = getDayNumber(ctx.today, ctx.seasonStartDate);
  if (day < 1 || day > 7) return null;

  const dismissed = loadDismissed();
  const candidates: CoachStepId[] = [];
  if (!ctx.hasPlan) candidates.push("pickTheme");
  else if (!ctx.hasIntention) candidates.push("intention");
  else if (!ctx.hasFocus) candidates.push("focus");
  else if (!ctx.dayClosed) candidates.push("close");

  return candidates.find((id) => !dismissed[id]) ?? null;
}
