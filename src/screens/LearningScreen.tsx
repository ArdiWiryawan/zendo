import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMonkStore } from "../store/useMonkStore";
import { useT } from "../i18n";
import { getTodayDateString, nowIso } from "../lib/date";
import { routes } from "../constants/routes";
import { createId } from "../lib/ids";
import { selectActiveGoals, selectTodayPlan } from "../store/selectors";
import { habitOptions, learningTypes } from "../constants/defaultData";
import {
  Card,
  CalmAlert,
  ChoiceChip,
  GhostButton,
  PageHeader,
  PrimaryButton,
  TextInput,
  Textarea,
  useCalmToast,
} from "../components/ui";
import type { LearningSession, LearningSourceType } from "../types/app";

export function LearningScreen() {
  const navigate = useNavigate();
  const store = useMonkStore();
  const todayPlan = selectTodayPlan(store);

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

  const activeGoals = selectActiveGoals(store);
  const parentOptions = store.learningSessions.filter((s) => !s.parentId && s.id !== "");

  const learningSessionTypes = [
    { value: "book", label: "Book" },
    { value: "course", label: "Course" },
    { value: "podcast", label: "Podcast" },
    { value: "long_video", label: "Long Video" },
    { value: "article", label: "Article" },
    { value: "mentor", label: "Mentor" },
    { value: "other", label: "Other" }
  ] as const;

  const timePresets = [10, 15, 25, 30, 45, 60];

  const actualMinutes = timeMode === "custom" ? (Number(customMinutes) || 0) : timeMode;
  const isValid = keyInsight.trim() !== "" && actualMinutes > 0;

  return (
    <>
      <PageHeader
        title="Add learning session"
        subtitle="Track one thing you learned that supports your current focus."
      />
      <div className="space-y-5">
        <Card>
          <p className="mb-3 font-semibold text-sm">Source Type</p>
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
            Source Title
          </label>
          <TextInput
            id="source-title"
            placeholder="Atomic Habits, Coursera course, Ali Abdaal podcast…"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <Card>
          <p className="mb-3 font-semibold text-sm">Learning Time</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {timePresets.map((preset) => (
              <ChoiceChip
                key={preset}
                label={`${preset} min`}
                selected={timeMode === preset}
                onClick={() => setTimeMode(preset)}
              />
            ))}
            <ChoiceChip
              label="Custom"
              selected={timeMode === "custom"}
              onClick={() => setTimeMode("custom")}
            />
          </div>
          {timeMode === "custom" && (
            <TextInput
              inputMode="numeric"
              placeholder="How many minutes did you learn?"
              value={customMinutes}
              onChange={(event) => setCustomMinutes(event.target.value)}
            />
          )}
        </Card>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted block" htmlFor="key-insight">
            What did you learn? *
          </label>
          <Textarea
            id="key-insight"
            placeholder="Write the key lesson in your own words."
            value={keyInsight}
            onChange={(event) => setKeyInsight(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted block" htmlFor="action-takeaway">
            How can this help your goal?
          </label>
          <Textarea
            id="action-takeaway"
            placeholder="Turn this lesson into a small action or reminder."
            value={actionTakeaway}
            onChange={(event) => setActionTakeaway(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted" htmlFor="chapter">Chapter / Module</label>
          <TextInput
            id="chapter"
            placeholder="e.g. Module 2, Chapter 3"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted" htmlFor="source-url">Source URL</label>
          <TextInput
            id="source-url"
            placeholder="https://..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </div>

        {parentOptions.length > 0 && (
          <Card>
            <p className="mb-2 font-semibold text-sm">Parent Module</p>
            <p className="text-xs text-monk-muted mb-3">Attach this note to an existing module for hierarchy.</p>
            <div className="flex flex-wrap gap-2">
              <ChoiceChip label="None (top-level)" selected={!parentId} onClick={() => setParentId("")} />
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
          <p className="mb-2 font-semibold text-sm">Link to Other Notes</p>
          <p className="text-xs text-monk-muted mb-3">Connect related ideas across your learning.</p>
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
          <label className="text-xs font-bold uppercase tracking-wider text-monk-muted" htmlFor="long-content">Notes</label>
          <Textarea
            id="long-content"
            placeholder="Write your full notes here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px]"
          />
        </div>

        <Card>
          <p className="mb-3 font-semibold text-sm">Related Goal (Optional)</p>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip label="None" selected={!goalId} onClick={() => setGoalId("")} />
            {activeGoals.map((g) => (
              <ChoiceChip key={g.id} label={g.title} selected={goalId === g.id} onClick={() => setGoalId(g.id)} />
            ))}
          </div>
        </Card>

        {!keyInsight.trim() ? <CalmAlert type="warning" title="What did you learn? is required." /> : null}
        {actualMinutes <= 0 ? <CalmAlert type="warning" title="Enter a valid learning duration." /> : null}

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
          Save learning session
        </PrimaryButton>
      </div>
    </>
  );
}

