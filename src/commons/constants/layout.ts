/**
 * Layout & design constants for values not covered by antd theme tokens.
 *
 * For colors, use STATUS_TOKENS from '@/commons/tokens'.
 * For auth page colors, use AUTH_THEME from '@/commons/constants/theme'.
 * For spacing/fontSize/borderRadius, use theme.useToken() from antd.
 * This file is ONLY for layout dimensions, modal widths, and z-index layers.
 *
 * @example
 * ```tsx
 * import { LAYOUT, MODAL_WIDTH } from '@/commons/constants/layout';
 *
 * <Modal width={MODAL_WIDTH.MD}>
 * <Header style={{ height: LAYOUT.HEADER_HEIGHT }}>
 * ```
 */

/* ── Modal & Drawer widths ─────────────────────────────────── */
export const MODAL_WIDTH = {
  SM: 420,
  MD: 520,
  LG: 600,
  XL: 640,
} as const;

/* ── Layout dimensions ─────────────────────────────────────── */
export const LAYOUT = {
  HEADER_HEIGHT: 60,
  SIDEBAR_WIDTH: 260,
  SIDEBAR_COLLAPSED_WIDTH: 80,
  AVATAR_SM: 28,
  AVATAR_MD: 36,
  AVATAR_LG: 44,
  ICON_SM: 18,
  ICON_MD: 24,
  ICON_LG: 36,
} as const;

/* ── Z-index layers ────────────────────────────────────────── */
export const Z_INDEX = {
  HEADER: 90,
  SIDEBAR: 100,
  DROPDOWN: 1050,
  MODAL: 1000,
  DRAWER: 1000,
  TOOLTIP: 1070,
} as const;

/* ── Transition durations ──────────────────────────────────── */
export const TRANSITION = {
  FAST: '120ms ease',
  NORMAL: '200ms ease',
  SLOW: '300ms ease',
} as const;
