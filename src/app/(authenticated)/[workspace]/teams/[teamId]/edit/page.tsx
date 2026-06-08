'use client';

import { use } from 'react';
import { EditTeamPage } from '@/features/teams/EditTeamPage';

/**
 * Route handler for editing an existing team.
 *
 * @remarks
 * Thin wrapper — extracts `teamId` from dynamic route params and passes
 * it to {@link EditTeamPage}.
 *
 * @param params - Next.js dynamic route params containing `teamId`.
 * @returns The team edit page.
 */
export default function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);

  return <EditTeamPage teamId={teamId} />;
}
