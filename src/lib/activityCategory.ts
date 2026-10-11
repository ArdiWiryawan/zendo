import type { TimeBlockCategory } from "../types/app";

/**
 * Single source of truth for time-block category identity.
 *
 * Category identity is an ID (`deep_work`), never a display name and never a
 * color. Renaming what a category is *called* must not move its color, and
 * adding a theme must not move it either — so the on-screen color stays in CSS
 * tokens (`--color-cat-*`, one value per theme) while the exported color is the
 * default-theme hex below. An .ics is a static file that outlives the app's
 * theme; baking the current theme into it would make two exports of the same
 * day differ by nothing but a palette choice.
 */

/** The five real categories, in menu order. Every other module iterates this. */
export const TIME_BLOCK_CATEGORIES = [
  "deep_work",
  "learning",
  "shallow",
  "rest",
  "personal"
] as const satisfies readonly TimeBlockCategory[];

export type ActivityCategory = TimeBlockCategory;

type CategoryMeta = {
  /**
   * Default-theme hex, matching `--color-cat-*` in src/styles/globals.css:9-13.
   * Used by the ICS exporter, which has no access to CSS.
   */
  hex: string;
  /**
   * CSS3 named color for the RFC 7986 `COLOR` property.
   *
   * RFC 7986 §5.9 defines the value as a CSS3 *color name*; a hex value is not
   * valid there. Zendo's muted palette has no exact CSS3 name, so each category
   * maps to the nearest name and the precise hex rides alongside in
   * X-APPLE-CALENDAR-COLOR. The keyword is a hint for clients that only speak
   * RFC 7986; it is never parsed back into a hex.
   */
  colorName: string;
  /** Whether the name is the *lightest* of the two extensions, for readability. */
  darkText: boolean;
  /** i18n key for the human label. Lives here so UI maps stop restating it. */
  labelKey: string;
};

/**
 * Fallback for an id this build does not know — a block from a newer Zendo, a
 * hand-edited payload, a category that was renamed or removed.
 *
 * Deliberately NOT `deep_work`. src/lib/icsParser.ts:515-524 already commits to
 * this rule for imported calendars ("Deep work must be named to be claimed"),
 * and it is the right rule for a stored block too: an unknown category is not
 * evidence of depth, and reading one as focus would quietly upgrade a day of
 * errands into a day of deep work. `personal` is the neutral answer.
 */
export const DEFAULT_ACTIVITY_CATEGORY: ActivityCategory = "personal";

const CATEGORY_META: Record<ActivityCategory, CategoryMeta> = {
  deep_work: {
    hex: "#C46A5B",
    colorName: "indianred",
    darkText: false,
    labelKey: "planning.catDeep"
  },
  learning: {
    hex: "#8B9DC4",
    colorName: "cornflowerblue",
    darkText: false,
    labelKey: "planning.catLearning"
  },
  shallow: {
    hex: "#6B9AC4",
    colorName: "steelblue",
    darkText: false,
    labelKey: "planning.catShallow"
  },
  rest: {
    hex: "#6BB48B",
    colorName: "mediumseagreen",
    darkText: false,
    labelKey: "planning.catRest"
  },
  personal: {
    hex: "#C48BB4",
    colorName: "orchid",
    darkText: false,
    labelKey: "planning.catPersonal"
  }
};

/**
 * True when `value` is one of the five ids this build knows.
 *
 * The guard exists because `Record<K, V>[key]` cannot tell a stored string that
 * happens to be a valid key from one that does not. Every read of a persisted
 * or hand-editable category goes through here.
 */
export function isActivityCategory(value: unknown): value is ActivityCategory {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(CATEGORY_META, value)
  );
}

/**
 * Resolve any stored/derived value to a category this build can render.
 *
 * Never throws: an undefined, misspelled, or retired id resolves to
 * DEFAULT_ACTIVITY_CATEGORY so a single bad block cannot break a render pass or
 * abort an export of the whole day.
 */
export function resolveActivityCategory(value: unknown): ActivityCategory {
  return isActivityCategory(value) ? value : DEFAULT_ACTIVITY_CATEGORY;
}

/**
 * Metadata for a category. Accepts `unknown` and resolves first, so callers can
 * pass `block.category` straight in without their own fallback expression —
 * which is how three components each grew a slightly different fallback.
 */
export function activityCategoryMeta(value: unknown): CategoryMeta {
  return CATEGORY_META[resolveActivityCategory(value)];
}

/** Default-theme hex for a category. Unknown ids get the fallback's hex. */
export function activityCategoryHex(value: unknown): string {
  return activityCategoryMeta(value).hex;
}

/** RFC 7986 CSS3 color name for a category. */
export function activityCategoryColorName(value: unknown): string {
  return activityCategoryMeta(value).colorName;
}
