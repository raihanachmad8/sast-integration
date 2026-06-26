'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Typography, Flex, theme } from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import { DOCS_CONFIG } from '@/lib/docs/config';
import { FONT_SIZE } from '@/lib/docs/tokens';
import { SEARCH_INDEX } from '@/lib/docs/search-index';

const { Text } = Typography;

interface SearchResult {
  slug: string;
  title: string;
  section: string;
  description: string;
  headings: string[];
  matchedHeading?: string;
  matchedContent?: string;
  score: number;
}

/** Build flat search items from config + search index */
function buildSearchItems() {
  const items: Array<{
    slug: string;
    title: string;
    section: string;
    description: string;
    headings: string[];
    content: string;
  }> = [];

  DOCS_CONFIG.forEach((section) => {
    section.items.forEach((item) => {
      const index = SEARCH_INDEX[item.slug];
      items.push({
        slug: item.slug,
        title: item.title,
        section: section.label,
        description: item.description,
        headings: index?.headings ?? [],
        content: index?.content ?? '',
      });
    });
  });

  return items;
}

/**
 * DocsSearchModal — Enterprise-grade search with Fuse.js.
 *
 * Features:
 * - Full-text search across titles, descriptions, headings, and content
 * - Fuzzy matching with ranking
 * - Hierarchical results (page → section → paragraph)
 * - Keyboard navigation (↑↓ Enter Esc)
 * - Ctrl+K / Cmd+K shortcut
 */
export function DocsSearchModal() {
  const { token } = theme.useToken();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo(() => buildSearchItems(), []);

  // Create Fuse instance with hierarchical search
  const fuse = useMemo(() => {
    return new Fuse(allItems, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'headings', weight: 0.3 },
        { name: 'description', weight: 0.2 },
        { name: 'content', weight: 0.1 },
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
    });
  }, [allItems]);

  // Search results with hierarchical matching
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) {
      return allItems.map((item) => ({
        ...item,
        score: 0,
      }));
    }

    const fuseResults = fuse.search(query);
    return fuseResults.slice(0, 20).map((result) => {
      const item = result.item;
      let matchedHeading: string | undefined;
      let matchedContent: string | undefined;

      // Find which heading matched
      if (result.matches) {
        for (const match of result.matches) {
          if (match.key === 'headings' && match.indices.length > 0) {
            matchedHeading = item.headings[match.indices[0][0]];
          }
          if (match.key === 'content' && match.indices.length > 0) {
            // Extract paragraph around match
            const idx = match.indices[0][0];
            const start = Math.max(0, idx - 30);
            const end = Math.min(item.content.length, idx + 50);
            matchedContent = '...' + item.content.slice(start, end) + '...';
          }
        }
      }

      return {
        ...item,
        matchedHeading,
        matchedContent,
        score: result.score ?? 0,
      };
    });
  }, [query, fuse, allItems]);

  // Listen for custom event
  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setQuery('');
      setSelectedIndex(0);
    };
    window.addEventListener('open-docs-search', handler);
    return () => window.removeEventListener('open-docs-search', handler);
  }, []);

  // Focus input when opened + trap focus
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);

      // Focus trap: prevent Tab from escaping modal
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          const modal = document.querySelector('[role="dialog"]');
          if (!modal) return;
          const focusable = modal.querySelectorAll<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])');
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter' && results[selectedIndex]) {
        let url = `/docs/${results[selectedIndex].slug}`;
        if (results[selectedIndex].matchedHeading) {
          const id = results[selectedIndex].matchedHeading!.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
          url += `#${id}`;
        }
        router.push(url);
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, selectedIndex, router]);

  // Reset selection when query changes
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search documentation"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 'clamp(80px, 15vh, 120px)', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div style={{ width: '90%', maxWidth: 600, background: 'white', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden', maxHeight: '65vh', display: 'flex', flexDirection: 'column' }}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <SearchOutlined style={{ color: token.colorTextTertiary, fontSize: 16 }} />
          <input ref={inputRef} type="text" placeholder="Search documentation..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: FONT_SIZE.lg, background: 'transparent', color: token.colorText }} />
          <kbd style={{ fontSize: FONT_SIZE.xs, padding: '2px 6px', borderRadius: 4, border: `1px solid ${token.colorBorderSecondary}`, background: token.colorFillQuaternary, color: token.colorTextTertiary, fontFamily: 'monospace' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(65vh - 52px)' }}>
          {results.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}><Text type="secondary">No results found</Text></div>
          ) : (
            results.map((item, i) => (
              <div
                key={item.slug}
                onClick={() => {
                  let url = `/docs/${item.slug}`;
                  if (item.matchedHeading) {
                    const id = item.matchedHeading.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                    url += `#${id}`;
                  }
                  router.push(url);
                  setOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                style={{ padding: '10px 16px', cursor: 'pointer', background: i === selectedIndex ? token.colorPrimaryBg : 'transparent', transition: 'background 0.1s ease', borderBottom: `1px solid ${token.colorBorderSecondary}` }}
              >
                <Flex align="center" gap={8}>
                  <FileTextOutlined style={{ color: token.colorTextTertiary, fontSize: 14 }} />
                  <Text strong style={{ fontSize: FONT_SIZE.base, color: token.colorText }}>{item.title}</Text>
                  <Text type="secondary" style={{ fontSize: FONT_SIZE.xs }}>({item.section})</Text>
                </Flex>
                <Text type="secondary" style={{ fontSize: FONT_SIZE.sm, marginTop: 2 }}>{item.description}</Text>
                {item.matchedHeading && (
                  <Text style={{ fontSize: FONT_SIZE.xs, color: token.colorPrimary, marginTop: 4, fontStyle: 'italic' }}>
                    → {item.matchedHeading}
                  </Text>
                )}
                {item.matchedContent && (
                  <Text type="secondary" style={{ fontSize: FONT_SIZE.xs, marginTop: 2, fontFamily: 'monospace' }}>
                    {item.matchedContent}
                  </Text>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: `1px solid ${token.colorBorderSecondary}`, display: 'flex', gap: 16, fontSize: FONT_SIZE.xs, color: token.colorTextTertiary }}>
          <span><kbd style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: `1px solid ${token.colorBorderSecondary}`, background: token.colorFillQuaternary }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: `1px solid ${token.colorBorderSecondary}`, background: token.colorFillQuaternary }}>↵</kbd> select</span>
          <span><kbd style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: `1px solid ${token.colorBorderSecondary}`, background: token.colorFillQuaternary }}>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
