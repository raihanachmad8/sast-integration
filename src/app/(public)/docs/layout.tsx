'use client';

import { useState, useEffect } from 'react';
import { Layout, Typography, Flex, theme } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOutlined,
  RocketOutlined,
  ApartmentOutlined,
  ScanOutlined,
  RobotOutlined,
  ApiOutlined,
  SearchOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { DOCS_CONFIG } from '@/lib/docs/config';
import { DocToc } from './doc-toc';

const { Sider, Content } = Layout;
const { Text } = Typography;

const NAVBAR_HEIGHT = 60;

const ICON_MAP: Record<string, React.ReactNode> = {
  overview:          <BookOutlined />,
  'getting-started': <RocketOutlined />,
  architecture:      <ApartmentOutlined />,
  scanning:          <ScanOutlined />,
  'ai-verification': <RobotOutlined />,
  'api-reference':   <ApiOutlined />,
};

function getActiveKey(pathname: string): string {
  if (pathname === '/docs') return 'overview';
  const segment = pathname.split('/docs/')[1]?.split('/')[0];
  return segment || 'overview';
}

/**
 * DocsLayout — simple sidebar + full-width content shell.
 *
 * Desktop: persistent 272 px sidebar, content fills remaining width.
 * Mobile: sidebar collapses to 0; a sticky bar with a menu button
 * opens a slide-in drawer. Content is always full width.
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const { token } = theme.useToken();
  const pathname    = usePathname();
  const activeKey   = getActiveKey(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);

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

  /** Shared sidebar nav rendered both in the desktop Sider and the mobile drawer. */
  function SidebarNav() {
    return (
      <>
        {/* Search stub */}
        <div style={{ padding: `${token.paddingLG}px ${token.paddingLG}px ${token.paddingSM}px` }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: token.paddingXS,
              padding: `${token.paddingSM}px`,
              background: token.colorFillQuaternary,
              borderRadius: token.borderRadiusLG,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <SearchOutlined style={{ color: token.colorTextQuaternary, fontSize: token.fontSizeSM }} />
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Search docs…</Text>
          </div>
        </div>

        {/* Nav sections */}
        <nav style={{ padding: `0 ${token.paddingSM}px ${token.paddingXL}px`, overflowY: 'auto', flex: 1 }}>
          {DOCS_CONFIG.map((section) => (
            <div key={section.label} style={{ marginBottom: token.marginLG }}>
              <Text
                strong
                style={{
                  display: 'block',
                  fontSize: token.fontSizeSM - 1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: token.colorTextQuaternary,
                  padding: `0 ${token.paddingXS}px`,
                  marginBottom: token.paddingXS,
                }}
              >
                {section.label}
              </Text>
              <Flex vertical gap={token.paddingXXS}>
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
                        padding: `${token.paddingXS}px ${token.paddingXS}px`,
                        borderRadius: token.borderRadiusSM,
                        textDecoration: 'none',
                        fontSize: token.fontSize,
                        fontWeight: isActive ? token.fontWeightStrong : 'normal',
                        color: isActive ? token.colorPrimary : token.colorText,
                        background: isActive ? token.colorPrimaryBg : 'transparent',
                        transition: `background ${token.motionDurationMid} ease, color ${token.motionDurationMid} ease`,
                      }}
                    >
                      <span style={{ fontSize: token.fontSizeLG, opacity: isActive ? 1 : 0.5, flexShrink: 0 }}>
                        {ICON_MAP[item.slug]}
                      </span>
                      {item.title}
                    </Link>
                  );
                })}
              </Flex>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: `${token.paddingSM}px ${token.paddingLG}px`,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            flexShrink: 0,
          }}
        >
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            SAST Integration v0.4.0
          </Text>
        </div>
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
        {/* Desktop sidebar */}
        <Sider
          width={272}
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
          {/* eslint-disable-next-line react-hooks/static-components -- shared nav needs parent scope */}
          <SidebarNav />
        </Sider>

        <Content style={{ display: 'flex', alignItems: 'flex-start', minWidth: 0 }}>
          {/* Mobile sticky breadcrumb bar */}
          {isMobile && (
            <div
              style={{
                position: 'sticky',
                top: NAVBAR_HEIGHT,
                zIndex: 10,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                background: token.colorBgContainer,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <button
                aria-label="Open docs navigation"
                onClick={() => setDrawerOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: token.colorFillQuaternary,
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
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {DOCS_CONFIG.flatMap(s => s.items).find(i => i.slug === activeKey)?.title ?? 'Docs'}
              </Text>
            </div>
          )}

          {/* Article + ToC */}
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

      {/* Mobile drawer */}
      {isMobile && (
        <>
          {drawerOpen && (
            <div
              aria-hidden="true"
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 299,
                background: 'rgba(0,0,0,0.40)',
              }}
            />
          )}
          <div
            role="dialog"
            aria-label="Documentation navigation"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              zIndex: 300,
              width: 272,
              background: token.colorBgContainer,
              boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
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
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                flexShrink: 0,
              }}
            >
              <Text strong style={{ fontSize: token.fontSize }}>Documentation</Text>
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
              {/* eslint-disable-next-line react-hooks/static-components -- shared nav needs parent scope */}
              <SidebarNav />
            </div>
          </div>
        </>
      )}
    </>
  );
}
