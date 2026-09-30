import { beforeEach, describe, expect, it } from "vitest";
import { useMonkStore } from "./useMonkStore";
import type { Goal } from "../types/app";

/**
 * §16: the Project layer. A project is a finite, nameable unit of work under a
 * goal — "Video #27", not "publish 1 video/week". The point is that a recurring
 * goal's steps stop being one undifferentiated checklist.
 */
describe("project layer", () => {
  const seed = () => {
    const goal: Goal = {
      id: "goal-1",
      seasonId: "season-test",
      title: "Publish weekly video",
      keystoneAction: "Record 10 minutes",
      priority: 1,
      weeklyTargetCount: 3,
      status: "active",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z"
    };
    useMonkStore.setState({
      activeSeason: {
        id: "season-test",
        name: "Test Season",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        durationDays: 30,
        status: "active",
        mode: "flow",
        goalIds: ["goal-1"],
        badHabitIds: [],
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z"
      },
      goals: [goal],
      projects: [],
      weeklyPlans: []
    });
    return goal;
  };

  const projects = () => useMonkStore.getState().projects;
  const goal = () => useMonkStore.getState().goals.find((g) => g.id === "goal-1")!;

  beforeEach(() => {
    useMonkStore.getState().resetApp();
  });

  it("opening a project under a goal records the season and parent", () => {
    seed();
    const project = useMonkStore.getState().addProject({ goalId: "goal-1", title: "  Video #27  " });

    expect(project).toBeDefined();
    expect(project!.title).toBe("Video #27");
    expect(project!.goalId).toBe("goal-1");
    expect(project!.seasonId).toBe("season-test");
    expect(project!.status).toBe("active");
    expect(projects()).toHaveLength(1);
  });

  it("refuses a project with no title, or no real parent goal", () => {
    seed();
    expect(useMonkStore.getState().addProject({ goalId: "goal-1", title: "   " })).toBeUndefined();
    expect(useMonkStore.getState().addProject({ goalId: "nope", title: "Video #27" })).toBeUndefined();
    expect(projects()).toHaveLength(0);
  });

  it("steps attach to a project and detach again without being deleted", () => {
    seed();
    const project = useMonkStore.getState().addProject({ goalId: "goal-1", title: "Video #27" })!;
    useMonkStore.getState().addGoalTask("goal-1", "Write script");
    const taskId = goal().tasks![0].id;

    useMonkStore.getState().setGoalTaskProject("goal-1", taskId, project.id);
    expect(goal().tasks![0].projectId).toBe(project.id);

    useMonkStore.getState().setGoalTaskProject("goal-1", taskId, undefined);
    expect(goal().tasks![0].projectId).toBeUndefined();
    expect(goal().tasks).toHaveLength(1);
  });

  it("finishing a project is reversible", () => {
    seed();
    const project = useMonkStore.getState().addProject({ goalId: "goal-1", title: "Video #27" })!;
    useMonkStore.getState().updateProject(project.id, { status: "done" });
    expect(projects()[0].status).toBe("done");
    useMonkStore.getState().updateProject(project.id, { status: "active" });
    expect(projects()[0].status).toBe("active");
  });

  it("a blank rename keeps the existing title", () => {
    seed();
    const project = useMonkStore.getState().addProject({ goalId: "goal-1", title: "Video #27" })!;
    useMonkStore.getState().updateProject(project.id, { title: "   " });
    expect(projects()[0].title).toBe("Video #27");
  });

  it("removing a project ungroups its steps but never deletes them", () => {
    seed();
    const project = useMonkStore.getState().addProject({ goalId: "goal-1", title: "Video #27" })!;
    useMonkStore.getState().addGoalTask("goal-1", "Write script");
    const taskId = goal().tasks![0].id;
    useMonkStore.getState().setGoalTaskProject("goal-1", taskId, project.id);

    useMonkStore.getState().removeProject(project.id);

    expect(projects()).toHaveLength(0);
    // The step was real work; only its grouping is gone.
    expect(goal().tasks).toHaveLength(1);
    expect(goal().tasks![0].projectId).toBeUndefined();
  });
});
