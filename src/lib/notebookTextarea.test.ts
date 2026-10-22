import { describe, expect, it } from "vitest";
import {
  EDITOR_SAFE_BOTTOM,
  caretScrollDelta,
  nextTextareaHeight,
  parseTextareaHeight
} from "./notebookTextarea";

describe("nextTextareaHeight", () => {
  it("mengembalikan tinggi baru saat selisih lebih dari 1px", () => {
    expect(nextTextareaHeight(420, 380)).toBe(420);
    expect(nextTextareaHeight(300, 380)).toBe(300);
  });

  it("tidak menulis apa pun saat selisih <= 1px", () => {
    expect(nextTextareaHeight(380.4, 380)).toBeNull();
    expect(nextTextareaHeight(380, 380)).toBeNull();
  });

  it("mengabaikan pengukuran tidak masuk akal", () => {
    expect(nextTextareaHeight(Number.NaN, 380)).toBeNull();
    expect(nextTextareaHeight(0, 380)).toBeNull();
    expect(nextTextareaHeight(-10, 380)).toBeNull();
  });
});

describe("caretScrollDelta", () => {
  it("tidak menggeser saat caret di dalam zona aman", () => {
    expect(
      caretScrollDelta({ caretBottom: 600, viewportHeight: 800, safeBottom: EDITOR_SAFE_BOTTOM })
    ).toBe(0);
  });

  it("menggeser sebesar kelebihan saat caret menembus toolbar bawah", () => {
    // 800 - 160 = 640 batas aman; caretBottom 700 -> geser 60.
    expect(
      caretScrollDelta({ caretBottom: 700, viewportHeight: 800, safeBottom: EDITOR_SAFE_BOTTOM })
    ).toBe(60);
  });

  it("membulatkan ke atas agar caret tidak tersisa setengah piksel di zona terlarang", () => {
    expect(
      caretScrollDelta({ caretBottom: 640.2, viewportHeight: 800, safeBottom: EDITOR_SAFE_BOTTOM })
    ).toBe(1);
  });
});

describe("parseTextareaHeight", () => {
  it("membaca tinggi px inline", () => {
    expect(parseTextareaHeight("1400px")).toBe(1400);
    expect(parseTextareaHeight("380.5px")).toBe(380.5);
  });

  it("mengembalikan 0 untuk nilai kosong atau tidak valid", () => {
    expect(parseTextareaHeight("")).toBe(0);
    expect(parseTextareaHeight("auto")).toBe(0);
  });
});

describe("konstanta", () => {
  it("sesuai spec", () => {
    expect(EDITOR_SAFE_BOTTOM).toBe(160);
  });
});
