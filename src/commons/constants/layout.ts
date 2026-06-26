/**
 * Layout & design constants for values not covered by antd theme tokens.
 *
 * For colors, use ENTITY_COLORS from '@/commons/constants/tokens'.
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

/* ── Border radius patterns ─────────────────────────────────── */
export const BORDER_RADIUS = {
  CIRCLE: '50%',
  PILL: 999,
} as const;

/* ── Report file formats ────────────────────────────────────── */
export const REPORT_FORMAT = {
  PDF: 'pdf',
  XLSX: 'xlsx',
  CSV: 'csv',
} as const;

/* ── Scan statuses & origins ─────────────────────────────────── */
export const SCAN_STATUS = {
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  PENDING: 'Pending',
} as const;

export const SCAN_ORIGIN = {
  MANAGED: 'managed',
  EXTERNAL_UPLOAD: 'external_upload',
} as const;

/* ── Source control statuses ──────────────────────────────────── */
export const SCM_STATUS = {
  CONNECTED: 'Connected',
  PENDING: 'Pending',
  DISCONNECTED: 'Disconnected',
} as const;

/* ── Scanner engine statuses ─────────────────────────────────── */
export const SCANNER_STATUS = {
  READY: 'Ready',
  NOT_INSTALLED: 'Not installed',
} as const;

/* ── Webhook delivery statuses ────────────────────────────────── */
export const WEBHOOK_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
  ACTIVE: 'active',
} as const;

/* ── Knowledge base source types ──────────────────────────────── */
export const KB_SOURCE_TYPE = {
  NVD: 'nvd',
  CWE: 'cwe',
} as const;

/* ── AI model roles ───────────────────────────────────────────── */
export const MODEL_ROLE = {
  PRIMARY: 'primary',
  FALLBACK: 'fallback',
} as const;

/* ── Tab keys ─────────────────────────────────────────────────── */
export const TAB_KEY = {
  MEMBERS: 'members',
  PENDING: 'pending',
  SETTINGS: 'settings',
  OVERVIEW: 'overview',
} as const;

export const TOPBAR_HEIGHT = 56;

export const SIDEBAR_Z_INDEX = { sidebar: 55, overlay: 50, topbar: 30, dropdown: 60 } as const;

export const SIDEBAR_COLORS = {
  bg: '#0f172a',
  hover: 'rgba(255,255,255,0.08)',
  active: 'rgba(15,118,110,0.3)',
  text: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.25)',
  brand: '#ffffff',
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
