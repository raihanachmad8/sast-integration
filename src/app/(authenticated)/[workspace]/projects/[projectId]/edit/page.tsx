'use client';

import { use } from 'react';
import { EditProjectPage } from '@/features/projects/EditProjectPage';

/**
 * Route handler for editing an existing project.
 *
 * @remarks
 * Thin wrapper — extracts `projectId` from dynamic route params and passes
 * it to {@link EditProjectPage}.
 *
 * @param params - Next.js dynamic route params containing `projectId`.
 * @returns The project edit page.
 */
export default function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);

  return <EditProjectPage projectId={projectId} />;
}
