'use client';

import { Typography, Row, Col, Flex, Tag, theme } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import { LANDING_TOKENS } from '@/commons/constants/landing-tokens';

const { Title, Text } = Typography;

const METRICS = [
  {
    value: '70%+',
    label: 'False Positive Reduction',
    sublabel: 'via QLoRA AI verification',
    icon: '🎯',
    accent: LANDING_TOKENS.accent.tealDark,
    glow: 'rgba(20,184,166,0.2)',
  },
  {
    value: '< 5 min',
    label: 'Average Scan Time',
    sublabel: 'full repo, all engines',
    icon: '⚡',
    accent: LANDING_TOKENS.accent.yellow,
    glow: 'rgba(245,158,11,0.2)',
  },
  {
    value: '4',
    label: 'Scanner Engines',
    sublabel: 'running in parallel',
    icon: '🔍',
    accent: LANDING_TOKENS.accent.purpleDark,
    glow: 'rgba(124,58,237,0.2)',
  },
  {
    value: '247+',
    label: 'Security Rules',
    sublabel: 'C/C++ focused, extensible',
    icon: '📋',
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.2)',
  },
] as const;

const COMPARISON = [
  { label: 'Multi-engine scanning',              ours: true, traditional: false },
  { label: 'AI false-positive verification',     ours: true, traditional: false },
  { label: 'Fine-tuned LLM explanations',        ours: true, traditional: false },
  { label: 'Docker-isolated scan runners',       ours: true, traditional: false },
  { label: 'RBAC with 24 granular permissions',  ours: true, traditional: false },
  { label: 'CI/CD quality gate enforcement',     ours: true, traditional: true  },
  { label: 'SARIF / PDF export',                 ours: true, traditional: true  },
] as const;

/** Tick / Cross cell component for the comparison table. */
function Cell({ value }: { value: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {value ? (
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'rgba(20,184,166,0.18)',
            color: LANDING_TOKENS.accent.tealDark,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          ✓
        </span>
      ) : (
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.12)',
            color: LANDING_TOKENS.accent.red,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
          }}
        >
          ✕
        </span>
      )}
    </div>
  );
}

/**
 * LandingMetrics — dark teal section with four key metric cards
 * and a feature-comparison table.
 *
 * The dark background provides contrast against the surrounding
 * light sections, drawing the reader's eye to the quantified
 * proof points before the CTA.
 */
export function LandingMetrics() {
  const { token } = theme.useToken();

  return (
    <section
      id="metrics"
      style={{
        padding: 'clamp(80px, 12vw, 120px) clamp(16px, 4vw, 64px)',
        background: LANDING_TOKENS.bg.dark,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        className="lp-pulse"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14,165,148,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
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
              border: '1px solid rgba(20,184,166,0.35)',
              color: LANDING_TOKENS.accent.teal,
              background: 'rgba(20,184,166,0.1)',
            }}
            icon={<TrophyOutlined />}
          >
            IMPACT BY THE NUMBERS
          </Tag>
          <Title
            level={2}
            style={{
              margin: 0,
              textAlign: 'center',
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: LANDING_TOKENS.bg.white,
            }}
          >
            Security that speaks in results
          </Title>
          <Text
            style={{
              maxWidth: 480,
              textAlign: 'center',
              fontSize: token.fontSizeLG,
              marginTop: token.marginXS,
              lineHeight: 1.65,
                  color: LANDING_TOKENS.text.secondary,
            }}
          >
            Real metrics from production usage — not marketing estimates.
          </Text>
        </Flex>

        {/* Metric cards */}
        <Row gutter={[24, 24]} style={{ marginBottom: 64 }}>
          {METRICS.map((m) => (
            <Col key={m.label} xs={12} md={6}>
              <div
                className="lp-card-hover"
                style={{
                  padding: '28px 20px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  textAlign: 'center',
                  backdropFilter: 'blur(8px)',
                  cursor: 'default',
                  boxShadow: `0 0 0 1px rgba(255,255,255,0.03)`,
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 12, lineHeight: 1 }}>
                  {m.icon}
                </div>
                <Text
                  strong
                  style={{
                    fontSize: 'clamp(28px, 4vw, 40px)',
                    letterSpacing: '-0.03em',
                    color: m.accent,
                    lineHeight: 1.1,
                    display: 'block',
                    marginBottom: 6,
                    textShadow: `0 0 32px ${m.glow}`,
                  }}
                >
                  {m.value}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: token.fontWeightStrong,
                    color: 'rgba(255,255,255,0.85)',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  {m.label}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.38)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {m.sublabel}
                </Text>
              </div>
            </Col>
          ))}
        </Row>

        {/* Comparison table */}
        <div>
          <Flex
            justify="center"
            style={{ marginBottom: token.marginLG }}
          >
            <Text
              style={{
                fontSize: token.fontSizeSM,
                fontWeight: token.fontWeightStrong,
                letterSpacing: '0.05em',
                color: LANDING_TOKENS.text.faint,
                textTransform: 'uppercase',
              }}
            >
              How we compare
            </Text>
          </Flex>

          <div
            style={{
              maxWidth: 720,
              margin: '0 auto',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Inner scroll wrapper for mobile */}
            <div className="lp-table-scroll" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: 480 }}>
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 130px 130px',
                padding: '14px 24px',
                background: 'rgba(255,255,255,0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>
                CAPABILITY
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: LANDING_TOKENS.accent.teal,
                  letterSpacing: '0.04em',
                  textAlign: 'center',
                }}
              >
                SAST INTEGRATION
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: LANDING_TOKENS.text.faint,
                  letterSpacing: '0.04em',
                  textAlign: 'center',
                }}
              >
                TRADITIONAL SAST
              </Text>
            </div>

            {/* Table rows */}
            {COMPARISON.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 130px 130px',
                  padding: '13px 24px',
                  background:
                    i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  borderBottom:
                    i < COMPARISON.length - 1
                      ? '1px solid rgba(255,255,255,0.05)'
                      : 'none',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: LANDING_TOKENS.text.secondary,
                    fontWeight: 500,
                  }}
                >
                  {row.label}
                </Text>
                <Cell value={row.ours} />
                <Cell value={row.traditional} />
              </div>
            ))}
            </div>{/* end minWidth wrapper */}
          </div>{/* end scroll wrapper */}
          </div>{/* end border container */}
        </div>
      </div>
    </section>
  );
}
