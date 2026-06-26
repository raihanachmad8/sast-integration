'use client';

import { useState, useEffect } from 'react';
import { Layout, Typography, Flex, theme } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  RocketOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BookOutlined,
  ApiOutlined,
  SettingOutlined,
  SafetyOutlined,
  FileTextOutlined,
  MenuOutlined,
  CloseOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { DOCS_CONFIG } from '@/lib/docs/config';
import { DocToc } from './doc-toc';
import { DocsSearchModal } from './DocsSearchModal';

const { Sider, Content } = Layout;
const { Text } = Typography;

const NAVBAR_HEIGHT = 56;

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'Getting Started': <RocketOutlined />,
  'Architecture':    <ApartmentOutlined />,
  'Features':        <AppstoreOutlined />,
  'Guides':          <BookOutlined />,
  'Integrations':    <ApiOutlined />,
  'Configuration':   <SettingOutlined />,
  'Security':        <SafetyOutlined />,
  'Reference':       <FileTextOutlined />,
};

const ICON_MAP: Record<string, React.ReactNode> = {};
DOCS_CONFIG.forEach((section) => {
  section.items.forEach((item) => {
    ICON_MAP[item.slug] = SECTION_ICONS[section.label] ?? <FileTextOutlined />;
  });
});

function getActiveKey(pathname: string): string {
  if (pathname === '/docs') return 'overview';
  const segment = pathname.split('/docs/')[1]?.split('/')[0];
  return segment || 'overview';
}

