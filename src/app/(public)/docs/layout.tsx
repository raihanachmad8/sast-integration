'use client';

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
} from '@ant-design/icons';
import { DOCS_CONFIG } from '@/lib/docs/config';
import { DocToc } from './doc-toc';

const { Sider, Content } = Layout;
const { Text } = Typography;

const ICON_MAP: Record<string, React.ReactNode> = {
  overview: <BookOutlined />,
  'getting-started': <RocketOutlined />,
  architecture: <ApartmentOutlined />,
  scanning: <ScanOutlined />,
  'ai-verification': <RobotOutlined />,
  'api-reference': <ApiOutlined />,
};

function getActiveKey(pathname: string): string {
  if (pathname === '/docs') return 'overview';
  const segment = pathname.split('/docs/')[1]?.split('/')[0];
  return segment || 'overview';
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const { token } = theme.useToken();
  const pathname = usePathname();
  const activeKey = getActiveKey(pathname);

  return (
    <Layout style={{ minHeight: 'calc(100vh - 56px - 65px)', background: token.colorBgContainer }}>
      <Sider
        width={272}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          overflow: 'auto',
        }}
        breakpoint="lg"
        collapsedWidth={0}
      >
        {/* Search */}
        <div style={{ padding: `${token.paddingLG}px ${token.paddingLG}px ${token.paddingSM}px` }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: token.paddingXS,
              padding: `${token.paddingSM}px ${token.paddingSM}px`,
              background: token.colorFillQuaternary,
              borderRadius: token.borderRadiusLG,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <SearchOutlined style={{ color: token.colorTextQuaternary, fontSize: token.fontSizeSM }} />
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Search docs...</Text>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: `0 ${token.paddingSM}px ${token.paddingXL}px` }}>
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
                      <span style={{ fontSize: token.fontSizeLG, opacity: isActive ? 1 : 0.5 }}>
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
          }}
        >
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            SAST Integration v0.4.0
          </Text>
        </div>
      </Sider>

      <Content style={{ flex: 1, overflow: 'auto' }}>
        <Flex align="flex-start" style={{ padding: `${token.paddingXL * 1.5}px clamp(24px, 4vw, 64px) 80px` }}>
          <div data-docs-content style={{ flex: '1 1 0', minWidth: 0 }}>
            {children}
          </div>
          <DocToc />
        </Flex>
      </Content>
    </Layout>
  );
}
