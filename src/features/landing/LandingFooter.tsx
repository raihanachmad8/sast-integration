'use client';

import { Typography, Row, Col, Flex, Space, theme } from 'antd';
import Link from 'next/link';
import { GithubOutlined } from '@ant-design/icons';
import { ROUTES } from '@/commons/constants';
import { GITHUB_REPO_URL } from '@/commons/constants/landing';

const { Text } = Typography;

/** Brand shield icon — reused from public layout. */
function ShieldIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features',        href: '#features'                   },
      { label: 'How It Works',    href: '#how-it-works'               },
      { label: 'Metrics',         href: '#metrics'                    },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Documentation',   href: ROUTES.DOCS.INDEX             },
      { label: 'Getting Started', href: ROUTES.DOCS.GETTING_STARTED   },
      { label: 'API Reference',   href: ROUTES.DOCS.API_REFERENCE     },
    ],
  },
  {
    heading: 'Platform',
    links: [
      { label: 'Sign in',         href: ROUTES.AUTH.SIGNIN            },
      { label: 'Sign up',         href: ROUTES.AUTH.SIGNUP            },
      { label: 'Architecture',    href: ROUTES.DOCS.ARCHITECTURE      },
      { label: 'AI Verification', href: ROUTES.DOCS.AI_VERIFICATION   },
    ],
  },
] as const;

/**
 * LandingFooter — multi-column footer with brand block,
 * three navigation groups, and a legal bottom bar.
 */
export function LandingFooter() {
  const { token } = theme.useToken();

  return (
    <footer
      style={{
        background: '#050f0d',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingTop: 'clamp(56px, 8vw, 80px)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: `0 clamp(24px, 5vw, 64px)`,
        }}
      >
        <Row gutter={[48, 48]}>
          {/* ── Brand column ─────────────────────────────────── */}
          <Col xs={24} md={8}>
            <Flex vertical gap={16}>
              {/* Logo */}
              <Link
                href="/"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', width: 'fit-content' }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(15,118,110,0.35)',
                    flexShrink: 0,
                  }}
                >
                  <ShieldIcon />
                </div>
                <Text
                  strong
                  style={{ fontSize: 15, color: '#fff', letterSpacing: '-0.02em' }}
                >
                  SAST Integration
                </Text>
              </Link>

              {/* Tagline */}
              <Text
                style={{
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: 14,
                  lineHeight: 1.7,
                  maxWidth: 260,
                }}
              >
                Open-source SAST platform with multi-engine scanning and
                AI-powered false-positive verification.
              </Text>

              {/* Social */}
              <Flex gap={12} style={{ marginTop: 4 }}>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub repository"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    textDecoration: 'none',
                    transition: 'color 0.18s ease, border-color 0.18s ease, background 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = '#fff';
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.08)';
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.55)';
                    (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.12)';
                  }}
                >
                  <GithubOutlined />
                </a>
              </Flex>
            </Flex>
          </Col>

          {/* ── Link columns ─────────────────────────────────── */}
          {FOOTER_LINKS.map((group) => (
            <Col key={group.heading} xs={8} md={16 / FOOTER_LINKS.length}>
              <Flex vertical gap={14}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.35)',
                    marginBottom: 2,
                  }}
                >
                  {group.heading}
                </Text>
                {group.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="lp-link"
                    style={{
                      color: 'rgba(255,255,255,0.55)',
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </Flex>
            </Col>
          ))}
        </Row>

        {/* ── Bottom bar ───────────────────────────────────── */}
        <div
          style={{
            marginTop: 56,
            paddingTop: 20,
            paddingBottom: 28,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Text
            style={{ color: 'rgba(255,255,255,0.3)', fontSize: token.fontSizeSM }}
          >
            © {new Date().getFullYear()} SAST Integration. Released under the MIT License.
          </Text>
          <Space size={token.marginLG}>
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              rel="noopener noreferrer"
              className="lp-link"
              style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: token.fontSizeSM,
              }}
            >
              MIT License
            </a>
          </Space>
        </div>
      </div>
    </footer>
  );
}
