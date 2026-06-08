'use client';

import {
  Typography,
  Row,
  Col,
  Flex,
  theme,
} from 'antd';

const { Text } = Typography;

export function LandingTrust() {
  const { token } = theme.useToken();

  return (
    <section
      style={{
        padding: `clamp(48px, 6vw, 72px) clamp(24px, 5vw, 64px)`,
        background: token.colorBgLayout,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex vertical align="center" gap={token.marginLG}>
        <Text
          type="secondary"
          style={{
            fontSize: token.fontSizeSM,
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Built with industry-standard technology
        </Text>
        <Row gutter={[40, 24]} justify="center" align="middle">
          {[
            'PostgreSQL',
            'Docker',
            'Next.js',
            'TypeScript',
            'Ant Design',
          ].map((name) => (
            <Col key={name}>
              <Text
                strong
                style={{
                  fontSize: token.fontSizeLG,
                  color: token.colorTextTertiary,
                  letterSpacing: '-0.01em',
                }}
              >
                {name}
              </Text>
            </Col>
          ))}
        </Row>
      </Flex>
    </section>
  );
}
