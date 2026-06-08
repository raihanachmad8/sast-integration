'use client';

import { NewProjectPage } from '@/features/projects/NewProjectPage';

/**
 * Route handler for creating a new project.
 *
 * @remarks
 * Thin wrapper — all logic lives in {@link NewProjectPage}.
 *
 * @returns The new project creation page.
 */
export default function Page() {
  return <NewProjectPage />;
}
