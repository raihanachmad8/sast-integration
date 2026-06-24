'use client';

import { Button, Typography, Flex, Space, theme } from 'antd';
import Link from 'next/link';
import { ArrowRightOutlined, GithubOutlined, CheckCircleFilled } from '@ant-design/icons';
import { ROUTES } from '@/commons/constants';
import { LANDING_COLORS, GITHUB_REPO_URL } from '@/commons/constants/landing';
import { LANDING_TOKENS } from '@/commons/constants/landing-tokens';

const { Title, Paragraph, Text } = Typography;

const CTA_HIGHLIGHTS = [
  'Deploy in minutes with Docker Compose',
  'No vendor lock-in — fully self-hosted',
  '100% open source under MIT license',
] as const;

/**
 * LandingCTA — full-width gradient call-to-action section.
 *
 * Uses the primary teal gradient with dot-grid texture overlay
 * and ambient glow orbs for visual depth.
 * Renders two action buttons and three trust highlights below.
 */
export function LandingCTA() {
  const { token } = theme.useToken();

  return (
    <section
      style={{
        padding: 'clamp(90px, 14vw, 130px) clamp(24px, 5vw, 64px)',
        textAlign: 'center',
        background: `linear-gradient(
          135deg,
          #042721 0%,
          #064e40 25%,
          ${token.colorPrimary} 55%,
          ${token.colorPrimaryHover} 80%,
          #0e8a7d 100%
        )`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative dot overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.055,
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          pointerEvents: 'none',
        }}
      />

      {/* Ambient glow orbs */}
      <div
        className="lp-pulse"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-30%',
          right: '-10%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(94,234,212,0.15) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="lp-pulse"
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 65%)',
          pointerEvents: 'none',
          animationDelay: '2s',
        }}
      />

      <Flex
        vertical
        align="center"
        style={{ maxWidth: 620, margin: '0 auto', position: 'relative' }}
      >
        {/* Headline */}
        <Title
          level={2}
          style={{
            margin: 0,
            color: LANDING_TOKENS.bg.white,
            fontSize: 'clamp(30px, 5vw, 48px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.12,
          }}
        >
          Ready to secure your codebase?
        </Title>

        {/* Body copy */}
        <Paragraph
          style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            color: LANDING_COLORS.white.text,
            margin: `${token.marginMD}px 0 ${token.marginXL}px`,
            lineHeight: 1.7,
          }}
        >
          Deploy SAST Integration in minutes with a single{' '}
          <code
            style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 5,
              padding: '2px 8px',
              fontFamily: 'monospace',
              fontSize: '0.9em',
            }}
          >
            docker-compose up
          </code>
          .{' '}
          Self-hosted, open source, and purpose-built for security-first development teams.
        </Paragraph>

        {/* Action buttons */}
        <Space size={12} wrap>
          <Link href={ROUTES.AUTH.SIGNUP}>
            <Button
              size="large"
              icon={<ArrowRightOutlined />}
              style={{
                background: LANDING_TOKENS.bg.white,
                color: token.colorPrimary,
                border: 'none',
                fontWeight: 700,
                height: 52,
                paddingInline: 32,
                fontSize: 15,
                borderRadius: 10,
                boxShadow: '0 4px 20px rgba(255,255,255,0.2)',
              }}
            >
              Get Started Free
            </Button>
          </Link>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="large"
              icon={<GithubOutlined />}
              ghost
              style={{
                height: 52,
                paddingInline: 28,
                fontSize: 15,
                borderRadius: 10,
                borderColor: LANDING_COLORS.white.muted,
                color: LANDING_TOKENS.bg.white,
                fontWeight: 500,
              }}
            >
              View on GitHub
            </Button>
          </a>
        </Space>

        {/* Trust highlights */}
        <Flex
          wrap="wrap"
          gap={20}
          justify="center"
          style={{ marginTop: token.marginXL }}
        >
          {CTA_HIGHLIGHTS.map((item) => (
            <Flex key={item} align="center" gap={7}>
              <CheckCircleFilled
                style={{ color: 'rgba(94,234,212,0.85)', fontSize: 14 }}
              />
              <Text
                style={{
                  color: LANDING_COLORS.white.text,
                  fontSize: 13.5,
                  fontWeight: 500,
                }}
              >
                {item}
              </Text>
            </Flex>
          ))}
        </Flex>
      </Flex>
    </section>
  );
}
