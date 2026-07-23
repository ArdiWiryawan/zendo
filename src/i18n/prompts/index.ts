import type { AppLanguage, JournalAnswers } from "../../types/app";
import { getDayNumber } from "../../lib/date";
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

export function getJournalAnswerItems(
  lang: AppLanguage,
  answers: JournalAnswers,
  date?: string
) {
  const labels = getJournalQuestionLabels(lang);
  return (Object.keys(labels) as Array<keyof JournalAnswers>)
    .map((key) => ({
      id: key,
      question: key === "whatMovedToday" && date ? getDailyJournalPromptForDate(lang, date) : labels[key],
      answer: answers[key]?.trim(),
    }))
    .filter((item): item is { id: keyof JournalAnswers; question: string; answer: string } => Boolean(item.answer));
}
