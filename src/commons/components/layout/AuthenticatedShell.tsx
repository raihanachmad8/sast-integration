'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ROUTES } from '@/commons/constants';
import { useSessionQuery } from '@/modules/auth/queries';
import { AppShell } from './AppShell';
import { EmailVerificationBanner } from '@/features/auth/components/EmailVerificationBanner';
import { LoadingState } from '@/commons/components/LoadingState';

/**
 * Auth-genticated shell wrapper for protected routes.
 *
 * Handles three responsibilities:
 * 1. **Session guard** — redirects to `/auth/signin` if session is invalid or missing.
 * 2. **Workspace guard** — redirects to `/workspaces` if slug doesn't match active workspace.
 * 3. **Layout wrapper** — wraps children in {@link AppShell} with email verification banner.
 *
 * Used by `(authenticated)/[workspace]/layout.tsx` as the root layout for all protected pages.
 *
 * @example
 * ```tsx
 * // In (authenticated)/layout.tsx
 * export default function AuthenticatedLayout({ children }) {
 *   return (
 *     <QueryProvider>
 *       <AuthenticatedShell>{children}</AuthenticatedShell>
 *     </QueryProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Behavior matrix:
 * // /workspaces          → passes through (no shell)
 * // /my-ws/dashboard     → AppShell + children
 * // /invalid-slug        → redirect to /workspaces
 * // unauthenticated      → redirect to /auth/signin
 * ```
 */
export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSessionQuery();
  const routeWorkspaceSlug = pathname.split('/')[1] ?? '';
  const hasRedirected = useRef(false);

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

  if (session.isLoading || session.isError || !session.data?.workspace || session.data.workspace.slug !== routeWorkspaceSlug) {
    return <LoadingState text="Loading workspace..." fullHeight />;
  }

  return (
    <AppShell>
      <EmailVerificationBanner />
      {children}
    </AppShell>
  );
}
