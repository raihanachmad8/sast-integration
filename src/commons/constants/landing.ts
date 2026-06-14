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
