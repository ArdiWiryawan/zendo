import { useState, useMemo } from "react";
import { useMonkStore } from "../store/useMonkStore";
import { Card, PrimaryButton, SecondaryButton, Textarea, EmptyState, GhostButton, CalmAlert } from "./ui";
import { Lock } from "lucide-react";
import type { JournalPack, JournalPackSession } from "../types/app";

export default function JournalPacks() {
  const store = useMonkStore();
  const packs = store.journalPacks;
  const sessions = store.journalPackSessions;
  const [activePackId, setActivePackId] = useState<string | null>(null);
  const [purchasePackId, setPurchasePackId] = useState<string | null>(null);

  const activePack = activePackId ? packs.find((p) => p.id === activePackId) : null;

  if (activePack) {
    return (
      <div className="packs-page-bg rounded-lg">
        <PackSession
          pack={activePack}
          onBack={() => setActivePackId(null)}
        />
      </div>
    );
  }

  return (
    <>
      <PackList packs={packs} sessions={sessions} onStart={setActivePackId} onPurchase={(id) => setPurchasePackId(id)} />
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
  const purchased = store.purchasedPackIds;

  const sorted = useMemo(() => {
    return packs.map((p) => {
      const session = sessions.find((s) => s.packId === p.id && !s.completedAt)
        ?? sessions.filter((s) => s.packId === p.id).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
      const completed = sessions.filter((s) => s.packId === p.id && s.completedAt);
      return { pack: p, activeSession: session, completedCount: completed.length, lastCompleted: completed[0]?.completedAt };
    });
  }, [packs, sessions]);

  return (
    <div className="space-y-3">
      {sorted.map(({ pack, activeSession, completedCount, lastCompleted }) => {
        const progress = activeSession?.progress ?? 0;
        const hasStarted = !!activeSession;
        return (
          <div key={pack.id} className={`workbook-card p-4 ${pack.isPremium && !purchased.includes(pack.id) ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{iconMap[pack.icon] ?? "📓"}</span>
                  <p className="font-semibold text-[#e5e2da]">{pack.title}</p>
                  {pack.isPremium && !purchased.includes(pack.id) ? (
                    <span className="rounded bg-[#a48b5e]/20 px-1.5 py-0.5 text-[8px] font-bold text-[#a48b5e] uppercase tracking-wider flex items-center gap-0.5">
                      <Lock size={8} /> Premium
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#908c83] leading-relaxed">{pack.description}</p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="rounded bg-[#2a251e] px-2 py-0.5 text-[9px] font-bold text-[#908c83] uppercase tracking-wider">
                    {pack.questions.length} {pack.questions.length === 1 ? "question" : "questions"}
                  </span>
                  <span className="text-[10px] text-[#68655e]">~{pack.estimatedMinutes} min</span>
                  {completedCount > 0 ? (
                    <span className="rounded bg-[#6bb48b]/20 px-2 py-0.5 text-[9px] font-bold text-[#6bb48b] uppercase tracking-wider">
                      ✓ {completedCount}x
                    </span>
                  ) : null}
                  {hasStarted && progress > 0 && progress < 100 ? (
                    <span className="rounded bg-[#a48b5e]/20 px-2 py-0.5 text-[9px] font-bold text-[#a48b5e] uppercase tracking-wider">
                      {progress}%
                    </span>
                  ) : null}
                </div>
                {hasStarted && progress > 0 && progress < 100 ? (
                  <div className="mt-2 h-1 rounded-full bg-[#2a251e] overflow-hidden">
                    <div className="h-full rounded-full bg-[#a48b5e]" style={{ width: `${progress}%` }} />
                  </div>
                ) : null}
                {lastCompleted ? (
                  <p className="mt-1 text-[10px] text-[#68655e]">Last: {new Date(lastCompleted).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</p>
                ) : null}
              </div>
              {pack.isPremium && !purchased.includes(pack.id) ? (
                <button
                  type="button"
                  onClick={() => onPurchase(pack.id)}
                  className="shrink-0 rounded-lg border border-[#8c7a5e] bg-[#2a251e] px-4 py-2 text-xs font-semibold text-[#a48b5e] hover:bg-[#3a3228] transition active:scale-95 flex items-center gap-1.5"
                >
                  <Lock size={12} /> Unlock $2.99
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    store.startJournalPack(pack.id);
                    onStart(pack.id);
                  }}
                  className="shrink-0 rounded-lg border border-[#a48b5e] bg-[#a48b5e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a48b5e]/90 transition active:scale-95"
                >
                  {hasStarted && progress < 100 ? "Continue" : completedCount > 0 ? "Do Again" : "Start"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PackSession({ pack, onBack }: { pack: JournalPack; onBack: () => void }) {
  const store = useMonkStore();
  const session = store.journalPackSessions.find((s) => s.packId === pack.id && !s.completedAt)
    ?? store.journalPackSessions.find((s) => s.packId === pack.id);

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!session) return 0;
    const unanswered = pack.questions.findIndex((q) => !session.answers.find((a) => a.questionId === q.id && a.answer.trim()));
    return unanswered >= 0 ? unanswered : 0;
  });
  const [input, setInput] = useState(() => {
    if (!session) return "";
    const existing = session.answers.find((a) => a.questionId === pack.questions[currentIndex]?.id);
    return existing?.answer ?? "";
  });
  const [saved, setSaved] = useState(false);

  if (!session) {
    store.startJournalPack(pack.id);
    return null;
  }

  const question = pack.questions[currentIndex];
  if (!question) {
    return (
      <div className="text-center p-8">
        <p className="text-2xl mb-3">✨</p>
        <p className="font-handwriting text-2xl text-[#e5e2da]">Well done.</p>
        <p className="mt-2 text-sm text-[#908c83]">You completed <span className="font-semibold">{pack.title}</span></p>
        <PrimaryButton className="mt-6" onClick={onBack}>← Back to Packs</PrimaryButton>
      </div>
    );
  }

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
      store.savePackAnswer(session.id, question.id, input.trim());
      store.completeJournalPack(session.id);
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header: Page X of Y + progress */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-xs text-[#68655e] hover:text-[#a48b5e] flex items-center gap-1">
          ← Back
        </button>
        <span className="workbook-page-number">Page {currentIndex + 1} of {pack.questions.length}</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 justify-center">
        {pack.questions.map((q, i) => {
          const answered = session.answers.some((a) => a.questionId === q.id && a.answer.trim());
          return (
            <span
              key={q.id}
              className={`w-2.5 h-2.5 rounded-full transition ${
                i === currentIndex ? "bg-[#a48b5e]" : answered ? "bg-[#6bb48b]" : "bg-[#2a251e]"
              }`}
            />
          );
        })}
      </div>

      {/* Question card — workbook style */}
      <div className="workbook-card p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#68655e] mb-2">{pack.title}</p>
        <p className="workbook-question">{question.question}</p>
        {question.hint ? <p className="mt-3 text-sm text-[#68655e] italic">— {question.hint}</p> : null}
      </div>

      {/* Answer area — ruled lines */}
      <div className="workbook-card p-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write your answer..."
          className="w-full bg-transparent workbook-answer-area border-none outline-none focus:outline-none resize-none min-h-[200px] text-sm text-[#d4cdc0] placeholder:text-[#68655e]"
          style={{ lineHeight: "2rem", backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #ddd6c8 27px, #ddd6c8 28px)" }}
        />
      </div>

      {saved ? (
        <p className="text-xs text-[#6bb48b] text-center">Saved ✓</p>
      ) : null}

      <div className="flex gap-3 pb-8">
        <GhostButton className="flex-1 text-[#68655e]" onClick={handleSave}>
          Save
        </GhostButton>
        <button
          type="button"
          disabled={!input.trim()}
          onClick={handleNext}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition active:scale-95 ${
            input.trim()
              ? "bg-[#a48b5e] text-white hover:bg-[#a48b5e]/90"
              : "bg-[#2a251e] text-[#68655e] cursor-not-allowed"
          }`}
        >
          {currentIndex < pack.questions.length - 1 ? "Next Question →" : "Complete"}
        </button>
      </div>
    </div>
  );
}

function PurchaseModal({ packId, onClose }: { packId: string; onClose: () => void }) {
  const store = useMonkStore();
  const pack = store.journalPacks.find((p) => p.id === packId);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  if (!pack) return null;

  const handlePurchase = () => {
    setProcessing(true);
    // Mock payment — simulate 1.2s processing
    setTimeout(() => {
      store.purchasePack(packId);
      setProcessing(false);
      setDone(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-[#1f1c17] border border-[#2a251e] p-6 sm:m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-semibold text-[#e5e2da]">Pack unlocked!</p>
            <p className="text-sm text-[#908c83] mt-1">You can now start "{pack.title}"</p>
            <PrimaryButton className="mt-5" onClick={onClose}>Start Writing</PrimaryButton>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#2a251e]">
                <Lock size={20} className="text-[#a48b5e]" />
              </div>
              <p className="font-semibold text-[#e5e2da]">Unlock Premium Pack</p>
              <p className="text-sm text-[#908c83] mt-1">{pack.title}</p>
            </div>

            <div className="rounded-lg bg-[#2a251e] p-4 mb-5 text-sm text-[#c8c2b4] space-y-1">
              <p>{pack.questions.length} deep journaling questions</p>
              <p>~{pack.estimatedMinutes} minutes of reflection</p>
              <p className="text-[#a48b5e] font-semibold pt-1">One-time purchase · $2.99</p>
            </div>

            {processing ? (
              <div className="text-center py-3 text-sm text-[#908c83]">Processing payment...</div>
            ) : (
              <div className="flex gap-3">
                <SecondaryButton className="flex-1" onClick={onClose}>
                  Not Now
                </SecondaryButton>
                <PrimaryButton className="flex-1" onClick={handlePurchase}>
                  Mock Purchase $2.99
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
