import { useLanguage } from "../i18n";
export function usePlanningCopy() {
  const lang = useLanguage();
  return (id: string, en: string) => (lang === "id" ? id : en);
}
export const planningField =
  "min-h-12 w-full rounded-xl border border-monk-border bg-monk-surface px-3 text-sm text-monk-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-monk-accent";
