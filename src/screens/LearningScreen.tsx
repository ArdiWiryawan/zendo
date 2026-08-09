import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { getTodayDateString, nowIso } from "../lib/date";
import { routes } from "../constants/routes";
import { createId } from "../lib/ids";
import { selectActiveGoals, selectTodayPlan } from "../store/selectors";
import {
  Card,
  CalmAlert,
  CalmDialog,
  ChoiceChip,
  PageHeader,
  PrimaryButton,
  TextInput,
  Textarea,
} from "../components/ui";
import type { LearningSession, LearningSourceType } from "../types/app";

export function LearningScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const todayPlan = selectTodayPlan(store);
  const t = useT();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [type, setType] = useState<LearningSourceType>("book");
  const [title, setTitle] = useState("");
  const [timeMode, setTimeMode] = useState<number | "custom">(30);
  const [customMinutes, setCustomMinutes] = useState("");
  const [keyInsight, setKeyInsight] = useState("");
  const [actionTakeaway, setActionTakeaway] = useState("");
  const [goalId, setGoalId] = useState(todayPlan?.goalId || "");
  const [chapter, setChapter] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [parentId, setParentId] = useState("");
  const [linkIds, setLinkIds] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<LearningSession | null>(null);

  const activeGoals = selectActiveGoals(store);
  const parentOptions = store.learningSessions.filter((s) => !s.parentId && s.seasonId === store.activeSeason?.id);
  const recentSessions = [...store.learningSessions]
    .filter((s) => s.seasonId === store.activeSeason?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  const learningSessionTypes = [
    { value: "book", label: t("learning.sourceTypes.book") },
    { value: "course", label: t("learning.sourceTypes.course") },
    { value: "podcast", label: t("learning.sourceTypes.podcast") },
    { value: "long_video", label: t("learning.sourceTypes.long_video") },
    { value: "article", label: t("learning.sourceTypes.article") },
    { value: "mentor", label: t("learning.sourceTypes.mentor") },
    { value: "other", label: t("learning.sourceTypes.other") }
  ] as const;

  const timePresets = [10, 15, 25, 30, 45, 60];

  const actualMinutes = timeMode === "custom" ? (Number(customMinutes) || 0) : timeMode;
  const isValid = keyInsight.trim() !== "" && actualMinutes > 0;

  return (
    <>
      <PageHeader
        title={t("learning.title")}
        subtitle={t("learning.subtitle")}
      />
      <div className="space-y-5">
        <Card>
          <p className="mb-3 font-semibold text-sm">{t("learning.sourceType")}</p>
          <div className="flex flex-wrap gap-2">
            {learningSessionTypes.map((item) => (
              <ChoiceChip
                key={item.value}
                label={item.label}
                selected={type === item.value}
                onClick={() => setType(item.value)}
              />
            ))}
          </div>
        </Card>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted" htmlFor="source-title">
            {t("learning.sourceTitle")}
          </label>
          <TextInput
            id="source-title"
            placeholder={t("learning.sourceTitlePlaceholder")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <Card>
          <p className="mb-3 font-semibold text-sm">{t("learning.time")}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {timePresets.map((preset) => (
              <ChoiceChip
                key={preset}
                label={t("learning.minutesUnit", { n: preset })}
                selected={timeMode === preset}
                onClick={() => setTimeMode(preset)}
              />
            ))}
            <ChoiceChip
              label={t("learning.custom")}
              selected={timeMode === "custom"}
              onClick={() => setTimeMode("custom")}
            />
          </div>
          {timeMode === "custom" && (
            <TextInput
              inputMode="numeric"
              placeholder={t("learning.customMinutesPlaceholder")}
              value={customMinutes}
              onChange={(event) => setCustomMinutes(event.target.value)}
            />
          )}
        </Card>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted block" htmlFor="key-insight">
            {t("learning.learnedLabel")}
          </label>
          <Textarea
            id="key-insight"
            placeholder={t("learning.learnedPlaceholder")}
            value={keyInsight}
            onChange={(event) => setKeyInsight(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted block" htmlFor="action-takeaway">
            {t("learning.actionLabel")}
          </label>
          <Textarea
            id="action-takeaway"
            placeholder={t("learning.actionPlaceholder")}
            value={actionTakeaway}
            onChange={(event) => setActionTakeaway(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted" htmlFor="chapter">{t("learning.chapter")}</label>
          <TextInput
            id="chapter"
            placeholder={t("learning.chapterPlaceholder")}
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted" htmlFor="source-url">{t("learning.sourceUrl")}</label>
          <TextInput
            id="source-url"
            placeholder="https://..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </div>

        {parentOptions.length > 0 && (
          <Card>
            <p className="mb-2 font-semibold text-sm">{t("learning.parentModule")}</p>
            <p className="text-xs text-monk-muted mb-3">{t("learning.parentModuleDesc")}</p>
            <div className="flex flex-wrap gap-2">
              <ChoiceChip label={t("learning.noneTopLevel")} selected={!parentId} onClick={() => setParentId("")} />
              {parentOptions.map((s) => (
                <ChoiceChip
                  key={s.id}
                  label={s.sourceTitle || s.lesson?.slice(0, 30) || s.id.slice(0, 8)}
                  selected={parentId === s.id}
                  onClick={() => setParentId(s.id)}
                />
              ))}
            </div>
          </Card>
        )}

        <Card>
          <p className="mb-2 font-semibold text-sm">{t("learning.linkNotes")}</p>
          <p className="text-xs text-monk-muted mb-3">{t("learning.linkNotesDesc")}</p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {store.learningSessions
              .filter((s) => !linkIds.includes(s.id))
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="text-xs rounded-full border border-monk-border px-2.5 py-1 text-monk-muted hover:border-monk-accent hover:text-monk-accent transition"
                  onClick={() => setLinkIds((prev) => [...prev, s.id])}
                >
                  + {s.sourceTitle || s.lesson?.slice(0, 25) || s.id.slice(0, 8)}
                </button>
              ))}
          </div>
          {linkIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {linkIds.map((lid) => {
                const linked = store.learningSessions.find((s) => s.id === lid);
                return (
                  <span key={lid} className="inline-flex items-center gap-1 rounded-full bg-monk-accent-soft border border-monk-accent/20 px-2 py-0.5 text-xs text-monk-accent">
                    {linked?.sourceTitle || linked?.lesson?.slice(0, 20) || lid.slice(0, 8)}
                    <button type="button" onClick={() => setLinkIds((prev) => prev.filter((id) => id !== lid))} className="hover:text-monk-danger">x</button>
                  </span>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted" htmlFor="long-content">{t("learning.notesLabel")}</label>
          <Textarea
            id="long-content"
            placeholder={t("learning.notesPlaceholder")}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px]"
          />
        </div>

        <Card>
          <p className="mb-3 font-semibold text-sm">{t("learning.relatedGoal")}</p>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip label={t("learning.none")} selected={!goalId} onClick={() => setGoalId("")} />
            {activeGoals.map((g) => (
              <ChoiceChip key={g.id} label={g.title} selected={goalId === g.id} onClick={() => setGoalId(g.id)} />
            ))}
          </div>
        </Card>

        {!keyInsight.trim() ? <CalmAlert type="warning" title={t("learning.requiredError")} /> : null}
        {actualMinutes <= 0 ? <CalmAlert type="warning" title={t("learning.durationError")} /> : null}

        {recentSessions.length > 0 && (
          <Card>
            <p className="mb-2 font-semibold text-sm">{t("learning.recentSessions")}</p>
            <div className="space-y-1.5">
              {recentSessions.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-xl border border-monk-border/40 bg-monk-soft px-3 py-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left text-xs text-monk-text"
                    onClick={() => setConfirmDelete(s)}
                  >
                    <span className="block truncate font-semibold">{s.sourceTitle || s.lesson?.slice(0, 40) || t("learning.untitled")}</span>
                    <span className="block text-monk-muted">
                      {Math.round(s.actualDurationSeconds / 60)} min
                      {s.relatedGoalId && store.goals.find((g) => g.id === s.relatedGoalId) ? ` · ${store.goals.find((g) => g.id === s.relatedGoalId)!.title}` : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={t("learning.deleteAria")}
                    onClick={() => setConfirmDelete(s)}
                    className="grid min-h-9 min-w-9 shrink-0 place-items-center rounded-full text-monk-muted transition duration-150 active:scale-95 hover:bg-monk-danger-soft hover:text-monk-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <PrimaryButton
          disabled={!isValid}
          onClick={() => {
            const now = nowIso();
            const session: LearningSession = {
              id: createId("learning"),
              seasonId: store.activeSeason?.id,
              relatedGoalId: goalId || null,
              sourceType: type,
              sourceTitle: title.trim() || undefined,
              startedAt: now,
              endedAt: now,
              plannedDurationMinutes: actualMinutes,
              actualDurationSeconds: actualMinutes * 60,
              lesson: keyInsight.trim(),
              actionIdea: actionTakeaway.trim() || undefined,
              parentId: parentId || undefined,
              childIds: [],
              linkedSessionIds: linkIds,
              content: content.trim() || undefined,
              chapter: chapter.trim() || undefined,
              sourceUrl: sourceUrl.trim() || undefined,
              status: "completed",
              createdAt: now,
              updatedAt: now
            };
            store.saveLearningSession(session);
            navigate(routes.today);
          }}
        >
          {t("learning.save")}
        </PrimaryButton>
      </div>

      <CalmDialog
        open={confirmDelete !== null}
        title={t("learning.deleteTitle")}
        description={t("learning.deleteConfirm", { title: confirmDelete?.sourceTitle || confirmDelete?.lesson?.slice(0, 30) || "" })}
        confirmLabel={t("dialog.delete")}
        cancelLabel={t("dialog.cancel")}
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) store.removeLearningSession(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </>
  );
}

