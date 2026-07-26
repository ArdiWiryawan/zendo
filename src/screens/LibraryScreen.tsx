import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, FileText, History } from "lucide-react";
import { useMonkStore } from "../store/useMonkStore";
import { useT, useLanguage } from "../i18n";
import { getJournalAnswerItems } from "../i18n/prompts";
import { getTodayDateString, formatHumanDate } from "../lib/date";
import { routes } from "../constants/routes";
import { DAILY_STATUS_LABELS, resolveDailyActivityStatus } from "../constants/dailyActivityStatus";
import { FOCUS_PRESETS } from "../constants/focusPresets";
import { getDailyActivity, getDailyHelperForDate, getFocusSummaryForDate, getLearningSummaryForDate } from "../lib/dailyActivity";
import { selectActiveGoals } from "../store/selectors";
import { DefenseChips } from "./TodayScreen";
import {
  Card,
  EmptyState,
  GhostButton,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SettingsLink,
  TextInput,
  Textarea,
  useCalmToast,
} from "../components/ui";
import JournalNotebook, { NotebookEditor } from "./JournalNotebook";
import JournalPacks from "./JournalPacks";
import { SeasonProgressCard } from "../components/SeasonWidgets";
import { CircularProgress } from "../components/CircularProgress";
import type { AppLanguage, TimelineStatus } from "../types/app";

export function CalendarCell({
  date,
  dayNumber,
  status,
  active,
  helperText,
  onClick
}: {
  date: string;
  dayNumber?: number;
  status: TimelineStatus;
  active?: boolean;
  helperText?: string;
  onClick?: () => void;
}) {
  const dotColor = {
    completed: "bg-monk-success/80",
    partial: "bg-monk-accent/70",
    missed: "bg-monk-text-soft/20",
    relapse: "bg-monk-danger/60",
    rest: "bg-monk-rest/50",
    not_started: "bg-monk-border/30"
  }[status];

  const isPast = date < getTodayDateString();
  const diffTime = new Date(getTodayDateString() + "T00:00:00").getTime() - new Date(date + "T00:00:00").getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const isEligible = isPast && diffDays <= 3 && ["missed", "not_started"].includes(status);

  return (
    <div
      title={`${dayNumber ? "Day " + dayNumber + " · " : ""}${status}${active ? " (today)" : ""}`}
      onClick={isEligible ? onClick : undefined}
      className={`aspect-square flex items-center justify-center ${isEligible ? "cursor-pointer" : ""}`}
    >
      <span className={`block w-1 h-1 rounded-full transition-all duration-300 ${dotColor} ${active ? "!w-2 !h-2 !bg-monk-accent/80 shadow-[0_0_6px_rgba(164,139,94,0.4)]" : ""} ${isEligible ? "hover:!w-2 hover:!h-2" : ""}`} />
    </div>
  );
}


