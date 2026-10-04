import { describe, expect, it } from "vitest";
import { formatIntention, isStructuredIntention, parseIntention, stripIntentionTime } from "./implementationIntention";

describe("stripIntentionTime", () => {
  it("removes a numeric time token from the when-clause", () => {
    expect(stripIntentionTime("When 21:00 Ketika mau tidur, I will baca buku")).toBe(
      "When Ketika mau tidur, I will baca buku",
    );
  });

  it("removes an Indonesian word-time token", () => {
    expect(stripIntentionTime("When malam sebelum tidur, I will baca buku")).toBe(
      "When sebelum tidur, I will baca buku",
    );
  });

  it("returns just the action when stripping empties the when-clause", () => {
    expect(stripIntentionTime("When 21:00, I will baca buku")).toBe("baca buku");
    expect(stripIntentionTime("When malam, I will baca buku")).toBe("baca buku");
  });

  it("passes through a structured intention with no time token", () => {
    const text = "When setelah makan, I will baca buku";
    expect(stripIntentionTime(text)).toBe(text);
  });

  it("passes through unstructured text", () => {
    expect(stripIntentionTime("baca buku")).toBe("baca buku");
    expect(stripIntentionTime("just some note")).toBe("just some note");
  });

  it("returns empty string for empty / whitespace input", () => {
    expect(stripIntentionTime("")).toBe("");
    expect(stripIntentionTime("   ")).toBe("");
  });

  it("trims the passthrough input", () => {
    expect(stripIntentionTime("  baca buku  ")).toBe("baca buku");
  });

  it("is idempotent", () => {
    const cases = [
      "When 21:00 Ketika mau tidur, I will baca buku",
      "When 21:00, I will baca buku",
      "When malam sebelum tidur, I will baca buku",
      "When setelah makan, I will baca buku",
      "baca buku",
    ];
    for (const c of cases) {
      const once = stripIntentionTime(c);
      expect(stripIntentionTime(once)).toBe(once);
    }
  });

  it("does not treat a non-time first token as a time", () => {
    const text = "When Ketika mau tidur, I will baca buku";
    expect(stripIntentionTime(text)).toBe(text);
  });
});

describe("parseIntention (no regression)", () => {
  it("still extracts a numeric time token", () => {
    expect(parseIntention("When 21:00 Ketika mau tidur, I will baca buku")).toEqual({
      time: "21:00",
      when: "Ketika mau tidur",
      action: "baca buku",
    });
  });

  it("still extracts an Indonesian word-time token", () => {
    expect(parseIntention("When malam sebelum tidur, I will baca buku")).toEqual({
      time: "malam",
      when: "sebelum tidur",
      action: "baca buku",
    });
  });

  it("keeps a single-token when-clause as when (no time)", () => {
    expect(parseIntention("When 21:00, I will baca buku")).toEqual({
      when: "21:00",
      action: "baca buku",
    });
  });

  it("handles structured text with no time token", () => {
    expect(parseIntention("When setelah makan, I will baca buku")).toEqual({
      when: "setelah makan",
      action: "baca buku",
    });
  });

  it("handles plain action and empty input", () => {
    expect(parseIntention("baca buku")).toEqual({ when: "", action: "baca buku" });
    expect(parseIntention("")).toEqual({ when: "", action: "" });
    expect(parseIntention("   ")).toEqual({ when: "", action: "" });
  });
});

describe("formatIntention", () => {
  it("still prepends the time token", () => {
    expect(formatIntention("Ketika mau tidur", "baca buku", "21:00")).toBe(
      "When 21:00 Ketika mau tidur, I will baca buku",
    );
  });

  it("handles no time", () => {
    expect(formatIntention("setelah makan", "baca buku")).toBe("When setelah makan, I will baca buku");
    expect(formatIntention("", "baca buku")).toBe("baca buku");
    expect(formatIntention("x", "")).toBe("");
  });
});

describe("isStructuredIntention", () => {
  it("detects structured shape", () => {
    expect(isStructuredIntention("When 21:00, I will baca buku")).toBe(true);
    expect(isStructuredIntention("baca buku")).toBe(false);
  });
});
