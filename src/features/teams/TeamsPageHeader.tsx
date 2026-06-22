'use client';

import { Button, theme } from 'antd';
import { PageHeader } from '@/commons/components/PageHeader';
import { PermissionGate } from '@/commons/components/PermissionGate';
import { FaIcon } from '@/commons/components/FaIcon';
import { PERMISSION } from '@/commons/constants/permissions';

interface TeamsPageHeaderProps {
  /** Callback triggered when the user clicks "New team" button. */
  onNewTeam: () => void;
}

/**
 * Page header for the teams page with title, description, and create button.
 * Create button is only visible to users with TEAM_MANAGE permission.
 *
 * @example
 * <TeamsPageHeader onNewTeam={() => openCreateModal()} />
 */
export function TeamsPageHeader({ onNewTeam }: TeamsPageHeaderProps) {
  const { token } = theme.useToken();
  return (
    <PageHeader
      title="Teams"
      description="Teams group people for project assignment. Permissions are managed at workspace level."
      actions={
        <PermissionGate permission={PERMISSION.TEAM_MANAGE}>
          <Button type="primary" onClick={onNewTeam} style={{ boxShadow: token.boxShadowSecondary }}>
            <FaIcon icon="fa-plus" /> New team
          </Button>
        </PermissionGate>
      }
    />
  );
}
