'use client';

import FindingsPage from '@/features/findings/FindingsPage';

/**
 * Route handler for the Findings list page.
 * Thin wrapper — all logic lives in FindingsPage.
 *
 * Routes: `/{workspaceSlug}/findings`
 */
export default function Page() {
  return <FindingsPage />;
}
