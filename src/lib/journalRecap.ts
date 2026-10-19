import type { AppLanguage, JournalAnswers, JournalEntry } from "../types/app";
import { getJournalAnswerItems } from "../i18n/prompts";

export type JournalRecapAnswer = {
  id: keyof JournalAnswers;
  question: string;
  answer: string;
};

export type JournalRecapEntry = {
  id: string;
  date: string;
  mood?: JournalEntry["mood"];
  promptText?: string;
  answers: JournalRecapAnswer[];
};

export type JournalRecap = {
  entries: JournalRecapEntry[];
  /** Days with at least one written answer. */
  entryCount: number;
  /** How many days the window covers, so the UI can say "3 of 7". */
  dayCount: number;
  moodCounts: Partial<Record<NonNullable<JournalEntry["mood"]>, number>>;
  /** The most recent answer, used as a one-line teaser. */
  latestAnswer?: string;
};

/**
 * Read-only digest of the week's journal.
 *
 * The weekly review is the moment a user decides whether the week worked. The
 * journal already holds the evidence for that — in the user's own words — but
 * it lived on a separate screen, so the review asked "how did it go?" next to
 * an empty box while the answer sat one tab away. This turns those entries into
 * something reviewable without asking the user to write anything again.
 *
 * Only days with actual content are returned: an entry created by opening the
 * journal and leaving it blank is not a thought worth resurfacing.
 */
export function buildJournalRecap(
  entries: JournalEntry[],
  startDate: string,
  endDate: string,
  lang: AppLanguage,
  seasonId?: string
): JournalRecap {
  const inRange = (entries || [])
    .filter((entry) => entry.date >= startDate && entry.date <= endDate)
    .filter((entry) => !seasonId || !entry.seasonId || entry.seasonId === seasonId)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const recapEntries: JournalRecapEntry[] = [];
  const moodCounts: JournalRecap["moodCounts"] = {};

  for (const entry of inRange) {
    const answers = getJournalAnswerItems(lang, entry.answers, entry.date, entry.promptText);
    if (answers.length === 0) continue;

    if (entry.mood) moodCounts[entry.mood] = (moodCounts[entry.mood] ?? 0) + 1;
    recapEntries.push({
      id: entry.id,
      date: entry.date,
      mood: entry.mood,
      promptText: entry.promptText,
      answers
    });
  }

  const lastEntry = recapEntries[recapEntries.length - 1];

  return {
    entries: recapEntries,
    entryCount: recapEntries.length,
    dayCount: daysBetween(startDate, endDate),
    moodCounts,
    latestAnswer: lastEntry?.answers[0]?.answer
  };
}

/** Inclusive day count for a YYYY-MM-DD window. */
function daysBetween(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}
