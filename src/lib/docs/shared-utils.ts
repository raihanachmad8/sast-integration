/**
 * Shared utilities for the docs system.
 * Centralises duplicated helpers across docs components.
 */

import {
  RocketOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BookOutlined,
  ApiOutlined,
  SettingOutlined,
  SafetyOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import React from 'react';

import { DOCS_CONFIG } from './config';
import { SECTION_ACCENTS, DEFAULT_ACCENT } from './tokens';

// ═══════════════════════════════════════════════════════════
// Slug Generation
// ═══════════════════════════════════════════════════════════

/** Convert heading text to a URL-safe slug for anchor links. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

// ═══════════════════════════════════════════════════════════
// Text Extraction (for heading ID generation)
// ═══════════════════════════════════════════════════════════

/** Recursively extract plain text from React nodes (handles inline code, bold, etc.). */
export function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (React.isValidElement<{ children?: React.ReactNode }>(node) && node.props.children) {
    return extractText(node.props.children);
  }
  if (Array.isArray(node)) return node.map(extractText).join('');
  return '';
}

// ═══════════════════════════════════════════════════════════
// Section Lookup
// ═══════════════════════════════════════════════════════════

/** Find the section and title for a given doc slug. */
export function getBreadcrumb(slug: string): { section: string; title: string } | null {
  for (const section of DOCS_CONFIG) {
    const item = section.items.find((i) => i.slug === slug);
    if (item) {
      return { section: section.label, title: item.title };
    }
  }
  return null;
}

/** Get the accent colors for a doc slug based on its section. */
export function getSectionAccent(slug: string): { color: string; bg: string } {
  for (const section of DOCS_CONFIG) {
    if (section.items.some((i) => i.slug === slug)) {
      return SECTION_ACCENTS[section.label] ?? DEFAULT_ACCENT;
    }
  }
  return DEFAULT_ACCENT;
}

// ═══════════════════════════════════════════════════════════
// Section Icons (component references)
// ═══════════════════════════════════════════════════════════

type IconComponent = typeof RocketOutlined;

/** Section label → icon component mapping. */
export const SECTION_ICONS: Record<string, IconComponent> = {
  'Getting Started': RocketOutlined,
  'Architecture': ApartmentOutlined,
  'Features': AppstoreOutlined,
  'Guides': BookOutlined,
  'Integrations': ApiOutlined,
  'Configuration': SettingOutlined,
  'Security': SafetyOutlined,
  'Reference': FileTextOutlined,
};

/** Slug → icon component mapping (computed from DOCS_CONFIG). */
export const ICON_MAP: Record<string, IconComponent> = {};
DOCS_CONFIG.forEach((section) => {
  const icon = SECTION_ICONS[section.label] ?? FileTextOutlined;
  section.items.forEach((item) => {
    ICON_MAP[item.slug] = icon;
  });
});

// ═══════════════════════════════════════════════════════════
// Prev / Next Navigation
// ═══════════════════════════════════════════════════════════

export interface DocNavItem {
  slug: string;
  title: string;
  section: string;
}

/** Get the flattened list of all doc items in order. */
const ALL_ITEMS: DocNavItem[] = DOCS_CONFIG.flatMap((section) =>
  section.items.map((item) => ({
    slug: item.slug,
    title: item.title,
    section: section.label,
  }))
);

/** Get previous and next doc items relative to the current slug. */
export function getDocNav(slug: string): { prev: DocNavItem | null; next: DocNavItem | null } {
  const idx = ALL_ITEMS.findIndex((item) => item.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? ALL_ITEMS[idx - 1] : null,
    next: idx < ALL_ITEMS.length - 1 ? ALL_ITEMS[idx + 1] : null,
  };
}
