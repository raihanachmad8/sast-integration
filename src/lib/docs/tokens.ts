/**
 * Docs & Landing page design tokens.
 * Centralized for easy editing and consistency.
 *
 * All hardcoded colors/sizes in docs and landing components should reference these tokens.
 */

// ═══════════════════════════════════════════════════════════
// Font Size Tokens
// ═══════════════════════════════════════════════════════════
export const FONT_SIZE = {
  xs: 12,
  sm: 13,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
} as const;

// ═══════════════════════════════════════════════════════════
// Code Block Tokens — Dark Theme (default)
// ═══════════════════════════════════════════════════════════
export const CODE_BLOCK_DARK = {
  bg: '#1e293b',
  text: '#e2e8f0',
  border: '#334155',
  fontSize: FONT_SIZE.sm,
} as const;

// ═══════════════════════════════════════════════════════════
// Code Block Tokens — Light Theme
// ═══════════════════════════════════════════════════════════
export const CODE_BLOCK_LIGHT = {
  bg: '#f8fafc',
  text: '#334155',
  border: '#e2e8f0',
  fontSize: FONT_SIZE.sm,
} as const;

// Default code block (dark)
export const CODE_BLOCK = CODE_BLOCK_DARK;

// ═══════════════════════════════════════════════════════════
// Inline Code Tokens
// ═══════════════════════════════════════════════════════════
export const INLINE_CODE = {
  bg: '#1e293b',
  text: '#e2e8f0',
  border: '#334155',
  fontSize: '0.875em',
} as const;

// ═══════════════════════════════════════════════════════════
// Docs Section Accent Colors
// ═══════════════════════════════════════════════════════════
export const SECTION_ACCENTS: Record<string, { color: string; bg: string }> = {
  'Getting Started': { color: '#0f766e', bg: '#f0fdfa' },
  'Architecture':    { color: '#0ea5e9', bg: '#f0f9ff' },
  'Features':        { color: '#7c3aed', bg: '#f5f3ff' },
  'Guides':          { color: '#f59e0b', bg: '#fffbeb' },
  'Integrations':    { color: '#10b981', bg: '#f0fdf4' },
  'Configuration':   { color: '#ea580c', bg: '#fff7ed' },
  'Security':        { color: '#dc2626', bg: '#fef2f2' },
  'Reference':       { color: '#6366f1', bg: '#eef2ff' },
};

export const DEFAULT_ACCENT = { color: '#0f766e', bg: '#f0fdfa' };

// ═══════════════════════════════════════════════════════════
// Text Colors
// ═══════════════════════════════════════════════════════════
export const TEXT = {
  heading: '#0f172a',
  body: '#64748b',
} as const;

// ═══════════════════════════════════════════════════════════
// Landing Page Tokens
// ═══════════════════════════════════════════════════════════
export const LANDING = {
  hero: {
    badgeText: '#0f766e',
    subtitle: '#64748b',
    trustText: '#64748b',
  },
  stats: {
    value: '#0f766e',
    label: '#64748b',
  },
  feature: {
    title: '#0f172a',
    description: '#64748b',
  },
} as const;
