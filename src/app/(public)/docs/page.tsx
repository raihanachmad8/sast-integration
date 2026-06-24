'use client';

import { Typography, Card, Flex, theme } from 'antd';
import Link from 'next/link';
import {
  RocketOutlined,
  ApartmentOutlined,
  ScanOutlined,
  RobotOutlined,
  ApiOutlined,
  BookOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { DOCS_CONFIG } from '@/lib/docs/config';

const { Title, Text } = Typography;

const ICONS: Record<string, typeof BookOutlined> = {
  overview:          BookOutlined,
  'getting-started': RocketOutlined,
  architecture:      ApartmentOutlined,
  scanning:          ScanOutlined,
  'ai-verification': RobotOutlined,
  'api-reference':   ApiOutlined,
};

/**
 * DocsIndexPage — docs hub with a simple hero header and card list
 * linking to each documentation section.
 */
export default function DocsIndexPage() {
  const { token } = theme.useToken();

  return (
    <div>
      {/* Hero header */}
      <div style={{ marginBottom: token.marginXXL }}>
        <Title
          level={1}
          style={{ margin: `0 0 ${token.paddingXS}px`, fontWeight: token.fontWeightStrong, letterSpacing: '-0.02em' }}
        >
          Documentation
        </Title>
        <Text type="secondary" style={{ fontSize: token.fontSizeLG, lineHeight: token.lineHeightLG }}>
          Learn how to deploy, configure, and use the SAST Integration platform.
        </Text>
      </div>

      {/* Sections */}
      {DOCS_CONFIG.map((section) => (
        <div key={section.label} style={{ marginBottom: token.marginXXL }}>
          <Text
            strong
            style={{
              display: 'block',
              fontSize: token.fontSizeSM,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: token.colorTextQuaternary,
              marginBottom: token.marginLG,
            }}
          >
            {section.label}
          </Text>
          <Flex vertical gap={token.marginSM}>
            {section.items.map((item) => {
              const Icon = ICONS[item.slug];
              return (
                <Link key={item.slug} href={`/docs/${item.slug}`} style={{ textDecoration: 'none' }}>
                  <Card
                    hoverable
                    style={{ borderColor: token.colorBorderSecondary, borderRadius: token.borderRadiusLG }}
                    styles={{ body: { padding: `${token.paddingLG}px ${token.paddingXL}px` } }}
                  >
                    <Flex align="center" justify="space-between">
                      <Flex align="center" gap={token.marginLG}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: token.borderRadiusLG,
                            background: token.colorPrimaryBg,
                            color: token.colorPrimary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: token.fontSizeXL,
                          }}
                        >
                          <Icon />
                        </div>
                        <Flex vertical gap={token.paddingXXS}>
                          <Text strong style={{ fontSize: token.fontSizeLG, color: token.colorText }}>
                            {item.title}
                          </Text>
                          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                            {item.description}
                          </Text>
                        </Flex>
                      </Flex>
                      <ArrowRightOutlined style={{ color: token.colorTextQuaternary, fontSize: token.fontSizeSM }} />
                    </Flex>
                  </Card>
                </Link>
              );
            })}
          </Flex>
        </div>
      ))}
    </div>
  );
}
