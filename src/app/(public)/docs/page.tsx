'use client';

import { Typography, Row, Col, Flex, theme } from 'antd';
import Link from 'next/link';
import {
  RocketOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BookOutlined,
  ApiOutlined,
  SettingOutlined,
  SafetyOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { DOCS_CONFIG } from '@/lib/docs/config';
import { SECTION_ACCENTS, DEFAULT_ACCENT, TEXT } from '@/lib/docs/tokens';

const { Title, Text } = Typography;

const SECTION_ICONS: Record<string, typeof BookOutlined> = {
  'Getting Started': RocketOutlined,
  'Architecture':    ApartmentOutlined,
  'Features':        AppstoreOutlined,
  'Guides':          BookOutlined,
  'Integrations':    ApiOutlined,
  'Configuration':   SettingOutlined,
  'Security':        SafetyOutlined,
  'Reference':       FileTextOutlined,
};

const ICONS: Record<string, typeof BookOutlined> = {};
DOCS_CONFIG.forEach((section) => {
  const icon = SECTION_ICONS[section.label] ?? FileTextOutlined;
  section.items.forEach((item) => {
    ICONS[item.slug] = icon;
  });
});

function getSectionAccent(slug: string): { color: string; bg: string } {
  for (const section of DOCS_CONFIG) {
    if (section.items.some((i) => i.slug === slug)) {
      return SECTION_ACCENTS[section.label] ?? DEFAULT_ACCENT;
    }
  }
  return DEFAULT_ACCENT;
}

/**
 * DocsIndexPage — docs hub with a premium hero header and a 2-column
 * card grid linking to each documentation section.
 *
 * Cards show the section icon with a per-section accent color,
 * title, description, and an animated arrow on hover.
 */
export default function DocsIndexPage() {
  const { token } = theme.useToken();

  return (
    <div>
      {/* ── Hero header ──────────────────────────────────────── */}
      <div
        style={{
          marginBottom: token.marginXXL,
          paddingBottom: token.marginXXL,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 14px',
            borderRadius: 50,
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            background: token.colorPrimaryBg,
            border: `1.5px solid ${token.colorPrimaryBorder}`,
            color: token.colorPrimary,
            marginBottom: 20,
          }}
        >
          <BookOutlined style={{ fontSize: 11 }} />
          Documentation
        </div>
        <Title
          level={1}
          style={{
            margin: `0 0 ${token.paddingSM}px`,
            fontWeight: 900,
            letterSpacing: '-0.03em',
            fontSize: 40,
            color: '#0f172a',
            lineHeight: 1.15,
          }}
        >
          SAST Integration Docs
        </Title>
        <Text
          style={{
            fontSize: 18,
            lineHeight: 1.75,
            color: TEXT.body,
            maxWidth: 560,
            display: 'block',
          }}
        >
          Learn how to deploy, configure, and use the SAST Integration platform.
          From quick start to advanced security configuration.
        </Text>
      </div>

      {/* ── Section groups ───────────────────────────────────── */}
      {DOCS_CONFIG.map((section) => (
        <div key={section.label} style={{ marginBottom: token.marginXXL }}>
          {/* Section label */}
          <Flex align="center" gap={10} style={{ marginBottom: token.marginLG }}>
            {(() => {
              const accent = SECTION_ACCENTS[section.label] ?? DEFAULT_ACCENT;
              const Icon = SECTION_ICONS[section.label] ?? FileTextOutlined;
              return (
                <>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      background: accent.bg,
                      color: accent.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      border: `1px solid ${accent.color}25`,
                    }}
                  >
                    <Icon />
                  </div>
                  <Text
                    strong
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: accent.color,
                    }}
                  >
                    {section.label}
                  </Text>
                </>
              );
            })()}
          </Flex>

          {/* Cards grid — 2 columns on medium+ */}
          <Row gutter={[12, 12]}>
            {section.items.map((item) => {
              const Icon   = ICONS[item.slug];
              const accent = getSectionAccent(item.slug);
              return (
                <Col key={item.slug} xs={24} md={12}>
                  <Link href={`/docs/${item.slug}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                    <div
                      className="lp-card-hover"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: token.marginMD,
                        padding: `${token.paddingLG}px ${token.paddingLG}px`,
                        borderRadius: 12,
                        border: `1.5px solid ${token.colorBorderSecondary}`,
                        background: 'white',
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'border-color 0.25s ease',
                      }}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: accent.bg,
                          color: accent.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: 18,
                          border: `1px solid ${accent.color}20`,
                        }}
                      >
                        <Icon />
                      </div>

                      {/* Text */}
                      <Flex vertical gap={3} style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          strong
                          style={{ fontSize: 15, color: '#0f172a', lineHeight: 1.4 }}
                          ellipsis
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}
                          ellipsis={{ tooltip: item.description }}
                        >
                          {item.description}
                        </Text>
                      </Flex>

                      {/* Arrow */}
                      <ArrowRightOutlined
                        style={{
                          color: token.colorTextQuaternary,
                          fontSize: 13,
                          flexShrink: 0,
                          transition: 'color 0.2s ease, transform 0.2s ease',
                        }}
                      />
                    </div>
                  </Link>
                </Col>
              );
            })}
          </Row>
        </div>
      ))}
    </div>
  );
}
