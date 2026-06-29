'use client';

import { Typography, Row, Col, Flex, Tag, theme } from 'antd';

const { Title, Text } = Typography;

/** Tech stack item with consistent visual treatment. */
interface TechBadgeProps {
  name: string;
  icon: string;
  role: string;
  accentColor: string;
  bgColor: string;
}

function TechBadge({ name, icon, role, accentColor, bgColor }: TechBadgeProps) {
  const { token } = theme.useToken();

  return (
    <div
      className="lp-card-hover"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: token.marginSM,
        padding: `${token.paddingSM}px ${token.paddingSM}px`,
        borderRadius: token.borderRadiusSM,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        cursor: 'default',
        width: '100%',
      }}
    >
      <div
        style={{
          width: token.sizeXL,
          height: token.sizeXL,
          borderRadius: token.borderRadiusSM,
          background: bgColor,
          color: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <Text strong style={{ fontSize: 14, display: 'block', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
          {name}
        </Text>
        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.3 }}>
          {role}
        </Text>
      </div>
    </div>
  );
}

const SCANNERS: TechBadgeProps[] = [
  { name: 'Semgrep',      icon: '⚙️', role: 'Pattern-based SAST',    accentColor: '#0ea5e9', bgColor: '#f0f9ff' },
  { name: 'Gitleaks',     icon: '🔑', role: 'Secret detection',       accentColor: '#f59e0b', bgColor: '#fffbeb' },
  { name: 'Flawfinder',   icon: '🔍', role: 'C/C++ vulnerability scan', accentColor: '#7c3aed', bgColor: '#f5f3ff' },
  { name: 'Cppcheck',     icon: '🛡️', role: 'C/C++ static analysis',  accentColor: '#0f766e', bgColor: '#f0fdfa' },
  { name: 'Clang-Tidy',   icon: '📋', role: 'C/C++ code quality',     accentColor: '#ea580c', bgColor: '#fff7ed' },
  { name: 'GCC Fanalyzer', icon: '📊', role: 'C/C++ static analyzer',  accentColor: '#6366f1', bgColor: '#eef2ff' },
];

const CORE_STACK: TechBadgeProps[] = [
  { name: 'Next.js',      icon: '▲', role: 'React framework',          accentColor: '#111827', bgColor: '#f9fafb' },
  { name: 'TypeScript',   icon: '⬛', role: 'Type-safe codebase',       accentColor: '#3178c6', bgColor: '#eff6ff' },
  { name: 'PostgreSQL',   icon: '🐘', role: 'Primary database',          accentColor: '#336791', bgColor: '#f0f4f8' },
  { name: 'Docker',       icon: '🐳', role: 'Container orchestration',   accentColor: '#2496ed', bgColor: '#eff8ff' },
  { name: 'Ant Design',   icon: '🐜', role: 'UI component library',      accentColor: '#1677ff', bgColor: '#f0f5ff' },
  { name: 'Drizzle ORM',  icon: '💧', role: 'Type-safe query builder',   accentColor: '#6366f1', bgColor: '#f5f3ff' },
];

/**
 * LandingTrust — dual-row tech-stack section showing scanner
 * engines and core infrastructure technologies as branded badge cards.
 */
export function LandingTrust() {
  const { token } = theme.useToken();

  return (
    <section
      style={{
        padding: 'clamp(72px, 10vw, 100px) clamp(16px, 4vw, 64px)',
        background: token.colorBgLayout,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Flex vertical align="center" style={{ marginBottom: token.marginXXL }}>
          <Tag
            style={{
              borderRadius: 100,
              marginBottom: token.marginSM,
              padding: '3px 14px',
              fontSize: 12,
              fontWeight: token.fontWeightStrong,
              letterSpacing: '0.04em',
              border: `1px solid ${token.colorPrimaryBorder}`,
              color: token.colorPrimary,
              background: token.colorPrimaryBg,
            }}
          >
            TECH STACK
          </Tag>
          <Title
            level={2}
            style={{
              margin: 0,
              textAlign: 'center',
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
            }}
          >
            Built on proven, battle-tested technology
          </Title>
          <Text
            type="secondary"
            style={{
              maxWidth: 460,
              textAlign: 'center',
              fontSize: token.fontSizeLG,
              marginTop: token.marginXS,
              lineHeight: 1.65,
            }}
          >
            Every component chosen for reliability, performance, and
            open-source transparency.
          </Text>
        </Flex>

        {/* Scanner engines */}
        <div style={{ marginBottom: token.marginXXL }}>
          <Text
            type="secondary"
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'block',
              textAlign: 'center',
              marginBottom: token.marginLG,
            }}
          >
            Scanner Engines
          </Text>
          <Row gutter={[16, 16]} justify="center">
            {SCANNERS.map((t) => (
              <Col key={t.name} xs={24} sm={12} md={6}>
                <TechBadge {...t} />
              </Col>
            ))}
          </Row>
        </div>

        {/* Core infrastructure */}
        <div>
          <Text
            type="secondary"
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'block',
              textAlign: 'center',
              marginBottom: token.marginLG,
            }}
          >
            Core Infrastructure
          </Text>
          <Row gutter={[16, 16]} justify="center">
            {CORE_STACK.map((t) => (
              <Col key={t.name} xs={12} sm={8} md={4}>
                <TechBadge {...t} />
              </Col>
            ))}
          </Row>
        </div>
      </div>
    </section>
  );
}
