'use client';

import { use } from 'react';
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage';

/**
 * Route handler for viewing project details.
 * Thin wrapper — extracts `projectId` from dynamic route params and passes
 * it to {@link ProjectDetailPage}.
 *
 * @param params - Next.js dynamic route params containing `projectId`.
 * @returns The project detail page.
 */
export default function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return <ProjectDetailPage projectId={projectId} />;
}
