'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Typography, theme } from 'antd';
import Link from 'next/link';
import { GithubOutlined } from '@ant-design/icons';
import { ROUTES } from '@/commons/constants';
import { GITHUB_REPO_URL } from '@/commons/constants/landing';

const { Text } = Typography;

const NAV_LINKS = [
  { label: 'Features',     href: '#features'      },
  { label: 'How It Works', href: '#how-it-works'  },
  { label: 'Metrics',      href: '#metrics'        },
  { label: 'Docs',         href: ROUTES.DOCS.INDEX },
] as const;

/** Brand shield SVG — matches primary teal palette. */
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
function HamburgerIcon({ open, barColor, barBorderRadius }: { open: boolean; barColor: string; barBorderRadius: number }) {
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
    <div style={{ width: 22, height: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
      <span style={{ ...bar, transform: open ? 'translateY(7px) rotate(45deg)' : 'none' }} />
      <span style={{ ...bar, opacity: open ? 0 : 1, transform: open ? 'scaleX(0)' : 'none' }} />
      <span style={{ ...bar, transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
    </div>
  );
}

/**
 * Public layout — scroll-aware glassmorphism navbar with full mobile support.
 *
 * Desktop (≥768 px): logo + nav links + action buttons in one row.
 * Mobile (<768 px): logo + hamburger button; nav links + actions slide down
 * in a full-width drawer overlay when the hamburger is pressed.
 *
 * The header becomes more opaque once the user scrolls past 16 px.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { token } = theme.useToken();
  const [scrolled,   setScrolled]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);

  /* ── Scroll listener ─────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Breakpoint listener ─────────────────────────────── */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => {
      setIsMobile(mq.matches);
      if (!mq.matches) setMenuOpen(false);
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  /* ── Close menu when clicking a nav link ─────────────── */
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  /* ── Lock body scroll while menu is open ────────────── */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const headerBg = scrolled
    ? 'rgba(5, 15, 13, 0.92)'
    : 'rgba(5, 15, 13, 0.60)';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ════════════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════════════ */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          background: menuOpen ? 'rgba(5,15,13,0.98)' : headerBg,
          borderBottom: scrolled || menuOpen
            ? '1px solid rgba(255,255,255,0.10)'
            : '1px solid rgba(255,255,255,0.04)',
          boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.28)' : 'none',
          transition: 'background 0.32s ease, border-color 0.32s ease, box-shadow 0.32s ease',
        }}
      >
        {/* ── Top bar ──────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 60,
            padding: '0 clamp(16px, 4vw, 56px)',
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
                width: 32,
                height: 32,
                borderRadius: token.borderRadius,
                background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryHover} 100%)`,
                color: token.colorTextLightSolid,
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(15,118,110,0.4)',
              }}
            >
              <ShieldIcon />
            </div>
            <Text
              strong
              style={{ fontSize: token.fontSize, color: token.colorTextLightSolid, margin: 0, letterSpacing: '-0.02em' }}
            >
              SAST Integration
            </Text>
          </Link>

          {/* Desktop nav */}
          {!isMobile && (
            <nav aria-label="Primary navigation" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="lp-nav-link"
                  style={{ padding: `${token.paddingXS}px ${token.paddingSM}px`, fontSize: token.fontSize, fontWeight: token.fontWeightStrong, color: token.colorTextQuaternary }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}

          {/* Desktop actions */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-nav-link"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  color: 'rgba(255,255,255,0.68)',
                  fontSize: token.fontSize,
                  textDecoration: 'none',
                }}
              >
                <GithubOutlined style={{ fontSize: token.fontSizeLG }} />
                <span>GitHub</span>
              </a>
              <Link href={ROUTES.AUTH.SIGNIN}>
                <Button
                  ghost
                  size="small"
                  style={{
                    borderColor: 'rgba(255,255,255,0.28)',
                    color: token.colorTextLightSolid,
                    fontWeight: token.fontWeightStrong,
                    height: 32,
                    paddingInline: 14,
                  }}
                >
                  Sign in
                </Button>
              </Link>
              <Link href={ROUTES.AUTH.SIGNUP}>
                <Button
                  type="primary"
                  size="small"
                  style={{
                    fontWeight: 600,
                    height: 32,
                    paddingInline: 16,
                    background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryHover})`,
                    border: 'none',
                    boxShadow: '0 2px 10px rgba(15,118,110,0.35)',
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
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                transition: 'background 0.18s ease',
              }}
            >
              <HamburgerIcon open={menuOpen} barColor={token.colorTextLightSolid} barBorderRadius={token.borderRadiusXS} />
            </button>
          )}
        </div>

        {/* ── Mobile drawer ────────────────────────────────── */}
        {isMobile && (
          <div
            role="dialog"
            aria-label="Mobile navigation"
            style={{
              overflow: 'hidden',
              maxHeight: menuOpen ? 480 : 0,
              opacity: menuOpen ? 1 : 0,
              transition: 'max-height 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
              borderTop: menuOpen ? '1px solid rgba(255,255,255,0.07)' : 'none',
            }}
          >
            <div style={{ padding: '8px 20px 24px' }}>
              {/* Nav links */}
              <nav aria-label="Mobile navigation links">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={closeMenu}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '13px 4px',
                      fontSize: token.fontSizeLG,
                      fontWeight: token.fontWeightStrong,
                      color: 'rgba(255,255,255,0.80)',
                      textDecoration: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      transition: 'color 0.18s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              {/* GitHub link */}
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '13px 4px',
                  fontSize: token.fontSizeLG,
                  fontWeight: token.fontWeightStrong,
                  color: 'rgba(255,255,255,0.80)',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <GithubOutlined style={{ fontSize: token.fontSizeLG }} />
                GitHub
              </a>

              {/* Auth buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <Link href={ROUTES.AUTH.SIGNIN} onClick={closeMenu} style={{ flex: 1 }}>
                  <Button
                    ghost
                    block
                    style={{
                      borderColor: 'rgba(255,255,255,0.28)',
                      color: token.colorTextLightSolid,
                      fontWeight: token.fontWeightStrong,
                      height: 44,
                      fontSize: token.fontSize,
                      borderRadius: token.borderRadiusLG,
                    }}
                  >
                    Sign in
                  </Button>
                </Link>
                <Link href={ROUTES.AUTH.SIGNUP} onClick={closeMenu} style={{ flex: 1 }}>
                  <Button
                    type="primary"
                    block
                    style={{
                      fontWeight: 600,
                      height: 44,
                      fontSize: token.fontSize,
                      borderRadius: token.borderRadiusLG,
                      background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryHover})`,
                      border: 'none',
                      boxShadow: '0 2px 12px rgba(15,118,110,0.4)',
                    }}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Backdrop — tap outside to close */}
      {isMobile && menuOpen && (
        <div
          aria-hidden="true"
          onClick={closeMenu}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 199,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
