import type { RestActivityCategory } from "./restActivities";

/**
 * The rest questionnaire.
 *
 * Each question measures a depleting *state* — what actually happened — rather
 * than asking the user to self-diagnose which category they need. A question
 * like "do you need people or solitude?" is decorative: it just makes the user
 * answer the question the app is supposed to answer.
 *
 * `sensory` is deliberately inverted: "it was loud" is the solitude signal.
 */
export type RestQuestionId = "body" | "mind" | "social" | "sensory";

export interface RestQuestionOption {
  id: string;
  /** Partial weights into the four renewal dimensions. */
  score: Partial<Record<RestActivityCategory, number>>;
  label: { id: string; en: string };
}

export interface RestQuestion {
  id: RestQuestionId;
  prompt: { id: string; en: string };
  options: RestQuestionOption[];
}

export const REST_QUESTIONS: RestQuestion[] = [
  {
    id: "body",
    prompt: {
      id: "Bagaimana tubuhmu hari ini?",
      en: "How does your body feel today?"
    },
    options: [
      {
        id: "heavy",
        score: { physical: 3 },
        label: { id: "Berat, kaku, atau mengantuk", en: "Heavy, stiff, or sleepy" }
      },
      {
        id: "restless",
        score: { physical: 2, solitude: 1 },
        label: { id: "Gelisah dan sulit diam", en: "Restless and hard to sit still" }
      },
      {
        id: "fine",
        score: {},
        label: { id: "Biasa saja, tidak ada keluhan", en: "Fine, nothing to report" }
      }
    ]
  },
  {
    id: "mind",
    prompt: {
      id: "Kalau kamu berhenti sebentar, ke mana pikiranmu pergi?",
      en: "If you stop for a moment, where does your mind go?"
    },
    options: [
      {
        id: "spinning",
        score: { creative: 3 },
        label: {
          id: "Berputar ke daftar tugas yang belum selesai",
          en: "Spinning on unfinished tasks"
        }
      },
      {
        id: "numb",
        score: { creative: 2, physical: 1 },
        label: {
          id: "Kosong dan tumpul, sulit fokus pada apa pun",
          en: "Blank and dull, hard to focus on anything"
        }
      },
      {
        id: "clear",
        score: {},
        label: { id: "Tenang, cukup jernih", en: "Calm, reasonably clear" }
      }
    ]
  },
  {
    id: "social",
    prompt: {
      id: "Seberapa sering kamu bicara dengan orang yang kamu sayangi belakangan ini?",
      en: "How often have you spoken with someone you care about lately?"
    },
    options: [
      {
        id: "rarely",
        score: { social: 3 },
        label: { id: "Sudah lama tidak, hampir tidak ada", en: "It has been a while, almost nobody" }
      },
      {
        id: "brief",
        score: { social: 2 },
        label: { id: "Ada, tapi singkat dan seperlunya saja", en: "Some, but brief and only as needed" }
      },
      {
        id: "plenty",
        score: {},
        label: { id: "Cukup sering dan terasa hangat", en: "Often enough, and it feels warm" }
      }
    ]
  },
  {
    id: "sensory",
    prompt: {
      id: "Seberapa bising dan padat hari-harimu akhir ini?",
      en: "How loud and crowded have your days been lately?"
    },
    options: [
      {
        id: "loud",
        score: { solitude: 3 },
        label: { id: "Sangat penuh, hampir tidak ada jeda", en: "Very full, almost no gaps" }
      },
      {
        id: "noisy",
        score: { solitude: 2 },
        label: { id: "Cukup padat, sering terpotong", en: "Fairly busy, often interrupted" }
      },
      {
        id: "quiet",
        score: {},
        label: { id: "Cukup lengang, ada ruang", en: "Fairly open, there is room" }
      }
    ]
  }
];
