'use client';

import { useEffect, useState } from 'react';

/** Breakpoint definitions matching common screen sizes. */
export const BREAKPOINTS = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
} as const;

/** Return type for the useBreakpoint hook. */
interface BreakpointState {
  /** Current screen width */
  width: number;
  /** Whether screen is at least xs (480px) */
  isXs: boolean;
  /** Whether screen is at least sm (576px) */
  isSm: boolean;
  /** Whether screen is at least md (768px) */
  isMd: boolean;
  /** Whether screen is at least lg (992px) */
  isLg: boolean;
  /** Whether screen is at least xl (1200px) */
  isXl: boolean;
  /** Whether screen is at least xxl (1600px) */
  isXxl: boolean;
  /** Whether screen is mobile (< 768px) */
  isMobile: boolean;
  /** Whether screen is tablet (768px - 992px) */
  isTablet: boolean;
  /** Whether screen is desktop (>= 992px) */
  isDesktop: boolean;
}

/**
 * Hook that tracks the current viewport size and provides breakpoint info.
 *
 * @returns Current breakpoint state
 *
 * @example
 * ```tsx
 * const { isMobile, isDesktop } = useBreakpoint();
 *
 * return (
 *   <div style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 300px' }}>
 *     ...
 *   </div>
 * );
 * ```
 */
export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1200,
        isXs: false, isSm: false, isMd: true, isLg: true, isXl: true, isXxl: false,
        isMobile: false, isTablet: false, isDesktop: true,
      };
    }
    return getBreakpointState(window.innerWidth);
  });

  useEffect(() => {
    const handleResize = () => {
      setState(getBreakpointState(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
}

function getBreakpointState(width: number): BreakpointState {
  return {
    width,
    isXs: width >= BREAKPOINTS.xs,
    isSm: width >= BREAKPOINTS.sm,
    isMd: width >= BREAKPOINTS.md,
    isLg: width >= BREAKPOINTS.lg,
    isXl: width >= BREAKPOINTS.xl,
    isXxl: width >= BREAKPOINTS.xxl,
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
  };
}

/**
 * Responsive grid column count based on screen size.
 *
 * @param columns - Object mapping breakpoint to column count
 * @returns CSS grid-template-columns value
 *
 * @example
 * ```tsx
 * const columns = useResponsiveColumns({ xs: 1, sm: 2, lg: 3 });
 * // Returns: "1fr" on mobile, "1fr 1fr" on tablet, "1fr 1fr 1fr" on desktop
 * ```
 */
export function useResponsiveColumns(columns: Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number>>): string {
  const { isSm, isMd, isLg, isXl } = useBreakpoint();

  const count = isXl ? (columns.xl ?? columns.lg ?? columns.md ?? columns.sm ?? columns.xs ?? 3)
    : isLg ? (columns.lg ?? columns.md ?? columns.sm ?? columns.xs ?? 3)
    : isMd ? (columns.md ?? columns.sm ?? columns.xs ?? 2)
    : isSm ? (columns.sm ?? columns.xs ?? 1)
    : (columns.xs ?? 1);

  return `repeat(${count}, 1fr)`;
}
