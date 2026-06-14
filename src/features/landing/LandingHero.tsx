'use client';

import { Button, Typography, Row, Col, Flex, Space, theme } from 'antd';
import Link from 'next/link';
import {
  ArrowRightOutlined,
  GithubOutlined,
  CheckCircleFilled,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { ROUTES } from '@/commons/constants';
import { LANDING_COLORS } from '@/commons/constants/landing';

const { Title, Text, Paragraph } = Typography;

/** Severity badge used inside the dashboard mock. */
function SeverityBadge({ level, count }: { level: string; count: number; color: string; bg: string }) {
  const colors: Record<string, { color: string; bg: string }> = {
    CRITICAL: { color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
    HIGH:     { color: '#e3b341', bg: 'rgba(227,179,65,0.12)' },
    MEDIUM:   { color: '#58a6ff', bg: 'rgba(88,166,255,0.12)' },
    LOW:      { color: '#3fb950', bg: 'rgba(63,185,80,0.12)'  },
  };
  const c = colors[level] ?? { color: '#8b949e', bg: 'rgba(139,148,158,0.1)' };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 12px',
        borderRadius: 8,
        background: c.bg,
        border: `1px solid ${c.color}28`,
        marginBottom: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: c.color,
            display: 'inline-block',
            boxShadow: `0 0 6px ${c.color}`,
          }}
        />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: c.color, letterSpacing: '0.04em' }}>
          {level}
        </span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>{count}</span>
    </div>
  );
}

/** Engine row in the scanner status panel. */
function EngineRow({ name, status, findings }: { name: string; status: 'done' | 'running'; findings?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: status === 'done' ? '#3fb950' : '#f59e0b',
            display: 'inline-block',
            boxShadow: status === 'running' ? '0 0 6px #f59e0b' : 'none',
          }}
        />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{name}</span>
      </div>
      {status === 'done' && findings !== undefined ? (
        <span style={{ fontSize: 12, color: '#5eead4', fontWeight: 600 }}>{findings} found</span>
      ) : (
        <span style={{ fontSize: 11, color: '#f59e0b' }}>scanning…</span>
      )}
    </div>
  );
}

/**
 * DashboardMock — a stylised preview of the SAST Integration dashboard UI.
 *
 * Shows the scan-results panel with severity breakdown, engine statuses,
 * and the AI verification summary. Replaces the old CLI-based TerminalMock
 * to reflect the actual product (a web platform, not a CLI tool).
 */
