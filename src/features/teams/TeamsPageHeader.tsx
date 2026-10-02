'use client';

import { Button, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { FaIcon } from '@/components/shared/fa-icon';
import { PERMISSION } from '@/commons/constants/permissions';

interface TeamsPageHeaderProps {
  onNewTeam: () => void;
}

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
