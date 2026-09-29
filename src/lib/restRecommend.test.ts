import { describe, it, expect } from "vitest";
import { recommendRest, isQuestionnaireComplete } from "./restRecommend";
import { REST_ACTIVITIES } from "../constants/restActivities";
import { REST_QUESTIONS } from "../constants/restQuestionnaire";

describe("recommendRest", () => {
  it("returns exactly two recommendations", () => {
    const result = recommendRest({ body: "heavy", mind: "spinning" });
    expect(result).toHaveLength(2);
  });

  it("weights a depleted body toward a physical activity", () => {
    const result = recommendRest({ body: "heavy" });
    expect(result[0].category).toBe("physical");
  });

  it("weights a spinning mind toward a creative activity", () => {
    const result = recommendRest({ mind: "spinning" });
    expect(result[0].category).toBe("creative");
  });

  it("weights social isolation toward a social activity", () => {
    const result = recommendRest({ social: "rarely" });
    expect(result[0].category).toBe("social");
  });

  it("weights a loud, full stretch toward solitude (inverted question)", () => {
    const result = recommendRest({ sensory: "loud" });
    expect(result[0].category).toBe("solitude");
  });

  it("never recommends the same activity twice", () => {
    const result = recommendRest({
      body: "heavy",
      mind: "spinning",
      social: "rarely",
      sensory: "loud"
    });
    const ids = result.map((r) => r.activity.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("breaks ties deterministically for identical answers", () => {
    const answers = { body: "heavy", mind: "spinning" };
    const a = recommendRest(answers).map((r) => r.activity.id);
    const b = recommendRest(answers).map((r) => r.activity.id);
    expect(a).toEqual(b);
  });

  it("still returns two options when every answer is the no-signal choice", () => {
    const result = recommendRest({
      body: "fine",
      mind: "clear",
      social: "plenty",
      sensory: "quiet"
    });
    expect(result).toHaveLength(2);
  });

  it("returns nothing when there are no answers at all is not the case — falls back", () => {
    const result = recommendRest({});
    expect(result).toHaveLength(2);
  });

  it("ignores unknown option ids without throwing", () => {
    const result = recommendRest({ body: "not-a-real-option" });
    expect(result).toHaveLength(2);
  });

  it("only recommends activities that exist in the shared pool", () => {
    const result = recommendRest({ body: "heavy", mind: "spinning" });
    for (const r of result) {
      expect(REST_ACTIVITIES.some((a) => a.id === r.activity.id)).toBe(true);
    }
  });

  it("scores a cross-category answer toward both categories", () => {
    // "restless" weights physical 2 + solitude 1.
    const result = recommendRest({ body: "restless" });
    expect(result[0].category).toBe("physical");
    expect(result[1].category).toBe("solitude");
  });
});

describe("isQuestionnaireComplete", () => {
  it("is false until every question is answered", () => {
    expect(isQuestionnaireComplete({})).toBe(false);
    expect(isQuestionnaireComplete({ body: "heavy" })).toBe(false);
  });

  it("is true once every question is answered", () => {
    const all = Object.fromEntries(
      REST_QUESTIONS.map((q) => [q.id, q.options[0].id])
    );
    expect(isQuestionnaireComplete(all)).toBe(true);
  });
});

describe("REST_QUESTIONS integrity", () => {
  it("every question has at least two options and a no-signal escape", () => {
    for (const q of REST_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.some((o) => Object.keys(o.score).length === 0)).toBe(true);
    }
  });

  it("every scored category has at least one activity to recommend", () => {
    const covered = new Set(REST_ACTIVITIES.map((a) => a.category));
    for (const q of REST_QUESTIONS) {
      for (const o of q.options) {
        for (const category of Object.keys(o.score)) {
          expect(covered.has(category as never)).toBe(true);
        }
      }
    }
  });

  it("has both id and en copy for every prompt, option, and activity", () => {
    for (const q of REST_QUESTIONS) {
      expect(q.prompt.id.length).toBeGreaterThan(0);
      expect(q.prompt.en.length).toBeGreaterThan(0);
      for (const o of q.options) {
        expect(o.label.id.length).toBeGreaterThan(0);
        expect(o.label.en.length).toBeGreaterThan(0);
      }
    }
    for (const a of REST_ACTIVITIES) {
      expect(a.title.id.length).toBeGreaterThan(0);
      expect(a.title.en.length).toBeGreaterThan(0);
    }
  });
});
