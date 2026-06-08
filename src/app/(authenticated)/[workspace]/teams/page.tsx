'use client';

import { TeamsPage } from '@/features/teams/TeamsPage';

/**
 * Route handler for the Teams list page.
 * Thin wrapper — all logic lives in TeamsPage.
 *
 * @returns The teams management page.
 */
export default function Page() {
  return <TeamsPage />;
}
