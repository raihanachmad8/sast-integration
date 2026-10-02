/**
 * Design tokens - centralized constants for consistent UI
 * Use these instead of hardcoded values
 */

// Layout
export const SELECT_WIDTH = 150;
export const SEARCH_INPUT_MAX_WIDTH = 360;
export const FORM_MAX_WIDTH = 720;
export const MODAL_MAX_WIDTH_SM = 480;

// Card styles
export const CARD_NO_PADDING = { body: { padding: 0 } };
export const CARD_COMPACT_PADDING = { body: { padding: 16 } };

// Table
export const TABLE_PAGE_SIZE = 10;

// Form spacing
export const FORM_ITEM_GAP = 16; // token.paddingMD

// Status colors (for Tags)
export const STATUS_COLORS: Record<string, string> = {
  active: 'success',
  ready: 'success',
  completed: 'success',
  success: 'success',
  enabled: 'success',
  inactive: 'default',
  not_installed: 'warning',
  pending: 'processing',
  running: 'processing',
  failed: 'error',
  error: 'error',
  disabled: 'default',
  revoked: 'default',
};

// Severity colors
export const SEVERITY_COLORS: Record<string, string> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'info',
  info: 'info',
  warning: 'warning',
  error: 'error',
};

// Provider colors (Git providers)
export const PROVIDER_COLORS: Record<string, { color: string; bg: string }> = {
  github: { color: '#24292e', bg: '#f6f8fa' },
  gitlab: { color: '#fc6d26', bg: '#fff4ed' },
  gitea: { color: '#478061', bg: '#e6f7ef' },
};

// Default avatar colors
export const AVATAR_COLORS = [
  '#0b1120', // dark
  '#1677ff', // blue
  '#52c41a', // green
  '#faad14', // yellow
  '#f5222d', // red
  '#722ed1', // purple
  '#13c2c2', // cyan
  '#eb2f96', // pink
];

// Summary card icon colors (light backgrounds + matching icon colors)
export const SUMMARY_CARD_COLORS = {
  primary: { bg: '#e6f4ff', icon: '#1677ff' },    // Blue
  success: { bg: '#f6ffed', icon: '#52c41a' },    // Green
  warning: { bg: '#fffbe6', icon: '#faad14' },    // Yellow
  danger: { bg: '#fff2f0', icon: '#ff4d4f' },     // Red
  purple: { bg: '#f9f0ff', icon: '#722ed1' },     // Purple
  cyan: { bg: '#e6fffb', icon: '#13c2c2' },       // Cyan
  teal: { bg: '#e6fffb', icon: '#13c2c2' },       // Teal
};