function DashboardMock() {
  return (
    <div className="lp-slide-right" style={{ position: 'relative' }}>
      {/* Outer ambient glow */}
      <div
        className="lp-pulse"
        style={{
          position: 'absolute',
          inset: -32,
          borderRadius: 40,
          background: 'radial-gradient(ellipse, rgba(14,165,148,0.16) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="lp-float"
        style={{
          background: '#0d1117',
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.04)',
          position: 'relative',
          zIndex: 1,
          minWidth: 0,
        }}
      >
        {/* Window chrome */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 16px',
            background: '#161b22',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'inline-block', flexShrink: 0 }} />
          <span
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 11,
              color: 'rgba(255,255,255,0.32)',
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '0.02em',
            }}
          >
            SAST Integration — Scan Results
          </span>
        </div>

        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            background: '#0d1117',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#5eead4', letterSpacing: '0.03em' }}>
              scan #142
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#3fb950',
                background: 'rgba(63,185,80,0.12)',
                border: '1px solid rgba(63,185,80,0.25)',
                borderRadius: 4,
                padding: '1px 6px',
                letterSpacing: '0.03em',
              }}
            >
              COMPLETE
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
            2m 34s
          </span>
        </div>

        <div style={{ padding: '14px 16px', fontFamily: "'Inter', sans-serif" }}>
          {/* Severity breakdown */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
              Findings by Severity
            </span>
            <div style={{ marginTop: 8 }}>
              <SeverityBadge level="CRITICAL" count={2}  color="" bg="" />
              <SeverityBadge level="HIGH"     count={7}  color="" bg="" />
              <SeverityBadge level="MEDIUM"   count={14} color="" bg="" />
              <SeverityBadge level="LOW"      count={31} color="" bg="" />
            </div>
          </div>

          {/* Engine status */}
          <div
            style={{
              paddingTop: 12,
              borderTop: '1px solid rgba(255,255,255,0.07)',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Scanner Engines
            </span>
            <EngineRow name="Semgrep"    status="done"    findings={12} />
            <EngineRow name="Trivy"      status="done"    findings={8}  />
            <EngineRow name="Gitleaks"   status="done"    findings={3}  />
            <EngineRow name="Flawfinder" status="running"              />
          </div>

          {/* AI verification summary */}
          <div
            className="lp-result-3"
            style={{
              paddingTop: 12,
              borderTop: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: '#a78bfa', textTransform: 'uppercase' }}>
                🤖 AI Verification
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>QLoRA LLM</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'rgba(63,185,80,0.08)',
                  border: '1px solid rgba(63,185,80,0.2)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: '#3fb950', lineHeight: 1 }}>16</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>True Positive</div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'rgba(248,81,73,0.08)',
                  border: '1px solid rgba(248,81,73,0.2)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f85149', lineHeight: 1 }}>7</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>False Positive</div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'rgba(94,234,212,0.08)',
                  border: '1px solid rgba(94,234,212,0.2)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: '#5eead4', lineHeight: 1 }}>94%</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>Accuracy</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge — repo info */}
      <div
        style={{
          position: 'absolute',
          bottom: -18,
          right: -16,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          border: '1px solid rgba(167,139,250,0.4)',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 8px 32px rgba(114,46,209,0.3)',
          zIndex: 2,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span style={{ fontSize: 18 }}>🤖</span>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(167,139,250,0.8)', fontWeight: 600, letterSpacing: '0.05em', lineHeight: 1.3 }}>
            AI VERIFIED
          </div>
          <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>
            94% accuracy
          </div>
        </div>
      </div>

      {/* Floating badge — scan time */}
      <div
        style={{
          position: 'absolute',
          top: -16,
          left: -16,
          background: 'linear-gradient(135deg, #064e40 0%, #0f766e 100%)',
          border: '1px solid rgba(94,234,212,0.3)',
          borderRadius: 12,
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 8px 24px rgba(15,118,110,0.3)',
          zIndex: 2,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span style={{ fontSize: 16 }}>⚡</span>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(94,234,212,0.8)', fontWeight: 600, letterSpacing: '0.05em', lineHeight: 1.3 }}>
            SCAN SPEED
          </div>
          <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>
            {'< 5 min'}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Stats bar rendered below the hero split layout. */
const HERO_STATS = [
  { value: '4',    label: 'Scanner Engines',   color: '#14b8a6' },
  { value: '70%+',  label: 'Less False Positives', color: '#a78bfa' },
  { value: '247',  label: 'Security Rules',    color: '#f59e0b' },
  { value: '100%', label: 'Open Source',       color: '#10b981' },
] as const;

/** Trust indicators shown below CTA buttons. */
const TRUST_ITEMS = ['Open Source', 'Self-hosted', 'Docker Ready', 'No telemetry'] as const;

/**
 * LandingHero — two-column hero with animated dashboard mock and stats bar.
 *
 * Left column contains the value proposition copy and CTAs.
 * Right column contains the interactive dashboard preview.
 * A four-column stats bar sits below both at full width.
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
          padding:
            'clamp(100px, 14vw, 160px) clamp(24px, 5vw, 64px) clamp(80px, 10vw, 120px)',
          background: `linear-gradient(
            155deg,
            #050f0d 0%,
            #0a1f1a 30%,
            #0f2d26 55%,
            #082b26 75%,
            #04110e 100%
          )`,
        }}
      >
        {/* ── Decorative glow orbs ─────────────────────────── */}
        <div
          className="lp-pulse"
          style={{
            position: 'absolute',
            top: '-15%',
            right: '-8%',
            width: 700,
            height: 700,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${LANDING_COLORS.teal.bg} 0%, transparent 65%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          className="lp-pulse"
          style={{
            position: 'absolute',
            bottom: '-25%',
            left: '-6%',
            width: 550,
            height: 550,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${LANDING_COLORS.purple.bg} 0%, transparent 65%)`,
            pointerEvents: 'none',
            animationDelay: '2s',
          }}
        />
        {/* Subtle dot grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.035,
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
          }}
        />

        {/* ── Main content grid ────────────────────────────── */}
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
          <Row gutter={[64, 56]} align="middle">
            {/* LEFT — copy */}
            <Col xs={24} lg={12}>
              {/* Pill badge */}
              <div className="lp-fade-up">
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 16px',
                    borderRadius: 100,
                    fontSize: token.fontSizeSM,
                    fontWeight: 600,
                    background: LANDING_COLORS.white.overlay,
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(8px)',
                    marginBottom: 28,
                    letterSpacing: '0.02em',
                  }}
                >
                  <ThunderboltOutlined style={{ color: '#facc15' }} />
                  v0.4.0 — Open Source SAST Platform
                </div>
              </div>

              {/* Headline */}
              <div className="lp-fade-up-1">
                <Title
                  level={1}
                  style={{
                    margin: 0,
                    fontSize: 'clamp(38px, 5vw, 64px)',
                    fontWeight: 800,
                    lineHeight: 1.08,
                    letterSpacing: '-0.03em',
                    color: '#fff',
                  }}
                >
                  Ship Code That&apos;s{' '}
                  <span className="lp-shimmer-text">Actually Secure</span>
                </Title>
              </div>

              {/* Subtitle */}
              <div className="lp-fade-up-2">
                <Paragraph
                  style={{
                    fontSize: 'clamp(16px, 1.8vw, 18px)',
                    color: LANDING_COLORS.white.text,
                    maxWidth: 500,
                    margin: `20px 0 0`,
                    lineHeight: 1.75,
                  }}
                >
                  Run Semgrep, Trivy, Gitleaks and Flawfinder through one unified
                  pipeline. Every finding is independently verified by fine-tuned AI —
                  cutting false positives by{' '}
                  <strong style={{ color: '#5eead4' }}>over 70%</strong>.
                </Paragraph>
              </div>

              {/* CTA Buttons */}
              <div className="lp-fade-up-3">
                <Space
                  size={12}
                  wrap
                  style={{ marginTop: 36 }}
                >
                  <Link href={ROUTES.AUTH.SIGNUP}>
                    <Button
                      type="default"
                      size="large"
                      icon={<ArrowRightOutlined />}
                      style={{
                        background: '#fff',
                        color: token.colorPrimary,
                        border: 'none',
                        fontWeight: 700,
                        height: 52,
                        paddingInline: 32,
                        fontSize: 15,
                        borderRadius: 10,
                        boxShadow: '0 4px 20px rgba(255,255,255,0.15)',
                      }}
                    >
                      Get Started Free
                    </Button>
                  </Link>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="large"
                      icon={<GithubOutlined />}
                      ghost
                      style={{
                        height: 52,
                        paddingInline: 28,
                        fontSize: 15,
                        borderRadius: 10,
                        borderColor: 'rgba(255,255,255,0.28)',
                        color: '#fff',
                        fontWeight: 500,
                      }}
                    >
                      View on GitHub
                    </Button>
                  </a>
                </Space>
              </div>

              {/* Trust indicators */}
              <div className="lp-fade-up-4">
                <Flex
                  wrap="wrap"
                  gap={16}
                  style={{ marginTop: 28 }}
                >
                  {TRUST_ITEMS.map((item) => (
                    <Flex key={item} align="center" gap={6}>
                      <CheckCircleFilled
                        style={{ color: '#5eead4', fontSize: 13 }}
                      />
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.55)',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        {item}
                      </Text>
                    </Flex>
                  ))}
                </Flex>
              </div>
            </Col>

            {/* RIGHT — dashboard mock */}
            <Col xs={24} lg={12}>
              {/* Extra margin on mobile so floating badges don't clip */}
              <div style={{ paddingTop: 24, paddingBottom: 24, paddingLeft: 20 }}>
                <DashboardMock />
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: `${token.paddingXL}px clamp(24px, 5vw, 64px)`,
          background: '#fff',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Row
          justify="center"
          gutter={[48, 24]}
          style={{ maxWidth: 960, margin: '0 auto' }}
        >
          {HERO_STATS.map((s, i) => (
            <Col key={s.label} xs={12} md={6} style={{ textAlign: 'center' }}>
              <div className={`lp-fade-up-${i + 1 as 1 | 2 | 3 | 4}`}>
                <Flex vertical align="center" gap={4}>
                  <Text
                    strong
                    style={{
                      fontSize: 'clamp(28px, 4vw, 40px)',
                      lineHeight: 1.1,
                      letterSpacing: '-0.03em',
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </Text>
                  <Text
                    type="secondary"
                    style={{ fontSize: token.fontSizeSM, fontWeight: 500 }}
                  >
                    {s.label}
                  </Text>
                </Flex>
              </div>
            </Col>
          ))}
        </Row>
      </section>
    </>
  );
}
