import type { AppLanguage, JournalAnswers } from "../../types/app";
import type { MonkStore } from "../../store/useMonkStore";
import { getDayNumber, getDaysLeft } from "../../lib/date";
import { getDailyActivity, resolveDayOutcome } from "../../lib/dailyActivity";
import { resolveDailyActivityStatus } from "../../constants/dailyActivityStatus";
import {
  getReflectionPromptText,
  selectReflectionPrompt,
  type ReflectionContext,
} from "../../lib/reflectionPrompts";
import * as en from "./en";
import * as id from "./id";

export type PromptPackId =
  | "big90Days"
  | "focusGoal"
  | "lifeAudit"
  | "systemDesign"
  | "identityDiscipline"
  | "weeklyReview"
  | "dailyJournal"
  | "closing90Days";

const packs = {
  en: {
    big90Days: en.promptsBig90Days,
    focusGoal: en.promptsFocusGoal,
    lifeAudit: en.promptsLifeAudit,
    systemDesign: en.promptsSystemDesign,
    identityDiscipline: en.promptsIdentityDiscipline,
    weeklyReview: en.promptsWeeklyReview,
    dailyJournal: en.promptsDailyJournal,
    closing90Days: en.promptsClosing90Days,
    labels: en.journalQuestionLabels,
  },
  id: {
    big90Days: id.promptsBig90Days,
    focusGoal: id.promptsFocusGoal,
    lifeAudit: id.promptsLifeAudit,
    systemDesign: id.promptsSystemDesign,
    identityDiscipline: id.promptsIdentityDiscipline,
    weeklyReview: id.promptsWeeklyReview,
    dailyJournal: id.promptsDailyJournal,
    closing90Days: id.promptsClosing90Days,
    labels: id.journalQuestionLabels,
  },
} as const;

export function getPromptPack(lang: AppLanguage, pack: PromptPackId): readonly string[] {
  return packs[lang][pack];
}

export function getJournalQuestionLabels(lang: AppLanguage): Record<keyof JournalAnswers, string> {
  return packs[lang].labels;
}

export function getDailyJournalPromptForDate(lang: AppLanguage, date: string): string {
  // Fixed epoch so rotation is calendar-stable and independent of season start.
  const dayNumber = getDayNumber(date, "2020-01-01");
  const list = packs[lang].dailyJournal;
  return list[Math.abs(dayNumber) % list.length];
}

/**
 * Context for the reflection selector, built ONLY from data the app already
 * holds. Nothing here infers a feeling: `low_energy` needs a stored low
 * `EnergyLog`, `focus_day` needs completed focus/learning evidence, and
 * `rest_day` needs the day to actually resolve as rest (evidence outranks the
 * plan, matching `resolveDayOutcome`).
 */
export function buildReflectionContext(
  store: MonkStore,
  date: string,
  seasonEndDate?: string | null
): ReflectionContext[] {
  const contexts = new Set<ReflectionContext>();

  const activity = getDailyActivity(store, date);
  const plan = store.dayPlans.find(
    (candidate) => candidate.date === date && candidate.seasonId === store.activeSeason?.id
  );
  const outcome = resolveDayOutcome({
    plan,
    focusSessions: activity.focusSessions,
    learningSessions: activity.learningSessions,
    relapseCount: (store.relapseLogs ?? []).filter((log) => log.date === date).length,
  });
  if (outcome === "rest") contexts.add("rest_day");

  if (resolveDailyActivityStatus(activity) === "completed") contexts.add("focus_day");

  if (store.energyLogs.some((log) => log.date === date && log.level === "low")) {
    contexts.add("low_energy");
  }

  if (seasonEndDate && getDaysLeft(seasonEndDate) <= 2) contexts.add("season_ending");

  if (contexts.size === 0) contexts.add("universal");
  return [...contexts];
}

/**
 * Pure resolution of the question to show for a date. Never writes to the
 * store, so it is safe to call during render. History-faithful: a stored
 * `promptText` is returned verbatim, so copy or language changes never
 * re-label a day the user already saw.
 */
export function resolveReflectionPrompt(
  store: MonkStore,
  date: string,
  lang: AppLanguage
): { id: string; text: string } | null {
  const activeSeasonId = store.activeSeason?.id;
  const entry = store.journalEntries.find(
    (candidate) => candidate.date === date && (!activeSeasonId || candidate.seasonId === activeSeasonId)
  );

  // A submitted day keeps the exact words it was answered in — that is history,
  // and it must survive both language switches and prompt-bank edits. An open
  // day has no history to protect, so it follows the id into the current
  // language instead of stranding the user on the language they assigned in.
  const isAnswered = Boolean(entry?.answers?.whatMovedToday?.trim());

  if (entry?.promptId) {
    if (isAnswered && entry.promptText) {
      return { id: entry.promptId, text: entry.promptText };
    }
    const localized = getReflectionPromptText(entry.promptId, lang);
    if (localized) return { id: entry.promptId, text: localized };
    if (entry.promptText) return { id: entry.promptId, text: entry.promptText };
  } else if (entry?.promptText) {
    // Legacy or unassigned-id entry: keep whatever wording was recorded.
    return { id: entry.promptId ?? "stored", text: entry.promptText };
  }

  const season = store.activeSeason ?? null;
  const selection = selectReflectionPrompt({
    seasonId: season?.id ?? null,
    date,
    season: season
      ? { startDate: season.startDate, durationDays: season.durationDays, status: season.status }
      : null,
    usedPromptIdsInSeason: store.journalEntries
      .filter((candidate) => candidate.seasonId === season?.id)
      .map((candidate) => candidate.promptId)
      .filter((id): id is string => Boolean(id)),
    recentPromptIds: store.journalEntries
      .filter((candidate) => candidate.date <= date)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 3)
      .map((candidate) => candidate.promptId)
      .filter((id): id is string => Boolean(id)),
    context: buildReflectionContext(store, date, season?.endDate),
  });
  return { id: selection.id, text: selection.text[lang] };
}

/** Text to render for the date, or the generic fallback if resolution fails. */
export function resolveReflectionPromptText(
  store: MonkStore,
  date: string,
  lang: AppLanguage
): string {
  const resolved = resolveReflectionPrompt(store, date, lang);
  return resolved?.text ?? getDailyJournalPromptForDate(lang, date);
}

/**
 * Persist the assignment for a date once. Idempotent: returns early when the
 * entry already carries a `promptId`, so it is safe to run on every render and
 * it must live outside render (a store write during render is illegal).
 */
export function ensureReflectionPromptAssigned(
  store: MonkStore,
  date: string,
  lang: AppLanguage
): void {
  const activeSeasonId = store.activeSeason?.id;
  const entry = store.journalEntries.find(
    (candidate) => candidate.date === date && (!activeSeasonId || candidate.seasonId === activeSeasonId)
  );
  if (entry?.promptId) return;

  const resolved = resolveReflectionPrompt(store, date, lang);
  if (!resolved) return;
  store.assignReflectionPrompt(date, resolved.id, resolved.text);
}

export function getJournalAnswerItems(
  lang: AppLanguage,
  answers: JournalAnswers,
  date?: string,
  promptText?: string
) {
  const labels = getJournalQuestionLabels(lang);
  return (Object.keys(labels) as Array<keyof JournalAnswers>)
    .map((key) => ({
      id: key,
      question:
        key === "whatMovedToday"
          ? (promptText ?? (date ? getDailyJournalPromptForDate(lang, date) : labels[key]))
          : labels[key],
      answer: answers[key]?.trim(),
    }))
    .filter((item): item is { id: keyof JournalAnswers; question: string; answer: string } => Boolean(item.answer));
}
