import { differenceInCalendarDays } from "date-fns";
import { parseLocalDateKey } from "./date";

export type ReflectionPhase = "early" | "middle" | "late";
export type ReflectionCategory =
  | "awareness"
  | "progress"
  | "energy"
  | "learning"
  | "identity";
export type ReflectionContext =
  | "rest_day"
  | "focus_day"
  | "low_energy"
  | "season_ending"
  | "universal";

export type ReflectionPrompt = {
  id: string; // "A01".."E10", stable across languages
  text: { en: string; id: string };
  category: ReflectionCategory;
  eligiblePhases: ReflectionPhase[]; // empty array = eligible in every phase
  contextTags: ReflectionContext[];
  isActive: boolean;
  version: number;
};

export type ReflectionSelectionInput = {
  seasonId: string | null;
  date: string;
  season: { startDate: string; durationDays: number; status?: string } | null;
  usedPromptIdsInSeason: string[]; // every id already assigned this season
  recentPromptIds: string[]; // most-recent-first, last few days
  context: ReflectionContext[];
};

// Category -> eligible phases. early -> awareness; middle -> progress, energy, learning;
// late -> learning, identity. No per-prompt exceptions: the phase shape is intentional.
const CATEGORY_PHASES: Record<ReflectionCategory, ReflectionPhase[]> = {
  awareness: ["early"],
  progress: ["middle"],
  energy: ["middle"],
  learning: ["middle", "late"],
  identity: ["late"],
};

function build(
  id: string,
  category: ReflectionCategory,
  en: string,
  idText: string,
  extraTags: ReflectionContext[] = [],
): ReflectionPrompt {
  return {
    id,
    text: { en, id: idText },
    category,
    eligiblePhases: [...CATEGORY_PHASES[category]],
    contextTags: ["universal", ...extraTags],
    isActive: true,
    version: 1,
  };
}

