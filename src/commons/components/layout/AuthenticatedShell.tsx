'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ROUTES } from '@/commons/constants';
import { useSessionQuery } from '@/modules/auth/queries';
import { getCachedWorkspace } from '@/lib/api/client';
import type { CachedWorkspace } from '@/lib/api/client';
import { AppShell } from './AppShell';
import { EmailVerificationBanner } from '@/features/auth/components/EmailVerificationBanner';
import { LoadingState } from '@/commons/components/LoadingState';

/**
 * Authenticated shell wrapper for protected routes.
 *
 * Uses localStorage cache for optimistic rendering — if the URL slug matches
 * the cached workspace, children render immediately while the session validates
 * async in the background. This eliminates loading flashes on page reload and
 * navigation between workspace pages.
 */
export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSessionQuery();
  const routeWorkspaceSlug = pathname.split('/')[1] ?? '';
  const hasRedirected = useRef(false);

  // Read localStorage after mount to avoid hydration mismatch
  const [cachedWorkspace, setCachedWorkspace] = useState<CachedWorkspace | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- single read after mount, not a cascade
    setCachedWorkspace(getCachedWorkspace());
  }, []);

  const sessionSlug = session.data?.workspace?.slug;
  const isSlugValid = sessionSlug === routeWorkspaceSlug;
  const isSlugCached = cachedWorkspace?.slug === routeWorkspaceSlug;
  const canRenderOptimistically = isSlugCached && !session.isError;

  useEffect(() => {
    if (hasRedirected.current) return;
    if (pathname === ROUTES.CHOOSER) return;
    if (session.isLoading || session.isFetching) return;

    if (session.isError) {
      hasRedirected.current = true;
      router.replace(`${ROUTES.AUTH.SIGNIN}?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const currentWorkspace = session.data?.workspace;
    if (!currentWorkspace || currentWorkspace.slug !== routeWorkspaceSlug) {
      hasRedirected.current = true;
      router.replace(`${ROUTES.CHOOSER}?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, routeWorkspaceSlug, session.data?.workspace, session.isError, session.isFetching, session.isLoading, router]);

  if (pathname === ROUTES.CHOOSER) {
    return <>{children}</>;
  }

  if (session.isError) {
    return <LoadingState text="Signing you in..." fullHeight />;
  }

  if ((session.isLoading || session.isFetching) && !canRenderOptimistically) {
    return <LoadingState text="Loading workspace..." fullHeight />;
  }

  if (!isSlugValid && !isSlugCached) {
    return <LoadingState text="Loading workspace..." fullHeight />;
  }

  return (
    <AppShell>
      <EmailVerificationBanner />
      {children}
    </AppShell>
  );
}
