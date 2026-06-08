'use client';

import { Button, Layout, theme } from 'antd';
import Link from 'next/link';
import { ROUTES } from '@/commons/constants';

/**
 * Public navbar displayed on unauthenticated pages (docs, landing page).
 *
 * Renders a minimal header with the SAST brand and a login button.
 * Uses Ant Design `Layout.Header` with `theme.useToken()` for styling.
 *
 * @example
 * ```tsx
 * // Used in (public)/layout.tsx
 * <Layout>
 *   <PublicNavbar />
 *   <Content>{children}</Content>
 * </Layout>
 * ```
 */
export function PublicNavbar() {
  const { token } = theme.useToken();
  return (
    <Layout.Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: token.colorBgContainer, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
      <span style={{ color: token.colorText, fontWeight: 800, fontSize: 18 }}>SAST</span>
      <Link href={ROUTES.AUTH.SIGNIN}><Button type="primary">Login</Button></Link>
    </Layout.Header>
  );
}
