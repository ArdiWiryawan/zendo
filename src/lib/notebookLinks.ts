import type { NotebookEntry } from "../types/app";

/** Regex to match [[Note Title]] wiki-links */
export const WIKI_LINK_REGEX = /\[\[(.*?)\]\]/g;

/** Common stop words in ID and EN to ignore in heuristic similarity matching */
const STOP_WORDS = new Set([
  "the", "and", "this", "that", "with", "from", "for", "have", "are", "you",
  "not", "can", "will", "what", "your", "all", "how", "when", "more", "make",
  "dan", "yang", "dari", "untuk", "pada", "ke", "di", "ini", "itu", "dengan",
  "adalah", "akan", "bisa", "bila", "ada", "saya", "aku", "kamu", "kita", "mereka",
  "juga", "hanya", "sudah", "lagi", "harus", "saat", "oleh", "tentang", "seperti"
]);

/** Extract all [[title]] substrings from a text block */
export function extractWikiLinks(text: string): string[] {
  if (!text) return [];
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(WIKI_LINK_REGEX);
  while ((match = regex.exec(text)) !== null) {
    const raw = match[1]?.trim();
    if (raw && !matches.includes(raw)) {
      matches.push(raw);
    }
  }
  return matches;
}

/** Resolve [[title]] matches to existing NotebookEntry IDs */
export function resolveLinkedNoteIds(text: string, allNotes: NotebookEntry[]): string[] {
  const titles = extractWikiLinks(text).map((t) => t.toLowerCase());
  if (!titles.length) return [];
  const ids: string[] = [];
  for (const note of allNotes) {
    if (titles.includes(note.title.trim().toLowerCase())) {
      ids.push(note.id);
    }
  }
  return ids;
}

/** Find all notes that reference `targetNote` */
export function findBacklinks(
  targetNote: { id: string; title: string },
  allNotes: NotebookEntry[]
): NotebookEntry[] {
  const lowerTitle = targetNote.title.trim().toLowerCase();
  return allNotes.filter((note) => {
    if (note.id === targetNote.id) return false;
    // Check explicit linked IDs
    if (note.linkedNoteIds?.includes(targetNote.id)) return true;
    // Check text for [[targetNote.title]]
    if (lowerTitle && note.body) {
      const extracted = extractWikiLinks(note.body).map((t) => t.toLowerCase());
      if (extracted.includes(lowerTitle)) return true;
    }
    return false;
  });
}

/** Tokenize text into set of meaningful lowercase word stems */
function tokenize(text: string): Set<string> {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s_-]/g, " ");
  const tokens = clean.split(/\s+/).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return new Set(tokens);
}

/** Find top related notes using keyword overlap & shared attributes */
export function findRelatedNotes(
  currentNote: NotebookEntry,
  allNotes: NotebookEntry[],
  limit = 3
): { note: NotebookEntry; sharedKeywords: string[]; score: number }[] {
  const currentTokens = tokenize(`${currentNote.title} ${currentNote.body || ""}`);
  if (currentTokens.size === 0) return [];

  const candidates = allNotes.filter((n) => n.id !== currentNote.id);
  const scored = candidates
    .map((candidate) => {
      const candTokens = tokenize(`${candidate.title} ${candidate.body || ""}`);
      const shared: string[] = [];
      for (const tok of currentTokens) {
        if (candTokens.has(tok)) shared.push(tok);
      }

      let score = shared.length * 2;

      // Bonus for same Goal or same PARA or explicit links
      if (currentNote.goalId && candidate.goalId && currentNote.goalId === candidate.goalId) {
        score += 5;
      }
      if (currentNote.paraType && candidate.paraType && currentNote.paraType === candidate.paraType) {
        score += 2;
      }
      if (currentNote.categoryId && candidate.categoryId && currentNote.categoryId === candidate.categoryId) {
        score += 1;
      }
      if (
        currentNote.linkedNoteIds?.includes(candidate.id) ||
        candidate.linkedNoteIds?.includes(currentNote.id)
      ) {
        score += 10;
      }

      return { note: candidate, sharedKeywords: shared.slice(0, 4), score };
    })
    .filter((item) => item.score > 2)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}