export function TimelineLegend() {
  const items: Array<[TimelineStatus, string]> = [
    ["completed", "Completed"],
    ["partial", "Partial"],
    ["missed", "Missed"],
    ["relapse", "Relapse"],
    ["rest", "Rest"]
  ];
  return (
    <Card className="bg-monk-soft">
      <div className="flex flex-wrap gap-3">
        {items.map(([status, label]) => (
          <div key={status} className="flex items-center gap-2 text-sm text-monk-muted">
            <CalendarCell date={label} status={status} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-widest text-monk-muted mb-2">{title}</p>
      {children}
    </div>
  );
}

export function JournalLibraryScreen() {
  const store = useMonkStore();
  const navigate = useNavigate();
  const t = useT();
  const lang = useLanguage();
  const dateLocale = lang === "id" ? "id-ID" : "en-US";
  const season = store.activeSeason;
  const journalEntries = store.journalEntries.filter(e => e.seasonId === season?.id);
  const notebookEntries = store.notebookEntries;
  const packSessions = store.journalPackSessions.filter(s => s.completedAt);
  const categories = store.notebookCategories;

  const [libTab, setLibTab] = useState<"reflections" | "notebook" | "packs">("reflections");

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? t("library.unknown");
  const subtitle =
    libTab === "reflections"
      ? t("library.reflectionsCount", { n: journalEntries.length })
      : libTab === "notebook"
        ? t("library.notesCount", { n: notebookEntries.length })
        : t("library.packSessionsCount", { n: packSessions.length });

  return (
    <>
      <PageHeader
        title={t("library.title")}
        subtitle={subtitle}
        rightSlot={<SettingsLink />}
      />
      <div className="flex rounded-xl bg-monk-soft p-1 mb-5 border border-monk-border/40 overflow-x-auto">
        <button type="button" className={`flex-1 rounded-lg py-2 text-xs font-semibold tracking-wide transition whitespace-nowrap px-2 ${libTab === "reflections" ? "bg-monk-surface text-monk-text border border-monk-border-strong shadow-sm" : "text-monk-muted hover:text-monk-text"}`} onClick={() => setLibTab("reflections")}>{t("library.tab.reflections")}</button>
        <button type="button" className={`flex-1 rounded-lg py-2 text-xs font-semibold tracking-wide transition whitespace-nowrap px-2 ${libTab === "notebook" ? "bg-monk-surface text-monk-text border border-monk-border-strong shadow-sm" : "text-monk-muted hover:text-monk-text"}`} onClick={() => setLibTab("notebook")}>{t("library.tab.notebook")}</button>
        <button type="button" className={`flex-1 rounded-lg py-2 text-xs font-semibold tracking-wide transition whitespace-nowrap px-2 ${libTab === "packs" ? "bg-monk-surface text-monk-text border border-monk-border-strong shadow-sm" : "text-monk-muted hover:text-monk-text"}`} onClick={() => setLibTab("packs")}>{t("library.tab.packs")}</button>
      </div>
      <div className="space-y-4 pb-8">

        {libTab === "notebook" ? (
          notebookEntries.length === 0
            ? (
              <EmptyState
                title={t("library.empty.notebook.title")}
                description={t("library.empty.notebook.desc")}
                actionLabel={t("library.empty.notebook.action")}
                onAction={() => navigate(routes.notebook)}
              />
            )
            : [...notebookEntries]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((entry) => (
                <div key={entry.id} className="p-4 bg-monk-surface border border-monk-border/40 rounded-xl transition hover:border-monk-accent">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-monk-text truncate mr-2">{entry.title || t("library.untitled")}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-monk-accent bg-monk-accent-soft px-2 py-0.5 rounded-full shrink-0">{catName(entry.categoryId)}</span>
                  </div>
                  <p className="text-xs text-monk-muted mt-1 line-clamp-2">{entry.body.replace(/\n/g, " ").slice(0, 200)}</p>
                  <p className="text-xs text-monk-text-soft mt-1">{new Date(entry.updatedAt).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
              ))
        ) : libTab === "packs" ? (
          packSessions.length === 0
            ? (
              <EmptyState
                title={t("library.empty.packs.title")}
                description={t("library.empty.packs.desc")}
                actionLabel={t("library.empty.packs.action")}
                onAction={() => navigate(routes.packs)}
              />
            )
            : [...packSessions]
              .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
              .map((session) => {
                const pack = store.journalPacks.find((p) => p.id === session.packId);
                return (
                  <div key={session.id} className="p-4 bg-monk-surface border border-monk-border/40 rounded-xl transition hover:border-monk-accent">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">🧭</span>
                      <span className="text-sm font-semibold text-monk-text">{pack?.title ?? t("library.unknownPack")}</span>
                    </div>
                    <p className="text-xs text-monk-muted mt-1">{t("library.answersCount", { n: session.answers.length })}</p>
                    <p className="text-xs text-monk-text-soft mt-1">
                      {session.completedAt
                        ? t("library.completed", {
                            date: new Date(session.completedAt).toLocaleDateString(dateLocale, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }),
                          })
                        : ""}
                    </p>
                  </div>
                );
              })
        ) : (
          journalEntries.length === 0
            ? (
              <EmptyState
                title={t("library.empty.reflections.title")}
                description={t("library.empty.reflections.desc")}
                actionLabel={t("library.empty.reflections.action")}
                onAction={() => navigate(routes.journal)}
              />
            )
            : [...journalEntries]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((entry) => {
                const hasMorningPages = !!entry.answers.morningPages?.trim();
                const hasReflection = !!entry.answers.whatMovedToday?.trim();
                return (
                  <button key={entry.id} className="w-full text-left p-4 bg-monk-surface hover:bg-monk-surface/40 transition border border-monk-border/40 rounded-xl hover:border-monk-accent relative"
                    onClick={() => navigate(`/journal?tab=${hasReflection ? "reflection" : "morning"}&date=${entry.date}`)}>
                    {(hasMorningPages || hasReflection) && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-monk-accent rounded-l-xl" />}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-monk-text">{formatHumanDate(entry.date)}</span>
                      <div className="flex gap-1.5">
                        {hasMorningPages ? <span className="text-xs font-bold uppercase tracking-wider text-monk-accent bg-monk-accent-soft px-2 py-0.5 rounded-full">AM</span> : null}
                        {hasReflection ? <span className="text-xs font-bold uppercase tracking-wider text-monk-success bg-monk-success-soft px-2 py-0.5 rounded-full">PM</span> : null}
                      </div>
                    </div>
                    {hasReflection ? <p className="text-xs text-monk-muted mt-1 line-clamp-2">{entry.answers.whatMovedToday}</p> : hasMorningPages ? <p className="text-xs text-monk-muted mt-1 line-clamp-2">{entry.answers.morningPages}</p> : null}
                  </button>
                );
              })
        )}
        <GhostButton className="w-full mt-4" onClick={() => navigate(routes.journal)}>
          {t("library.writeNew")}
        </GhostButton>
      </div>
    </>
  );
}


export function NotebookPage() {
  const navigate = useNavigate();
  const t = useT();
  return (
    <div className="notebook-page-bg -mx-6 min-h-[calc(100dvh-120px)] px-6 pb-8 pt-2">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-handwriting text-[2rem] leading-none text-monk-text">{t("notebook.title")}</h1>
          <p className="mt-1 text-sm text-monk-muted">{t("notebook.subtitle")}</p>
        </div>
        <div className="flex items-center gap-1 pt-1">
          <button
            type="button"
            onClick={() => navigate(routes.library)}
            className="flex min-h-10 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-monk-text-soft transition hover:text-monk-accent"
          >
            <BookOpen size={13} strokeWidth={1.5} />
            {t("library.nav")}
          </button>
          <button
            type="button"
            onClick={() => navigate(routes.journal)}
            className="flex min-h-10 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-monk-text-soft transition hover:text-monk-accent"
          >
            <FileText size={13} strokeWidth={1.5} />
            {t("nav.journal")}
          </button>
        </div>
      </div>
      <JournalNotebook />
    </div>
  );
}


export function PacksPage() {
  const navigate = useNavigate();
  const t = useT();
  return (
    <>
      <PageHeader
        title={t("packs.title")}
        subtitle={t("packs.subtitle")}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(routes.library)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-monk-text-soft transition hover:text-monk-accent"
            >
              <BookOpen size={12} strokeWidth={1.5} /> {t("library.nav")}
            </button>
            <button
              type="button"
              onClick={() => navigate(routes.journal)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-monk-text-soft transition hover:text-monk-accent"
            >
              <FileText size={12} strokeWidth={1.5} /> {t("nav.journal")}
            </button>
          </div>
        }
      />
      <JournalPacks />
    </>
  );
}





export function LibraryScreen() {
  const store = useMonkStore();
  const navigate = useNavigate();
  const [subview, setSubview] = useState<"journal" | "learning" | "history" | null>(null);
  const [activeTab, setActiveTab] = useState<"focus" | "drifts">("focus");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReflections = useMemo(() => {
    return store.journalEntries.filter((j) => {
      const q = searchQuery.toLowerCase();
      return (
        j.date.toLowerCase().includes(q) ||
        (j.answers.whatMovedToday || "").toLowerCase().includes(q) ||
        (j.answers.whatDistractedMe || "").toLowerCase().includes(q) ||
        (j.answers.whatDidILearn || "").toLowerCase().includes(q)
      );
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [store.journalEntries, searchQuery]);

  const filteredFocus = useMemo(() => {
    return store.focusSessions.filter((s) => {
      if (!["completed", "ended_early"].includes(s.status)) return false;
      const q = searchQuery.toLowerCase();
      const goal = store.goals.find((g) => g.id === s.goalId);
      return (
        (goal?.title || "").toLowerCase().includes(q) ||
        (s.note || "").toLowerCase().includes(q) ||
        s.startTime.includes(q)
      );
    }).sort((a, b) => b.startTime.localeCompare(a.startTime));
  }, [store.focusSessions, store.goals, searchQuery]);

  const filteredLearning = useMemo(() => {
    return store.learningSessions.filter((l) => {
      const q = searchQuery.toLowerCase();
      const goal = store.goals.find((g) => g.id === l.relatedGoalId);
      return (
        (l.sourceTitle || "").toLowerCase().includes(q) ||
        (l.lesson || "").toLowerCase().includes(q) ||
        (l.actionIdea || "").toLowerCase().includes(q) ||
        (goal?.title || "").toLowerCase().includes(q)
      );
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [store.learningSessions, store.goals, searchQuery]);

  const filteredDrifts = useMemo(() => {
    return store.relapseLogs.filter((r) => {
      const q = searchQuery.toLowerCase();
      return (
        r.trigger.toLowerCase().includes(q) ||
        (r.note || "").toLowerCase().includes(q) ||
        (r.recoveryAction || "").toLowerCase().includes(q)
      );
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [store.relapseLogs, searchQuery]);

  if (subview === "journal") {
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => { setSubview(null); setSearchQuery(""); }}
            className="grid h-10 w-10 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-monk-text">Journal</h1>
            <p className="text-xs text-monk-muted">Reflect on your season, progress, blockers, and thoughts.</p>
          </div>
        </div>

        <div className="space-y-4">
          <PrimaryButton onClick={() => navigate(routes.journal)}>
            Write journal
          </PrimaryButton>

          <TextInput
            placeholder="Search reflections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="space-y-3 pt-2">
            {filteredReflections.length === 0 ? (
              <EmptyState
                title={searchQuery ? "No matching reflections" : "Your journal is still empty."}
                description={
                  searchQuery
                    ? "Try a different search, or clear the box to see everything."
                    : "Write your first reflection to understand what's really happening in your season."
                }
              />
            ) : (
              filteredReflections.map((j) => (
                <Card key={j.id} className="p-4 bg-monk-surface/30">
                  <div className="border-b border-monk-border/50 pb-3 mb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-monk-accent">{formatHumanDate(j.date)}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-monk-muted">
                          {getDailyHelperForDate(store, j.date)}
                        </p>
                      </div>
                      <span className="rounded-full border border-monk-border bg-monk-soft px-2 py-1 text-xs font-bold uppercase tracking-wider text-monk-muted">
                        {DAILY_STATUS_LABELS[resolveDailyActivityStatus({
                          focusSessions: getDailyActivity(store, j.date).focusSessions,
                          learningSessions: getDailyActivity(store, j.date).learningSessions.length > 0
                            ? getDailyActivity(store, j.date).learningSessions
                            : getDailyActivity(store, j.date).legacyLearningEntries.map((entry) => ({ id: entry.id }))
                        })]}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-monk-border bg-monk-bg p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-monk-muted">Focus</p>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-monk-text">{getFocusSummaryForDate(store, j.date)}</p>
                      </div>
                      <div className="rounded-xl border border-monk-border bg-monk-bg p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-monk-muted">Learning</p>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-monk-text">{getLearningSummaryForDate(store, j.date)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {getJournalAnswerItems((store.appSettings.language ?? "id") as AppLanguage, j.answers, j.date).map((item) => (
                        <div key={item.id}>
                          <span className="block text-xs font-bold uppercase tracking-wider text-monk-muted">{item.question}</span>
                          <p className="mt-0.5 text-xs font-medium leading-relaxed text-monk-text">{item.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </>
    );
  }

  if (subview === "learning") {
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => { setSubview(null); setSearchQuery(""); }}
            className="grid h-10 w-10 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-monk-text">Learning Companion</h1>
            <p className="text-xs text-monk-muted">Capture what you learn, then connect it to your current goals.</p>
          </div>
        </div>

        <div className="space-y-4">
          <PrimaryButton onClick={() => navigate(routes.learn)}>
            Add learning
          </PrimaryButton>

          <TextInput
            placeholder="Search learning notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="space-y-3 pt-2">
            {filteredLearning.length === 0 ? (
              <EmptyState
                title={searchQuery ? "No matching notes" : "No learning notes yet."}
                description={
                  searchQuery
                    ? "Try a different search, or clear the box to see everything."
                    : "Add one lesson from a book, course, podcast, or video that can support your season."
                }
              />
            ) : (
              filteredLearning.map((l) => {
                const goal = store.goals.find((g) => g.id === l.relatedGoalId);
                const durationMinutes = Math.round(l.actualDurationSeconds / 60);
                const parent = l.parentId ? store.learningSessions.find((s) => s.id === l.parentId) : null;
                const linked = l.linkedSessionIds?.map((lid) => store.learningSessions.find((s) => s.id === lid)).filter(Boolean) ?? [];
                return (
                  <Card key={l.id} className="p-4 bg-monk-surface/30">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-xs font-bold text-monk-accent">{formatHumanDate(l.startedAt.slice(0, 10))}</p>
                        <p className="text-sm font-semibold text-monk-text mt-0.5">{l.sourceTitle || "Untitled Note"}</p>
                        {l.chapter && <p className="text-xs text-monk-muted mt-0.5">{l.chapter}</p>}
                      </div>
                      <span className="text-xs font-bold text-monk-success bg-monk-success-soft border border-monk-success/30 px-2 py-0.5 rounded-full shrink-0">
                        {durationMinutes} mins
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-xs uppercase font-bold text-monk-accent bg-monk-accent-soft px-2 py-0.5 rounded border border-monk-accent/20">
                        {l.sourceType.replace("_", " ")}
                      </span>
                      {goal && <span className="text-xs text-monk-muted bg-monk-soft px-2 py-0.5 rounded border border-monk-border">{goal.title}</span>}
                      {parent && <span className="text-xs text-monk-text-soft bg-monk-soft px-2 py-0.5 rounded border border-monk-border">under: {parent.sourceTitle || parent.lesson?.slice(0, 20) || parent.id.slice(0, 8)}</span>}
                    </div>
                    {l.lesson && (
                      <div className="mt-3 bg-monk-soft/50 rounded-xl p-3 border border-monk-border/30">
                        <span className="text-xs font-bold text-monk-muted uppercase tracking-wider block">Lesson</span>
                        <p className="text-xs leading-relaxed text-monk-text mt-0.5">"{l.lesson}"</p>
                      </div>
                    )}
                    {l.content && (
                      <div className="mt-3 bg-monk-bg/60 rounded-xl p-3 border border-monk-border/30">
                        <span className="text-xs font-bold text-monk-muted uppercase tracking-wider block">Notes</span>
                        <p className="text-xs leading-6 text-monk-text whitespace-pre-wrap mt-0.5">{l.content}</p>
                      </div>
                    )}
                    {l.actionIdea && (
                      <div className="mt-3 bg-monk-accent-soft/30 rounded-xl p-3 border border-monk-accent/15">
                        <span className="text-xs font-bold text-monk-accent uppercase tracking-wider block">Action</span>
                        <p className="text-xs leading-relaxed text-monk-text-soft mt-0.5">{l.actionIdea}</p>
                      </div>
                    )}
                    {linked.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {linked.filter(Boolean).map((lnk: any) => (
                          <span key={lnk?.id} className="text-xs text-monk-accent bg-monk-accent-soft px-2 py-0.5 rounded-full border border-monk-accent/20">
                            linked: {lnk?.sourceTitle || lnk?.lesson?.slice(0, 20) || lnk?.id?.slice(0, 8)}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </>
    );
  }

  if (subview === "history") {
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => { setSubview(null); setSearchQuery(""); }}
            className="grid h-10 w-10 place-items-center rounded-full border border-monk-border bg-monk-surface text-monk-muted active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-monk-text">History & Logs</h1>
            <p className="text-xs text-monk-muted">Past focus sessions and drifts.</p>
          </div>
        </div>

        <div className="space-y-4">
          <TextInput
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="flex gap-2">
            {[
              { id: "focus", label: `Focus Sessions (${filteredFocus.length})` },
              { id: "drifts", label: `Drift Logs (${filteredDrifts.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`flex-1 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                  activeTab === tab.id
                    ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                    : "border-monk-border bg-monk-surface text-monk-muted"
                }`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            {activeTab === "focus" && (
              filteredFocus.length === 0 ? (
                <EmptyState
                  title={searchQuery ? "No matching sessions" : "No focus sessions yet"}
                  description={
                    searchQuery
                      ? "Try a different search, or clear the box to see everything."
                      : "Complete a quiet focus block and it will land here."
                  }
                  actionLabel={searchQuery ? undefined : "Start focus"}
                  onAction={searchQuery ? undefined : () => navigate(routes.focus)}
                />
              ) : (
                filteredFocus.map((s) => {
                  const goal = store.goals.find((g) => g.id === s.goalId);
                  return (
                    <Card key={s.id} className="p-4 bg-monk-surface/30 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-monk-accent">{formatHumanDate(s.startTime.slice(0, 10))}</p>
                        <p className="text-sm font-semibold mt-1">{goal?.title || "Focus Session"}</p>
                        <p className="text-xs text-monk-muted mt-0.5 uppercase tracking-wider font-bold">
                          {FOCUS_PRESETS[s.preset ?? s.timerMode ?? "deep_work"].shortLabel}
                          {s.status === "ended_early" ? " · Ended early" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-monk-success">{s.focusDurationMinutes ?? s.durationMinutes}m</p>
                        <p className="text-xs text-monk-muted">{s.breakDurationMinutes ?? 0}m break</p>
                      </div>
                    </Card>
                  );
                })
              )
            )}

            {activeTab === "drifts" && (
              filteredDrifts.length === 0 ? (
                <EmptyState
                  title={searchQuery ? "No matching drift logs" : "No drift logs"}
                  description={
                    searchQuery
                      ? "Try a different search, or clear the box to see everything."
                      : "Clean track so far. Drift notes only appear when you log a slip."
                  }
                />
              ) : (
                filteredDrifts.map((r) => (
                  <Card key={r.id} className="p-4 bg-monk-surface/30 border-monk-danger/20">
                    <div className="border-b border-monk-border/50 pb-2 mb-2">
                      <p className="text-xs font-bold text-monk-danger">{formatHumanDate(r.createdAt.slice(0, 10))}</p>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-bold text-monk-muted uppercase tracking-wider block">Trigger</span>
                        <p className="text-xs font-semibold leading-relaxed text-monk-danger mt-0.5 uppercase tracking-wider">{r.trigger.replace("_", " ")}</p>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-monk-muted uppercase tracking-wider block">Notes</span>
                        <p className="text-xs text-monk-text mt-0.5 leading-relaxed">{r.note || "-"}</p>
                      </div>
                      {r.recoveryAction && (
                        <div className="bg-monk-soft/30 rounded-xl p-2.5 border border-monk-border/40 mt-1">
                          <span className="text-xs font-bold text-monk-muted uppercase tracking-wider block">Recovery plan</span>
                          <p className="text-xs text-monk-text-soft mt-0.5 leading-normal">{r.recoveryAction}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Library" subtitle="Your second brain." rightSlot={<SettingsLink />} />
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setSubview("journal")}
          className="w-full text-left transition active:scale-[0.99]"
        >
          <Card className="p-5 border border-monk-border/60 bg-monk-surface/20 hover:bg-monk-surface/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-monk-accent/5 border border-monk-accent/15 text-monk-accent">
                <FileText size={18} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-monk-text">Reflections</p>
                  <span className="text-xs font-bold text-monk-muted bg-monk-soft/80 px-2 py-0.5 rounded-full">
                    {store.journalEntries.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-monk-muted leading-relaxed">
                  Daily reflections, morning pages, and what moved.
                </p>
              </div>
            </div>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => setSubview("learning")}
          className="w-full text-left transition active:scale-[0.99]"
        >
          <Card className="p-5 border border-monk-border/60 bg-monk-surface/20 hover:bg-monk-surface/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-monk-accent/5 border border-monk-accent/15 text-monk-accent">
                <BookOpen size={18} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-monk-text">Learning Notes</p>
                  <span className="text-xs font-bold text-monk-muted bg-monk-soft/80 px-2 py-0.5 rounded-full">
                    {store.learningSessions.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-monk-muted leading-relaxed">
                  Lessons, modules, and connected ideas.
                </p>
              </div>
            </div>
          </Card>
        </button>

        {/* Collapsible History Section */}
        <button
          type="button"
          onClick={() => setSubview("history")}
          className="w-full text-left transition active:scale-[0.99] mt-2"
        >
          <Card className="p-4 border border-monk-border bg-monk-surface/40 hover:bg-monk-surface transition-colors">
            <div className="flex items-center justify-between gap-3 text-monk-muted">
              <div className="flex items-center gap-3">
                <History size={16} />
                <span className="text-sm font-semibold">History & Logs</span>
              </div>
              <span className="text-xs text-monk-text-soft">
                {store.focusSessions.filter(s => ["completed", "ended_early"].includes(s.status)).length} focus · {store.relapseLogs.length} drifts
              </span>
            </div>
          </Card>
        </button>
      </div>
    </>
  );
}

