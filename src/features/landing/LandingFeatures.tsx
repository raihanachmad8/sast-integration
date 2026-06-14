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
  TeamOutlined,
  ApiOutlined,
  BarChartOutlined,
  SafetyCertificateOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const FEATURES = [
  {
    icon: <SecurityScanOutlined />,
    title: 'Multi-Engine Scanning',
    description:
      'Orchestrate Semgrep, Gitleaks, Flawfinder, and Trivy through a unified pipeline with configurable policies and Docker-isolated runners.',
    highlights: ['Parallel scanner execution', 'Custom ruleset management', 'Container-isolated runners'],
    accent: '#14b8a6',
    accentBg: '#f0fdfa',
  },
  {
    icon: <RobotOutlined />,
    title: 'AI-First Verification',
    description:
      'QLoRA fine-tuned LLMs independently classify every finding as true or false positive with reasoned explanations, data-flow tracing, and CWE mapping.',
    highlights: ['70%+ verdict accuracy', 'Data flow tracing', 'CWE mapping & remediation'],
    accent: '#7c3aed',
    accentBg: '#f5f3ff',
  },
  {
    icon: <TeamOutlined />,
    title: 'Enterprise-Grade RBAC',
    description:
      'Multi-tenant workspaces with four role levels and 24 granular permissions. Audit logging, SSO-ready, and compliance-friendly architecture.',
    highlights: ['Owner / Manager / Reviewer / Member', '24 granular permissions', 'Full audit trail'],
    accent: '#0ea5e9',
    accentBg: '#f0f9ff',
  },
  {
    icon: <ApiOutlined />,
    title: 'CI/CD Integration',
    description:
      'Trigger scans automatically on every push or pull request via GitHub Actions, GitLab CI, or Gitea Actions. Set quality gates to block insecure merges.',
    highlights: ['GitHub / GitLab / Gitea webhooks', 'Quality gate enforcement', 'PR status checks'],
    accent: '#f59e0b',
    accentBg: '#fffbeb',
  },
  {
    icon: <BarChartOutlined />,
    title: 'Real-time Analytics',
    description:
      'Live vulnerability trends, severity distribution charts, scanner performance metrics, and full scan history — all in a single interactive dashboard.',
    highlights: ['Severity trend charts', 'Scanner engine metrics', 'Exportable scan history'],
    accent: '#10b981',
    accentBg: '#f0fdf4',
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: 'Compliance Reports',
    description:
      'Generate audit-ready SARIF, PDF, and JSON reports with full CWE classifications, remediation guidance, and suppression history for compliance reviews.',
    highlights: ['SARIF / PDF / JSON export', 'CWE classification', 'Suppression audit log'],
    accent: '#ec4899',
    accentBg: '#fdf2f8',
  },
] as const;

/**
 * LandingFeatures — six feature cards in a responsive 3×2 grid.
 *
 * Each card renders an accent-coloured icon container,
 * feature title, description, and a short highlight checklist.
 * Cards lift on hover via the `lp-card-hover` CSS utility.
 */
export function LandingFeatures() {
  const { token } = theme.useToken();

  return (
    <section
      id="features"
      style={{
        padding: 'clamp(80px, 12vw, 120px) clamp(24px, 5vw, 64px)',
        background: token.colorBgLayout,
      }}
    >
      {/* Section header */}
      <Flex vertical align="center" style={{ marginBottom: token.marginXXL }}>
        <Tag
          style={{
            borderRadius: 100,
            marginBottom: token.marginSM,
            padding: '3px 14px',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.04em',
            border: `1px solid ${token.colorPrimaryBorder}`,
            color: token.colorPrimary,
            background: token.colorPrimaryBg,
          }}
        >
          PLATFORM FEATURES
        </Tag>
        <Title
          level={2}
          style={{
            margin: 0,
            textAlign: 'center',
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 800,
            letterSpacing: '-0.025em',
          }}
        >
          Everything your security team needs
        </Title>
        <Text
          type="secondary"
          style={{
            maxWidth: 500,
            textAlign: 'center',
            fontSize: token.fontSizeLG,
            marginTop: token.marginXS,
            lineHeight: 1.65,
          }}
        >
          From multi-engine scanning to AI verification — one platform for the
          entire vulnerability management workflow.
        </Text>
      </Flex>

      {/* Feature grid */}
      <Row
        gutter={[token.marginLG, token.marginLG]}
        justify="center"
        style={{ maxWidth: 1140, margin: '0 auto' }}
      >
        {FEATURES.map((f) => (
          <Col key={f.title} xs={24} sm={12} lg={8}>
            <div
              className="lp-card-hover"
              style={{
                height: '100%',
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
                padding: '28px 28px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                cursor: 'default',
              }}
            >
              {/* Icon */}
              <div
                className="lp-feature-icon"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: f.accentBg,
                  color: f.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </div>

              {/* Title */}
              <Title
                level={4}
                style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.015em' }}
              >
                {f.title}
              </Title>

              {/* Description */}
              <Text
                type="secondary"
                style={{ lineHeight: 1.7, fontSize: token.fontSize, flex: 1 }}
              >
                {f.description}
              </Text>

              {/* Highlights */}
              <div
                style={{
                  paddingTop: 16,
                  borderTop: `1px solid ${token.colorBorderSecondary}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {f.highlights.map((h) => (
                  <Flex key={h} align="center" gap={8}>
                    <CheckCircleFilled
                      style={{ color: f.accent, fontSize: 13, flexShrink: 0 }}
                    />
                    <Text style={{ fontSize: token.fontSizeSM, fontWeight: 500 }}>
                      {h}
                    </Text>
                  </Flex>
                ))}
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </section>
  );
}
