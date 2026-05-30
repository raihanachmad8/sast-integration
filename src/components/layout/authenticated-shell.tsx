'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ROUTES } from '@/commons/constants';
import { useSessionQuery } from '@/modules/auth/queries';
import { AppShell } from './app-shell';

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
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
