import { useState, useMemo, useEffect, useRef } from "react";
import { useMonkStore } from "../store/useMonkStore";
import { Card, PrimaryButton, SecondaryButton, GhostButton, EmptyState, useModalA11y } from "../components/ui";
import {
  Lock,
  ChevronLeft,
  Check,
  Crown,
  Sparkles,
  Sunrise,
  MoonStar,
  Shield,
  Compass,
  Trophy,
  Search,
  Brain,
  Heart,
  Rocket,
  ScrollText,
  CloudRain,
  Briefcase,
  Flame,
  Paintbrush,
  Lightbulb,
  TrendingUp,
  HeartHandshake,
  NotebookPen,
  PenLine,
  Users,
  User,
  Wallet,
  Ellipsis,
  Pen,
  type LucideIcon
} from "lucide-react";
import type { JournalPack, JournalPackSession } from "../types/app";
import { useT, useLanguage } from "../i18n";
import { ZendoProModal } from "../components/ZendoProModal";
import { addDaysToDate, getTodayDateString } from "../lib/date";
import { hapticPress } from "../lib/haptics";

export default function JournalPacks() {
  const store = useMonkStore();
  const packs = store.journalPacks;
  const sessions = store.journalPackSessions;
  const [activePackId, setActivePackId] = useState<string | null>(null);
  const [purchasePackId, setPurchasePackId] = useState<string | null>(null);
  const [proModalOpen, setProModalOpen] = useState(false);

  const activePack = activePackId ? packs.find((p) => p.id === activePackId) : null;

  if (activePack) {
    return (
      <PackSession pack={activePack} onBack={() => setActivePackId(null)} />
    );
  }

  return (
    <>
      <PackList
        packs={packs}
        sessions={sessions}
        onStart={setActivePackId}
        onPurchase={setPurchasePackId}
        onOpenPro={() => setProModalOpen(true)}
      />
      {purchasePackId ? (
        <PurchaseModal
          packId={purchasePackId}
          onClose={() => setPurchasePackId(null)}
          onOpenPro={() => {
            setPurchasePackId(null);
            setProModalOpen(true);
          }}
        />
      ) : null}
      <ZendoProModal isOpen={proModalOpen} onClose={() => setProModalOpen(false)} />
    </>
  );
}

