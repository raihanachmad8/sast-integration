'use client';

import {
  Button,
  Typography,
  Row,
  Col,
  Flex,
  Space,
  theme,
} from 'antd';
import Link from 'next/link';
import {
  SecurityScanOutlined,
  RobotOutlined,
  FileTextOutlined,
  GithubOutlined,
  StarFilled,
  ThunderboltOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { ROUTES } from '@/commons/constants';
import { LANDING_COLORS } from '@/commons/constants/landing';

const { Title, Text, Paragraph } = Typography;

export function LandingHero() {
  const { token } = theme.useToken();

  return (
    <>
      {/* ═══════════════ HERO ═══════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: 'clamp(100px, 14vw, 160px) clamp(24px, 5vw, 64px) clamp(80px, 10vw, 120px)',
          background: `linear-gradient(
            170deg,
            ${token.colorPrimaryActive} 0%,
            ${token.colorPrimary} 35%,
            ${token.colorPrimaryHover} 65%,
            ${token.colorBgLayout} 100%
          )`,
        }}
      >
        {/* Decorative glow orbs */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background:
              `radial-gradient(circle, ${LANDING_COLORS.teal.bg} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-30%',
            left: '-5%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background:
              `radial-gradient(circle, ${LANDING_COLORS.purple.bg} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
          }}
        />

        <Flex
          vertical
          align="center"
          style={{
            maxWidth: 760,
            margin: '0 auto',
            position: 'relative',
          }}
        >
          {/* Pill badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 16px',
              borderRadius: 100,
              fontSize: token.fontSizeSM,
              fontWeight: 500,
              background: LANDING_COLORS.white.overlay,
              color: token.colorTextLightSolid,
              border: '1px solid rgba(255,255,255,0.2)',
              marginBottom: token.marginXL,
              backdropFilter: 'blur(8px)',
            }}
          >
            <ThunderboltOutlined />
            v0.4.0 &mdash; Open Source SAST Platform
          </div>

          {/* Headline */}
          <Title
            level={1}
            style={{
              margin: 0,
              fontSize: 'clamp(38px, 6.5vw, 68px)',
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              textAlign: 'center',
              color: token.colorTextLightSolid,
            }}
          >
            Ship Code That&apos;s{' '}
            <span
              style={{
                background: LANDING_COLORS.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Actually Secure
            </span>
          </Title>

          <Paragraph
            style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              color: LANDING_COLORS.white.text,
              maxWidth: 540,
              margin: `${token.marginMD}px 0 0`,
              lineHeight: token.lineHeightLG,
              textAlign: 'center',
            }}
          >
            Run multiple SAST scanners, verify every finding with AI, and manage
            results across your team — all in one open-source platform.
          </Paragraph>

          <Space size={token.marginSM} wrap style={{ marginTop: token.marginXL }}>
            <Link href={ROUTES.AUTH.SIGNUP}>
              <Button
                type="default"
                size="large"
                icon={<ArrowRightOutlined />}
                style={{
                  background: token.colorBgContainer,
                  color: token.colorPrimary,
                  border: 'none',
                  fontWeight: 600,
                  height: 48,
                  paddingInline: 28,
                  fontSize: 15,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                }}
              >
                Get Started Free
              </Button>
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="large"
                icon={<GithubOutlined />}
                ghost
                style={{
                  height: 48,
                  paddingInline: 28,
                  fontSize: 15,
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: token.colorTextLightSolid,
                }}
              >
                View on GitHub
              </Button>
            </a>
          </Space>

          {/* Trust bar */}
          <Flex
            align="center"
            gap={token.marginXS}
            style={{ marginTop: token.marginXXL, opacity: 0.5 }}
          >
            <StarFilled style={{ color: LANDING_COLORS.star, fontSize: 14 }} />
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: token.fontSizeSM }}>
              Trusted by security teams in development organizations
            </Text>
          </Flex>
        </Flex>
      </section>

      {/* ═══════════════ STATS BAR ════════════════════════════ */}
      <section
        style={{
          padding: `${token.paddingXL}px clamp(24px, 5vw, 64px)`,
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Row
          justify="center"
          gutter={[48, 24]}
          style={{ maxWidth: 960, margin: '0 auto' }}
        >
          {[
            { value: '41+', label: 'Database Tables', icon: <FileTextOutlined /> },
            { value: '4', label: 'Scanner Engines', icon: <SecurityScanOutlined /> },
            { value: '2', label: 'Fine-tuned AI Models', icon: <RobotOutlined /> },
            { value: '100%', label: 'Open Source', icon: <GithubOutlined /> },
          ].map((s) => (
            <Col key={s.label} xs={12} md={6} style={{ textAlign: 'center' }}>
              <Flex vertical align="center" gap={4}>
                <Text style={{ color: token.colorPrimary, fontSize: 18 }}>
                  {s.icon}
                </Text>
                <Text
                  strong
                  style={{
                    fontSize: token.fontSizeHeading2,
                    color: token.colorText,
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {s.value}
                </Text>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {s.label}
                </Text>
              </Flex>
            </Col>
          ))}
        </Row>
      </section>
    </>
  );
}
