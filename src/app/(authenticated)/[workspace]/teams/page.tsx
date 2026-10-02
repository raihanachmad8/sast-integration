'use client';

import { TeamsPage } from '@/features/teams/TeamsPage';

/**
 * Route handler for the Teams list page.
 *
 * @remarks
 * Thin wrapper — all logic lives in {@link TeamsPage}.
 *
 * @returns The teams management page.
 */
export default function Page() {
  return <TeamsPage />;
}
