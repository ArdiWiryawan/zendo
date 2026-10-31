import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards the two systemic rules this pass established:
 *
 * 1. Semantic colours that carry text must clear WCAG AA (4.5:1) on both the
 *    page surface and their own soft fill, in every theme. Success and rest
 *    used to sit at 4.06:1 and 3.28:1 — legible-looking in a screenshot,
 *    failing for low-vision users.
 * 2. Hierarchy on a dark UI comes from the text tokens, not from opacity.
 *    `text-monk-muted/60` measured 2.79:1 and `text-monk-text-soft/40`
 *    measured 1.78:1; both were used for real content.
 */

const css = readFileSync("src/styles/globals.css", "utf8");

type Triplet = { r: number; g: number; b: number };

function themeBlocks(): Array<{ name: string; vars: Record<string, Triplet> }> {
  const out: Array<{ name: string; vars: Record<string, Triplet> }> = [];
  const re = /(?:^|\n)(:root|\[data-theme="([a-z_]+)"\])\s*\{([\s\S]*?)\n\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css))) {
    const vars: Record<string, Triplet> = {};
    for (const line of match[3].split("\n")) {
      const m = line.match(/--color-([a-z-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/);
      if (m) vars[m[1]] = { r: Number(m[2]), g: Number(m[3]), b: Number(m[4]) };
    }
    // The first `:root` block holds the time-block hues; the second one is the
    // palette. Only palette blocks declare `surface`.
    if (!vars.surface) continue;
    out.push({ name: match[2] ?? "dark", vars });
  }
  return out;
}

function luminance({ r, g, b }: Triplet): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Triplet, b: Triplet): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("semantic text colours clear WCAG AA in every theme", () => {
  const blocks = themeBlocks();

  it("finds all six palettes", () => {
    expect(blocks.map((b) => b.name).sort()).toEqual(
      ["dark", "kurogane", "kyoto_moss", "sumi_ink", "temple_gold", "wabi_sabi"].sort()
    );
  });

  it.each(blocks.map((b) => [b.name, b] as const))("%s: success on surface and soft", (_name, block) => {
    expect(contrast(block.vars.success, block.vars.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(block.vars.success, block.vars["success-soft"])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(blocks.map((b) => [b.name, b] as const))("%s: rest on surface and soft", (_name, block) => {
    expect(contrast(block.vars.rest, block.vars.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(block.vars.rest, block.vars["rest-soft"])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("typography floor and text hierarchy", () => {
  const files = import.meta.glob("../**/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<
    string,
    string
  >;

  it("no 9px text anywhere", () => {
    const offenders = Object.entries(files).filter(([, src]) => /text-\[9px\]/.test(src));
    expect(offenders.map(([file]) => file)).toEqual([]);
  });

  it("no text colour dimmed below 80% opacity", () => {
    const offenders: string[] = [];
    for (const [file, src] of Object.entries(files)) {
      const matches = src.match(/text-monk-[a-z-]+\/(?:10|20|30|40|50|60|70)\b/g);
      if (matches) offenders.push(`${file}: ${matches[0]}`);
    }
    expect(offenders).toEqual([]);
  });
});
