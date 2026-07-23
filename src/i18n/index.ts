import { useMonkStore } from "../store/useMonkStore";
import type { AppLanguage } from "../types/app";
import { en, type MessageKey } from "./messages/en";
import { id } from "./messages/id";

const catalogs: Record<AppLanguage, Record<MessageKey, string>> = { en, id };

export type { MessageKey, AppLanguage };

export function t(lang: AppLanguage, key: MessageKey, vars?: Record<string, string | number>): string {
  let text = catalogs[lang]?.[key] ?? catalogs.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

export function useLanguage(): AppLanguage {
  return useMonkStore((s) => s.appSettings.language ?? "id");
}

export function useT() {
  const lang = useLanguage();
  return (key: MessageKey, vars?: Record<string, string | number>) => t(lang, key, vars);
}

export {
  getDailyJournalPromptForDate,
  getJournalAnswerItems,
  getJournalQuestionLabels,
  getPromptPack,
  type PromptPackId,
} from "./prompts";
