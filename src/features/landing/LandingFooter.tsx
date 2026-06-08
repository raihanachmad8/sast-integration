'use client';

import {
  Typography,
  Row,
  Col,
  Flex,
  Space,
  theme,
} from 'antd';

const { Text } = Typography;

export function LandingFooter() {
  const { token } = theme.useToken();

  return (
    <footer
      style={{
        padding: `${token.paddingXL}px clamp(24px, 5vw, 64px)`,
        background: token.colorBgContainer,
      }}
    >
      <Row
        align="middle"
        justify="space-between"
        style={{ maxWidth: 1100, margin: '0 auto' }}
        gutter={[16, 16]}
      >
        <Col>
          <Flex align="center" gap={6}>
            <Text
              strong
              style={{ fontSize: 15, letterSpacing: '-0.01em' }}
            >
              SAST Integration
            </Text>
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              &copy; {new Date().getFullYear()}
            </Text>
          </Flex>
        </Col>
        <Col>
          <Space size={token.marginLG}>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM, textDecoration: 'none' }}
            >
              GitHub
            </a>
            <a
              href="#"
              style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM, textDecoration: 'none' }}
            >
              Privacy
            </a>
            <a
              href="#"
              style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM, textDecoration: 'none' }}
            >
              Terms
            </a>
          </Space>
        </Col>
      </Row>
    </footer>
  );
}
