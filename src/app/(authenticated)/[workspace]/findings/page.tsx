'use client';

import { FindingsPage } from '@/features/findings/FindingsPage';

/**
 * Route handler for the Findings list page.
 *
 * @remarks
 * Thin wrapper — all logic lives in {@link FindingsPage}.
 *
 * @returns The findings management page.
 */
export default function Page() {
  return <FindingsPage />;
}
