'use client';

import { Button, Typography, Flex, theme } from 'antd';
import Link from 'next/link';
import { ArrowRightOutlined, BookOutlined, CheckCircleFilled } from '@ant-design/icons';
import { ROUTES } from '@/commons/constants';

const { Title, Paragraph, Text } = Typography;

const TRUST_ITEMS = [
  'No credit card required',
  'Self-hostable via Docker',
  'MIT licensed',
] as const;

/**
 * LandingCTA — full-width teal gradient call-to-action section.
 *
 * Accurately describes the platform's deployment model and license.
 * Horizontal padding clamped for safe mobile rendering.
 */
export function LandingCTA() {
  const { token } = theme.useToken();

  return (
    <section
      style={{
        padding: 'clamp(72px, 12vw, 112px) clamp(16px, 4vw, 40px)',
        textAlign: 'center',
        background: `linear-gradient(135deg, ${token.colorPrimary} 0%, #115e59 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative orb — top right */}
      <div
        className="lp-pulse"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-40%',
          right: '-8%',
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          pointerEvents: 'none',
        }}
      />

      {/* Decorative orb — bottom left */}
      <div
        className="lp-pulse"
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-28%',
          left: '-6%',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          pointerEvents: 'none',
          animationDelay: '3s',
        }}
      />

      <Flex
        vertical
        align="center"
        style={{ maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 1 }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 16px',
            borderRadius: 50,
            fontSize: 12,
            fontWeight: 600,
            background: 'rgba(255,255,255,0.14)',
            color: 'rgba(255,255,255,0.95)',
            border: '1.5px solid rgba(255,255,255,0.22)',
            marginBottom: 24,
          }}
        >
          🛡️ Start securing your C/C++ codebase today
        </div>

        {/* Headline */}
        <Title
          level={2}
          style={{
            margin: 0,
            color: 'white',
            fontSize: 'clamp(24px, 4vw, 46px)',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            lineHeight: 1.12,
          }}
        >
          Ready to Eliminate False Positives?
        </Title>

        {/* Body */}
        <Paragraph
          style={{
            fontSize: 'clamp(14px, 1.8vw, 18px)',
            color: 'rgba(255, 255, 255, 0.85)',
            margin: '18px 0 36px',
            lineHeight: 1.75,
          }}
        >
          Deploy SAST Integration in minutes with Docker. Connect your GitHub, GitLab,
          or Gitea repositories and get AI-verified scan results on your first commit.
        </Paragraph>

        {/* Action buttons */}
        <Flex gap={12} wrap justify="center">
          <Link href={ROUTES.AUTH.SIGNUP}>
            <Button
              size="large"
              icon={<ArrowRightOutlined />}
              style={{
                background: 'white',
                color: token.colorPrimary,
                border: 'none',
                fontWeight: 700,
                height: 50,
                paddingInline: 32,
                fontSize: 15,
                borderRadius: 10,
                boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
              }}
            >
              Get Started Free
            </Button>
          </Link>
          <Link href={ROUTES.DOCS.INDEX}>
            <Button
              size="large"
              icon={<BookOutlined />}
              ghost
              style={{
                fontWeight: 600,
                height: 50,
                paddingInline: 28,
                fontSize: 15,
                borderRadius: 10,
                borderColor: 'rgba(255,255,255,0.45)',
                color: 'white',
              }}
            >
              Read the Docs
            </Button>
          </Link>
        </Flex>

        {/* Trust indicators */}
        <Flex gap={24} wrap justify="center" style={{ marginTop: 28 }}>
          {TRUST_ITEMS.map((item) => (
            <Flex key={item} align="center" gap={6}>
              <CheckCircleFilled style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }} />
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                {item}
              </Text>
            </Flex>
          ))}
        </Flex>
      </Flex>
    </section>
  );
}
