'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Tag, theme, Input } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GithubOutlined,
  SearchOutlined,
  ArrowRightOutlined,
  HomeOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { ROUTES } from '@/commons/constants';
import { GITHUB_REPO_URL } from '@/commons/constants/landing';
import '../landing.css';

const { Text } = Typography;

const NAV_LINKS = [
  { label: 'Features',     href: '#features'      },
  { label: 'How It Works', href: '#how-it-works'  },
  { label: 'Metrics',      href: '#metrics'        },
  { label: 'Docs',         href: ROUTES.DOCS.INDEX },
] as const;

const DOCS_NAV_SECTIONS = [
  { label: 'Getting Started', href: ROUTES.DOCS.GETTING_STARTED },
  { label: 'Architecture',    href: ROUTES.DOCS.ARCHITECTURE    },
  { label: 'API Reference',   href: ROUTES.DOCS.API_REFERENCE   },
] as const;

/** Brand shield SVG. */
function ShieldIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

/** Animated hamburger / close icon. */
function HamburgerIcon({
  open,
  barColor,
  barBorderRadius,
}: {
  open: boolean;
  barColor: string;
  barBorderRadius: number;
}) {
  const bar: React.CSSProperties = {
    display: 'block',
    width: 22,
    height: 2,
    borderRadius: barBorderRadius,
    background: barColor,
    transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
    transformOrigin: 'center',
  };
  return (
    <div
      style={{
        width: 22,
        height: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
    >
      <span style={{ ...bar, transform: open ? 'translateY(7px) rotate(45deg)' : 'none' }} />
      <span style={{ ...bar, opacity: open ? 0 : 1, transform: open ? 'scaleX(0)' : 'none' }} />
      <span style={{ ...bar, transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   DOCS NAVBAR — dedicated minimal navbar for /docs pages.
   Layout mirrors common doc sites (Stripe, Grok, etc.):
     Left:   Logo + "Docs" label
     Center: Section quick-links (desktop only)
     Right:  GitHub + Search hint + "Open App" CTA
   ════════════════════════════════════════════════════════════════ */
function DocsNavbar() {
  const { token } = theme.useToken();
  const [scrolled,   setScrolled]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => { setIsMobile(mq.matches); if (!mq.matches) setMenuOpen(false); };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Dispatch custom event for search modal
        window.dispatchEvent(new CustomEvent('open-docs-search'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          height: 56,
          background: scrolled
            ? 'rgba(255,255,255,0.98)'
            : 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${scrolled ? token.colorBorderSecondary : 'rgba(226,232,240,0.5)'}`,
          boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
          transition: 'all 0.25s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            padding: '0 clamp(16px, 3vw, 32px)',
            gap: 0,
          }}
        >
          {/* ── Left: Logo + Docs label ───────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                paddingRight: 12,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryHover})`,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 2px 8px rgba(15,118,110,0.25)`,
                }}
              >
                <ShieldIcon size={13} />
              </div>
              <Text
                strong
                style={{
                  fontSize: 15,
                  color: token.colorText,
                  letterSpacing: '-0.02em',
                  fontWeight: 700,
                }}
              >
                SAST Integration
              </Text>
            </Link>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* ── Right: actions ────────────────────────────── */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* Search hint */}
              <button
                type="button"
                aria-label="Search documentation"
                onClick={() => window.dispatchEvent(new CustomEvent('open-docs-search'))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 8,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  background: token.colorFillQuaternary,
                  cursor: 'pointer',
                  color: token.colorTextTertiary,
                  fontSize: 13,
                  transition: 'border-color 0.18s ease',
                }}
              >
                <SearchOutlined style={{ fontSize: 13 }} />
                <span>Search</span>
                <kbd
                  style={{
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 4,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: 'white',
                    color: token.colorTextQuaternary,
                    fontFamily: 'monospace',
                    marginLeft: 2,
                  }}
                >
                  ⌘K
                </kbd>
              </button>

              {/* GitHub */}
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: 8,
                  color: token.colorTextSecondary,
                  transition: 'color 0.18s ease, background 0.18s ease',
                  textDecoration: 'none',
                }}
                className="lp-nav-link"
              >
                <GithubOutlined style={{ fontSize: 18 }} />
              </a>

              {/* Back to landing */}
              <Link href="/" style={{ textDecoration: 'none' }}>
                <Button
                  type="text"
                  icon={<HomeOutlined />}
                  style={{
                    color: token.colorTextSecondary,
                    fontWeight: 500,
                    height: 34,
                    paddingInline: 12,
                    fontSize: 13,
                    borderRadius: 7,
                  }}
                >
                  Home
                </Button>
              </Link>

              {/* Open App CTA */}
              <Link href={ROUTES.AUTH.SIGNIN} style={{ textDecoration: 'none' }}>
                <Button
                  type="primary"
                  icon={<ArrowRightOutlined />}
                  style={{
                    fontWeight: 700,
                    height: 34,
                    paddingInline: 16,
                    borderRadius: 8,
                    fontSize: 13,
                    boxShadow: `0 3px 10px rgba(15,118,110,0.3)`,
                  }}
                >
                  Open App
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          {isMobile && (
            <button
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: token.borderRadius,
              }}
            >
              <HamburgerIcon
                open={menuOpen}
                barColor={token.colorText}
                barBorderRadius={token.borderRadiusXS}
              />
            </button>
          )}
        </div>

        {/* ── Mobile dropdown menu ─────────────────────────── */}
        {isMobile && (
          <div
            role="dialog"
            aria-label="Docs mobile navigation"
            style={{
              overflow: 'hidden',
              maxHeight: menuOpen ? 400 : 0,
              opacity: menuOpen ? 1 : 0,
              transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease',
              borderTop: menuOpen ? `1px solid ${token.colorBorderSecondary}` : 'none',
              background: 'white',
            }}
          >
            <div style={{ padding: '8px 16px 24px' }}>
              {/* GitHub */}
              <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 4px',
                    fontSize: 15,
                    fontWeight: 600,
                    color: token.colorText,
                    textDecoration: 'none',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  <GithubOutlined />
                  GitHub
                </a>
              {/* Auth actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Link href="/" onClick={closeMenu} style={{ flex: 1 }}>
                  <Button
                    block
                    ghost
                    style={{
                      height: 42,
                      fontWeight: 600,
                      borderRadius: 8,
                      borderColor: token.colorBorderSecondary,
                      color: token.colorText,
                    }}
                  >
                    Home
                  </Button>
                </Link>
                <Link href={ROUTES.AUTH.SIGNIN} onClick={closeMenu} style={{ flex: 1 }}>
                  <Button
                    type="primary"
                    block
                    style={{
                      height: 42,
                      fontWeight: 700,
                      borderRadius: 8,
                      boxShadow: `0 2px 10px rgba(15,118,110,0.3)`,
                    }}
                  >
                    Open App
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Backdrop */}
      {isMobile && menuOpen && (
        <div
          aria-hidden="true"
          onClick={closeMenu}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 199,
            background: 'rgba(0,0,0,0.35)',
          }}
        />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   LANDING NAVBAR — scroll-aware glassmorphism bar for / pages.
   ════════════════════════════════════════════════════════════════ */
function LandingNavbar() {
  const { token } = theme.useToken();
  const pathname = usePathname();
  const [scrolled,   setScrolled]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => { setIsMobile(mq.matches); if (!mq.matches) setMenuOpen(false); };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const textColor = token.colorText;
  const textMuted = token.colorTextSecondary;

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          height: 72,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          background: menuOpen ? 'rgba(255,255,255,0.99)' : (scrolled ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.95)'),
          borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid rgba(226,232,240,0.6)',
          boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.06)' : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '100%',
            maxWidth: 1400,
            margin: '0 auto',
            padding: '0 clamp(16px, 3vw, 40px)',
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            onClick={closeMenu}
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryHover} 100%)`,
                color: token.colorTextLightSolid,
                flexShrink: 0,
                boxShadow: `0 4px 12px rgba(15,118,110,0.28)`,
              }}
            >
              <ShieldIcon size={16} />
            </div>
            <Text
              strong
              style={{ fontSize: 20, color: textColor, margin: 0, letterSpacing: '-0.025em', fontWeight: 800 }}
            >
              SAST Integration
            </Text>
          </Link>

          {/* Desktop nav */}
          {!isMobile && (
            <nav aria-label="Primary navigation" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {NAV_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    className="lp-nav-link"
                    style={{
                      padding: '7px 14px',
                      fontSize: 15,
                      fontWeight: 600,
                      color: isActive ? token.colorPrimary : textMuted,
                      textDecoration: 'none',
                      borderRadius: 8,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>
          )}

          {/* Desktop actions */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-nav-link"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  color: '#64748b',
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  borderRadius: 8,
                }}
              >
                <GithubOutlined style={{ fontSize: 16 }} />
                <span>GitHub</span>
              </a>
              <Link href={ROUTES.AUTH.SIGNIN}>
                <Button
                  type="text"
                  style={{ color: textColor, fontWeight: 600, height: 38, paddingInline: 16, borderRadius: 8, fontSize: 14 }}
                >
                  Sign in
                </Button>
              </Link>
              <Link href={ROUTES.AUTH.SIGNUP}>
                <Button
                  type="primary"
                  style={{
                    fontWeight: 700, height: 38, paddingInline: 20, borderRadius: 8, fontSize: 14,
                    boxShadow: `0 4px 12px rgba(15,118,110,0.35)`,
                  }}
                >
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          {isMobile && (
            <button
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 8, display: 'flex', alignItems: 'center',
                justifyContent: 'center', borderRadius: token.borderRadius,
              }}
            >
              <HamburgerIcon open={menuOpen} barColor={textColor} barBorderRadius={token.borderRadiusXS} />
            </button>
          )}
        </div>

        {/* Mobile drawer */}
        {isMobile && (
          <div
            role="dialog"
            aria-label="Mobile navigation"
            style={{
              overflow: 'hidden',
              maxHeight: menuOpen ? 520 : 0,
              opacity: menuOpen ? 1 : 0,
              transition: 'max-height 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
              borderTop: menuOpen ? '1px solid #e2e8f0' : 'none',
              background: 'white',
            }}
          >
            <div style={{ padding: '8px 20px 28px' }}>
              <nav aria-label="Mobile navigation links">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={closeMenu}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '13px 4px', fontSize: token.fontSizeLG, fontWeight: 600,
                      color: textColor, textDecoration: 'none',
                      borderBottom: '1px solid #f1f5f9', transition: 'color 0.18s ease',
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '13px 4px', fontSize: token.fontSizeLG, fontWeight: 600,
                  color: textColor, textDecoration: 'none',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <GithubOutlined style={{ fontSize: token.fontSizeLG }} />
                GitHub
              </a>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <Link href={ROUTES.AUTH.SIGNIN} onClick={closeMenu} style={{ flex: 1 }}>
                  <Button ghost block style={{ borderColor: '#e2e8f0', color: textColor, fontWeight: 600, height: 44, fontSize: token.fontSize, borderRadius: token.borderRadiusLG }}>
                    Sign in
                  </Button>
                </Link>
                <Link href={ROUTES.AUTH.SIGNUP} onClick={closeMenu} style={{ flex: 1 }}>
                  <Button type="primary" block style={{ fontWeight: 700, height: 44, fontSize: token.fontSize, borderRadius: token.borderRadiusLG, boxShadow: `0 2px 12px rgba(15,118,110,0.35)` }}>
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Backdrop */}
      {isMobile && menuOpen && (
        <div
          aria-hidden="true"
          onClick={closeMenu}
          style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
        />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   PUBLIC LAYOUT — renders the correct navbar based on route.
   /docs/** → DocsNavbar (height 56px, minimal docs-style)
   /**       → LandingNavbar (height 72px, full marketing bar)
   ════════════════════════════════════════════════════════════════ */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDocsPage = pathname.startsWith('/docs');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {isDocsPage ? <DocsNavbar /> : <LandingNavbar />}
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
