'use client';

import { ProjectsPage } from '@/features/projects/ProjectsPage';

/**
 * Route handler for the Projects list page.
 *
 * @remarks
 * Thin wrapper — all logic lives in {@link ProjectsPage}.
 *
 * @returns The projects management page.
 */
export default function Page() {
  return <ProjectsPage />;
}
