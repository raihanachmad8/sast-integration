/**
 * Landing page design constants — hardcoded colors and values
 * extracted from LandingHero and LandingCTA.
 *
 * @example
 * ```tsx
 * import { LANDING_COLORS } from '@/commons/constants/landing';
 *
 * <span style={{ background: LANDING_COLORS.gradient }}>...</span>
 * ```
 */
export const LANDING_COLORS = {
  gradient: 'linear-gradient(135deg, #5eead4 0%, #a78bfa 100%)',
  teal: { bg: 'rgba(20, 184, 166, 0.15)', text: '#5eead4' },
  purple: { bg: 'rgba(114, 46, 209, 0.1)', text: '#a78bfa' },
  white: { overlay: 'rgba(255,255,255,0.12)', text: 'rgba(255,255,255,0.75)', muted: 'rgba(255,255,255,0.3)' },
  star: '#fbbf24',
} as const;

/** GitHub repository URL — used across all landing page links. */
export const GITHUB_REPO_URL = 'https://github.com/raihanachmad8/sast-integration' as const;

/**
 * Shared layout dimensions for the landing page.
 * Centralises magic numbers that were duplicated across
 * LandingHero and LandingMetrics.
 */
export const LANDING_DIMENSIONS = {
  /** Hero section outer glow orb size */
  heroGlowOrb: 700,
  /** Hero secondary glow orb size */
  heroGlowOrbSecondary: 550,
  /** Metrics section background glow size */
  metricsGlow: 800,
  /** Hero content max-width */
  heroMaxWidth: 1200,
  /** Metrics content max-width */
  metricsMaxWidth: 1100,
  /** Stats bar max-width */
  statsBarMaxWidth: 960,
  /** Comparison table max-width */
  comparisonMaxWidth: 720,
  /** Comparison table min-width (inner scroll) */
  comparisonMinWidth: 480,
} as const;
