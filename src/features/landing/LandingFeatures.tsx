'use client';

import { Typography, Row, Col, Flex, theme } from 'antd';
import {
  AppstoreOutlined,
  RobotOutlined,
  BranchesOutlined,
  DatabaseOutlined,
  TeamOutlined,
  BarChartOutlined,
  CheckOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  accentBg: string;
  highlights: string[];
}

const FEATURES: Feature[] = [
  {
    icon: <AppstoreOutlined />,
    title: '6 Scanner Engines',
    description:
      'Semgrep, Gitleaks, Flawfinder, Cppcheck, Clang-Tidy, and GCC Fanalyzer run in parallel inside Docker-isolated containers.',
    accent: '#0f766e',
    accentBg: '#f0fdfa',
    highlights: ['C/C++ focused ruleset', 'Docker-isolated runners', 'Parallel execution'],
  },
  {
    icon: <RobotOutlined />,
    title: 'QLoRA AI Verification',
    description:
      'A fine-tuned LLM assesses each finding with full data-flow context — classifying true/false positives automatically.',
    accent: '#7c3aed',
    accentBg: '#f5f3ff',
    highlights: ['Fine-tuned on security data', 'Context-aware analysis', '70%+ false positive reduction'],
  },
  {
    icon: <BranchesOutlined />,
    title: 'Git Source Control',
    description:
      'Connect GitHub, GitLab, or Gitea repositories. Automated scans trigger on every push, PR, or scheduled interval.',
    accent: '#0ea5e9',
    accentBg: '#f0f9ff',
    highlights: ['GitHub & GitLab & Gitea', 'Webhook-triggered scans', 'PR annotations'],
  },
  {
    icon: <DatabaseOutlined />,
    title: 'Quality Gates',
    description:
      'Block pull requests automatically when critical unverified findings are detected. Enforce security standards before merge.',
    accent: '#f59e0b',
    accentBg: '#fffbeb',
    highlights: ['PR blocking enforcement', 'Configurable thresholds', 'CI/CD integration'],
  },
  {
    icon: <TeamOutlined />,
    title: 'Team Workspaces',
    description:
      'Workspace-based RBAC with 24 granular permissions. Invite members, assign roles, and manage projects across teams.',
    accent: '#10b981',
    accentBg: '#f0fdf4',
    highlights: ['24 granular permissions', 'Multi-workspace support', 'Role-based access'],
  },
  {
    icon: <BarChartOutlined />,
    title: 'Report & Export',
    description:
      'Export SARIF, PDF, or JSON reports with full traceability. Track trends, compliance posture, and remediation progress.',
    accent: '#ea580c',
    accentBg: '#fff7ed',
    highlights: ['SARIF · PDF · JSON', 'Trend analytics', 'Compliance tracking'],
  },
];

/**
 * LandingFeatures — six feature cards in a responsive 3×2 grid.
 *
 * Each card reflects an actual platform capability with a unique accent
 * color and a short highlight checklist for scannability.
 */
export function LandingFeatures() {
  const { token } = theme.useToken();

  return (
    <section
      id="features"
      style={{
        padding: 'clamp(80px, 12vw, 120px) clamp(16px, 4vw, 40px)',
        background: 'white',
      }}
    >
      {/* Section header */}
      <Flex vertical align="center" style={{ marginBottom: 64, textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            background: token.colorPrimaryBg,
            color: token.colorPrimary,
            padding: '5px 16px',
            borderRadius: 50,
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1.2px',
            marginBottom: 18,
            border: `1.5px solid ${token.colorPrimaryBorder}`,
          }}
        >
          PLATFORM CAPABILITIES
        </div>
        <Title
          level={2}
          style={{
            margin: 0,
            fontSize: 'clamp(26px, 3.5vw, 44px)',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            color: '#0f172a',
            marginBottom: 14,
          }}
        >
          Built for Serious Security
        </Title>
        <Text
          style={{
            maxWidth: 580,
            fontSize: 17,
            lineHeight: 1.75,
            color: '#64748b',
          }}
        >
          A purpose-built platform combining multiple SAST engines with AI-powered
          verification — designed specifically for C/C++ security analysis.
        </Text>
      </Flex>

      {/* Feature grid */}
      <Row gutter={[20, 20]} justify="center" style={{ maxWidth: 1200, margin: '0 auto' }}>
        {FEATURES.map((f) => (
          <Col key={f.title} xs={24} sm={12} lg={8}>
            <div
              className="lp-card-hover"
              style={{
                height: '100%',
                borderRadius: 16,
                border: `1.5px solid #e2e8f0`,
                background: 'white',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                cursor: 'default',
              }}
            >
              {/* Icon */}
              <div
                className="lp-feature-icon"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: f.accentBg,
                  color: f.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                  border: `1.5px solid ${f.accent}22`,
                }}
              >
                {f.icon}
              </div>

              {/* Title */}
              <Title
                level={4}
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#0f172a',
                }}
              >
                {f.title}
              </Title>

              {/* Description */}
              <Text style={{ lineHeight: 1.7, fontSize: 14, color: '#64748b', flex: 1 }}>
                {f.description}
              </Text>

              {/* Highlights */}
              <Flex vertical gap={5}>
                {f.highlights.map((h) => (
                  <Flex key={h} align="center" gap={7}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: f.accentBg,
                        border: `1px solid ${f.accent}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CheckOutlined style={{ fontSize: 9, color: f.accent }} />
                    </div>
                    <Text style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
                      {h}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </div>
          </Col>
        ))}
      </Row>
    </section>
  );
}
