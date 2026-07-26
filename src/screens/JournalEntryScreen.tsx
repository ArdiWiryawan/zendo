import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { useCalmToast } from "../components/ui";
import { getTodayDateString } from "../lib/date";
import { routes } from "../constants/routes";
import { selectJournalEntryForToday } from "../store/selectors";
import {
  Card,
  GhostButton,
  PageHeader,
  PrimaryButton,
  Textarea,
} from "../components/ui";
import { WhyEditor } from "../components/SeasonWidgets";

export function JournalEntryScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const lang = (store.appSettings.language ?? "id") as AppLanguage;
  const [searchParams, setSearchParams] = useSearchParams();

  const todayPlan = selectTodayPlan(store);
  const todayEntry = selectJournalEntryForToday(store);
  const dateSeed = todayPlan ? todayPlan.date : getTodayDateString();
  const journalDraftKey = `${JOURNAL_DRAFT_KEY}:${dateSeed}`;

  const initial = useMemo(() => {
    const draft = localStorage.getItem(journalDraftKey);
    return draft ? (JSON.parse(draft) as JournalAnswers) : todayEntry?.answers ?? {};
  }, [journalDraftKey, todayEntry?.id, todayEntry?.updatedAt]);

  const [answers, setAnswers] = useState<JournalAnswers>(initial);
  const [saved, setSaved] = useState(false);
  const [tomorrow, setTomorrow] = useState("");
  const [tomorrowSaved, setTomorrowSaved] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftSkipRef = useRef(true);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    setAnswers(initial);
    setSaved(false);
    setTomorrowSaved(false);
    setDraftSaved(false);
    draftSkipRef.current = true;
  }, [initial]);

  useEffect(() => {
    if (draftSkipRef.current) {
      draftSkipRef.current = false;
      return;
    }
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(journalDraftKey, JSON.stringify(answers));
        setDraftSaved(true);
      } catch {
        /* ignore */
      }
    }, 600);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [answers, journalDraftKey]);

  const activePrompt = useMemo(() => getDailyJournalPromptForDate(lang, dateSeed), [lang, dateSeed]);

  const now = new Date();
  const isEvening = now.getHours() >= 17;
  const urlTab = searchParams.get("tab");
  const defaultTab: "reflection" | "morning" = urlTab === "morning" || urlTab === "reflection" ? urlTab : (isEvening ? "reflection" : "morning");
  const [currentTab, setCurrentTab] = useState(defaultTab);

  useEffect(() => {
    setCurrentTab(defaultTab);
  }, [defaultTab]);

  const setTab = (tab: "reflection" | "morning") => {
    setCurrentTab(tab);
    setSearchParams({ tab });
  };

  const wordCount = useMemo(() => {
    const text = answers.morningPages || "";
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [answers.morningPages]);

  const canSave = todayPlan && (
    currentTab === "morning"
      ? !!answers.morningPages?.trim()
      : !!answers.whatMovedToday?.trim()
  );

  return (
    <>
      <PageHeader
        title={t("journal.title")}
        subtitle={isEvening ? t("journal.subtitleEvening") : t("journal.subtitleMorning")}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(routes.library)}
              className="grid h-9 w-9 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted hover:text-monk-accent hover:border-monk-accent transition active:scale-90"
              aria-label={t("journal.ariaLibrary")}
            >
              <BookOpen size={16} strokeWidth={1.5} />
            </button>
            <SettingsLink />
          </div>
        }
      />
      {!todayPlan ? <CalmAlert type="warning" title={t("journal.needFocus")} /> : null}

      <div className="flex rounded-xl bg-monk-soft p-1 mb-5 border border-monk-border/40">
        <button
          type="button"
          className={`flex-1 min-h-11 rounded-lg py-2 text-xs font-semibold tracking-wide transition relative ${
            currentTab === "morning"
              ? "bg-monk-surface text-monk-text border border-monk-border-strong shadow-sm"
              : "text-monk-muted hover:text-monk-text"
          }`}
          onClick={() => setTab("morning")}
        >
          {t("journal.tabMorning")}
          {answers.morningPages?.trim() && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-monk-accent" />}
        </button>
        <button
          type="button"
          className={`flex-1 min-h-11 rounded-lg py-2 text-xs font-semibold tracking-wide transition relative ${
            currentTab === "reflection"
              ? "bg-monk-surface text-monk-text border border-monk-border-strong shadow-sm"
              : "text-monk-muted hover:text-monk-text"
          }`}
          onClick={() => setTab("reflection")}
        >
          {t("journal.tabReflection")}
          {answers.whatMovedToday?.trim() && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-monk-success" />}
        </button>
      </div>

      {currentTab === "morning" ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-widest text-monk-text-soft font-mono">{t("journal.morningLabel")}</span>
            <span className={`text-[10px] font-mono ${wordCount >= 750 ? "text-monk-success" : "text-monk-text-soft"}`}>
              {t("journal.words", { n: wordCount })}{wordCount >= 750 ? " ✦" : ""}
            </span>
          </div>
          {wordCount > 0 && (
            <div className="h-1 rounded-full bg-monk-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${wordCount >= 750 ? "bg-monk-success" : "bg-monk-accent"}`}
                style={{ width: `${Math.min((wordCount / 750) * 100, 100)}%` }}
              />
            </div>
          )}
          <div className="morning-page-card">
            <textarea
              id="morningPages"
              value={answers.morningPages ?? ""}
              placeholder={t("journal.morningPlaceholder")}
              className="morning-page-textarea"
              onChange={(event) => setAnswers((value) => ({ ...value, morningPages: event.target.value }))}
            />
          </div>
          <p className="text-[11px] text-monk-text-soft text-center leading-relaxed px-2">
            {t("journal.morningHelper")}
          </p>
          {draftSaved ? (
            <p className="text-center text-[11px] font-medium text-monk-muted" aria-live="polite">
              {t("journal.draftSaved")}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Main Required Question */}
          <Card>
            <div className="mb-3 space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-monk-text-soft font-mono">{t("journal.promptChrome", { date: formatHumanDate(dateSeed) })}</div>
              <label className="block font-semibold text-base leading-relaxed text-monk-text" htmlFor="whatMovedToday">
                {activePrompt}
              </label>
            </div>
            <Textarea
              id="whatMovedToday"
              value={answers.whatMovedToday ?? ""}
              placeholder={t("journal.reflectionPlaceholder")}
              onChange={(event) => setAnswers((value) => ({ ...value, whatMovedToday: event.target.value }))}
            />
            <p className="text-[11px] text-monk-text-soft mt-3">{t("journal.reflectionHelper")}</p>
            {draftSaved ? (
              <p className="mt-2 text-[11px] font-medium text-monk-muted" aria-live="polite">
                {t("journal.draftSaved")}
              </p>
            ) : null}
          </Card>
          <TextInput
            label={t("today.closeDay.tomorrowLabel")}
            placeholder={t("today.closeDay.tomorrowPlaceholder")}
            value={tomorrow}
            onChange={(event) => setTomorrow(event.target.value)}
          />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {(currentTab === "reflection" || currentTab === "morning") ? <>
        {saved ? (
          <CalmAlert
            type="success"
            title={tomorrowSaved ? t("journal.tomorrowSaved") : t("journal.saved")}
          />
        ) : null}
        {!canSave && todayPlan ? (
          <p className="text-xs text-monk-text-soft text-center">
            {currentTab === "morning"
              ? t("journal.needWriteMorning")
              : t("journal.needWriteReflection")}
          </p>
        ) : null}
        <PrimaryButton
          disabled={!canSave}
          onClick={() => {
            store.saveJournalEntry(answers);
            localStorage.removeItem(journalDraftKey);
            let wroteTomorrow = false;
            if (currentTab === "reflection") {
              const tomorrowText = tomorrow.trim();
              if (tomorrowText) {
                const tomorrowDate = addDaysToDate(dateSeed, 1);
                const isRest = todayPlan?.dayType === "rest";
                if (isRest) {
                  store.createOrUpdateDayPlan(tomorrowDate, { dayType: "rest" });
                  wroteTomorrow = true;
                } else if (todayPlan?.goalId) {
                  store.createOrUpdateDayPlan(tomorrowDate, {
                    dayType: "goal",
                    goalId: todayPlan.goalId,
                    mainAction: tomorrowText
                  });
                  wroteTomorrow = true;
                }
              }
            }
            setTomorrowSaved(wroteTomorrow);
            setSaved(true);
            setTimeout(() => {
              navigate(routes.today);
            }, 800);
          }}
        >
          {currentTab === "morning" ? t("journal.saveMorning") : t("journal.saveReflection")}
        </PrimaryButton>
      </> : null}
      </div>

      {/* Notebook & Packs shortcuts below save */}
      <div className="grid grid-cols-2 gap-3 pt-6 pb-8">
        <button
          type="button"
          onClick={() => navigate(routes.notebook)}
          className="rounded-monk border border-monk-border bg-monk-surface p-4 text-left transition hover:border-monk-accent"
        >
          <div className="w-6 h-6 rounded-full bg-monk-accent-soft flex items-center justify-center mb-2">
            <FileText size={14} strokeWidth={1.5} className="text-monk-accent" />
          </div>
          <span className="block text-xs font-semibold text-monk-text mb-0.5">{t("journal.shortcut.notebook")}</span>
          <span className="block text-[10px] text-monk-text-soft">{t("journal.shortcut.notebookDesc")}</span>
        </button>
        <button
          type="button"
          onClick={() => navigate(routes.packs)}
          className="rounded-monk border border-monk-border bg-monk-surface p-4 text-left transition hover:border-monk-accent"
        >
          <div className="w-6 h-6 rounded-full bg-monk-success-soft flex items-center justify-center mb-2">
            <BookOpen size={14} strokeWidth={1.5} className="text-monk-success" />
          </div>
          <span className="block text-xs font-semibold text-monk-text mb-0.5">{t("journal.shortcut.packs")}</span>
          <span className="block text-[10px] text-monk-text-soft">{t("journal.shortcut.packsDesc")}</span>
        </button>
      </div>
    </>
  );
}

