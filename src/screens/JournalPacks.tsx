import { useState, useMemo, useEffect } from "react";
import { useMonkStore } from "../store/useMonkStore";
import { Card, PrimaryButton, SecondaryButton, GhostButton, EmptyState } from "../components/ui";
import { Lock, ChevronLeft, Check } from "lucide-react";
import type { JournalPack, JournalPackSession } from "../types/app";
import { useT, useLanguage } from "../i18n";

export default function JournalPacks() {
  const store = useMonkStore();
  const packs = store.journalPacks;
  const sessions = store.journalPackSessions;
  const [activePackId, setActivePackId] = useState<string | null>(null);
  const [purchasePackId, setPurchasePackId] = useState<string | null>(null);

  const activePack = activePackId ? packs.find((p) => p.id === activePackId) : null;

  if (activePack) {
    return (
      <PackSession pack={activePack} onBack={() => setActivePackId(null)} />
    );
  }

  return (
    <>
      <PackList packs={packs} sessions={sessions} onStart={setActivePackId} onPurchase={setPurchasePackId} />
      {purchasePackId ? <PurchaseModal packId={purchasePackId} onClose={() => setPurchasePackId(null)} /> : null}
    </>
  );
}

function PackList({
  packs,
  sessions,
  onStart,
  onPurchase,
}: {
  packs: JournalPack[];
  sessions: JournalPackSession[];
  onStart: (packId: string) => void;
  onPurchase: (packId: string) => void;
}) {
  const store = useMonkStore();
  const t = useT();
  const purchased = store.purchasedPackIds;

  const sorted = useMemo(() => {
    return packs
      .map((p) => {
        const active = sessions.find((s) => s.packId === p.id && !s.completedAt);
        const completed = sessions
          .filter((s) => s.packId === p.id && s.completedAt)
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
        return {
          pack: p,
          activeSession: active,
          completedCount: completed.length,
          lastCompleted: completed[0]?.completedAt,
        };
      })
      .sort((a, b) => {
        // In-progress first, then free, then by title
        const aProg = a.activeSession && (a.activeSession.progress ?? 0) < 100 ? 0 : 1;
        const bProg = b.activeSession && (b.activeSession.progress ?? 0) < 100 ? 0 : 1;
        if (aProg !== bProg) return aProg - bProg;
        const aLock = a.pack.isPremium && !purchased.includes(a.pack.id) ? 1 : 0;
        const bLock = b.pack.isPremium && !purchased.includes(b.pack.id) ? 1 : 0;
        if (aLock !== bLock) return aLock - bLock;
        return a.pack.title.localeCompare(b.pack.title);
      });
  }, [packs, sessions, purchased]);

  if (!packs.length) {
    return (
      <EmptyState
        title={t("packs.empty.title")}
        description={t("packs.empty.desc")}
      />
    );
  }

  const inProgress = sorted.filter((s) => s.activeSession && (s.activeSession.progress ?? 0) < 100);
  const rest = sorted.filter((s) => !(s.activeSession && (s.activeSession.progress ?? 0) < 100));

  return (
    <div className="space-y-6">
      {inProgress.length ? (
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">{t("packs.continue")}</p>
          {inProgress.map((item) => (
            <PackCard
              key={item.pack.id}
              {...item}
              purchased={purchased.includes(item.pack.id)}
              onStart={onStart}
              onPurchase={onPurchase}
            />
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        {inProgress.length ? (
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">{t("packs.all")}</p>
        ) : null}
        {rest.map((item) => (
          <PackCard
            key={item.pack.id}
            {...item}
            purchased={purchased.includes(item.pack.id)}
            onStart={onStart}
            onPurchase={onPurchase}
          />
        ))}
      </section>
    </div>
  );
}

function PackCard({
  pack,
  activeSession,
  completedCount,
  lastCompleted,
  purchased,
  onStart,
  onPurchase,
}: {
  pack: JournalPack;
  activeSession?: JournalPackSession;
  completedCount: number;
  lastCompleted?: string;
  purchased: boolean;
  onStart: (id: string) => void;
  onPurchase: (id: string) => void;
}) {
  const store = useMonkStore();
  const t = useT();
  const lang = useLanguage();
  const dateLocale = lang === "id" ? "id-ID" : "en-US";
  const progress = activeSession?.progress ?? 0;
  const inProgress = !!activeSession && progress < 100;
  const hasSession = !!activeSession;
  const locked = !!pack.isPremium && !purchased;

  return (
    <Card className={`p-4 ${locked ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border text-lg ${
            locked
              ? "border-monk-border bg-monk-soft text-monk-muted"
              : "border-monk-accent/30 bg-monk-accent-soft text-monk-accent"
          }`}
          aria-hidden
        >
          {iconMap[pack.icon] ?? "📓"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-monk-text">{pack.title}</p>
            {locked ? (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-monk-accent/30 bg-monk-accent-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-monk-accent">
                <Lock size={9} /> {t("packs.premium")}
              </span>
            ) : null}
            {completedCount > 0 && !inProgress ? (
              <span className="rounded-full border border-monk-success/30 bg-monk-success-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-monk-success">
                {t("packs.doneCount", { n: completedCount })}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-5 text-monk-muted">{pack.description}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-monk-text-soft">
            <span>{t("packs.questions", { n: pack.questions.length })}</span>
            <span aria-hidden>·</span>
            <span>{t("packs.minutes", { n: pack.estimatedMinutes })}</span>
            {lastCompleted ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  {t("packs.last", {
                    date: new Date(lastCompleted).toLocaleDateString(dateLocale, {
                      day: "numeric",
                      month: "short",
                    }),
                  })}
                </span>
              </>
            ) : null}
          </div>

          {hasSession ? (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[10px] text-monk-muted">
                <span>{inProgress ? t("packs.inProgress") : t("packs.doneCount", { n: completedCount })}</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-monk-soft">
                <div
                  className="h-full rounded-full bg-monk-accent transition-all"
                  style={{ width: `${Math.max(progress, 2)}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {locked ? (
          <button
            type="button"
            onClick={() => onPurchase(pack.id)}
            className="shrink-0 rounded-monk border border-monk-accent/40 bg-monk-soft px-3 py-2 text-xs font-semibold text-monk-accent transition active:scale-95 hover:bg-monk-accent-soft"
          >
            {t("packs.unlock")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              store.startJournalPack(pack.id);
              onStart(pack.id);
            }}
            className="shrink-0 rounded-monk bg-monk-accent px-3.5 py-2 text-xs font-semibold text-white transition active:scale-95 hover:opacity-90"
          >
            {inProgress ? t("packs.continue") : completedCount > 0 ? t("packs.again") : t("packs.start")}
          </button>
        )}
      </div>
    </Card>
  );
}

function PackSession({ pack, onBack }: { pack: JournalPack; onBack: () => void }) {
  const store = useMonkStore();
  const t = useT();
  const session =
    store.journalPackSessions.find((s) => s.packId === pack.id && !s.completedAt) ??
    store.journalPackSessions.find((s) => s.packId === pack.id);

  // Ensure session exists without setState-during-render
  useEffect(() => {
    if (!session) store.startJournalPack(pack.id);
  }, [session, pack.id]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!session) return 0;
    const unanswered = pack.questions.findIndex(
      (q) => !session.answers.find((a) => a.questionId === q.id && a.answer.trim())
    );
    return unanswered >= 0 ? unanswered : 0;
  });
  const [input, setInput] = useState(() => {
    if (!session) return "";
    const existing = session.answers.find((a) => a.questionId === pack.questions[currentIndex]?.id);
    return existing?.answer ?? "";
  });
  const [saved, setSaved] = useState(false);
  const [done, setDone] = useState(false);

  if (!session) {
    return (
      <div className="py-12 text-center text-sm text-monk-muted">{t("packs.opening")}</div>
    );
  }

  if (done || currentIndex >= pack.questions.length) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-monk-success/30 bg-monk-success-soft text-monk-success">
          <Check size={22} strokeWidth={2.5} />
        </div>
        <p className="text-xl font-semibold text-monk-text">{t("packs.wellDone")}</p>
        <p className="mt-2 text-sm text-monk-muted">
          {t("packs.completedPack", { title: pack.title })}
        </p>
        <PrimaryButton className="mt-6" onClick={onBack}>
          {t("packs.backToPacks")}
        </PrimaryButton>
      </Card>
    );
  }

  const question = pack.questions[currentIndex];
  const answeredCount = pack.questions.filter((q) =>
    session.answers.some((a) => a.questionId === q.id && a.answer.trim())
  ).length;

  const handleSave = () => {
    store.savePackAnswer(session.id, question.id, input.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1000);
  };

  const handleNext = () => {
    store.savePackAnswer(session.id, question.id, input.trim());
    if (currentIndex < pack.questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const nextAnswer = session.answers.find((a) => a.questionId === pack.questions[nextIdx]?.id);
      setInput(nextAnswer?.answer ?? "");
    } else {
      const isLast = currentIndex === pack.questions.length - 1;
      if (isLast && session.completedAt) {
        setDone(true);
      } else {
        store.completeJournalPack(session.id);
        setDone(true);
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs font-semibold text-monk-muted transition hover:text-monk-accent"
        >
          <ChevronLeft size={14} /> {t("packs.back")}
        </button>
        <span className="text-[11px] font-mono text-monk-text-soft">
          {currentIndex + 1}/{pack.questions.length}
        </span>
      </div>

      <div
        className="flex gap-1.5"
        aria-label={t("packs.progressAria", { done: answeredCount, total: pack.questions.length })}
      >
        {pack.questions.map((q, i) => {
          const answered = session.answers.some((a) => a.questionId === q.id && a.answer.trim());
          return (
            <span
              key={q.id}
              className={`h-1.5 flex-1 rounded-full transition ${
                i === currentIndex
                  ? "bg-monk-accent"
                  : answered
                  ? "bg-monk-success/70"
                  : "bg-monk-soft"
              }`}
            />
          );
        })}
      </div>

      <Card className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">{pack.title}</p>
        <p className="mt-3 text-lg font-semibold leading-7 text-monk-text">{question.question}</p>
        {question.hint ? (
          <p className="mt-3 text-sm italic leading-5 text-monk-text-soft">— {question.hint}</p>
        ) : null}
      </Card>

      <Card className="p-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("packs.answerPlaceholder")}
          className="min-h-[200px] w-full resize-none bg-transparent text-sm leading-7 text-monk-text outline-none placeholder:text-monk-muted"
          style={{
            backgroundImage:
              "repeating-linear-gradient(transparent, transparent 27px, var(--color-monk-border, #2a251e) 27px, var(--color-monk-border, #2a251e) 28px)",
          }}
        />
      </Card>

      {saved ? <p className="text-center text-xs text-monk-success">{t("packs.saved")}</p> : null}

      <div className="flex gap-3 pb-4">
        <GhostButton className="flex-1" onClick={handleSave}>
          {t("packs.save")}
        </GhostButton>
        <PrimaryButton className="flex-1" disabled={!input.trim()} onClick={handleNext}>
          {currentIndex < pack.questions.length - 1 ? t("packs.next") : t("packs.complete")}
        </PrimaryButton>
      </div>
    </div>
  );
}

function PurchaseModal({ packId, onClose }: { packId: string; onClose: () => void }) {
  const store = useMonkStore();
  const t = useT();
  const pack = store.journalPacks.find((p) => p.id === packId);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  if (!pack) return null;

  const handlePurchase = () => {
    setProcessing(true);
    setTimeout(() => {
      store.purchasePack(packId);
      setProcessing(false);
      setDone(true);
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl border border-monk-border bg-monk-surface p-6 sm:m-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-monk-success/30 bg-monk-success-soft text-monk-success">
              <Check size={20} />
            </div>
            <p className="font-semibold text-monk-text">{t("packs.unlocked")}</p>
            <p className="mt-1 text-sm text-monk-muted">{t("packs.canStart", { title: pack.title })}</p>
            <PrimaryButton className="mt-5" onClick={onClose}>
              {t("packs.startWriting")}
            </PrimaryButton>
          </div>
        ) : (
          <>
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-monk-accent/30 bg-monk-accent-soft text-monk-accent">
                <Lock size={18} />
              </div>
              <p className="font-semibold text-monk-text">{t("packs.unlockTitle")}</p>
              <p className="mt-1 text-sm text-monk-muted">{pack.title}</p>
            </div>

            <div className="mb-5 space-y-1 rounded-monk border border-monk-border bg-monk-soft p-4 text-sm text-monk-text-soft">
              <p>{t("packs.deepQuestions", { n: pack.questions.length })}</p>
              <p>{t("packs.reflectMinutes", { n: pack.estimatedMinutes })}</p>
              <p className="pt-1 font-semibold text-monk-accent">{t("packs.price")}</p>
            </div>

            {processing ? (
              <div className="py-3 text-center text-sm text-monk-muted">{t("packs.processing")}</div>
            ) : (
              <div className="flex gap-3">
                <SecondaryButton className="flex-1" onClick={onClose}>
                  {t("packs.notNow")}
                </SecondaryButton>
                <PrimaryButton className="flex-1" onClick={handlePurchase}>
                  {t("packs.mockBuy")}
                </PrimaryButton>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const iconMap: Record<string, string> = {
  Sun: "☀️",
  Moon: "🌙",
  Star: "⭐",
  Shield: "🛡️",
  Compass: "🧭",
  Award: "🏆",
  Search: "🔍",
  Brain: "🧠",
  Heart: "❤️",
  Rocket: "🚀",
  Scroll: "📜",
  CloudRain: "🌧️",
  Sparkles: "✨",
  HeartHandshake: "🤝",
  Briefcase: "💼",
  Flame: "🔥",
  Paintbrush: "🎨",
  Lightbulb: "💡",
  Target: "🎯",
  TrendingUp: "📈",
};
