import { useState } from "react";
import { useMonkStore } from "../store/useMonkStore";
import { getTodayDateString } from "../lib/date";
import { Card, GhostButton } from "../components/ui";
import { WhyEditor } from "../components/SeasonWidgets";
import { ChevronRight, X } from "lucide-react";
import { CORE_VALUES } from "../constants/whyValues";
import { useT, useLanguage } from "../i18n";
import type { EnergyLevel, Goal, GoalTask } from "../types/app";

/** One treatment for every inline text action on the focus card. Edit, Add
 *  intention, Set action, Cancel and Save are all the same class of affordance,
 *  so they must not each invent their own size, weight and hover. */
/* Inline text links that still need a real touch target: 44px tall hit area
   (WCAG 2.2 SC 2.5.8 / the 44px recommendation) with -my-2 cancelling the
   extra height so the surrounding rows keep their rhythm. */
export const focusLinkClass =
  "-my-2 inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-monk-accent transition hover:underline active:scale-95";
export const focusLinkMutedClass =
  "-my-2 inline-flex min-h-11 items-center rounded-md text-sm font-medium text-monk-muted transition hover:underline active:scale-95";

/** Maps the focus card's CTA into its label + action state. A "deferred" state
 *  is intentionally absent — nothing in the card offers deferral, so a fifth
 *  branch would be dead weight. First match wins; completed outranks a live
 *  session, which outranks a paused one. Pure: reads no store, holds no state. */
export type PrimaryCTA = "start" | "return" | "resume" | "completed";

export function derivePrimaryCTA(
  focusStatus: "running" | "paused" | undefined,
  todayCompleted: boolean
): PrimaryCTA {
  if (todayCompleted) return "completed";
  if (focusStatus === "running") return "return";
  if (focusStatus === "paused") return "resume";
  return "start";
}