export const REFLECTION_PROMPTS: readonly ReflectionPrompt[] = [
  // A — awareness
  build("A01", "awareness", "What did you manage to begin today?", "Apa yang berhasil kamu mulai hari ini?"),
  build("A02", "awareness", "What is one small thing you appreciate about today?", "Satu hal kecil apa yang kamu syukuri dari hari ini?", ["rest_day"]),
  build("A03", "awareness", "When did you feel most energized today?", "Kapan kamu merasa paling bersemangat hari ini?"),
  build("A04", "awareness", "What felt easier than you expected?", "Apa yang ternyata lebih mudah dari yang kamu duga?"),
  build("A05", "awareness", "What took up most of your attention today?", "Apa yang paling menyita perhatianmu hari ini?", ["focus_day"]),
  build("A06", "awareness", "What made starting difficult?", "Apa yang membuatmu sulit memulai tadi?", ["low_energy"]),
  build("A07", "awareness", "What would you like to understand better?", "Apa yang ingin kamu pahami lebih baik?"),
  build("A08", "awareness", "When did you feel most present today?", "Kapan kamu merasa paling hadir hari ini?", ["rest_day"]),
  build("A09", "awareness", "What made today meaningful?", "Apa yang membuat hari ini terasa berarti?"),
  build("A10", "awareness", "What small thing can you appreciate about yourself today?", "Hal kecil apa dari dirimu yang bisa kamu hargai hari ini?", ["low_energy"]),

  // B — progress
  build("B01", "progress", "What small progress mattered most today?", "Kemajuan kecil apa yang paling berarti hari ini?", ["focus_day"]),
  build("B02", "progress", "What did you handle well?", "Apa yang berhasil kamu tangani dengan baik?", ["focus_day"]),
  build("B03", "progress", "What moved you closer to a Goal that matters?", "Apa yang membawamu lebih dekat ke tujuan yang penting?", ["focus_day"]),
  build("B04", "progress", "What did you learn from your work today?", "Apa yang kamu pelajari dari pekerjaanmu hari ini?", ["focus_day"]),
  build("B05", "progress", "Which part of your work felt most satisfying?", "Bagian mana dari pekerjaanmu yang paling memuaskan?", ["focus_day"]),
  build("B06", "progress", "What did not need to be as perfect as you imagined?", "Apa yang ternyata tak perlu sesempurna yang kamu bayangkan?", ["focus_day"]),
  build("B07", "progress", "What feels clearer now?", "Apa yang sekarang terasa lebih jelas?", ["focus_day"]),
  build("B08", "progress", "What are you proud of today?", "Apa yang kamu banggakan hari ini?", ["focus_day"]),
  build("B09", "progress", "What is worth continuing tomorrow?", "Apa yang layak kamu lanjutkan besok?", ["focus_day"]),
  build("B10", "progress", "What is one thing from today you want to carry forward?", "Satu hal apa dari hari ini yang ingin kamu bawa ke depan?", ["focus_day"]),

  // C — energy
  build("C01", "energy", "What gave you energy today?", "Apa yang memberimu energi hari ini?", ["rest_day"]),
  build("C02", "energy", "What drained your energy today?", "Apa yang menguras energimu hari ini?", ["low_energy"]),
  build("C03", "energy", "When did you enjoy what you were doing?", "Kapan kamu menikmati apa yang sedang kamu kerjakan?"),
  build("C04", "energy", "What was one enjoyable moment today?", "Momen menyenangkan apa yang kamu rasakan hari ini?", ["rest_day"]),
  build("C05", "energy", "Who made your day a little better?", "Siapa yang membuat harimu sedikit lebih baik?", ["rest_day"]),
  build("C06", "energy", "What helped you feel calmer?", "Apa yang membuatmu merasa lebih tenang?", ["low_energy"]),
  build("C07", "energy", "What would you like to make more room for?", "Apa yang ingin kamu beri ruang lebih banyak?"),
  build("C08", "energy", "What did you do simply because you enjoyed it?", "Apa yang kamu lakukan murni karena menikmatinya?", ["rest_day"]),
  build("C09", "energy", "Did you give yourself enough room to pause?", "Sudahkah kamu memberi dirimu cukup ruang untuk berhenti sejenak?", ["low_energy"]),
  build("C10", "energy", "What would feel kind to yourself tonight?", "Apa yang terasa lembut untuk dirimu malam ini?", ["low_energy"]),

  // D — learning
  build("D01", "learning", "What would you do a little differently tomorrow?", "Apa yang ingin kamu lakukan sedikit berbeda besok?", ["focus_day"]),
  build("D02", "learning", "What caused you to postpone something today?", "Apa yang membuatmu menunda sesuatu hari ini?"),
  build("D03", "learning", "How could you make the next step easier?", "Bagaimana kamu bisa membuat langkah berikutnya lebih mudah?", ["focus_day"]),
  build("D04", "learning", "What turned out to be less important than expected?", "Apa yang ternyata kurang penting dari dugaanmu?"),
  build("D05", "learning", "What could you simplify?", "Apa yang bisa kamu sederhanakan?", ["focus_day"]),
  build("D06", "learning", "Did your plan match your energy today?", "Apakah rencanamu sejalan dengan energimu hari ini?", ["low_energy"]),
  build("D07", "learning", "What could you let go of without losing much?", "Apa yang bisa kamu lepaskan tanpa banyak kehilangan?"),
  build("D08", "learning", "What helped you stay focused?", "Apa yang membantumu tetap fokus?", ["focus_day"]),
  build("D09", "learning", "What would you like to try differently?", "Apa yang ingin kamu coba dengan cara berbeda?", ["focus_day"]),
  build("D10", "learning", "What could change to make your rhythm healthier?", "Apa yang bisa diubah agar ritmemu lebih sehat?", ["low_energy"]),

  // E — identity
  build("E01", "identity", "What are you beginning to understand about yourself?", "Apa yang mulai kamu pahami tentang dirimu sendiri?", ["season_ending"]),
  build("E02", "identity", "Which behavior is starting to feel more natural?", "Kebiasaan mana yang mulai terasa lebih alami?", ["season_ending"]),
  build("E03", "identity", "Does your work still connect with why you started?", "Apakah pekerjaanmu masih terhubung dengan alasanmu memulai?", ["season_ending"]),
  build("E04", "identity", "What do you want to preserve from this Season?", "Apa yang ingin kamu jaga dari Season ini?", ["season_ending"]),
  build("E05", "identity", "What was not worth the energy it required?", "Apa yang ternyata tak sepadan dengan energi yang dikeluarkan?", ["season_ending"]),
  build("E06", "identity", "What deserves more of your attention?", "Apa yang layak mendapat lebih banyak perhatianmu?", ["season_ending"]),
  build("E07", "identity", "What would you like to stop doing?", "Apa yang ingin kamu berhenti lakukan?", ["season_ending"]),
  build("E08", "identity", "Does your Goal still feel important to you?", "Apakah Goal-mu masih terasa penting bagimu?", ["season_ending"]),
  build("E09", "identity", "What lesson would you like to carry into the next Season?", "Pelajaran apa yang ingin kamu bawa ke Season berikutnya?", ["season_ending"]),
  build("E10", "identity", "What advice would you give yourself right now?", "Nasihat apa yang ingin kamu berikan pada dirimu saat ini?", ["season_ending"]),
];

