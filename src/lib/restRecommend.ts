import {
  REST_ACTIVITIES,
  type RestActivityCategory,
  type RestActivityDef
} from "../constants/restActivities";
import { REST_QUESTIONS, type RestQuestionId } from "../constants/restQuestionnaire";

export type RestAnswers = Partial<Record<RestQuestionId, string>>;

export interface RestRecommendation {
  activity: RestActivityDef;
  category: RestActivityCategory;
  score: number;
}

/**
 * Scores every category from the answers, then returns the top two distinct
 * categories and one option from each.
 *
 * Tie-break order is fixed (body → mind → social → solitude) so the same
 * answers always produce the same pair. A rest suggestion that reshuffles on
 * re-render reads as noise, not guidance.
 */
export function recommendRest(
  answers: RestAnswers,
  activities: RestActivityDef[] = REST_ACTIVITIES
): RestRecommendation[] {
  const scores: Record<RestActivityCategory, number> = {
    physical: 0,
    creative: 0,
    social: 0,
    solitude: 0
  };

  for (const question of REST_QUESTIONS) {
    const chosenId = answers[question.id];
    if (!chosenId) continue;
    const chosen = question.options.find((o) => o.id === chosenId);
    if (!chosen) continue;
    for (const [category, points] of Object.entries(chosen.score) as [
      RestActivityCategory,
      number
    ][]) {
      scores[category] += points;
    }
  }

  const order: RestActivityCategory[] = [
    "physical",
    "creative",
    "social",
    "solitude"
  ];

  const ranked = order
    .map((category) => ({ category, score: scores[category] }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  // Nothing scored (all "fine" answers): the day is not depleted in any one
  // direction, so offer the quietest defaults rather than nothing at all.
  const chosen = ranked.length > 0
    ? ranked.slice(0, 2)
    : [
        { category: "solitude" as RestActivityCategory, score: 0 },
        { category: "physical" as RestActivityCategory, score: 0 }
      ];

  const used = new Set<string>();

  return chosen
    .map((entry) => {
      const activity = activities.find(
        (a) => a.category === entry.category && !used.has(a.id)
      );
      if (activity) used.add(activity.id);
      return activity
        ? { activity, category: entry.category, score: entry.score }
        : null;
    })
    .filter((r): r is RestRecommendation => r !== null);
}

export function isQuestionnaireComplete(answers: RestAnswers): boolean {
  return REST_QUESTIONS.every((q) => Boolean(answers[q.id]));
}
