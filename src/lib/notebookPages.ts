import { IMG_MARKER } from "./imageStore";

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
