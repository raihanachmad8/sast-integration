'use client';

import { Typography, Row, Col, Flex, theme } from 'antd';
import Link from 'next/link';
import { GithubOutlined } from '@ant-design/icons';
import { ROUTES } from '@/commons/constants';
import { GITHUB_REPO_URL } from '@/commons/constants/landing';

const { Text } = Typography;

/** Brand shield icon. */
function ShieldIcon() {
  return (
    <svg
      width="14"
      height="14"
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
      { label: 'Features',        href: '#features'                 },
      { label: 'Documentation',   href: ROUTES.DOCS.INDEX           },
      { label: 'Changelog',       href: '#'                         },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Getting Started', href: ROUTES.DOCS.GETTING_STARTED },
      { label: 'Architecture',    href: ROUTES.DOCS.ARCHITECTURE    },
      { label: 'API Reference',   href: ROUTES.DOCS.API_REFERENCE   },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',           href: '#'                         },
      { label: 'Contact',         href: '#'                         },
      { label: 'Privacy Policy',  href: '#'                         },
    ],
  },
] as const;

/**
 * LandingFooter — dark multi-column footer with brand block,
 * three navigation groups, GitHub link, and a legal bottom bar.
 *
 * Logo and brand accent consistently use the teal palette.
 */
export function LandingFooter() {
  const { token } = theme.useToken();

  return (
    <footer
      style={{
        background: '#0a1628',
        color: '#94a3b8',
        padding: 'clamp(56px, 10vw, 80px) clamp(24px, 5vw, 40px) 0',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <Row gutter={[60, 56]} style={{ marginBottom: 0, paddingBottom: 56 }}>
          {/* ── Brand column ─────────────────────────────────── */}
          <Col xs={24} md={12} lg={9}>
            <Flex vertical gap={20}>
              {/* Logo */}
              <Link
                href="/"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', width: 'fit-content' }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryHover})`,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 12px rgba(15,118,110,0.4)`,
                    flexShrink: 0,
                  }}
                >
                  <ShieldIcon />
                </div>
                <Text
                  strong
                  style={{ fontSize: 22, color: 'white', letterSpacing: '-0.02em', fontWeight: 800 }}
                >
                  SAST Integration
                </Text>
              </Link>

              {/* Tagline */}
              <Text
                style={{
                  color: '#94a3b8',
                  fontSize: 15,
                  lineHeight: 1.75,
                  maxWidth: 340,
                }}
              >
                AI-powered security analysis platform for modern development teams.
                Ship secure code faster with intelligent verification.
              </Text>

              {/* GitHub link */}
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-link"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  color: '#94a3b8',
                  fontWeight: 500,
                  width: 'fit-content',
                }}
              >
                <GithubOutlined style={{ fontSize: 16 }} />
                View on GitHub
              </a>
            </Flex>
          </Col>

          {/* ── Link columns ─────────────────────────────────── */}
          {FOOTER_LINKS.map((group) => (
            <Col key={group.heading} xs={8} md={4}>
              <Flex vertical gap={14}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'white',
                    marginBottom: 4,
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
                      color: '#94a3b8',
                      fontSize: 14,
                      fontWeight: 500,
                      textDecoration: 'none',
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
            paddingTop: 28,
            paddingBottom: 28,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Text style={{ color: '#64748b', fontSize: 13 }}>
            © {new Date().getFullYear()} SAST Integration. All rights reserved.
          </Text>
          <Text style={{ color: '#475569', fontSize: 13 }}>
            v0.4.0 · Built with Next.js & Ant Design
          </Text>
        </div>
      </div>
    </footer>
  );
}