/**
 * DocsLayout — sidebar + content + TOC shell.
 *
 * Desktop: persistent 268px sidebar, content fills remaining width, TOC on right.
 * Mobile: sidebar collapses; sticky bar with menu button opens slide-in drawer.
 *
 * Sidebar features:
 * - Branded header with logo + version badge
 * - Section labels with uppercase styling
 * - Active items with left border accent indicator
 * - Smooth hover transitions
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const { token } = theme.useToken();
  const pathname    = usePathname();
  const activeKey   = getActiveKey(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    // Collapse all sections except the one containing the active page
    const collapsed = new Set<string>();
    DOCS_CONFIG.forEach((section) => {
      const hasActive = section.items.some((item) => item.slug === activeKey);
      if (!hasActive) collapsed.add(section.label);
    });
    return collapsed;
  });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 991px)');
    const update = () => { setIsMobile(mq.matches); };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  function SidebarNav() {
    const toggleSection = (label: string) => {
      setCollapsedSections((prev) => {
        const next = new Set(prev);
        if (next.has(label)) next.delete(label);
        else next.add(label);
        return next;
      });
    };

    return (
      <>
        {/* Navigation */}
        <nav
          style={{
            padding: `${token.paddingLG}px ${token.paddingSM}px ${token.paddingXL}px`,
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {DOCS_CONFIG.map((section) => {
            const isCollapsed = collapsedSections.has(section.label);
            const hasActive = section.items.some((item) => item.slug === activeKey);
            return (
              <div key={section.label} style={{ marginBottom: token.marginMD }}>
                {/* Section label with collapse toggle */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: `${token.paddingXS}px ${token.paddingSM}px`,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: token.borderRadiusSM,
                    transition: `background ${token.motionDurationMid} ease`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = token.colorFillQuaternary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Text
                    strong
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: hasActive ? token.colorPrimary : token.colorTextTertiary,
                      fontWeight: 700,
                    }}
                  >
                    {section.label}
                  </Text>
                  <span
                    style={{
                      fontSize: 10,
                      color: token.colorTextTertiary,
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    ▼
                  </span>
                </button>
              {!isCollapsed && (
              <Flex vertical gap={1}>
                {section.items.map((item) => {
                  const isActive = activeKey === item.slug;
                  return (
                    <Link
                      key={item.slug}
                      href={`/docs/${item.slug}`}
                      onClick={() => setDrawerOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: token.paddingSM,
                        padding: `${token.paddingXS}px ${token.paddingSM}px`,
                        borderRadius: token.borderRadiusSM,
                        textDecoration: 'none',
                        fontSize: token.fontSize,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? token.colorPrimary : token.colorTextSecondary,
                        background: isActive ? token.colorPrimaryBg : 'transparent',
                        borderLeft: isActive ? `3px solid ${token.colorPrimary}` : '3px solid transparent',
                        transition: `background ${token.motionDurationMid} ease, color ${token.motionDurationMid} ease, border-left-color ${token.motionDurationMid} ease`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          opacity: isActive ? 1 : 0.45,
                          flexShrink: 0,
                          color: isActive ? token.colorPrimary : token.colorText,
                          transition: `opacity ${token.motionDurationMid} ease`,
                        }}
                      >
                        {ICON_MAP[item.slug]}
                      </span>
                      <span style={{ flex: 1, lineHeight: 1.5 }}>{item.title}</span>
                    </Link>
                  );
                })}
              </Flex>
              )}
            </div>
          );
        })}
        </nav>
      </>
    );
  }

  return (
    <>
      <Layout
        style={{
          minHeight: '100vh',
          paddingTop: NAVBAR_HEIGHT,
          background: token.colorBgContainer,
        }}
      >
        <Sider
          width={268}
          trigger={null}
          style={{
            background: token.colorBgContainer,
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            position: 'sticky',
            top: NAVBAR_HEIGHT,
            height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
          breakpoint="lg"
          collapsedWidth={0}
          onBreakpoint={(broken) => {
            setIsMobile(broken);
            if (!broken) setDrawerOpen(false);
          }}
        >
          {/* eslint-disable-next-line react-hooks/static-components -- SidebarNav uses parent state */}
          <SidebarNav />
        </Sider>

        <Content style={{ display: 'flex', alignItems: 'flex-start', minWidth: 0 }}>
          {isMobile && (
            <div
              style={{
                position: 'sticky',
                top: NAVBAR_HEIGHT,
                zIndex: 10,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 16px',
                background: token.colorBgContainer,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                minHeight: 44,
              }}
            >
              <button
                aria-label="Open docs navigation"
                onClick={() => setDrawerOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: token.colorFillTertiary,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: token.borderRadiusSM,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  fontSize: token.fontSizeSM,
                  color: token.colorText,
                  fontWeight: token.fontWeightStrong,
                }}
              >
                <MenuOutlined style={{ fontSize: token.fontSizeSM }} />
                Menu
              </button>
              <button
                aria-label="Search documentation"
                onClick={() => window.dispatchEvent(new CustomEvent('open-docs-search'))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: token.colorFillTertiary,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: token.borderRadiusSM,
                  padding: '5px 10px',
                  cursor: 'pointer',
                  color: token.colorText,
                }}
              >
                <SearchOutlined style={{ fontSize: token.fontSizeSM }} />
              </button>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {DOCS_CONFIG.flatMap(s => s.items).find(i => i.slug === activeKey)?.title ?? 'Docs'}
              </Text>
            </div>
          )}

          <Flex align="flex-start" style={{ width: '100%', minWidth: 0 }}>
            <div
              data-docs-content
              style={{
                flex: '1 1 0',
                minWidth: 0,
                padding: `${token.paddingXL * 1.5}px clamp(20px, 4vw, 56px) 80px`,
              }}
            >
              {children}
            </div>
            <DocToc />
          </Flex>
        </Content>
      </Layout>

      {isMobile && drawerOpen && (
        <div
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 299,
            background: 'rgba(0,0,0,0.38)',
          }}
        />
      )}
      {isMobile && (
        <div
          role="dialog"
          aria-label="Documentation navigation"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 300,
            width: 268,
            background: token.colorBgContainer,
            boxShadow: '4px 0 28px rgba(0,0,0,0.12)',
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '14px 20px',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              flexShrink: 0,
            }}
          >
            <button
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                color: token.colorTextSecondary,
                fontSize: token.fontSizeLG,
                borderRadius: token.borderRadiusSM,
              }}
            >
              <CloseOutlined />
            </button>
          </div>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* eslint-disable-next-line react-hooks/static-components -- SidebarNav uses parent state */}
              <SidebarNav />
            </div>
        </div>
      )}
      <DocsSearchModal />
    </>
  );
}
