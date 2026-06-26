'use client';

import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { theme, Typography, Flex } from 'antd';
import { FONT_SIZE } from '@/lib/docs/tokens';

const { Text } = Typography;

interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Docs Table of Contents — dynamically reads heading elements (h1, h2, h3)
 * from the content area and renders a sticky outline panel.
 * The active heading is highlighted based on scroll position via IntersectionObserver.
 *
 * Automatically hidden on narrow screens (< 900px).
 */
export function DocToc() {
  const { token } = theme.useToken();
  const [items,    setItems]    = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [visible,  setVisible]  = useState(false);
  const itemsRef = useRef<TocItem[]>([]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const update = () => setVisible(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    const root = document.querySelector('[data-docs-content]');
    if (!root) return;

    // Dynamically read all heading levels: h1, h2, h3
    const headings = root.querySelectorAll('h1, h2, h3');
    const tocItems: TocItem[] = [];
    headings.forEach((h) => {
      const fallback = h.textContent?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || '';
      const id = h.id || fallback;
      if (h.id !== id) h.id = id;
      const level = parseInt(h.tagName.charAt(1), 10);
      tocItems.push({ id, text: h.textContent || '', level });
    });

    if (JSON.stringify(itemsRef.current) !== JSON.stringify(tocItems)) {
      itemsRef.current = tocItems;
      setItems(tocItems);
    }

    if (tocItems.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  if (!visible || items.length === 0) return null;

  const handleClick = (id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      aria-label="Table of contents"
      style={{
        position: 'sticky',
        top: 72,
        width: 220,
        flexShrink: 0,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        padding: `${token.paddingSM}px 0 ${token.paddingSM}px ${token.paddingLG}px`,
        borderLeft: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Text
        strong
        style={{
          display: 'block',
          fontSize: FONT_SIZE.xs,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: token.colorTextTertiary,
          marginBottom: token.marginSM,
          fontWeight: 700,
        }}
      >
        On this page
      </Text>

      <Flex vertical gap={1}>
        {items.map((item) => {
          const isActive = activeId === item.id;
          // Indent based on heading level: h1=0, h2=8, h3=16
          const indent = (item.level - 1) * 8;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                borderLeft: isActive ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
                cursor: 'pointer',
                padding: `${token.paddingXXS + 1}px 0 ${token.paddingXXS + 1}px ${indent}px`,
                fontSize: item.level === 1 ? FONT_SIZE.sm : FONT_SIZE.xs,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? token.colorPrimary : token.colorTextSecondary,
                transition: `color ${token.motionDurationFast} ease, border-left-color ${token.motionDurationFast} ease`,
                lineHeight: 1.6,
                marginLeft: -1,
              }}
            >
              {item.text}
            </button>
          );
        })}
      </Flex>
    </nav>
  );
}
