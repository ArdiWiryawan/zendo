import type { EnergyLevel, WeeklyPlan, WeeklyReflectionAnswers, WeeklyReview, WeeklyReviewDecision } from "../types/app";

/**
 * Read-only projections of `weeklyReviews` for the Library's review history.
 *
 * Historic reviews are the only place a user can read back a past week's
 * re-decision, so nothing here is allowed to drop a record: a review whose week
 * plan was released or rewritten still appears, and a skipped review keeps its
 * skipped treatment rather than being dressed up as a completed reflection.
 */

export type ReviewDecisionCounts = {
  cont: number;
  adj: number;
  rel: number;
  total: number;
};

export type ReviewReflectionEntry = {
  /** Translation key under `weeklyReviewModal.*` describing the field. */
  labelKey: string;
  value: string;
};

export type ReviewHistoryItem = {
  /** `weekId` — the key the review is stored under in `weeklyReviews`. */
  id: string;
  review: WeeklyReview;
  /** Week label via `t("week.weekN", { n })`, or null when the week plan is gone. */
  weekNumber: number | null;
  /** Start of the owning week plan, or the review's own date when orphaned. */
  startDate: string;
  /** End of the owning week plan. Null when the plan cannot be found. */
  endDate: string | null;
  /** False when the week plan is missing (released, legacy, or orphan data). */
  planFound: boolean;
  decisions: ReviewDecisionCounts;
  /** Non-empty reflection answers in question order; always `[]` when skipped. */
  reflections: ReviewReflectionEntry[];
  /** True only when the review was explicitly skipped — never a completed one. */
  skipped: boolean;
  /** Optional; only present when the review actually recorded an energy level. */
  energy?: EnergyLevel;
  /** Pre-lowered haystack so search can match any reflection text. */
  searchText: string;
};

/** Reflection fields in the order the review modal asks for them. */
const REFLECTION_FIELDS: Array<{ key: keyof WeeklyReflectionAnswers; labelKey: string }> = [
  { key: "wins", labelKey: "weeklyReviewModal.winsLabel" },
  { key: "challenges", labelKey: "weeklyReviewModal.challengesLabel" },
  { key: "lesson", labelKey: "weeklyReviewModal.lessonLabel" },
  { key: "organise", labelKey: "weeklyReviewModal.organiseLabel" },
  { key: "priorities", labelKey: "weeklyReviewModal.prioritiesLabel" }
];

function countDecisions(decisions?: Record<string, WeeklyReviewDecision>): ReviewDecisionCounts {
  const list = decisions ? Object.values(decisions) : [];
  return {
    cont: list.filter((d) => d?.action === "continue").length,
    adj: list.filter((d) => d?.action === "adjust").length,
    rel: list.filter((d) => d?.action === "release").length,
    total: list.length
  };
}

function collectReflections(reflection?: WeeklyReflectionAnswers): ReviewReflectionEntry[] {
  if (!reflection) return [];
  return REFLECTION_FIELDS
    .map(({ key, labelKey }) => ({ labelKey, value: (reflection[key] || "").trim() }))
    .filter((entry) => entry.value.length > 0);
}

/**
 * Orders reviews newest-first.
 *
 * Ordering never depends on finding the week plan, so an orphaned review keeps
 * its place in the list instead of sinking to the bottom or being dropped.
 */
export function buildReviewHistory(
  weeklyReviews: Record<string, WeeklyReview> | undefined,
  weeklyPlans: WeeklyPlan[] | undefined
): ReviewHistoryItem[] {
  if (!weeklyReviews) return [];

  const plansById = new Map<string, WeeklyPlan>();
  (weeklyPlans ?? []).forEach((plan) => plansById.set(plan.id, plan));

  return Object.entries(weeklyReviews)
    .map(([id, review]) => {
      const plan = plansById.get(id);
      const skipped = review?.skipped === true;

      return {
        id,
        review,
        weekNumber: plan?.weekNumber ?? null,
        startDate: plan?.startDate ?? review?.date ?? "",
        endDate: plan?.endDate ?? null,
        planFound: Boolean(plan),
        decisions: countDecisions(review?.decisions),
        // A skipped review is an explicit "not this week", so its half-filled
        // reflection is not read back as a completed one.
        reflections: skipped ? [] : collectReflections(review?.reflection),
        skipped,
        energy: review?.energy,
        searchText: buildSearchText(review, skipped)
      };
    })
    .sort((a, b) => {
      const byDate = (b.startDate || "").localeCompare(a.startDate || "");
      if (byDate !== 0) return byDate;
      return b.id.localeCompare(a.id);
    });
}

function buildSearchText(review: WeeklyReview | undefined, skipped: boolean): string {
  if (!review) return "";
  const parts: string[] = [];

  parts.push(review.date || "");
  review.restActivity?.title && parts.push(review.restActivity.title);
  review.restActivity?.notes && parts.push(review.restActivity.notes);

  if (!skipped) {
    collectReflections(review.reflection).forEach((entry) => parts.push(entry.value));
  } else {
    // Still searchable by the text the user wrote before skipping.
    Object.values(review.reflection || {}).forEach((value) => value && parts.push(value));
  }

  Object.values(review.decisions || {}).forEach((decision) => {
    decision?.mainAction && parts.push(decision.mainAction);
  });

  return parts.join(" ").toLowerCase();
}

export function filterReviewHistory(items: ReviewHistoryItem[], query: string): ReviewHistoryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => item.searchText.includes(q));
}

export function hasReviewHistoryText(item: ReviewHistoryItem): boolean {
  return item.reflections.length > 0;
}
