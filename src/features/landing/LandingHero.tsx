'use client';

import { Button, Typography, Row, Col, Flex, theme, Tag } from 'antd';
import Link from 'next/link';
import {
  ArrowRightOutlined,
  GithubOutlined,
  CheckCircleFilled,
  SecurityScanOutlined,
  RobotOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { ROUTES } from '@/commons/constants';
import { GITHUB_REPO_URL } from '@/commons/constants/landing';

const { Title, Text, Paragraph } = Typography;

/** Stats bar — real numbers from the platform. */
const HERO_STATS = [
  { value: '6',     label: 'Scanner Engines',          sub: 'running in parallel'   },
  { value: '247+',  label: 'Security Rules',           sub: 'C/C++ focused'          },
  { value: '70%+',  label: 'FP Reduction',             sub: 'via AI verification'    },
  { value: '< 5m',  label: 'Avg Scan Time',            sub: 'full repository'        },
] as const;

const TRUST_PILLS = [
  'No credit card',
  'Self-hostable',
  'Open source',
] as const;

/** A minimal mock finding card rendered in the hero visual. */
function FindingCard({
  severity,
  rule,
  file,
  verified,
}: {
  severity: 'critical' | 'high' | 'medium';
  rule: string;
  file: string;
  verified: boolean;
}) {
  const SEVERITY_COLOR: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
  };
  const color = SEVERITY_COLOR[severity];

  return (
    <div
      style={{
        background: 'white',
        border: '1.5px solid #e2e8f0',
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 12, color: '#0f172a', display: 'block', lineHeight: 1.3 }}>
          {rule}
        </Text>
        <Text style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{file}</Text>
      </div>
      {verified && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 50,
            background: '#f0fdf4',
            border: '1px solid #86efac',
          }}
        >
          <RobotOutlined style={{ fontSize: 9, color: '#16a34a' }} />
          <Text style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>AI Verified</Text>
        </div>
      )}
      {!verified && (
        <Tag
          style={{
            margin: 0,
            fontSize: 10,
            padding: '1px 7px',
            borderRadius: 50,
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#dc2626',
            fontWeight: 700,
          }}
        >
          {severity.toUpperCase()}
        </Tag>
      )}
    </div>
  );
}

