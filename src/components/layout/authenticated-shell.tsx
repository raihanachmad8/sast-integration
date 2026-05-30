'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ROUTES } from '@/commons/constants';
import { useSessionQuery } from '@/modules/auth/queries';
import { AppShell } from './app-shell';
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner';
import { LoadingState } from '@/components/shared/LoadingState';

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSessionQuery();
  const routeWorkspaceSlug = pathname.split('/')[1] ?? '';

  useEffect(() => {
    if (pathname === ROUTES.CHOOSER || session.isLoading || session.isFetching) return;

    if (session.isError) {
      router.replace(`${ROUTES.AUTH.SIGNIN}?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const currentWorkspace = session.data?.workspace;
    if (!currentWorkspace || currentWorkspace.slug !== routeWorkspaceSlug) {
      router.replace(ROUTES.CHOOSER);
    }
  }, [pathname, routeWorkspaceSlug, router, session.data?.workspace, session.isError, session.isFetching, session.isLoading]);

  if (pathname === ROUTES.CHOOSER) {
    return <>{children}</>;
  }

  if (session.isLoading || session.isFetching || session.isError || !session.data?.workspace || session.data.workspace.slug !== routeWorkspaceSlug) {
    // Render a proper loading state instead of blank page.
    // This prevents layout flash, improves perceived performance,
    // and makes E2E tests much more stable (elements are always findable).
    return <LoadingState text="Loading workspace..." fullHeight />;
  }

  return (
    <AppShell>
      {/* Global email verification reminder */}
      <EmailVerificationBanner />
      {children}
    </AppShell>
  );
}
