/** Format / parse "When X, I will Y" implementation intentions. */

export function formatIntention(when: string, action: string): string {
  const w = when.trim();
  const a = action.trim();
  if (!a) return "";
  if (!w) return a;
  return `When ${w}, I will ${a}`;
}

export function parseIntention(text: string): { when: string; action: string } {
  const raw = (text ?? "").trim();
  if (!raw) return { when: "", action: "" };
  const match = raw.match(/^When\s+(.+?),\s*I will\s+(.+)$/i);
  if (match) return { when: match[1].trim(), action: match[2].trim() };
  return { when: "", action: raw };
}

export function isStructuredIntention(text: string): boolean {
  return /^When\s+.+\s*,\s*I will\s+.+/i.test((text ?? "").trim());
}
