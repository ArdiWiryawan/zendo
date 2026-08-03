/** Format / parse "When X, I will Y" implementation intentions with optional time. */

export function formatIntention(when: string, action: string, time?: string): string {
  const w = when.trim();
  const a = action.trim();
  const t = time?.trim();
  if (!a) return "";
  if (!w && !t) return a;
  const prefix = t ? (w ? `${t} ${w}` : t) : w;
  return `When ${prefix}, I will ${a}`;
}

export function parseIntention(text: string): { when: string; action: string; time?: string } {
  const raw = (text ?? "").trim();
  if (!raw) return { when: "", action: "" };
  const match = raw.match(/^When\s+(.+?),\s*I will\s+(.+)$/i);
  if (match) {
    const whenPart = match[1].trim();
    const timeMatch = whenPart.match(/^([^\s]+)\s+(.*)$/);
    if (timeMatch && timeMatch[2]) {
      return { time: timeMatch[1], when: timeMatch[2].trim(), action: match[2].trim() };
    }
    return { when: whenPart, action: match[2].trim() };
  }
  return { when: "", action: raw };
}

export function isStructuredIntention(text: string): boolean {
  return /^When\s+.+\s*,\s*I will\s+.+/i.test((text ?? "").trim());
}
