import { useState } from "react";
import { useMonkStore } from "../store/useMonkStore";
import { getTodayDateString } from "../lib/date";
import { Card } from "../components/ui";
import { WhyEditor } from "../components/SeasonWidgets";
import { ChevronRight } from "lucide-react";
import { CORE_VALUES } from "../constants/whyValues";
import { useT, useLanguage } from "../i18n";
import type { EnergyLevel, Goal, GoalTask } from "../types/app";

export function EnergyCheck({ value, onChange, compact = false }: { value?: EnergyLevel; onChange: (value: EnergyLevel) => void; compact?: boolean }) {
  const t = useT();
  const lang = useLanguage();
  const isId = lang === "id";
  const store = useMonkStore();
  const today = getTodayDateString();
  const past7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - (6 - i));
    return getTodayDateString(d);
  });

  const labels: Record<EnergyLevel, string> = {
    low: isId ? "Rendah" : "Low",
    medium: isId ? "Stabil" : "Steady",
    high: isId ? "Tinggi" : "High"
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-sm">{isId ? "Energi" : "Energy"}</p>
          <p className="mt-0.5 text-xs text-monk-muted">{t("today.energy.tank")}</p>
        </div>
        {value ? (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            value === "high"
              ? "border-monk-success/30 bg-monk-success-soft text-monk-success"
              : value === "medium"
              ? "border-monk-accent/30 bg-monk-accent-soft text-monk-accent"
              : "border-monk-danger/30 bg-monk-danger-soft text-monk-danger"
          }`}>
            {labels[value]}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["low", "medium", "high"] as EnergyLevel[]).map((level) => {
          const selected = value === level;
          const tone =
            level === "high"
              ? selected
                ? "border-monk-success bg-monk-success-soft text-monk-success"
                : "border-monk-border text-monk-muted hover:border-monk-success/40"
              : level === "medium"
              ? selected
                ? "border-monk-accent bg-monk-accent-soft text-monk-accent"
                : "border-monk-border text-monk-muted hover:border-monk-accent/40"
              : selected
              ? "border-monk-danger bg-monk-danger-soft text-monk-danger"
              : "border-monk-border text-monk-muted hover:border-monk-danger/40";
          return (
            <button
              key={level}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(level)}
              className={`min-h-12 rounded-monk border text-sm font-semibold transition active:scale-95 ${tone}`}
            >
              {labels[level]}
            </button>
          );
        })}
      </div>
      {!compact ? (
        <div className="mt-4">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-monk-muted">
            {isId ? "Tren 7 Hari" : "7-Day Trend"}
          </p>
          <div className="flex items-end gap-1.5" aria-label={isId ? "Tren energi 7 hari terakhir" : "Energy trend last 7 days"}>
            {past7.map((date) => {
              const log = store.energyLogs?.find((l) => l.date === date);
              const isToday = date === today;
              const h = log?.level === "high" ? "h-5" : log?.level === "medium" ? "h-3.5" : log?.level === "low" ? "h-2" : "h-1.5";
              const color = log?.level === "high"
                ? "bg-monk-success"
                : log?.level === "medium"
                ? "bg-monk-accent"
                : log?.level === "low"
                ? "bg-monk-danger"
                : "bg-monk-border/40";
              return (
                <span
                  key={date}
                  title={`${date}${log ? ` · ${log.level}` : ""}`}
                  className={`inline-block w-full rounded-sm ${h} ${color} ${isToday ? "ring-1 ring-monk-accent/50" : ""}`}
                />
              );
            })}
          </div>
        </div>
      ) : null}
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
      <div className="rounded-monk border border-monk-accent/20 bg-monk-accent-soft/30 px-3.5 py-2 text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="shrink-0 rounded bg-monk-accent/20 px-1.5 py-0.5 text-[9px] font-bold text-monk-accent">
            {t("why.badgeWhy")}
          </span>
          <span className="truncate text-monk-muted">{primaryLine}</span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 text-[10px] font-semibold text-monk-accent hover:underline"
        >
          {t("why.editButton")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-monk border border-monk-accent/20 bg-monk-accent-soft/30 px-4 py-3 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-monk-accent/20 px-2 py-0.5 text-[9px] font-bold text-monk-accent">
                {t("why.badgeWhy")}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-monk-muted">{t("why.sectionTitle")}</p>
            </div>
            {intrinsicWhy ? (
              <p className={`mt-1.5 text-sm font-semibold leading-snug text-monk-text ${open ? "" : "line-clamp-2"}`}>
                {intrinsicWhy}
              </p>
            ) : null}

            {/* In closed state, subtle teasers for outcome & anti-why */}
            {!open && (outcome || antiWhy) ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-monk-muted">
                {outcome ? (
                  <span className="truncate text-monk-accent">✦ {outcome}</span>
                ) : null}
                {antiWhy && !outcome ? (
                  <span className="truncate text-monk-warning/90">⚠ {antiWhy}</span>
                ) : null}
              </div>
            ) : null}

            {/* Expanded 4-component view */}
            {open ? (
              <div className="mt-3 space-y-2 text-xs">
                {outcome ? (
                  <div className="rounded-xl border border-monk-accent/30 bg-monk-bg/60 p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-monk-accent">
                      ✦ {t("why.badgeOutcome")}
                    </p>
                    <p className="mt-0.5 text-xs text-monk-text-soft leading-relaxed">{outcome}</p>
                  </div>
                ) : null}

                {antiWhy ? (
                  <div className="rounded-xl border border-monk-warning/25 bg-monk-warning/5 p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-monk-warning">
                      ⚠ {t("why.badgeAntiWhy")}
                    </p>
                    <p className="mt-0.5 text-xs text-monk-text-soft leading-relaxed">{antiWhy}</p>
                  </div>
                ) : null}

                {why?.protectValues?.length ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {why.protectValues.map((id) => {
                      const v = CORE_VALUES.find((c) => c.id === id);
                      const valLabel = isId ? v?.labelId : v?.labelEn;
                      return (
                        <span
                          key={id}
                          className="rounded-full border border-monk-border bg-monk-bg px-2 py-0.5 text-[10px] font-medium text-monk-muted"
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
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-monk-accent transition hover:opacity-80"
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
  const lang = useLanguage();
  const isId = lang === "id";
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
    <div className="mt-3.5 space-y-2 rounded-xl border border-monk-border/70 bg-monk-soft/30 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-monk-muted flex items-center gap-1.5">
          <span>{isId ? "📋 Langkah / Subtask" : "📋 Steps / Subtasks"}</span>
          {tasks.length > 0 ? (
            <span className="font-mono text-[10px] text-monk-accent">
              ({tasks.filter((t) => t.completed).length}/{tasks.length})
            </span>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          {!isAddingProject && (
            <button
              type="button"
              onClick={() => setIsAddingProject(true)}
              className="text-[11px] font-semibold text-monk-muted hover:text-monk-accent hover:underline active:scale-95"
            >
              {t("project.addNew")}
            </button>
          )}
          {!isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="text-[11px] font-semibold text-monk-accent hover:underline active:scale-95"
            >
              {isId ? "+ Tambah" : "+ Add"}
            </button>
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
            className="flex-1 rounded-lg border border-monk-border bg-monk-surface px-2.5 py-1 text-xs text-monk-text placeholder:text-monk-muted focus:border-monk-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddProject}
            className="rounded-lg bg-monk-accent px-2.5 py-1 text-xs font-semibold text-monk-bg transition active:scale-95"
          >
            {isId ? "Simpan" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setIsAddingProject(false)}
            className="text-xs text-monk-muted hover:text-monk-text px-1"
          >
            {isId ? "Batal" : "Cancel"}
          </button>
        </div>
      ) : null}

      {projectGroups.length > 0 ? (
        <div className="space-y-2 pt-1">
          {projectGroups.map((group) => (
            <div key={group.project?.id ?? "ungrouped"} className="space-y-1.5">
              {group.project ? (
                <div className="flex items-center justify-between gap-2 border-b border-monk-border/40 pb-1">
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-monk-text">
                    <span className="truncate">{group.project.title}</span>
                    <span className="font-mono text-[10px] text-monk-muted">
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
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-monk-accent hover:bg-monk-accent/15 transition active:scale-95"
                    >
                      {group.project.status === "done" ? t("project.reopen") : t("project.markDone")}
                    </button>
                    <button
                      type="button"
                      title={isId ? "Hapus" : "Delete"}
                      onClick={() => store.removeProject(group.project!.id)}
                      className="text-monk-muted/60 hover:text-rose-400 p-0.5 transition"
                    >
                      ✕
                    </button>
                  </span>
                </div>
              ) : null}

              {group.tasks.map((task) => {
                const isCurrentMain = todayMainAction?.trim() === task.title.trim();
                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                      isCurrentMain
                        ? "border-monk-accent/50 bg-monk-accent/10"
                        : "border-monk-border/40 bg-monk-surface/60 hover:bg-monk-surface"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => store.toggleGoalTask(goal.id, task.id)}
                        className="h-3.5 w-3.5 rounded border-monk-border text-monk-accent focus:ring-0 cursor-pointer"
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
                        <span className="shrink-0 rounded-full bg-monk-accent/20 px-1.5 py-0.2 text-[9px] font-bold text-monk-accent">
                          {isId ? "Aksi Hari Ini" : "Today's Action"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {projects.length > 0 && (
                        <select
                          value={task.projectId ?? ""}
                          onChange={(e) =>
                            store.setGoalTaskProject(goal.id, task.id, e.target.value || undefined)
                          }
                          aria-label={t("project.assignLabel")}
                          className="max-w-[7rem] rounded border border-monk-border/60 bg-monk-surface px-1 py-0.5 text-[10px] text-monk-muted focus:border-monk-accent focus:outline-none"
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
                          title={isId ? "Jadikan Aksi Hari Ini" : "Set as Today's Action"}
                          onClick={() => handlePromoteToAction(task.title)}
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-monk-accent hover:bg-monk-accent/15 transition active:scale-95"
                        >
                          {isId ? "Jadikan Aksi" : "Set Action"}
                        </button>
                      )}
                      <button
                        type="button"
                        title={isId ? "Hapus" : "Delete"}
                        onClick={() => store.deleteGoalTask(goal.id, task.id)}
                        className="text-monk-muted/60 hover:text-rose-400 p-0.5 transition"
                      >
                        ✕
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
            placeholder={isId ? "Langkah 10 menit (mis: Tulis draft bab 1)..." : "10-minute step (e.g. Write draft of chapter 1)..."}
            autoFocus
            className="flex-1 rounded-lg border border-monk-border bg-monk-surface px-2.5 py-1 text-xs text-monk-text placeholder:text-monk-muted focus:border-monk-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-lg bg-monk-accent px-2.5 py-1 text-xs font-semibold text-monk-bg transition active:scale-95"
          >
            {isId ? "Simpan" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="text-xs text-monk-muted hover:text-monk-text px-1"
          >
            {isId ? "Batal" : "Cancel"}
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full text-center py-1.5 text-xs text-monk-muted/80 hover:text-monk-accent border border-dashed border-monk-border/60 rounded-lg transition"
        >
          {isId ? "+ Pecah target ini jadi langkah-langkah kecil" : "+ Break this goal into small steps"}
        </button>
      ) : null}
    </div>
  );
}
