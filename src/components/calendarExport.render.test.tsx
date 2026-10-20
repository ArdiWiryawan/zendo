import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { CalendarExportModal } from "./CalendarExportModal";
import type { TimeBlock } from "../types/app";

/**
 * Render smoke tests. These catch the failures unit tests cannot: a translation
 * key that does not exist, a hook called conditionally, or a modal that throws
 * while the rest of the suite stays green.
 *
 * The goal-why sheet is not covered here on purpose: it reads the goal from the
 * store, and zustand's server snapshot is the *initial* state, so an SSR render
 * can never see a goal seeded by a test. Its logic lives in `lib/goalWhy` and
 * `useMonkStore.goalWhy.test.ts` instead.
 */

describe("calendar export modal", () => {
  const blocks: TimeBlock[] = [
    { id: "a", title: "Deep work", startTime: "08:00", endTime: "10:00", category: "deep_work" },
    { id: "b", title: "Lunch", startTime: "12:00", endTime: "13:00", category: "rest" }
  ];

  it("warns that one calendar cannot hold several colors and offers one file per category", () => {
    const html = renderToString(
      <CalendarExportModal open onClose={() => {}} date="2026-10-19" timeBlocks={blocks} />
    );
    expect(html).toContain("Ekspor ke Kalender");
    expect(html).toContain("Unduh 2 file (1 per kategori)");
    expect(html).toContain("#6BB48B");
    expect(html).toContain("Jangan impor semua file ke SATU kalender");
    expect(html).toContain("Buat kalender");
    expect(html).toContain("0/2 kalender siap");
  });

  it("shows an empty state instead of an export button with no blocks", () => {
    const html = renderToString(
      <CalendarExportModal open onClose={() => {}} date="2026-10-19" timeBlocks={[]} />
    );
    expect(html).toContain("Belum ada time block");
    expect(html).not.toContain("Unduh 2 file");
  });
});
