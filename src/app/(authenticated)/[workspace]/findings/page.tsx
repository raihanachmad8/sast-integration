'use client';

import { FindingsPage } from '@/features/findings';
import { PermissionGate, PermissionHint } from '@/commons/components/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';

/**
 * Route handler for the Findings list page.
 * Thin wrapper — all logic lives in FindingsPage.
 *
 * Routes: `/{workspaceSlug}/findings`
 */
export default function Page() {
  return (
    <PermissionGate permission={PERMISSION.FINDING_VIEW} fallback={<PermissionHint permission={PERMISSION.FINDING_VIEW} />}>
      <FindingsPage />
    </PermissionGate>
  );
}
