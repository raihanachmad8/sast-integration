'use client';

import {
  Typography,
  Row,
  Col,
  Card,
  Space,
  Flex,
  Divider,
  Tag,
  theme,
} from 'antd';
import {
  SecurityScanOutlined,
  RobotOutlined,
  TeamOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const FEATURES = [
  {
    icon: <SecurityScanOutlined />,
    title: 'Multi-Engine Scanning',
    description:
      'Orchestrate Semgrep, Gitleaks, Flawfinder, and Trivy through a unified pipeline with configurable policies and Docker-isolated runners.',
    highlights: [
      'Parallel scanner execution',
      'Custom ruleset management',
      'Container-isolated runners',
    ],
  },
  {
    icon: <RobotOutlined />,
    title: 'AI-First Verification',
    description:
      'QLoRA fine-tuned LLMs independently classify every finding as true or false positive with reasoned explanations and confidence scoring.',
    highlights: [
      '90% verdict accuracy',
      'Data flow tracing',
      'CWE mapping & remediation',
    ],
  },
  {
    icon: <TeamOutlined />,
    title: 'Enterprise-Grade RBAC',
    description:
      'Multi-tenant workspaces with four role levels and 24 granular permissions. Audit logging, SSO-ready, and compliance-friendly.',
    highlights: [
      'Owner / Manager / Reviewer / Member',
      '24 granular permissions',
      'Full audit trail',
    ],
  },
];

export function LandingFeatures() {
  const { token } = theme.useToken();

  return (
    <section
      style={{
        padding: 'clamp(80px, 12vw, 120px) clamp(24px, 5vw, 64px)',
        background: token.colorBgLayout,
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
          Platform Features
        </Tag>
        <Title level={2} style={{ margin: 0, textAlign: 'center' }}>
          Everything your security team needs
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
          From multi-engine scanning to AI verification — one platform for the
          entire workflow.
        </Text>
      </Flex>

      <Row
        gutter={[token.marginLG, token.marginLG]}
        justify="center"
        style={{ maxWidth: 1100, margin: '0 auto' }}
      >
        {FEATURES.map((f) => (
          <Col key={f.title} xs={24} sm={12} md={8}>
            <Card
              hoverable
              style={{
                height: '100%',
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorBorderSecondary}`,
                transition: `all ${token.motionDurationMid} ${token.motionEaseOut}`,
              }}
              styles={{
                body: { padding: token.paddingXL * 1.5 },
              }}
            >
              <Flex vertical gap={token.marginMD}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: token.colorPrimaryBg,
                    color: token.colorPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}
                >
                  {f.icon}
                </div>
                <Title level={4} style={{ margin: 0 }}>
                  {f.title}
                </Title>
                <Text
                  type="secondary"
                  style={{ lineHeight: token.lineHeightLG }}
                >
                  {f.description}
                </Text>
                <Divider style={{ margin: `${token.marginSM}px 0` }} />
                <Space size={8} orientation="vertical">
                  {f.highlights.map((h) => (
                    <Flex key={h} align="center" gap={8}>
                      <CheckCircleFilled
                        style={{ color: token.colorSuccess, fontSize: 14 }}
                      />
                      <Text style={{ fontSize: token.fontSizeSM }}>{h}</Text>
                    </Flex>
                  ))}
                </Space>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
}
