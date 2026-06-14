'use client';

import { NewTeamPage } from '@/features/teams/NewTeamPage';

/**
 * Route handler for creating a new team.
 *
 * @remarks
 * Thin wrapper — all logic lives in {@link NewTeamPage}.
 *
 * @returns The new team creation page.
 */
export default function Page() {
  return <NewTeamPage />;
}