/** Visual panel showing a mock scan output — sits on the right side of the hero. */
function HeroVisual() {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        background: '#f8fafc',
        borderRadius: 20,
        border: '1.5px solid #e2e8f0',
        padding: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.10)',
        position: 'relative',
      }}
    >
      {/* Terminal bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 16,
          paddingBottom: 14,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
          <div
            key={c}
            style={{ width: 10, height: 10, borderRadius: '50%', background: c }}
          />
        ))}
        <Text style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8, fontFamily: 'monospace' }}>
          sast-integration scan --repo my-project
        </Text>
      </div>

      {/* Scanner progress */}
      <div style={{ marginBottom: 16 }}>
        {[
          { name: 'Semgrep',     status: '✓', findings: 12, color: '#0f766e' },
          { name: 'Gitleaks',    status: '✓', findings: 3,  color: '#0f766e' },
          { name: 'Flawfinder',  status: '✓', findings: 8,  color: '#0f766e' },
          { name: 'Cppcheck',    status: '✓', findings: 5,  color: '#0f766e' },
        ].map((s) => (
          <div
            key={s.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 0',
            }}
          >
            <Text style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>{s.status}</Text>
            <Text style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace', flex: 1 }}>
              {s.name}
            </Text>
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>{s.findings} findings</Text>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #e2e8f0', marginBottom: 14 }} />

      {/* AI verification label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 10,
        }}
      >
        <RobotOutlined style={{ fontSize: 12, color: token.colorPrimary }} />
        <Text style={{ fontSize: 11, fontWeight: 700, color: token.colorPrimary }}>
          AI Verification in progress…
        </Text>
      </div>

      {/* Findings */}
      <Flex vertical gap={8}>
        <FindingCard
          severity="critical"
          rule="buffer-overflow-risk"
          file="src/parser.c:142"
          verified={false}
        />
        <FindingCard
          severity="high"
          rule="hardcoded-secret"
          file="config/db.h:18"
          verified={true}
        />
        <FindingCard
          severity="medium"
          rule="null-pointer-deref"
          file="src/handler.cpp:67"
          verified={true}
        />
      </Flex>

      {/* Summary badge */}
      <div
        style={{
          marginTop: 14,
          padding: '10px 14px',
          borderRadius: 10,
          background: token.colorPrimaryBg,
          border: `1px solid ${token.colorPrimaryBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 12, color: token.colorPrimary, fontWeight: 600 }}>
          28 findings · 19 verified true positive
        </Text>
        <SecurityScanOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
      </div>
    </div>
  );
}

/**
 * LandingHero — two-column hero on desktop (text left, mock scan panel right).
 * Collapses to single column on mobile.
 *
 * All colors derived from Ant Design theme tokens (teal palette).
 * Content accurately reflects the platform's real capabilities.
 */
export function LandingHero() {
  const { token } = theme.useToken();

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          paddingTop: 'clamp(100px, 14vw, 140px)',
          paddingBottom: 'clamp(60px, 8vw, 80px)',
          paddingLeft: 'clamp(16px, 4vw, 40px)',
          paddingRight: 'clamp(16px, 4vw, 40px)',
          background: 'linear-gradient(160deg, #f0fdfa 0%, #f8fafc 50%, #ffffff 100%)',
        }}
      >
        {/* Dot grid */}
        <div
          aria-hidden="true"
          className="lp-grid-bg"
          style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }}
        />

        {/* Glow top-right */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -160,
            right: -160,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${token.colorPrimaryBg} 0%, transparent 65%)`,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Row gutter={[48, 56]} align="middle">
            {/* ── Left: text content ───────────────────────── */}
            <Col xs={24} lg={12}>
              {/* Badge */}
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '6px 16px',
                    borderRadius: 50,
                    fontSize: 13,
                    fontWeight: 600,
                    background: token.colorPrimaryBg,
                    color: token.colorPrimary,
                    border: `1.5px solid ${token.colorPrimaryBorder}`,
                  }}
                >
                  <ThunderboltFilled style={{ fontSize: 12, color: token.colorWarning }} />
                  AI-Powered SAST Platform
                </div>
              </div>

              {/* Headline */}
              <Title
                level={1}
                style={{
                  margin: 0,
                  fontSize: 'clamp(34px, 5vw, 58px)',
                  fontWeight: 900,
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  color: '#0f172a',
                  marginBottom: 20,
                }}
              >
                Secure C/C++ Code
                <br />
                <span
                  style={{
                    background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorSuccess} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  with AI Verification
                </span>
              </Title>

              {/* Subtitle */}
              <Paragraph
                style={{
                  fontSize: 'clamp(15px, 1.8vw, 18px)',
                  color: '#64748b',
                  lineHeight: 1.75,
                  margin: 0,
                  marginBottom: 36,
                }}
              >
                Run 6 scanner engines in parallel — Semgrep, Gitleaks, Flawfinder, Cppcheck,
                Clang-Tidy, and GCC Fanalyzer — then verify every finding with a QLoRA
                fine-tuned LLM to eliminate false positives automatically.
              </Paragraph>

              {/* CTAs */}
              <Flex gap={12} wrap style={{ marginBottom: 32 }}>
                <Link href={ROUTES.AUTH.SIGNUP}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ArrowRightOutlined />}
                    style={{
                      fontWeight: 700,
                      height: 50,
                      paddingInline: 32,
                      fontSize: 15,
                      borderRadius: 10,
                      boxShadow: `0 6px 20px rgba(15,118,110,0.35)`,
                    }}
                  >
                    Get Started Free
                  </Button>
                </Link>
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="large"
                    icon={<GithubOutlined />}
                    style={{
                      height: 50,
                      paddingInline: 28,
                      fontSize: 15,
                      borderRadius: 10,
                      borderColor: '#e2e8f0',
                      color: '#0f172a',
                      fontWeight: 500,
                      background: 'white',
                    }}
                  >
                    View on GitHub
                  </Button>
                </a>
              </Flex>

              {/* Trust pills */}
              <Flex gap={20} wrap>
                {TRUST_PILLS.map((pill) => (
                  <Flex key={pill} align="center" gap={6}>
                    <CheckCircleFilled style={{ color: token.colorSuccess, fontSize: 13 }} />
                    <Text style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                      {pill}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </Col>

            {/* ── Right: mock scan visual ───────────────────── */}
            <Col xs={24} lg={12}>
              <HeroVisual />
            </Col>
          </Row>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: '0 clamp(16px, 4vw, 40px) 64px',
          background: 'white',
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            background: 'white',
            borderRadius: 16,
            padding: 'clamp(24px, 3vw, 36px) clamp(16px, 3vw, 40px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            border: `1px solid #e2e8f0`,
          }}
        >
          <Row gutter={[0, 24]}>
            {HERO_STATS.map((s, idx) => (
              <Col
                key={s.label}
                xs={12}
                sm={6}
                style={{
                  textAlign: 'center',
                  borderRight: idx < HERO_STATS.length - 1 ? '1px solid #f1f5f9' : 'none',
                  padding: '8px 16px',
                }}
              >
                <Text
                  strong
                  style={{
                    display: 'block',
                    fontSize: 'clamp(26px, 3.5vw, 38px)',
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    color: token.colorPrimary,
                    fontWeight: 900,
                    marginBottom: 6,
                  }}
                >
                  {s.value}
                </Text>
                <Text
                  strong
                  style={{ display: 'block', fontSize: 13, color: '#0f172a', marginBottom: 2 }}
                >
                  {s.label}
                </Text>
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>{s.sub}</Text>
              </Col>
            ))}
          </Row>
        </div>
      </section>
    </>
  );
}
