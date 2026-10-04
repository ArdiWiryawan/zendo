import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  X,
  LayoutTemplate,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Check,
  Repeat,
  Plus,
  ArrowUp,
  ArrowDown,
  Pause,
  Play,
  Trash2
} from "lucide-react";
import { useMonkStore, normalizeAvailability } from "../store/useMonkStore";
import { selectCurrentWeeklyPlan } from "../store/selectors";
import { useT } from "../i18n";
import type { MessageKey } from "../i18n";
import type { GoalType, GoalWeekday } from "../types/app";
import { PrimaryButton, SecondaryButton, GhostButton, TextInput, CalmAlert, CalmDialog, useCalmToast, useModalA11y } from "./ui";
import { ReleaseChoiceDialog } from "./ReleaseChoiceDialog";
import { hapticPress } from "../lib/haptics";
import { GOAL_TEMPLATES, GoalBlueprintTemplate } from "../constants/goalTemplates";
import { MAX_ACTIVE_GOAL_TRACKS } from "../lib/validation";

interface GoalBlueprintModalProps {
  goalId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Monday-first, matching GoalWeekday's index order.
const WEEKDAY_KEYS = [
  "blueprint.weekday.mon",
  "blueprint.weekday.tue",
  "blueprint.weekday.wed",
  "blueprint.weekday.thu",
  "blueprint.weekday.fri",
  "blueprint.weekday.sat",
  "blueprint.weekday.sun"
] as const;

/**
 * GOAL TRACKS — the season's named focus areas, with real identity so they can
 * be renamed, reordered, paused and deleted. The chips set THIS goal's track
 * (which stays a plain name on the goal); the list below is the season-wide
 * manager. The active cap is a gentle nudge, never a hard error: at the limit
 * the add action explains the trade-off and points at pausing.
 */
function GoalTrackManager({
  lang,
  selectedTrack,
  onSelectTrack
}: {
  lang: "en" | "id";
  selectedTrack: string;
  onSelectTrack: (name: string) => void;
}) {
  const store = useMonkStore();
  const seasonId = store.activeSeason?.id;
  const tracks = (store.goalTracks ?? [])
    .filter((track) => track.seasonId === seasonId)
    .sort((a, b) => a.order - b.order);
  const activeTracks = tracks.filter((track) => track.status === "active");
  const atCap = activeTracks.length >= MAX_ACTIVE_GOAL_TRACKS;

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [showCapNote, setShowCapNote] = useState(false);

  const commitRename = (id: string, fallback: string) => {
    const draft = drafts[id];
    if (draft === undefined) return;
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    const trimmed = draft.trim();
    if (!trimmed || trimmed === fallback) return;
    hapticPress("light");
    store.renameGoalTrack(id, trimmed);
  };

  const move = (id: string, direction: -1 | 1) => {
    const ids = tracks.map((track) => track.id);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    hapticPress("light");
    store.reorderGoalTracks(ids);
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (atCap) {
      // Surface the trade-off rather than a hard error; nothing is written.
      setShowCapNote(true);
      return;
    }
    hapticPress("light");
    const created = store.addGoalTrack(trimmed);
    if (created) {
      setNewName("");
      setShowCapNote(false);
      onSelectTrack(created.name);
    }
  };

  return (
    <div className="space-y-2">
      {/* Quick pick — sets this goal's track from the season's real tracks. */}
      {activeTracks.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {activeTracks.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { hapticPress("light"); onSelectTrack(item.name); }}
              aria-pressed={selectedTrack === item.name}
              className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold transition active:scale-95 border ${
                selectedTrack === item.name
                  ? "border-monk-accent bg-monk-accent/15 text-monk-accent font-bold"
                  : "border-monk-border/60 bg-monk-surface text-monk-muted hover:text-monk-text"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : null}

      {/* Manager */}
      <div className="space-y-1.5 border-t border-monk-border/50 pt-2">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-monk-muted">
          {lang === "en" ? "Tracks this season" : "Track musim ini"}
        </span>

        {tracks.length === 0 ? (
          <p className="text-[11px] text-monk-muted">
            {lang === "en"
              ? "No tracks yet. Add one to group related goals."
              : "Belum ada track. Tambahkan satu untuk mengelompokkan goal terkait."}
          </p>
        ) : null}

        {tracks.map((item, index) => {
          const paused = item.status !== "active";
          return (
            <div
              key={item.id}
              className="flex items-center gap-1.5 rounded-lg border border-monk-border/60 bg-monk-surface px-2 py-1.5"
            >
              <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums text-monk-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <input
                value={drafts[item.id] ?? item.name}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                onBlur={() => commitRename(item.id, item.name)}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                aria-label={lang === "en" ? "Track name" : "Nama track"}
                className={`min-w-0 flex-1 bg-transparent text-xs font-semibold focus:outline-none ${
                  paused ? "text-monk-muted line-through" : "text-monk-text"
                }`}
              />
              <button
                type="button"
                onClick={() => move(item.id, -1)}
                disabled={index === 0}
                aria-label={lang === "en" ? "Move up" : "Naikkan"}
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-monk-muted transition hover:text-monk-text disabled:opacity-30"
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => move(item.id, 1)}
                disabled={index === tracks.length - 1}
                aria-label={lang === "en" ? "Move down" : "Turunkan"}
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-monk-muted transition hover:text-monk-text disabled:opacity-30"
              >
                <ArrowDown size={13} />
              </button>
              <button
                type="button"
                onClick={() => { hapticPress("light"); store.setGoalTrackStatus(item.id, paused ? "active" : "paused"); }}
                aria-label={
                  paused
                    ? (lang === "en" ? "Resume track" : "Lanjutkan track")
                    : (lang === "en" ? "Pause track" : "Jeda track")
                }
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-monk-muted transition hover:text-monk-text"
              >
                {paused ? <Play size={13} /> : <Pause size={13} />}
              </button>
              <button
                type="button"
                onClick={() => { hapticPress("light"); store.removeGoalTrack(item.id); }}
                aria-label={lang === "en" ? "Delete track" : "Hapus track"}
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-monk-muted transition hover:text-monk-danger"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}

        <div className="flex items-center gap-1.5 pt-0.5">
          <input
            value={newName}
            onChange={(e) => { setNewName(e.target.value); if (showCapNote) setShowCapNote(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            placeholder={lang === "en" ? "New track name" : "Nama track baru"}
            aria-label={lang === "en" ? "New track name" : "Nama track baru"}
            className="min-w-0 flex-1 rounded-lg border border-monk-border bg-monk-surface px-2 py-1.5 text-xs text-monk-text focus:border-monk-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-monk-border bg-monk-surface text-monk-muted transition hover:text-monk-text active:scale-95"
            aria-label={lang === "en" ? "Add track" : "Tambah track"}
          >
            <Plus size={14} />
          </button>
        </div>

        {showCapNote ? (
          <CalmAlert
            type="info"
            title={
              lang === "en"
                ? `You already have ${MAX_ACTIVE_GOAL_TRACKS} active tracks`
                : `Kamu sudah punya ${MAX_ACTIVE_GOAL_TRACKS} track aktif`
            }
            description={
              lang === "en"
                ? "Three live tracks is usually as much as a season can carry well. Pause one to free a slot, or replace one you're no longer working on — nothing is lost either way."
                : "Tiga track aktif biasanya sudah sebatas yang bisa dijalani dengan baik dalam satu musim. Jeda salah satunya untuk membuka slot, atau ganti yang sudah tidak kamu kerjakan — tidak ada yang hilang."
            }
          />
        ) : null}
      </div>
    </div>
  );
}

export function GoalBlueprintModal({ goalId, isOpen, onClose }: GoalBlueprintModalProps) {
  const t = useT();
  const toast = useCalmToast();
  const store = useMonkStore();
  const goal = store.goals.find((g) => g.id === goalId);
  const lang = (store.appSettings.language ?? "id") === "en" ? "en" : "id";
  const templates = GOAL_TEMPLATES[lang];

  // Releasing a goal removes it from this week's allocations, so the week gets
  // those focus days back. Stated up front so the release dialog can name them.
  const currentPlan = selectCurrentWeeklyPlan(store);
  const freedFocusDays = currentPlan
    ? currentPlan.goalAllocations.find((a) => a.goalId === goalId)?.targetCount ?? 0
    : 0;

  const [showTemplates, setShowTemplates] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // §release — releasing a goal from the season lives here now, as the modal's
  // own escape hatch. `releaseOpen` drives ReleaseChoiceDialog, which names the
  // focus day the release hands back before asking the note.
  const [releaseOpen, setReleaseOpen] = useState(false);

  // 4 Essential Pillars
  const [title, setTitle] = useState("");
  const [keystoneAction, setKeystoneAction] = useState("");
  const [whenWhere, setWhenWhere] = useState("");
  const [definitionOfDone, setDefinitionOfDone] = useState("");

  // Additional settings
  const [track, setTrack] = useState("");
  const [why, setWhy] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [weeklyTargetCount, setWeeklyTargetCount] = useState(4);
  // §12-13: the goal's kind, and — only for `frequency` goals — the countable
  // outcome target, kept separate from the practice rhythm above.
  const [goalType, setGoalType] = useState<GoalType>("achievement");
  const [outcomeFrequency, setOutcomeFrequency] = useState(3);
  // §14 availability — preferred days + workable window.
  const [preferredDays, setPreferredDays] = useState<GoalWeekday[]>([]);
  const [availStart, setAvailStart] = useState("");
  const [availEnd, setAvailEnd] = useState("");
  const [obstacleMitigation, setObstacleMitigation] = useState("");
  const [error, setError] = useState("");

  // §23-25 — Goal → Practice reclassification. Not a separate screen: the same
  // modal swaps its body for a confirmation before anything is written.
  const [showConvert, setShowConvert] = useState(false);
  const [convertNewGoal, setConvertNewGoal] = useState(false);
  const [convertGoalTitle, setConvertGoalTitle] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const convertRef = useRef<HTMLDivElement>(null);

  // The confirmation renders at the end of a long scroll body; bring it into
  // view so the action never looks like it did nothing.
  useEffect(() => {
    if (showConvert) convertRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [showConvert]);

  useEffect(() => {
    if (goal && isOpen) {
      setTitle(goal.title || "");
      setKeystoneAction(goal.keystoneAction || "");
      setWhenWhere(goal.whenWhere || "");
      setDefinitionOfDone(goal.definitionOfDone || "");
      setTrack(goal.track || "");
      setWhy(goal.why || "");
      setDesiredOutcome(goal.desiredOutcome || "");
      setWeeklyTargetCount(goal.weeklyTargetCount || 4);
      setGoalType(goal.type ?? "achievement");
      setOutcomeFrequency(goal.outcomeFrequencyPerWeek ?? 3);
      setPreferredDays(goal.availability?.preferredDays ?? []);
      setAvailStart(goal.availability?.preferredStartTime ?? "");
      setAvailEnd(goal.availability?.preferredEndTime ?? "");
      setObstacleMitigation(goal.obstacleMitigation || "");
      setShowTemplates(false);
      setShowAdvanced(false);
      setShowConvert(false);
      setConvertNewGoal(false);
      setConvertGoalTitle(goal.desiredOutcome || "");
      setReleaseOpen(false);
      setError("");
    }
  }, [goal, isOpen]);

  useEffect(() => {
    if (goal && isOpen) {
      setConvertGoalTitle(goal.desiredOutcome || "");
    }
  }, [goal?.desiredOutcome, isOpen]);

  // Escape closes (backing out of the template picker first), Tab stays inside,
  // focus returns to the opener on unmount.
  useModalA11y({
    open: isOpen,
    ref: modalRef,
    onClose: () => {
      // The release dialog stacks on top and owns Escape while it is open:
      // without this, its listener and ours both fire and the whole modal
      // would close underneath the dialog.
      if (releaseOpen) {
        setReleaseOpen(false);
        return;
      }
      if (showTemplates) setShowTemplates(false);
      else if (showConvert) setShowConvert(false);
      else onClose();
    }
  });

  if (!goal || !isOpen) return null;

  const handleApplyTemplate = (tpl: GoalBlueprintTemplate) => {
    hapticPress("medium");
    setTitle(tpl.title);
    setWhy(tpl.why);
    setKeystoneAction(tpl.keystoneAction);
    setWeeklyTargetCount(tpl.weeklyTargetCount);
    setObstacleMitigation(tpl.obstacleMitigation);
    setShowTemplates(false);
    setError("");
    toast.show(t("blueprint.templateApplied", { name: tpl.category }));
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError(t("blueprint.needTitle"));
      return;
    }
    if (!keystoneAction.trim()) {
      setError(t("blueprint.needKeystone"));
      return;
    }

    hapticPress("medium");
    store.updateGoalBlueprint(goal.id, {
      title: title.trim(),
      keystoneAction: keystoneAction.trim(),
      track: track.trim() || undefined,
      whenWhere: whenWhere.trim() || undefined,
      availability: normalizeAvailability({
        preferredDays,
        preferredStartTime: availStart,
        preferredEndTime: availEnd
      }),
      definitionOfDone: definitionOfDone.trim() || undefined,
      weeklyTargetCount,
      type: goalType,
      outcomeFrequencyPerWeek: goalType === "frequency" ? outcomeFrequency : undefined,
      why: why.trim() || undefined,
      desiredOutcome: desiredOutcome.trim() || undefined,
      obstacleMitigation: obstacleMitigation.trim() || undefined
    });

    toast.show(t("blueprint.saved"));
    onClose();
  };

  const handleConvert = () => {
    hapticPress("medium");
    const newGoalTitle = convertGoalTitle.trim();
    if (convertNewGoal && !newGoalTitle) {
      setError(
        lang === "en"
          ? "Give the new goal a title."
          : "Beri judul untuk goal baru ini."
      );
      return;
    }
    store.convertGoalToPractice(goal.id, {
      practiceName: title.trim() || goal.title,
      weeklyTargetCount,
      newGoal: convertNewGoal ? { title: newGoalTitle, why: why.trim() || undefined } : undefined
    });
    toast.show(
      lang === "en"
        ? "Moved to practices. Past sessions stay in this goal's history."
        : "Dipindah ke praktik. Sesi lama tetap tersimpan di riwayat goal ini."
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-monk-bg/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Modal / Bottom Sheet */}
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="blueprint-dialog-title"
        className="relative z-10 flex max-h-[92dvh] sm:max-h-[88vh] w-full sm:max-w-[560px] flex-col rounded-t-monk-lg sm:rounded-monk-lg border border-monk-border bg-monk-surface shadow-2xl overflow-hidden"
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-monk-border-strong/70" />
        </div>

        {/* Top Header */}
        <div className="border-b border-monk-border/60 px-5 pt-3.5 pb-3 sm:px-6 sm:pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-monk-accent/15 text-monk-accent">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 id="blueprint-dialog-title" className="text-base font-bold tracking-tight text-monk-text">
                  {t("blueprint.dialogTitle")}
                </h2>
                <p className="text-[11px] font-medium text-monk-muted">
                  {showTemplates ? t("blueprint.templatesTitle") : t("blueprint.pillarsSubtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  hapticPress("light");
                  setShowTemplates((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                  showTemplates
                    ? "bg-monk-accent text-monk-bg shadow-sm"
                    : "border border-monk-accent/40 bg-monk-accent/10 text-monk-accent hover:bg-monk-accent/20"
                }`}
              >
                <LayoutTemplate size={12} />
                <span>{showTemplates ? t("blueprint.backToCustom") : t("blueprint.useTemplate")}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-7 w-7 place-items-center rounded-lg text-monk-muted hover:bg-monk-soft hover:text-monk-text transition"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-4">
          {error ? (
            <div className="rounded-xl border border-monk-danger/30 bg-monk-danger/10 p-3 text-xs text-monk-danger font-medium flex items-center gap-2">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {showTemplates ? (
            <div className="space-y-2.5 animate-fade-in">
              <div className="rounded-xl border border-monk-border/60 bg-monk-soft/50 p-3 text-xs text-monk-muted">
                {t("blueprint.templatesDesc")}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="flex flex-col text-left p-3.5 rounded-xl border border-monk-border bg-monk-surface hover:border-monk-accent/60 hover:bg-monk-accent-soft/20 transition active:scale-[0.99] space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-monk-text">{tpl.title}</span>
                      <span className="rounded-full bg-monk-accent/15 px-2 py-0.5 text-[10px] font-bold text-monk-accent">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-monk-muted leading-relaxed">
                      <span className="font-semibold text-monk-text-soft">{tpl.keystoneAction}</span>
                    </p>
                    <p className="text-[10px] text-monk-muted/80 line-clamp-1 italic">
                      &quot;{tpl.why}&quot;
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pillar 1: Goal */}
              <div className="rounded-2xl border border-monk-border bg-monk-soft/40 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-monk-text font-bold text-xs uppercase tracking-wider">
                  <div className="grid h-5 w-5 place-items-center rounded bg-monk-accent/20 text-monk-accent">
                    <Target size={12} />
                  </div>
                  <span>{t("blueprint.pillar1Title")}</span>
                </div>
                <TextInput
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder={t("blueprint.titlePlaceholder")}
                  className="bg-monk-surface text-sm font-semibold"
                />
                <p className="text-[11px] text-monk-muted">{t("blueprint.pillar1Desc")}</p>
                <label htmlFor="blueprint-outcome" className="text-xs font-bold uppercase tracking-wider text-monk-muted block">
                  {t("blueprint.outcomeLabel")}
                </label>
                <TextInput
                  id="blueprint-outcome"
                  value={desiredOutcome}
                  onChange={(e) => setDesiredOutcome(e.target.value)}
                  placeholder={t("blueprint.outcomePlaceholder")}
                  className="bg-monk-surface text-sm"
                  onBlur={(e) => setDesiredOutcome(e.target.value.trim())}
                />
              </div>

              {/* Goal Track / Focus Area */}
              <div className="rounded-2xl border border-monk-border bg-monk-soft/30 p-3.5 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-monk-muted block">
                  {t("blueprint.trackLabel")}
                </label>
                <TextInput
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                  placeholder={t("blueprint.trackPlaceholder")}
                  className="bg-monk-surface text-sm"
                />
                <GoalTrackManager lang={lang} selectedTrack={track} onSelectTrack={setTrack} />
              </div>

              {/* Pillar 2: Next Keystone Action */}
              <div className="rounded-2xl border border-monk-accent/30 bg-monk-accent-soft/20 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-monk-accent font-bold text-xs uppercase tracking-wider">
                  <div className="grid h-5 w-5 place-items-center rounded bg-monk-accent text-monk-bg">
                    <Zap size={12} />
                  </div>
                  <span>{t("blueprint.pillar2Title")}</span>
                </div>
                <TextInput
                  value={keystoneAction}
                  onChange={(e) => {
                    setKeystoneAction(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder={t("blueprint.keystonePlaceholder")}
                  className="bg-monk-surface text-sm font-semibold"
                />
                <p className="text-[11px] text-monk-muted">{t("blueprint.pillar2Desc")}</p>
              </div>

              {/* Pillar 3: When & Where */}
              <div className="rounded-2xl border border-monk-border bg-monk-soft/40 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-monk-text font-bold text-xs uppercase tracking-wider">
                  <div className="grid h-5 w-5 place-items-center rounded bg-monk-cat-shallow/20 text-monk-cat-shallow">
                    <Clock size={12} />
                  </div>
                  <span>{t("blueprint.pillar3Title")}</span>
                </div>
                <TextInput
                  value={whenWhere}
                  onChange={(e) => setWhenWhere(e.target.value)}
                  placeholder={t("blueprint.pillar3Placeholder")}
                  className="bg-monk-surface text-sm"
                />
                <p className="text-[11px] text-monk-muted">{t("blueprint.pillar3Desc")}</p>
              </div>

              {/* Pillar 4: Definition of Done */}
              <div className="rounded-2xl border border-monk-border bg-monk-soft/40 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-monk-text font-bold text-xs uppercase tracking-wider">
                  <div className="grid h-5 w-5 place-items-center rounded bg-monk-success/20 text-monk-success">
                    <CheckCircle2 size={12} />
                  </div>
                  <span>{t("blueprint.pillar4Title")}</span>
                </div>
                <TextInput
                  value={definitionOfDone}
                  onChange={(e) => setDefinitionOfDone(e.target.value)}
                  placeholder={t("blueprint.pillar4Placeholder")}
                  className="bg-monk-surface text-sm"
                />
                <p className="text-[11px] text-monk-muted">{t("blueprint.pillar4Desc")}</p>
              </div>

              {/* Optional Advanced Settings Accordion */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-monk-border/60 bg-monk-soft/30 px-3.5 py-2.5 text-xs font-semibold text-monk-muted hover:text-monk-text transition"
                >
                  <span>{t("blueprint.advancedLabel")}</span>
                  {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showAdvanced ? (
                  <div className="mt-2 space-y-3 rounded-2xl border border-monk-border/60 bg-monk-soft/20 p-3.5 text-xs">
                    <div>
                      <label className="font-semibold text-monk-text block mb-1">
                        {t("blueprint.typeLabel")}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {(["achievement", "frequency", "maintenance"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setGoalType(type)}
                            aria-pressed={goalType === type}
                            className={`rounded-lg border px-2.5 py-1.5 transition ${
                              goalType === type
                                ? "border-monk-accent/50 bg-monk-accent/10 font-semibold text-monk-text"
                                : "border-monk-border/70 bg-monk-surface/60 text-monk-muted hover:text-monk-text"
                            }`}
                          >
                            {t(`blueprint.type.${type}` as MessageKey)}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[10px] leading-4 text-monk-muted">
                        {t(`blueprint.typeHint.${goalType}` as MessageKey)}
                      </p>
                    </div>
                    <div>
                      <label className="font-semibold text-monk-text block mb-1">
                        {t("blueprint.frequencyLabel")} ({weeklyTargetCount} {t("blueprint.daysPerWeek")})
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={7}
                        value={weeklyTargetCount}
                        onChange={(e) => setWeeklyTargetCount(Number(e.target.value))}
                        className="w-full accent-monk-accent cursor-pointer"
                      />
                    </div>
                    {goalType === "frequency" ? (
                      <div>
                        <label className="font-semibold text-monk-text block mb-1">
                          {t("blueprint.outcomeFrequencyLabel")} ({outcomeFrequency}{" "}
                          {t("blueprint.timesPerWeek")})
                        </label>
                        <input
                          type="range"
                          min={1}
                          max={7}
                          value={outcomeFrequency}
                          onChange={(e) => setOutcomeFrequency(Number(e.target.value))}
                          className="w-full accent-monk-accent cursor-pointer"
                        />
                        <p className="mt-1 text-[10px] leading-4 text-monk-muted">
                          {t("blueprint.outcomeFrequencyHint")}
                        </p>
                      </div>
                    ) : null}
                    {/* §14 Availability — when this is realistically workable. */}
                    <div>
                      <label className="font-semibold text-monk-text block mb-1">
                        {t("blueprint.availabilityLabel")}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAY_KEYS.map((key, index) => {
                          const on = preferredDays.includes(index as GoalWeekday);
                          return (
                            <button
                              key={key}
                              type="button"
                              aria-pressed={on}
                              onClick={() =>
                                setPreferredDays((prev) =>
                                  prev.includes(index as GoalWeekday)
                                    ? prev.filter((d) => d !== index)
                                    : [...prev, index as GoalWeekday].sort((a, b) => a - b)
                                )
                              }
                              className={`min-h-8 rounded-lg border px-2.5 text-[11px] font-semibold transition active:scale-95 ${
                                on
                                  ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                                  : "border-monk-border bg-monk-surface text-monk-muted hover:text-monk-text"
                              }`}
                            >
                              {t(key)}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="time"
                          aria-label={t("blueprint.availabilityStart")}
                          value={availStart}
                          onChange={(e) => setAvailStart(e.target.value)}
                          className="min-h-9 flex-1 rounded-lg border border-monk-border bg-monk-surface px-2 text-xs text-monk-text focus:border-monk-accent focus:outline-none"
                        />
                        <span className="text-xs text-monk-muted">–</span>
                        <input
                          type="time"
                          aria-label={t("blueprint.availabilityEnd")}
                          value={availEnd}
                          onChange={(e) => setAvailEnd(e.target.value)}
                          className="min-h-9 flex-1 rounded-lg border border-monk-border bg-monk-surface px-2 text-xs text-monk-text focus:border-monk-accent focus:outline-none"
                        />
                      </div>
                      <p className="mt-1 text-[10px] leading-4 text-monk-muted">
                        {t("blueprint.availabilityHint")}
                      </p>
                    </div>
                    <div>
                      <label className="font-semibold text-monk-text block mb-1">
                        {t("blueprint.planBLabel")}
                      </label>
                      <TextInput
                        value={obstacleMitigation}
                        onChange={(e) => setObstacleMitigation(e.target.value)}
                        placeholder={t("blueprint.planBPlaceholder")}
                        className="bg-monk-surface text-xs"
                      />
                      <p className="mt-1 text-[10px] text-monk-muted">{t("blueprint.planBHint")}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* §23-25 — Goal → Practice conversion confirmation. */}
          {showConvert ? (
            <div ref={convertRef} className="space-y-3.5 rounded-xl border border-monk-border bg-monk-soft/60 p-4">
              <CalmAlert
                type="info"
                title={
                  lang === "en"
                    ? "Turn this goal into a practice?"
                    : "Ubah goal ini jadi praktik?"
                }
                description={
                  lang === "en"
                    ? "Your recorded sessions stay attached to this goal's history. Only what you're doing from now on changes."
                    : "Sesi yang sudah tercatat tetap menempel di riwayat goal ini. Yang berubah hanya cara kamu menjalaninya mulai sekarang."
                }
              />

              <div>
                <label htmlFor="convert-practice-name" className="mb-1 block text-[11px] font-semibold text-monk-muted">
                  {lang === "en" ? "Practice name" : "Nama praktik"}
                </label>
                <TextInput
                  id="convert-practice-name"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setError(""); }}
                  placeholder={goal.title}
                  className="bg-monk-surface text-sm"
                />
                <p className="mt-1 text-[10px] text-monk-muted">
                  {lang === "en"
                    ? `${weeklyTargetCount} days a week — the same rhythm this goal had.`
                    : `${weeklyTargetCount} hari per minggu — ritme yang sama seperti goal ini.`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => { hapticPress("light"); setConvertNewGoal((prev) => !prev); }}
                aria-pressed={convertNewGoal}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-monk-border bg-monk-surface px-3 py-2.5 text-left"
              >
                <span className="text-xs font-semibold text-monk-text">
                  {lang === "en" ? "Also create a new goal for it" : "Sekaligus buat goal baru untuknya"}
                </span>
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                    convertNewGoal ? "border-monk-accent bg-monk-accent text-monk-bg" : "border-monk-border-strong"
                  }`}
                >
                  {convertNewGoal ? <Check size={13} /> : null}
                </span>
              </button>

              {convertNewGoal ? (
                <div>
                  <label htmlFor="convert-goal-title" className="mb-1 block text-[11px] font-semibold text-monk-muted">
                    {lang === "en" ? "New goal title" : "Judul goal baru"}
                  </label>
                  <TextInput
                    id="convert-goal-title"
                    value={convertGoalTitle}
                    onChange={(e) => { setConvertGoalTitle(e.target.value); setError(""); }}
                    placeholder={lang === "en" ? "e.g. Build a body of work" : "mis. Bangun karya yang nyata"}
                    className="bg-monk-surface text-sm"
                  />
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2.5">
                <SecondaryButton onClick={() => setShowConvert(false)} className="min-h-10 px-4">
                  {t("dialog.cancel")}
                </SecondaryButton>
                <PrimaryButton onClick={handleConvert} className="min-h-10 px-5">
                  {lang === "en" ? "Convert" : "Ubah"}
                </PrimaryButton>
              </div>
            </div>
          ) : null}
        </div>

        {/*
          Release is an escape hatch, not a second primary action: it sits after
          the goal's own content, tinted like the destructive confirm it opens,
          so it never competes with Save. It is also the ONLY way to release a
          goal now — TodayScreen no longer owns this control.
        */}
        <div className="border-t border-monk-border/60 px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={() => {
              hapticPress("light");
              setReleaseOpen(true);
            }}
            aria-haspopup="dialog"
            aria-label={`${t("release.triggerLabel")} — ${t("release.confirm")}`}
            className="flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-monk-danger/80 transition hover:bg-monk-danger/10 hover:text-monk-danger"
          >
            <Trash2 size={14} />
            <span>{t("release.triggerLabel")}</span>
          </button>
          <p className="mt-1 px-2.5 text-[10px] leading-4 text-monk-muted">{t("release.body")}</p>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-monk-border/60 bg-monk-surface px-5 py-3 sm:px-6 flex items-center justify-between gap-2.5">
          <GhostButton
            onClick={() => { hapticPress("light"); setShowConvert((prev) => !prev); setError(""); }}
            aria-expanded={showConvert}
            className="flex min-h-11 items-center gap-1.5 px-2 text-xs"
          >
            <Repeat size={14} />
            <span>{lang === "en" ? "Convert to practice" : "Ubah jadi praktik"}</span>
          </GhostButton>
          <div className="flex items-center gap-2.5">
            <SecondaryButton onClick={onClose} className="min-h-11 px-4">
              {t("dialog.cancel")}
            </SecondaryButton>
            <PrimaryButton onClick={handleSave} className="min-h-11 px-5 flex items-center gap-1.5">
              <Check size={15} />
              <span>{t("blueprint.save")}</span>
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/*
        CalmDialog hardcodes `fixed inset-0 z-[70]`, which is below this modal's
        own `z-[80]` root, so it needs lifting to paint above the blueprint panel.
        The wrapper must be mounted ONLY while the dialog is open: a bare
        `fixed inset-0` wrapper is an invisible full-screen hit target that
        swallows every click inside the modal — including the release button
        that opens this dialog, making release unreachable.
        Confirm closes the dialog, clears the note, fires the toast, then closes
        the blueprint — a released goal no longer belongs to the season, so the
        modal has nothing left to show.
      */}
      {releaseOpen && goal ? (
        <div className="fixed inset-0 z-[90]">
          <ReleaseChoiceDialog
            open
            goal={goal}
            activeGoals={store.goals.filter(
              (candidate) => candidate.id !== goal.id && candidate.status === "active"
            )}
            freedDays={freedFocusDays}
            onConfirm={(note, choice) => {
              // Release first: the freed days only exist once the allocation is gone.
              store.releaseGoalFromSeason(goal.id, note);
              if (choice.kind !== "none") {
                const result = store.reallocateFreeDays(choice);
                // The chosen goal may have been released in the meantime; say so
                // instead of leaving the day silently unclaimed.
                if (!result.valid) toast.show(t("rhythm.failed"));
              }
              setReleaseOpen(false);
              onClose();
            }}
            onCancel={() => setReleaseOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
