'use client';

import { Row, Col, theme } from 'antd';
import { usePathname } from 'next/navigation';

import { LoadingState } from '@/commons/components/LoadingState';
import { ROUTES } from '@/commons/constants';
import { AuthHero } from '@/features/auth';
import { getAccessToken, getCachedWorkspace } from '@/lib/api/client';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { token: themeToken } = theme.useToken();
  const isInvitePage = pathname === '/auth/invite' || pathname.startsWith('/auth/invite/');

  if (typeof window !== 'undefined' && !isInvitePage) {
    const token = getAccessToken();
    const cached = getCachedWorkspace();

    if (token && cached?.slug) {
      window.location.assign(ROUTES.WORKSPACE.DASHBOARD(cached.slug));
      return <LoadingState text="Redirecting..." fullHeight />;
    }

    if (token && !cached?.slug) {
      fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(d => {
        const slug = d.data?.workspace?.slug;
        if (slug) window.location.assign(ROUTES.WORKSPACE.DASHBOARD(slug));
        else window.location.assign(ROUTES.CHOOSER);
      }).catch(() => {});
    }
  }

  return (
    <Row style={{ minHeight: '100vh' }}>
      <Col xs={0} sm={0} md={12} lg={12} xl={12}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <AuthHero />
        </div>
      </Col>
      <Col
        xs={24}
        sm={24}
        md={12}
        lg={12}
        xl={12}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${themeToken.paddingXL}px ${themeToken.paddingXL * 1.5}px`,
          background: themeToken.colorBgLayout,
        }}
      >
        <div style={{ width: '100%', maxWidth: themeToken.sizeXXL * 9.17 }}>
          {children}
        </div>
      </Col>
    </Row>
  );
}

