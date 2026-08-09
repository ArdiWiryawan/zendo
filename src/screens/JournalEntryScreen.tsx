import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, useBlocker } from "react-router-dom";
import { BookOpen, FileText } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT, type MessageKey } from "../i18n";
import { getDailyJournalPromptForDate } from "../i18n/prompts";
import {
  CalmAlert,
  CalmDialog,
  Card,
  GhostButton,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SettingsLink,
  TextInput,
  Textarea,
  useCalmToast,
} from "../components/ui";
import { getTodayDateString, addDaysToDate, formatHumanDate } from "../lib/date";
import { routes } from "../constants/routes";
import { JOURNAL_DRAFT_KEY, readJournalDraft, writeJournalDraft } from "../lib/storage";
import { selectActiveGoals, selectJournalEntryForToday, selectTodayPlan } from "../store/selectors";
import { WhyEditor } from "../components/SeasonWidgets";
import type { AppLanguage, JournalAnswers } from "../types/app";

export function JournalEntryScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const t = useT();
  const lang = (store.appSettings.language ?? "id") as AppLanguage;
  const [searchParams, setSearchParams] = useSearchParams();

  const today = getTodayDateString();
  const urlDate = searchParams.get("date");
  const requestedDate = urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate) ? urlDate : today;
  const isRequestedDate = requestedDate !== today;

  const todayPlan = selectTodayPlan(store);
  const targetPlan = isRequestedDate
    ? store.dayPlans.find((p) => p.seasonId === store.activeSeason?.id && p.date === requestedDate)
    : todayPlan;
  const targetEntry = isRequestedDate
    ? store.journalEntries.find(
        (entry) => entry.seasonId === store.activeSeason?.id && entry.date === requestedDate
      )
    : selectJournalEntryForToday(store);
  const dateSeed = targetPlan?.date ?? requestedDate;
  const journalDraftKey = `${JOURNAL_DRAFT_KEY}:${dateSeed}`;

  const initial = useMemo(() => {
    const draft = readJournalDraft(journalDraftKey);
    return draft?.answers ?? targetEntry?.answers ?? {};
  }, [journalDraftKey, targetEntry?.id, targetEntry?.updatedAt]);

  const initialTomorrow = useMemo(
    () => readJournalDraft(journalDraftKey)?.tomorrow ?? "",
    [journalDraftKey]
  );

  const [answers, setAnswers] = useState<JournalAnswers>(initial);
  const [saved, setSaved] = useState(false);
  const [tomorrow, setTomorrow] = useState(initialTomorrow);
  const [tomorrowSaved, setTomorrowSaved] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const draftSkipRef = useRef(true);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Shortcut buttons (Notebook/Packs) below the save button deliberately leave
  // the page; draft is already autosaved to localStorage, so skip the guard.
  const leaveRef = useRef(false);
  const toast = useCalmToast();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    setAnswers(initial);
    setTomorrow(initialTomorrow);
    setSaved(false);
    setTomorrowSaved(false);
    setDraftSaved(false);
    draftSkipRef.current = true;
  }, [initial, initialTomorrow]);

  useEffect(() => {
    if (draftSkipRef.current) {
      draftSkipRef.current = false;
      return;
    }
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      writeJournalDraft(journalDraftKey, { answers, tomorrow });
      setDraftSaved(true);
    }, 600);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [answers, tomorrow, journalDraftKey]);

  const activePrompt = useMemo(() => getDailyJournalPromptForDate(lang, dateSeed), [lang, dateSeed]);

  const now = new Date();
  const isEvening = now.getHours() >= 17;
  const urlTab = searchParams.get("tab");
  const reason = searchParams.get("reason");
  const defaultTab: "reflection" | "morning" = urlTab === "morning" || urlTab === "reflection" ? urlTab : (isEvening ? "reflection" : "morning");
  const reasonPrompt = useMemo(() => {
    if (!reason) return undefined;
    const base = t(`journal.reason.${reason}` as MessageKey);
    return t("journal.reason.prefix", { reason: reason.replace("_", " ") }) + base;
  }, [reason, t]);
  const [currentTab, setCurrentTab] = useState(defaultTab);

  const hasDraft =
    (currentTab === "morning" && !!answers.morningPages?.trim()) ||
    (currentTab === "reflection" && !!answers.whatMovedToday?.trim());
  const blocker = useBlocker(() => hasDraft && !saved);

  useEffect(() => {
    // Shortcut nav is deliberate: draft is autosaved to localStorage, so
    // bypass the unsaved-draft guard instead of showing the dialog. The effect
    // runs only when blocker STATE changes (not every render), so leaveRef set
    // right before navigate() is still pending when the blocker flips to
    // "blocked" — proceed() then applies to that same blocked transition.
    if (blocker.state === "blocked") {
      if (leaveRef.current) {
        leaveRef.current = false;
        blocker.proceed?.();
        return;
      }
      setConfirmLeave(true);
    }
  }, [blocker.state, blocker.proceed]);

  useEffect(() => {
    setCurrentTab(defaultTab);
  }, [defaultTab]);

  const setTab = (tab: "reflection" | "morning") => {
    setCurrentTab(tab);
    const next: Record<string, string> = { tab };
    if (isRequestedDate) next.date = requestedDate;
    setSearchParams(next);
  };

  const wordCount = useMemo(() => {
    const text = answers.morningPages || "";
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [answers.morningPages]);

  const canSave =
    currentTab === "morning"
      ? !!answers.morningPages?.trim()
      : !!answers.whatMovedToday?.trim();

  return (
    <>
      <PageHeader
        title={t("journal.title")}
        subtitle={isRequestedDate
          ? t("journal.dateContext", { date: formatHumanDate(requestedDate) })
          : (isEvening ? t("journal.subtitleEvening") : t("journal.subtitleMorning"))}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(routes.library)}
              className="grid min-h-10 min-w-10 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted hover:text-monk-accent hover:border-monk-accent transition active:scale-90"
              aria-label={t("journal.ariaLibrary")}
            >
              <BookOpen size={16} strokeWidth={1.5} />
            </button>
            <SettingsLink />
          </div>
        }
      />
      {!targetPlan ? (
        <div className="space-y-2">
          <CalmAlert type="info" title={t("journal.noPlanNote")} />
          <button
            type="button"
            onClick={() => navigate(routes.today)}
            className="text-xs font-medium text-monk-accent hover:underline"
          >
            {t("journal.setFocusToday")}
          </button>
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite">{t("journal.selectedDate", { date: formatHumanDate(dateSeed) })}</span>
      <div role="tablist" aria-label={t("journal.title")} className="flex rounded-xl bg-monk-soft p-1 mb-5 border border-monk-border/40">
        <button
          type="button"
          role="tab"
          id="journal-tab-morning"
          aria-selected={currentTab === "morning"}
          aria-controls="journal-panel-morning"
          aria-label={t("journal.tabMorningAria")}
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
          role="tab"
          id="journal-tab-reflection"
          aria-selected={currentTab === "reflection"}
          aria-controls="journal-panel-reflection"
          aria-label={t("journal.tabReflectionAria")}
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
        <div
          role="tabpanel"
          id="journal-panel-morning"
          aria-labelledby="journal-tab-morning"
          className="mt-4 space-y-3"
        >
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
          {toast.Toast()}
        </div>
      ) : (
        <div
          role="tabpanel"
          id="journal-panel-reflection"
          aria-labelledby="journal-tab-reflection"
          className="mt-5 space-y-4"
        >
          {/* Main Required Question */}
          {reasonPrompt && (
            <Card className="mb-3">
              <label className="block font-semibold text-base leading-relaxed text-monk-text">{t("journal.whyPulledAway")}</label>
              <p className="text-sm text-monk-muted mt-1">{reasonPrompt}</p>
            </Card>
          )}
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
            {toast.Toast()}
          </Card>
          {!isRequestedDate && targetPlan ? (
            <TextInput
              label={t("today.closeDay.tomorrowLabel")}
              placeholder={t("today.closeDay.tomorrowPlaceholder")}
              value={tomorrow}
              onChange={(event) => setTomorrow(event.target.value)}
            />
          ) : isRequestedDate ? (
            <p className="text-[11px] text-monk-text-soft">{t("journal.tomorrowPast")}</p>
          ) : null}
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
        {!canSave ? (
          <p className="text-xs text-monk-text-soft text-center">
            {currentTab === "morning"
              ? t("journal.needWriteMorning")
              : t("journal.needWriteReflection")}
          </p>
        ) : null}
        <PrimaryButton
          disabled={!canSave}
          onClick={() => {
            store.saveJournalEntry(answers, { date: dateSeed, tab: currentTab });
            localStorage.removeItem(journalDraftKey);
            // Skip the next draft-write debounce so it can't resurrect stale
            // answers just after the saved draft was cleared.
            draftSkipRef.current = true;
            let wroteTomorrow = false;
            if (currentTab === "reflection" && !isRequestedDate && targetPlan) {
              const tomorrowText = tomorrow.trim();
              if (tomorrowText) {
                const tomorrowDate = addDaysToDate(dateSeed, 1);
                const goalId = targetPlan?.goalId ?? selectActiveGoals(store)[0]?.id;
                const isRest = targetPlan?.dayType === "rest";
                if (isRest) {
                  // Rest-day "tomorrow I will…" is an explicit resume action → a
                  // GOAL day for tomorrow (week budget is 1 rest day; a written
                  // action means intent to resume). Save intention text as mainAction.
                  if (goalId) {
                    store.createOrUpdateDayPlan(tomorrowDate, {
                      dayType: "goal",
                      goalId,
                      mainAction: tomorrowText
                    });
                    wroteTomorrow = true;
                  }
                  // ponytail: no active goal → skip tomorrow plan write.
                } else if (goalId) {
                  store.createOrUpdateDayPlan(tomorrowDate, {
                    dayType: "goal",
                    goalId,
                    mainAction: tomorrowText
                  });
                  wroteTomorrow = true;
                }
              }
            }
            setTomorrowSaved(wroteTomorrow);
            setSaved(true);
            toast.show(wroteTomorrow ? t("journal.tomorrowSaved") : t("journal.saved"));
          }}
        >
          {currentTab === "morning" ? t("journal.saveMorning") : t("journal.saveReflection")}
        </PrimaryButton>
        {saved ? (
          <SecondaryButton onClick={() => navigate(routes.today)}>
            {t("journal.done")}
          </SecondaryButton>
        ) : null}
      </> : null}
      </div>

      <CalmDialog
        open={confirmLeave}
        title={t("journal.discardTitle")}
        description={t("journal.discardBody")}
        confirmLabel={t("dialog.discard")}
        cancelLabel={t("dialog.cancel")}
        danger
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          if (blocker.state === "blocked") blocker.proceed();
        }}
      />

      {/* Notebook & Packs shortcuts below save */}
      <div className="grid grid-cols-2 gap-3 pt-6 pb-8">
        <button
          type="button"
          onClick={() => { leaveRef.current = true; navigate(routes.notebook); }}
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
          onClick={() => { leaveRef.current = true; navigate(routes.packs); }}
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

