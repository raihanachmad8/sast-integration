'use client';

import { Flex, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { WorkspaceGeneralSettings } from '@/features/workspace';
import { useSessionData } from '@/modules/auth/queries';

/**
 * Workspace settings page — general workspace configuration.
 * Part of the CONFIGURE section in the sidebar.
 *
 * Routes: `/{workspaceSlug}/settings`
 *
 * @example
 * ```tsx
 * // Accessed via sidebar → Configure → Settings
 * <SettingsPage />
 * ```
 */
export default function SettingsPage() {
  const { token } = theme.useToken();
  const session = useSessionData();
  const workspaceId = session.data?.workspace?.id ?? '';

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader title="Settings" description="Configure workspace name, slug, and description." />
      <WorkspaceGeneralSettings workspaceId={workspaceId} />
    </Flex>
  );
}