export function EnergyCheck({ value, onChange, compact = false }: { value?: EnergyLevel; onChange: (value: EnergyLevel) => void; compact?: boolean }) {
  const t = useT();
  const store = useMonkStore();
  const today = getTodayDateString();
  const past7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - (6 - i));
    return getTodayDateString(d);
  });

  const labels: Record<EnergyLevel, string> = {
    low: t("rest.energy.low"),
    medium: t("rest.energy.medium"),
    high: t("rest.energy.high")
  };

  return (
    <Card className={compact ? "p-4" : "p-5"}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t("today.check.energy")}</p>
          <p className="mt-0.5 text-xs text-monk-muted">{t("today.energy.tank")}</p>
        </div>
        {value ? (
          /* The readout states the level in words. It used to be tinted green /
             amber / red, so one answer painted three competing status colours
             onto the page; the words carry the meaning and the accent carries
             the emphasis. */
          <span className="shrink-0 rounded-full border border-monk-accent/30 bg-monk-accent-soft px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-monk-accent">
            {labels[value]}
          </span>
        ) : null}
      </div>

      {/* One segmented control instead of three independently coloured buttons.
          The three options still read as three distinct choices; they no longer
          each claim a semantic colour before the user has chosen anything. */}
      <div role="group" aria-label={t("today.check.energy")} className="flex gap-2">
        {(["low", "medium", "high"] as EnergyLevel[]).map((level) => {
          const selected = value === level;
          return (
            <button
              key={level}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(level)}
              className={`min-h-11 flex-1 rounded-monk border text-sm font-semibold transition active:scale-95 ${
                selected
                  ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                  : "border-monk-border text-monk-muted hover:border-monk-border-strong hover:text-monk-text"
              }`}
            >
              {labels[level]}
            </button>
          );
        })}
      </div>

      {/* The 7-day trend is part of the module, not a wide-screen extra: it used
          to be dropped in `compact` mode, which is exactly the mode the focus
          state renders — so the history vanished on the days it was most useful. */}
      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-monk-muted">
          {t("today.energy.trendTitle")}
        </p>
        <div className="flex items-end gap-1.5" aria-label={t("today.energy.trendAria")}>
          {past7.map((date) => {
            const log = store.energyLogs?.find((l) => l.date === date);
            const isToday = date === today;
            const h = log?.level === "high" ? "h-5" : log?.level === "medium" ? "h-3.5" : log?.level === "low" ? "h-2" : "h-1.5";
            const color = log?.level === "high"
              ? "bg-monk-success/80"
              : log?.level === "medium"
              ? "bg-monk-accent/80"
              : log?.level === "low"
              ? "bg-monk-danger/70"
              : "bg-monk-border/40";
            return (
              <span
                key={date}
                title={`${date}${log ? ` · ${labels[log.level]}` : ""}`}
                className={`inline-block w-full rounded-sm ${h} ${color} ${isToday ? "ring-1 ring-monk-accent/50" : ""}`}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export function WhyStrip({ compact = false }: { compact?: boolean }) {
  const store = useMonkStore();
  const t = useT();
  const lang = useLanguage();
  const isId = lang === "id";
  const why = store.activeSeason?.why;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  
  const intrinsicWhy = why?.why || why?.identity;
  const outcome = why?.desiredOutcome;
  const antiWhy = why?.antiWhy || why?.consequenceOfInaction;
  const hasWhy = !!(intrinsicWhy || outcome || antiWhy);

  if (editing) {
    return (
      <Card className="border-monk-accent/25 bg-monk-accent-soft/30 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-monk-accent">
          {hasWhy ? t("why.editButton") : t("why.sectionTitle")}
        </p>
        <WhyEditor
          initial={why}
          onCancel={() => setEditing(false)}
          onSave={(next) => {
            store.updateSeasonWhy(next);
            setEditing(false);
            setOpen(true);
          }}
        />
      </Card>
    );
  }

  if (!hasWhy) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full rounded-monk border border-dashed border-monk-accent/30 bg-monk-accent-soft/20 px-4 py-3 text-left transition active:scale-[0.99]"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-monk-accent">{t("why.sectionTitle")}</p>
        <p className="mt-1 text-sm text-monk-muted">{t("why.emptyDesc")}</p>
      </button>
    );
  }

  const primaryLine = intrinsicWhy || outcome || antiWhy;

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-monk border border-monk-border bg-monk-surface px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 rounded bg-monk-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-monk-accent">
            {t("why.badgeWhy")}
          </span>
          <span className="truncate text-xs text-monk-muted">{primaryLine}</span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          /* 44px hit area; -my-2 keeps the strip's visual height unchanged. */
          className="-my-2 inline-flex min-h-11 shrink-0 items-center text-[10px] font-semibold text-monk-accent hover:underline"
        >
          {t("why.editButton")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-monk border border-monk-border bg-monk-surface px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-monk-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-monk-accent">
                {t("why.badgeWhy")}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">{t("why.sectionTitle")}</p>
            </div>
            {intrinsicWhy ? (
              <p className={`mt-1.5 text-sm font-medium leading-snug text-monk-text-soft ${open ? "" : "line-clamp-2"}`}>
                {intrinsicWhy}
              </p>
            ) : null}

            {/* In closed state, subtle teasers for outcome & anti-why */}
            {!open && (outcome || antiWhy) ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-monk-muted">
                {outcome ? (
                  <span className="truncate text-monk-accent/80">{outcome}</span>
                ) : null}
                {antiWhy && !outcome ? (
                  <span className="truncate text-monk-warning/80">{antiWhy}</span>
                ) : null}
              </div>
            ) : null}

            {/* Expanded 4-component view — hairline-separated blocks, not a box
                inside a box inside a box. */}
            {open ? (
              <div className="mt-3 space-y-2.5">
                {outcome ? (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-monk-accent">
                      {t("why.badgeOutcome")}
                    </p>
                    <p className="mt-0.5 text-xs text-monk-text-soft leading-relaxed">{outcome}</p>
                  </div>
                ) : null}

                {antiWhy ? (
                  <div className="border-t border-monk-border/50 pt-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-monk-warning">
                      {t("why.badgeAntiWhy")}
                    </p>
                    <p className="mt-0.5 text-xs text-monk-text-soft leading-relaxed">{antiWhy}</p>
                  </div>
                ) : null}

                {why?.protectValues?.length ? (
                  <div className="flex flex-wrap gap-1.5 border-t border-monk-border/50 pt-2.5">
                    {why.protectValues.map((id) => {
                      const v = CORE_VALUES.find((c) => c.id === id);
                      const valLabel = isId ? v?.labelId : v?.labelEn;
                      return (
                        <span
                          key={id}
                          className="rounded-full border border-monk-border bg-monk-soft px-2 py-0.5 text-[10px] font-medium text-monk-muted"
                        >
                          {valLabel ?? v?.label ?? id}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <ChevronRight
            size={14}
            className={`mt-1 shrink-0 text-monk-muted transition ${open ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {open ? (
        <div className="flex justify-end border-t border-monk-border/50 pt-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="-my-2 inline-flex min-h-11 items-center text-xs font-semibold text-monk-accent transition hover:opacity-80"
          >
            {t("why.editButton")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function GoalTasksCard({ goal, todayMainAction }: { goal: Goal; todayMainAction?: string }) {
  const store = useMonkStore();
  const t = useT();
  const today = getTodayDateString();
  const [newTitle, setNewTitle] = useState("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const tasks = goal.tasks || [];
  // §16 — a finite unit of work under this goal ("Video #27"). Steps may point
  // at one; steps without one are simply ungrouped, not invalid.
  const projects = store.projects.filter((p) => p.goalId === goal.id);

  type ProjectGroup = { project?: (typeof projects)[number]; tasks: GoalTask[] };

  const projectGroups: ProjectGroup[] = [
    { tasks: tasks.filter((t) => !t.projectId || !projects.some((p) => p.id === t.projectId)) },
    ...projects.map(
      (project): ProjectGroup => ({
        project,
        tasks: tasks.filter((t) => t.projectId === project.id)
      })
    )
  ].filter((group) => group.project || group.tasks.length > 0);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    store.addGoalTask(goal.id, newTitle.trim());
    setNewTitle("");
    setIsAdding(false);
  };

  const handleAddProject = () => {
    const project = store.addProject({ goalId: goal.id, title: newProjectTitle });
    if (!project) return;
    setNewProjectTitle("");
    setIsAddingProject(false);
  };

  const handlePromoteToAction = (taskTitle: string) => {
    store.createOrUpdateDayPlan(today, {
      dayType: "goal",
      goalId: goal.id,
      mainAction: taskTitle
    });
  };

  return (
    <div className="mt-4 border-t border-monk-border/60 pt-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-monk-muted flex items-center gap-1.5">
          <span>{t("today.tasks.heading")}</span>
          {tasks.length > 0 ? (
            <span className="font-mono text-xs text-monk-accent">
              ({tasks.filter((t) => t.completed).length}/{tasks.length})
            </span>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          {!isAddingProject && (
            <GhostButton
              type="button"
              onClick={() => setIsAddingProject(true)}
              className="text-xs font-semibold text-monk-accent enabled:hover:text-monk-accent"
            >
              {t("project.addNew")}
            </GhostButton>
          )}
          {!isAdding && (
            <GhostButton
              type="button"
              onClick={() => setIsAdding(true)}
              className="text-xs font-semibold text-monk-accent enabled:hover:text-monk-accent"
            >
              {t("today.add")}
            </GhostButton>
          )}
        </div>
      </div>

      {isAddingProject ? (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newProjectTitle}
            onChange={(e) => setNewProjectTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddProject();
              }
            }}
            placeholder={t("project.namePlaceholder")}
            autoFocus
            aria-label={t("project.newAria")}
            className="flex-1 rounded-lg border border-monk-border bg-monk-surface px-2.5 py-1 text-xs text-monk-text placeholder:text-monk-muted focus:border-monk-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddProject}
            className="rounded-lg bg-monk-accent px-2.5 py-1 text-xs font-semibold text-monk-bg transition active:scale-95"
          >
            {t("today.save")}
          </button>
          <button
            type="button"
            onClick={() => setIsAddingProject(false)}
            className="text-xs text-monk-muted hover:text-monk-text px-1"
          >
            {t("today.cancel")}
          </button>
        </div>
      ) : null}

      {projectGroups.length > 0 ? (
        <div className="space-y-3 pt-1">
          {projectGroups.map((group) => (
            /* Hairline-separated rows. Each step used to be its own bordered,
               rounded box, so a goal with five steps drew five nested outlines
               inside the goal card. */
            <div key={group.project?.id ?? "ungrouped"} className="divide-y divide-monk-border/40">
              {group.project ? (
                <div className="flex items-center justify-between gap-2 pb-1.5">
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-monk-text">
                    <span className="truncate">{group.project.title}</span>
                    <span className="font-mono text-xs text-monk-muted">
                      ({group.tasks.filter((t) => t.completed).length}/{group.tasks.length})
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        store.updateProject(group.project!.id, {
                          status: group.project!.status === "done" ? "active" : "done"
                        })
                      }
                      className="rounded px-1.5 py-0.5 text-xs font-semibold text-monk-accent transition hover:bg-monk-accent/15 active:scale-95"
                    >
                      {group.project.status === "done" ? t("project.reopen") : t("project.markDone")}
                    </button>
                    <button
                      type="button"
                      aria-label={`${t("dialog.delete")}: ${group.project!.title}`}
                      onClick={() => store.removeProject(group.project!.id)}
                      className="text-monk-muted/60 hover:text-monk-danger p-0.5 transition"
                    >
                      <X size={12} strokeWidth={2.5} aria-hidden="true" />
                    </button>
                  </span>
                </div>
              ) : null}

              {group.tasks.map((task) => {
                const isCurrentMain = todayMainAction?.trim() === task.title.trim();
                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between gap-2 py-1.5 text-xs transition ${
                      isCurrentMain ? "bg-monk-accent/[0.08]" : ""
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => store.toggleGoalTask(goal.id, task.id)}
                        aria-label={task.title}
                        className="h-3.5 w-3.5 shrink-0 rounded border-monk-border text-monk-accent focus:ring-0 cursor-pointer"
                      />
                      <span
                        className={`min-w-0 truncate text-xs ${
                          task.completed
                            ? "line-through text-monk-muted"
                            : isCurrentMain
                            ? "font-semibold text-monk-accent"
                            : "text-monk-text"
                        }`}
                      >
                        {task.title}
                      </span>
                      {isCurrentMain && (
                        <span className="shrink-0 rounded-full bg-monk-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-monk-accent">
                          {t("today.tasks.todayActionTag")}
                        </span>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {projects.length > 0 && (
                        <select
                          value={task.projectId ?? ""}
                          onChange={(e) =>
                            store.setGoalTaskProject(goal.id, task.id, e.target.value || undefined)
                          }
                          aria-label={t("project.assignLabel")}
                          className="max-w-[7rem] rounded border border-monk-border/60 bg-monk-surface px-1 py-0.5 text-xs text-monk-muted focus:border-monk-accent focus:outline-none"
                        >
                          <option value="">{t("project.none")}</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                      )}
                      {!task.completed && !isCurrentMain && (
                        <button
                          type="button"
                          aria-label={t("today.tasks.setAsAction")}
                          onClick={() => handlePromoteToAction(task.title)}
                          className="rounded px-1.5 py-0.5 text-xs font-semibold text-monk-accent transition hover:bg-monk-accent/15 active:scale-95"
                        >
                          {t("today.tasks.setAsAction")}
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={t("today.tasks.deleteAria", { title: task.title })}
                        onClick={() => store.deleteGoalTask(goal.id, task.id)}
                        className="text-monk-muted/60 hover:text-monk-danger p-0.5 transition"
                      >
                        <X size={12} strokeWidth={2.5} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}

      {isAdding ? (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder={t("today.tasks.newStepPlaceholder")}
            autoFocus
            aria-label={t("today.tasks.newStepAria")}
            className="flex-1 rounded-lg border border-monk-border bg-monk-surface px-2.5 py-1 text-xs text-monk-text placeholder:text-monk-muted focus:border-monk-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-lg bg-monk-accent px-2.5 py-1 text-xs font-semibold text-monk-bg transition active:scale-95"
          >
            {t("today.save")}
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="text-xs text-monk-muted hover:text-monk-text px-1"
          >
            {t("today.cancel")}
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full text-center py-1.5 text-xs text-monk-muted/80 hover:text-monk-accent border border-dashed border-monk-border/60 rounded-lg transition"
        >
          {t("today.tasks.breakIntoSteps")}
        </button>
      ) : null}
    </div>
  );
}
