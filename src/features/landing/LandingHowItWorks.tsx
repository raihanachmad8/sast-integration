'use client';

import { Typography, Row, Col, Flex, Tag, theme } from 'antd';
import {
  ApiOutlined,
  SecurityScanOutlined,
  RobotOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { LANDING_TOKENS } from '@/commons/constants/landing-tokens';

const { Title, Text } = Typography;

const STEPS = [
  {
    icon: <ApiOutlined />,
    step: '01',
    title: 'Connect',
    desc: 'Import repositories from GitHub, GitLab, or Gitea. Configure scan policies and engine selection per project in minutes.',
    accent: LANDING_TOKENS.accent.tealDark,
    accentBg: '#f0fdfa',
  },
  {
    icon: <SecurityScanOutlined />,
    step: '02',
    title: 'Scan',
    desc: 'Run Semgrep, Gitleaks, Flawfinder, and Cppcheck in parallel inside Docker-isolated containers with your custom ruleset.',
    accent: LANDING_TOKENS.accent.yellow,
    accentBg: '#fffbeb',
  },
  {
    icon: <RobotOutlined />,
    step: '03',
    title: 'Verify',
    desc: 'Each finding is independently assessed by a QLoRA fine-tuned LLM — classified as true/false positive with data-flow context.',
    accent: LANDING_TOKENS.accent.purpleDark,
    accentBg: '#f5f3ff',
  },
  {
    icon: <FileTextOutlined />,
    step: '04',
    title: 'Report',
    desc: 'Export SARIF, PDF, or JSON reports. Set quality gates to block PRs containing critical unverified findings automatically.',
    accent: '#10b981',
    accentBg: '#f0fdf4',
  },
] as const;

/**
 * LandingHowItWorks — four-step workflow with connecting gradient line.
 *
 * On desktop the steps lay out in a single row with a gradient
 * connector line running between step icon centres.
 * On mobile they stack vertically with a left-edge connector line.
 */
export function LandingHowItWorks() {
  const { token } = theme.useToken();

  return (
    <section
      id="how-it-works"
      style={{
        padding: 'clamp(80px, 12vw, 120px) clamp(24px, 5vw, 64px)',
        background: token.colorBgContainer,
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
            fontWeight: token.fontWeightStrong,
            letterSpacing: '0.04em',
            border: `1px solid ${token.colorPrimaryBorder}`,
            color: token.colorPrimary,
            background: token.colorPrimaryBg,
          }}
        >
          WORKFLOW
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
          From commit to report in four steps
        </Title>
        <Text
          type="secondary"
          style={{
            maxWidth: 480,
            textAlign: 'center',
            fontSize: token.fontSizeLG,
            marginTop: token.marginXS,
            lineHeight: 1.65,
          }}
        >
          A streamlined pipeline that turns every code change into
          actionable, AI-verified security insights.
        </Text>
      </Flex>

      {/* Connector line + step cards */}
      <div
        style={{
          maxWidth: 1060,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* Horizontal connector — visible on md+ screens */}
        <div
          aria-hidden="true"
          className="lp-step-connector"
          style={{
            position: 'absolute',
            top: 32,
            left: '12.5%',
            right: '12.5%',
            height: 2,
            background:
              `linear-gradient(90deg, ${LANDING_TOKENS.accent.tealDark} 0%, ${LANDING_TOKENS.accent.yellow} 33%, ${LANDING_TOKENS.accent.purpleDark} 66%, #10b981 100%)`,
            opacity: 0.25,
            borderRadius: 1,
          }}
        />

        <Row gutter={[32, 48]} justify="center">
          {STEPS.map((step) => (
            <Col key={step.step} xs={24} sm={12} md={6}>
              <Flex vertical align="center" style={{ textAlign: 'center' }}>
                {/* Icon bubble */}
                <div
                  className="lp-step-card"
                  style={{
                    position: 'relative',
                    width: 68,
                    height: 68,
                    borderRadius: 18,
                    background: step.accentBg,
                    color: step.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    marginBottom: token.marginMD,
                    boxShadow: `0 4px 20px ${step.accent}22`,
                    border: `1.5px solid ${step.accent}30`,
                    flexShrink: 0,
                    cursor: 'default',
                  }}
                >
                  {step.icon}
                  {/* Step number badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -9,
                      right: -9,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: step.accent,
                      color: LANDING_TOKENS.bg.white,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px solid ${LANDING_TOKENS.bg.white}`,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {step.step}
                  </div>
                </div>

                <Title
                  level={4}
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    letterSpacing: '-0.015em',
                    marginBottom: 8,
                    color: step.accent,
                  }}
                >
                  {step.title}
                </Title>
                <Text
                  type="secondary"
                  style={{
                    fontSize: token.fontSize,
                    lineHeight: 1.7,
                    maxWidth: 200,
                  }}
                >
                  {step.desc}
                </Text>
              </Flex>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
}
