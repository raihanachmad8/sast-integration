'use client';

import { Layout, Button, Typography, Space, theme } from 'antd';
import Link from 'next/link';
import { GithubOutlined } from '@ant-design/icons';
import { ROUTES } from '@/commons/constants';

const { Text } = Typography;

function ShieldIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { token } = theme.useToken();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Layout.Header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(24px, 5vw, 64px)',
          height: 56,
          background: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              background: token.colorBgContainer,
              color: token.colorPrimary,
            }}
          >
            <ShieldIcon />
          </div>
          <Text
            strong
            style={{
              fontSize: 15,
              color: token.colorTextLightSolid,
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            SAST Integration
          </Text>
        </Link>

        <Space size={6}>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: token.fontSize,
              textDecoration: 'none',
              borderRadius: 6,
              transition: 'color 0.2s',
            }}
          >
            <GithubOutlined />
            <Text style={{ color: 'inherit', fontSize: token.fontSize }}>GitHub</Text>
          </a>
          <Link href={ROUTES.AUTH.SIGNIN}>
            <Button
              type="default"
              size="small"
              ghost
              style={{
                borderColor: 'rgba(255,255,255,0.25)',
              color: token.colorTextLightSolid,
              }}
            >
              Sign in
            </Button>
          </Link>
        </Space>
      </Layout.Header>

      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
