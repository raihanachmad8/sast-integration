'use client';

import { Row, Col, theme } from 'antd';
import { AuthHero } from '@/features/auth';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { token } = theme.useToken();

  return (
    <Row style={{ minHeight: '100vh' }}>
      <Col
        xs={0}
        sm={0}
        md={12}
        lg={12}
        xl={12}
      >
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
          padding: `${token.paddingXL}px ${token.paddingXL * 1.5}px`,
          background: token.colorBgLayout,
        }}
      >
        <div style={{ width: '100%', maxWidth: token.sizeXXL * 9.17 }}>
          {children}
        </div>
      </Col>
    </Row>
  );
}