function PackList({
  packs,
  sessions,
  onStart,
  onPurchase,
  onOpenPro,
}: {
  packs: JournalPack[];
  sessions: JournalPackSession[];
  onStart: (packId: string) => void;
  onPurchase: (packId: string) => void;
  onOpenPro: () => void;
}) {
  const store = useMonkStore();
  const t = useT();
  const purchased = store.purchasedPackIds;
  const isPro = store.isPro;

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
        const aLock = a.pack.isPremium && !isPro && !purchased.includes(a.pack.id) ? 1 : 0;
        const bLock = b.pack.isPremium && !isPro && !purchased.includes(b.pack.id) ? 1 : 0;
        if (aLock !== bLock) return aLock - bLock;
        return a.pack.title.localeCompare(b.pack.title);
      });
  }, [packs, sessions, purchased, isPro]);

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
      {!isPro && (
        <div className="rounded-2xl border border-monk-accent/40 bg-gradient-to-r from-monk-accent-soft/40 via-monk-surface to-monk-surface p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-monk-accent text-monk-bg shadow-sm">
              <Crown size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-monk-text">
                {t("packs.proUpsellTitle")}
              </p>
              <p className="text-[11px] text-monk-muted">
                {t("packs.proUpsellDesc")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenPro}
            className="shrink-0 rounded-monk bg-monk-accent px-3.5 py-1.5 text-xs font-bold text-monk-bg shadow-sm transition active:scale-95 hover:opacity-90 flex items-center gap-1"
          >
            <Sparkles size={12} />
            {t("packs.proUpsellCta")}
          </button>
        </div>
      )}

      {inProgress.length ? (
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">{t("packs.continue")}</p>
          {inProgress.map((item) => (
            <PackCard
              key={item.pack.id}
              {...item}
              purchased={isPro || purchased.includes(item.pack.id)}
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
            purchased={isPro || purchased.includes(item.pack.id)}
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
  const PackIcon = iconMap[pack.icon] ?? FallbackIcon;
  const locked = !!pack.isPremium && !purchased;

  return (
    <Card className={`p-4 ${locked ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${
            locked
              ? "border-monk-border bg-monk-soft text-monk-muted"
              : "border-monk-accent/30 bg-monk-accent-soft text-monk-accent"
          }`}
          aria-hidden
        >
          <PackIcon size={20} strokeWidth={1.75} />
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

          {inProgress ? (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-monk-muted">
                <span>{t("packs.inProgress")}</span>
                <span>{progress}%</span>
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
            className="shrink-0 rounded-monk bg-monk-accent px-3.5 py-2 text-xs font-semibold text-monk-bg transition active:scale-95 hover:opacity-90"
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
  const [bridgeCommitted, setBridgeCommitted] = useState(false);

  const currentQ = pack.questions[currentIndex];
  const total = pack.questions.length;
  const isLast = currentIndex === total - 1;

  useEffect(() => {
    if (!session) return;
    const existing = session.answers.find((a) => a.questionId === currentQ?.id);
    setInput(existing?.answer ?? "");
    setSaved(false);
  }, [currentIndex, currentQ?.id, session]);

  const handleSave = () => {
    if (!session || !currentQ) return;
    store.savePackAnswer(session.id, currentQ.id, input);
    setSaved(true);
  };

  const handleNext = () => {
    handleSave();
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
    } else {
      if (session) store.completeJournalPack(session.id);
      setDone(true);
    }
  };

  const handlePrev = () => {
    handleSave();
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  if (done) {
    const lastQ = pack.questions[pack.questions.length - 1];
    const lastAnswer = session?.answers.find((a) => a.questionId === lastQ?.id)?.answer?.trim();

    const handleBridgeAction = () => {
      if (!lastAnswer) return;
      const tomorrow = addDaysToDate(getTodayDateString(), 1);
      store.createOrUpdateDayPlan(tomorrow, {
        dayType: "goal",
        mainAction: lastAnswer
      });
      setBridgeCommitted(true);
      hapticPress("success");
    };

    return (
      <div className="py-10 text-center max-w-md mx-auto">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-monk-success/30 bg-monk-success-soft text-2xl text-monk-success">
          ✓
        </div>
        <h2 className="text-xl font-semibold text-monk-text">{t("packs.wellDone")}</h2>
        <p className="mt-1 text-sm text-monk-muted">{t("packs.completedPack", { title: pack.title })}</p>

        {lastAnswer ? (
          <div className="mt-6 text-left rounded-2xl border border-monk-accent/30 bg-monk-surface p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-monk-accent">
              <Sparkles size={14} />
              <span>{t("packs.actionBridgeTitle")}</span>
            </div>
            <p className="mt-2 text-sm italic font-serif text-monk-text leading-relaxed">
              "{lastAnswer}"
            </p>
            <div className="mt-3">
              {bridgeCommitted ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-monk-success">
                  <Check size={14} strokeWidth={2.5} />
                  <span>{t("packs.actionBridgeSaved")}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleBridgeAction}
                  className="flex items-center gap-1.5 rounded-monk bg-monk-accent px-3 py-2 text-xs font-semibold text-monk-bg transition hover:bg-monk-accent-hover active:scale-95 shadow-sm"
                >
                  <Sparkles size={13} />
                  <span>{t("packs.setAsTomorrowAction")}</span>
                </button>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-center gap-3">
          <PrimaryButton onClick={onBack}>{t("packs.backToPacks")}</PrimaryButton>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <GhostButton onClick={onBack} className="!px-2">
          <ChevronLeft size={16} className="mr-1 inline" /> {t("packs.back")}
        </GhostButton>
        <span className="text-xs font-semibold text-monk-muted">
          {currentIndex + 1} / {total}
        </span>
      </div>

      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-monk-accent">
          {pack.title}
        </span>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-monk-text">
          {currentQ.question}
        </h2>
        {currentQ.hint ? (
          <p className="mt-1 text-xs text-monk-muted">{currentQ.hint}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setSaved(false);
          }}
          placeholder={t("packs.answerPlaceholder")}
          rows={6}
          className="w-full resize-none rounded-monk border border-monk-border bg-monk-surface p-3 text-sm text-monk-text outline-none transition focus:border-monk-accent"
        />
        {saved ? (
          <p className="text-right text-[11px] font-medium text-monk-muted">{t("packs.saved")}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between pt-2">
        <SecondaryButton onClick={handlePrev} disabled={currentIndex === 0}>
          {t("packs.back")}
        </SecondaryButton>
        <PrimaryButton onClick={handleNext}>
          {isLast ? t("packs.complete") : t("packs.next")}
        </PrimaryButton>
      </div>
    </div>
  );
}

function PurchaseModal({
  packId,
  onClose,
  onOpenPro,
}: {
  packId: string;
  onClose: () => void;
  onOpenPro?: () => void;
}) {
  const store = useMonkStore();
  const t = useT();
  const pack = store.journalPacks.find((p) => p.id === packId);
  const [processing, setProcessing] = useState(false);
  const [demo, setDemo] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape closes, Tab stays inside, focus returns to the opener on unmount.
  const sheetRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open: true, ref: sheetRef, onClose });

  // After Bayar GG redirects back (?purchased=<packId>), the webhook has
  // persisted the purchase — mark it unlocked immediately and refresh from Supabase.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchased") === packId) {
      store.purchasePack(packId);
      store.syncPurchases();
      setDone(true);
      params.delete("purchased");
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
    }
  }, [packId, store]);

  if (!pack) return null;

  const handlePurchase = async () => {
    setProcessing(true);
    setError(null);
    try {
      const resp = await fetch("/api/bayargg-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json.url) {
        setError(t("packs.checkoutError"));
        setProcessing(false);
        return;
      }
      setDemo(Boolean(json.demo));
      window.location.href = json.url;
    } catch {
      setDemo(true);
      store.purchasePack(packId);
      setDone(true);
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
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

            <div className="mb-4 space-y-1 rounded-monk border border-monk-border bg-monk-soft p-4 text-sm text-monk-text-soft">
              <p>{t("packs.deepQuestions", { n: pack.questions.length })}</p>
              <p>{t("packs.reflectMinutes", { n: pack.estimatedMinutes })}</p>
              <p className="pt-1 font-semibold text-monk-accent">{t("packs.priceRp", { price: pack.priceRp ?? 29000 })}</p>
              {demo ? <p className="pt-1 text-xs font-semibold text-monk-accent">{t("packs.demoMode")}</p> : null}
            </div>

            {onOpenPro && (
              <button
                type="button"
                onClick={onOpenPro}
                className="w-full mb-4 rounded-monk border border-monk-accent/40 bg-monk-accent-soft/40 p-2.5 text-center text-xs font-bold text-monk-accent hover:bg-monk-accent-soft transition flex items-center justify-center gap-1.5"
              >
                <Crown size={14} />
                {t("packs.proUnlockAll")}
              </button>
            )}

            {processing ? (
              <div className="py-3 text-center text-sm text-monk-muted">{t("packs.processing")}</div>
            ) : (
              <div className="flex gap-3">
                <SecondaryButton className="flex-1" onClick={onClose}>
                  {t("packs.notNow")}
                </SecondaryButton>
                <PrimaryButton className="flex-1" onClick={handlePurchase}>
                  {t("packs.buy")}
                </PrimaryButton>
              </div>
            )}
            {error ? <p className="mt-2 text-center text-xs text-monk-danger">{error}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Pack icons. Keyed by the `icon` string each pack declares, so persisted packs
 * keep working and a new glyph is a renderer-only change.
 *
 * Deliberately lucide rather than emoji: emoji render as full-colour OS glyphs
 * that ignore the tile's accent colour and vary by platform, so a grid of them
 * reads as a party of unrelated stickers. Line icons inherit `currentColor`,
 * which is what actually ties the set to Zendo's palette.
 *
 * Mapped by meaning, not by literal name — "Journal" and "Star" are the two
 * reflective packs, so they get NotebookPen and Sparkles, the marks the rest of
 * the app already uses for writing and insight. `FallbackIcon` covers anything
 * unmapped, so a new pack never renders an empty tile.
 */
const iconMap: Record<string, LucideIcon> = {
  Sun: Sunrise,
  Moon: MoonStar,
  Star: Sparkles,
  Sparkles,
  Shield,
  Compass,
  Award: Trophy,
  Search,
  Brain,
  Heart,
  HeartHandshake,
  Rocket,
  Scroll: ScrollText,
  CloudRain,
  Briefcase,
  Flame,
  Paintbrush,
  Lightbulb,
  Target: NotebookPen,
  TrendingUp,
  Pen,
  PenLine,
  Users,
  User,
  Wallet,
  MoreHorizontal: Ellipsis,
  Journal: NotebookPen
};

const FallbackIcon: LucideIcon = NotebookPen;
