/**
 * Design tokens — single source of truth for spacing, typography, and layout values.
 *
 * These values are used in inline styles across components and pages.
 * For CSS-based styling, prefer the corresponding CSS variables in globals.css.
 *
 * @module design-tokens
 */

// ─── Spacing ─────────────────────────────────────────────────────────────────

/** Extra-small gap (4px) — used between tightly grouped elements */
export const SPACE_XS = 4;
/** Small gap (6px) — used between related items */
export const SPACE_SM = 6;
/** Default gap (8px) — standard element spacing */
export const SPACE_MD = 8;
/** Medium gap (12px) — used in toolbars and form groups */
export const SPACE_LG = 12;
/** Large gap (14px) — used in summary grids */
export const SPACE_XL = 14;
/** Extra-large gap (16px) — used between major sections */
export const SPACE_2XL = 16;
/** Section gap (18px) — used between page sections */
export const SPACE_3XL = 18;
/** Header gap (20px) — used in page headers */
export const SPACE_4XL = 20;
/** Banner gap (24px) — used between major page blocks */
export const SPACE_5XL = 24;

// ─── Typography ──────────────────────────────────────────────────────────────

/** Extra-small font (10px) — used for tiny labels and icons */
export const FONT_XS = 10;
/** Small font (11px) — used for labels, badges, and uppercase text */
export const FONT_SM = 11;
/** Default font (12px) — used for secondary text and metadata */
export const FONT_MD = 12;
/** Medium font (13px) — used for table cells and body text */
export const FONT_LG = 13;
/** Large font (14px) — used for descriptions and form labels */
export const FONT_XL = 14;
/** Heading font (16px) — used for card titles */
export const FONT_2XL = 16;
/** Sub-heading font (20px) — used for section titles */
export const FONT_3XL = 20;
/** Page title font (22px) — used for summary stats */
export const FONT_4XL = 22;
/** Display font (28px) — used for page titles */
export const FONT_5XL = 28;

// ─── Font Weights ────────────────────────────────────────────────────────────

/** Normal weight */
export const WEIGHT_NORMAL = 400;
/** Medium weight */
export const WEIGHT_MEDIUM = 500;
/** Semibold weight */
export const WEIGHT_SEMIBOLD = 600;
/** Bold weight */
export const WEIGHT_BOLD = 700;
/** Extra-bold weight */
export const WEIGHT_EXTRABOLD = 800;

// ─── Border Radius ───────────────────────────────────────────────────────────

/** Small radius (4px) — used for pagination buttons */
export const RADIUS_SM = 4;
/** Default radius (6px) — used for tabs and pagination */
export const RADIUS_MD = 6;
/** Medium radius (7px) — used for tab buttons */
export const RADIUS_LG = 7;
/** Large radius (8px) — used for cards, inputs, buttons, avatars */
export const RADIUS_XL = 8;
/** Pill radius (999px) — used for badges and pills */
export const RADIUS_PILL = 999;

// ─── Layout ──────────────────────────────────────────────────────────────────

/** Compact button min-height (28px) */
export const MIN_HEIGHT_SM = 28;
/** Default button min-height (36px) */
export const MIN_HEIGHT_MD = 36;
/** Large button min-height (38px) */
export const MIN_HEIGHT_LG = 38;

/** Default page max-width (1100px) */
export const PAGE_MAX_WIDTH = 1100;
/** Wide page max-width (1200px) */
export const PAGE_MAX_WIDTH_WIDE = 1200;
/** Extra-wide page max-width (1280px) */
export const PAGE_MAX_WIDTH_XWIDE = 1280;

/** Page horizontal padding */
export const PAGE_PADDING = '0 16px';

// ─── Table ───────────────────────────────────────────────────────────────────

/** Minimum table width before horizontal scroll */
export const TABLE_MIN_WIDTH = 760;
/** Default page size for tables */
export const DEFAULT_PAGE_SIZE = 10;
/** Page size options for table pagination */
export const PAGE_SIZE_OPTIONS = ['10', '25', '50'] as const;

// ─── Debounce ────────────────────────────────────────────────────────────────

/** Default debounce delay in milliseconds */
export const DEBOUNCE_DELAY_MS = 300;

// ─── Shadows ─────────────────────────────────────────────────────────────────

/** Subtle shadow for cards and surfaces */
export const SHADOW_SM = '0 1px 2px rgba(15, 23, 42, 0.04)';
/** Medium shadow for elevated elements */
export const SHADOW_MD = '0 1px 2px rgba(15, 23, 42, 0.06)';
/** Brand shadow for primary buttons */
export const SHADOW_BRAND = '0 8px 18px rgba(15, 118, 110, 0.18)';

// ─── Z-Index ─────────────────────────────────────────────────────────────────

/** Popover z-index */
export const Z_POPOVER = 1000;
