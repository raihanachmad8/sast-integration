'use client';

import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { theme, Typography, Flex } from 'antd';

const { Text } = Typography;

interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Docs Table of Contents — reads heading elements (h2, h3) from the content area
 * and renders a sticky outline. Active heading is highlighted based on scroll position.
 * Automatically hidden on narrow screens.
 */
export function DocToc() {
  const { token } = theme.useToken();
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [visible, setVisible] = useState(false);
  const itemsRef = useRef<TocItem[]>([]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1100px)');
    const update = () => setVisible(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    const root = document.querySelector('[data-docs-content]');
    if (!root) return;

    const headings = root.querySelectorAll('h2, h3');
    const tocItems: TocItem[] = [];
    headings.forEach((h) => {
      const fallback = h.textContent?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || '';
      const id = h.id || fallback;
      if (h.id !== id) h.id = id;
      tocItems.push({
        id,
        text: h.textContent || '',
        level: h.tagName === 'H2' ? 2 : 3,
      });
    });
    // DOM read + state sync — only update if items actually changed
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
        top: 88,
        width: 200,
        flexShrink: 0,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        paddingLeft: token.paddingLG,
        borderLeft: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Text
        strong
        style={{
          display: 'block',
          fontSize: token.fontSizeSM,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: token.colorTextQuaternary,
          marginBottom: token.marginSM,
        }}
      >
        On this page
      </Text>

      <Flex vertical gap={token.marginXXS}>
        {items.map((item) => (
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
              cursor: 'pointer',
              padding: `${token.paddingXXS}px 0 ${token.paddingXXS}px ${item.level === 3 ? 16 : 0}px`,
              fontSize: token.fontSizeSM,
              fontWeight: activeId === item.id ? 600 : 400,
              color: activeId === item.id ? token.colorPrimary : token.colorTextSecondary,
              transition: `color ${token.motionDurationFast} ease`,
              lineHeight: 1.6,
            }}
          >
            {item.text}
          </button>
        ))}
      </Flex>
    </nav>
  );
}
