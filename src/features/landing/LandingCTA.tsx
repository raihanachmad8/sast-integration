'use client';

import {
  Button,
  Typography,
  Flex,
  Space,
  theme,
} from 'antd';
import Link from 'next/link';
import { ArrowRightOutlined } from '@ant-design/icons';
import { ROUTES } from '@/commons/constants';
import { LANDING_COLORS } from '@/commons/constants/landing';

const { Title, Paragraph } = Typography;

export function LandingCTA() {
  const { token } = theme.useToken();

  return (
    <section
      style={{
        padding: 'clamp(80px, 12vw, 120px) clamp(24px, 5vw, 64px)',
        textAlign: 'center',
        background: `linear-gradient(
          135deg,
          ${token.colorPrimaryActive} 0%,
          ${token.colorPrimary} 50%,
          ${token.colorPrimaryHover} 100%
        )`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative dot overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          backgroundImage:
            'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}
      />

      <Flex
        vertical
        align="center"
        style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}
      >
        <Title level={2} style={{ margin: 0, color: token.colorTextLightSolid }}>
          Ready to secure your codebase?
        </Title>
        <Paragraph
          style={{
            fontSize: token.fontSizeLG,
            color: LANDING_COLORS.white.text,
            margin: `${token.marginSM}px 0 ${token.marginLG}`,
            lineHeight: token.lineHeightLG,
          }}
        >
          Deploy in minutes with Docker. Self-hosted, open source, and purpose-built
          for security-first teams.
        </Paragraph>
        <Space size={token.marginSM}>
          <Link href={ROUTES.AUTH.SIGNUP}>
            <Button
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
              }}
            >
              Get Started Free
            </Button>
          </Link>
          <Link href={ROUTES.AUTH.SIGNIN}>
            <Button
              size="large"
              ghost
              style={{
                height: 48,
                paddingInline: 28,
                fontSize: 15,
                borderColor: LANDING_COLORS.white.muted,
                color: token.colorTextLightSolid,
              }}
            >
              Sign In
            </Button>
          </Link>
        </Space>
      </Flex>
    </section>
  );
}
