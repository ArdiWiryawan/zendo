/** Format / parse "When X, I will Y" implementation intentions with optional time. */

/** ponytail: time-in-intention is being retired (Today Focus no longer schedules); param kept for callers. Remove when callers migrate. */
export function formatIntention(when: string, action: string, time?: string): string {
  const w = when.trim();
  const a = action.trim();
  const t = time?.trim();
  if (!a) return "";
  if (!w && !t) return a;
  const prefix = t ? (w ? `${t} ${w}` : t) : w;
  return `When ${prefix}, I will ${a}`;
}

/** Single source of truth for what counts as a time token in a when-clause. */
function isTimeToken(token: string): boolean {
  return /^\d{1,2}[:.]\d{2}$/.test(token) || /^(pagi|siang|sore|malam|morning|afternoon|evening|night)$/i.test(token);
}

export function parseIntention(text: string): { when: string; action: string; time?: string } {
  const raw = (text ?? "").trim();
  if (!raw) return { when: "", action: "" };
  const match = raw.match(/^When\s+(.+?),\s*I will\s+(.+)$/i);
  if (match) {
    const whenPart = match[1].trim();
    const timeMatch = whenPart.match(/^([^\s]+)\s+(.*)$/);
    if (timeMatch && timeMatch[2] && isTimeToken(timeMatch[1])) {
      return { time: timeMatch[1], when: timeMatch[2].trim(), action: match[2].trim() };
    }
    return { when: whenPart, action: match[2].trim() };
  }
  return { when: "", action: raw };
}

/**
 * Drop a leading time token from a structured intention's when-clause.
 * "When 21:00 Ketika mau tidur, I will baca buku" -> "When Ketika mau tidur, I will baca buku"
 * "When 21:00, I will baca buku" -> "baca buku" (empty when-clause falls back to the action)
 * Non-structured / no time token -> input unchanged (trimmed). Idempotent.
 */
export function stripIntentionTime(text: string): string {
  const raw = (text ?? "").trim();
  if (!raw) return "";
  const match = raw.match(/^When\s+(.+?),\s*I will\s+(.+)$/i);
  if (!match) return raw;
  const whenPart = match[1].trim();
  const action = match[2].trim();
  const spaceIdx = whenPart.search(/\s/);
  const firstToken = spaceIdx === -1 ? whenPart : whenPart.slice(0, spaceIdx);
  if (!isTimeToken(firstToken)) return raw;
  const rest = spaceIdx === -1 ? "" : whenPart.slice(spaceIdx + 1).trim();
  return rest ? `When ${rest}, I will ${action}` : action;
}

export function isStructuredIntention(text: string): boolean {
  return /^When\s+.+\s*,\s*I will\s+.+/i.test((text ?? "").trim());
}
