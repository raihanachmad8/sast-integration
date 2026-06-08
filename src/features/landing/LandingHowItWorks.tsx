'use client';

import {
  Typography,
  Row,
  Col,
  Flex,
  Tag,
  theme,
} from 'antd';
import {
  SecurityScanOutlined,
  RobotOutlined,
  ApiOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const ARCH_STEPS = [
  {
    icon: <ApiOutlined />,
    step: '01',
    title: 'Connect',
    desc: 'Import repositories from GitHub, GitLab, or Gitea',
  },
  {
    icon: <SecurityScanOutlined />,
    step: '02',
    title: 'Scan',
    desc: 'Run multiple engines with configurable scan policies',
  },
  {
    icon: <RobotOutlined />,
    step: '03',
    title: 'Verify',
    desc: 'AI classifies and enriches each finding with context',
  },
  {
    icon: <FileTextOutlined />,
    step: '04',
    title: 'Report',
    desc: 'Export findings with quality gates and trend analytics',
  },
];

export function LandingHowItWorks() {
  const { token } = theme.useToken();

  return (
    <section
      style={{
        padding: 'clamp(80px, 12vw, 120px) clamp(24px, 5vw, 64px)',
        background: token.colorBgContainer,
      }}
    >
      <Flex
        vertical
        align="center"
        style={{ marginBottom: token.marginXXL }}
      >
        <Tag
          color={token.colorPrimary}
          style={{ borderRadius: 100, marginBottom: token.marginSM }}
        >
          Workflow
        </Tag>
        <Title level={2} style={{ margin: 0, textAlign: 'center' }}>
          From commit to report in four steps
        </Title>
        <Text
          type="secondary"
          style={{
            maxWidth: 480,
            textAlign: 'center',
            fontSize: token.fontSizeLG,
            marginTop: token.marginXS,
          }}
        >
          A streamlined pipeline that turns code changes into actionable
          security insights.
        </Text>
      </Flex>

      <Row
        gutter={[32, 40]}
        justify="center"
        style={{ maxWidth: 1000, margin: '0 auto' }}
      >
        {ARCH_STEPS.map((step) => (
          <Col key={step.step} xs={24} sm={12} md={6}>
            <Flex vertical align="center" style={{ textAlign: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: token.colorPrimaryBg,
                  color: token.colorPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  marginBottom: token.marginMD,
                }}
              >
                {step.icon}
                {/* Step number badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: token.colorPrimary,
                    color: token.colorTextLightSolid,
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {step.step}
                </div>
              </div>
              <Title level={4} style={{ margin: 0 }}>
                {step.title}
              </Title>
              <Text
                type="secondary"
                style={{ fontSize: token.fontSize, marginTop: 4 }}
              >
                {step.desc}
              </Text>
            </Flex>
          </Col>
        ))}
      </Row>
    </section>
  );
}
