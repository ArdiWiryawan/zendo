import { IMG_MARKER } from "./imageStore";
import { photoIdsInBody } from "../components/NotebookImages";

/**
 * Multi-page helpers for notebook entries. `body` on the entry is always the
 * flat join of pages (one page per line-group, separated by "\n"), so the rest
 * of the app (search, list render, marker GC) keeps working on one string.
 */

/** Join pages into the canonical flat body string. */
export function joinPages(pages: string[]): string {
  return pages.join("\n");
}

/** Drop the {{img:<id>}} marker line from one page's text, if present. */
export function removePhotoMarker(page: string, id: string): string {
  return page
    .split("\n")
    .filter((line) => {
      const m = line.trim().match(IMG_MARKER);
      return !m || m[1] !== id;
    })
    .join("\n");
}

/**
 * Trim trailing empty/whitespace-only pages from a notebook entry.
 * Guarantees at least one page is returned (e.g. `[""]`).
 */
export function trimTrailingBlankPages(pages: string[] | undefined | null): string[] {
  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return [""];
  }
  let lastIndex = pages.length - 1;
  while (lastIndex > 0 && pages[lastIndex].trim() === "") {
    lastIndex--;
  }
  return pages.slice(0, lastIndex + 1);
}

/**
 * Whether a sheet holds anything a user would mourn: non-whitespace text or an
 * embedded photo. Blank sheets delete without a confirm step — we only
 * interrupt for destructive intent, not for removing an empty sheet.
 */
export function pageHasContent(page: string | undefined | null): boolean {
  if (!page) return false;
  return page.trim().length > 0 || photoIdsInBody(page).length > 0;
}

/**
 * Delete a specific page index from the pages array.
 * If only one page remains and it is deleted, returns `[""]`.
 */
export function deletePageAtIndex(pages: string[], index: number): string[] {
  if (!Array.isArray(pages) || index < 0 || index >= pages.length) {
    return pages && pages.length > 0 ? pages : [""];
  }
  if (pages.length <= 1) {
    return [""];
  }
  const next = [...pages.slice(0, index), ...pages.slice(index + 1)];
  return trimTrailingBlankPages(next);
}