export function computeReflectionPhase(
  season: { startDate: string; durationDays: number } | null,
  date: string,
): ReflectionPhase | null {
  if (!season) return null;
  const { durationDays } = season;
  if (!Number.isFinite(durationDays) || durationDays <= 0) return null;

  const elapsed = differenceInCalendarDays(
    parseLocalDateKey(date),
    parseLocalDateKey(season.startDate),
  );
  if (!Number.isFinite(elapsed)) return null;

  const daysPassed = Math.min(Math.max(elapsed + 1, 1), durationDays);
  const progress = (daysPassed - 1) / durationDays;

  if (progress < 1 / 3) return "early";
  if (progress < 2 / 3) return "middle";
  return "late";
}

// FNV-1a 32-bit. Stable, dependency-free, no Math.random / Date.
function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickCandidate(
  tiers: readonly ReflectionPrompt[][],
  levels: readonly ((prompt: ReflectionPrompt) => boolean)[],
  start: number,
): ReflectionPrompt {
  for (const tier of tiers) {
    if (tier.length === 0) continue;
    const offset = start % tier.length;
    for (const level of levels) {
      for (let i = 0; i < tier.length; i += 1) {
        const candidate = tier[(offset + i) % tier.length];
        if (candidate && level(candidate)) return candidate;
      }
    }
  }
  throw new Error("reflection prompt selection failed: empty prompt bank");
}

export function selectReflectionPrompt(
  input: ReflectionSelectionInput,
): ReflectionPrompt {
  const { seasonId, date, season, usedPromptIdsInSeason, recentPromptIds, context } =
    input;

  const phase = computeReflectionPhase(season, date);

  const isPhaseEligible = (prompt: ReflectionPrompt) =>
    phase === null ||
    prompt.eligiblePhases.length === 0 ||
    prompt.eligiblePhases.includes(phase);

  const isContextMatch = (prompt: ReflectionPrompt) =>
    context.length === 0 || prompt.contextTags.some((tag) => context.includes(tag));

  const active = REFLECTION_PROMPTS.filter((prompt) => prompt.isActive);
  const pool = active.length > 0 ? active : REFLECTION_PROMPTS.slice();

  // Fallback cascade: phase+context -> phase-only -> all active.
  const tiers: ReflectionPrompt[][] = [
    pool.filter((prompt) => isPhaseEligible(prompt) && isContextMatch(prompt)),
    pool.filter(isPhaseEligible),
    pool,
  ];

  const recentHead = recentPromptIds.length > 0 ? recentPromptIds[0] : null;
  const recentWindow = new Set(recentPromptIds.slice(0, 3));
  const used = new Set(usedPromptIdsInSeason);

  const levels: ((prompt: ReflectionPrompt) => boolean)[] = [
    (prompt) => !recentWindow.has(prompt.id) && !used.has(prompt.id),
    (prompt) => !recentWindow.has(prompt.id),
    (prompt) => prompt.id !== recentHead && !used.has(prompt.id),
    (prompt) => prompt.id !== recentHead,
    () => true,
  ];

  const start = stableHash(`${seasonId}:${date}`);
  return pickCandidate(tiers, levels, start);
}

export function getReflectionPromptText(
  id: string,
  lang: "en" | "id",
): string | null {
  const prompt = REFLECTION_PROMPTS.find((candidate) => candidate.id === id);
  if (!prompt) return null;
  return prompt.text[lang];
}