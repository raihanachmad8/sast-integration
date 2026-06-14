'use client';

import { Button, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { FaIcon } from '@/components/shared/FaIcon';
import { PERMISSION } from '@/commons/constants/permissions';

interface ProjectsPageHeaderProps {
  onNewProject: () => void;
}

export function ProjectsPageHeader({ onNewProject }: ProjectsPageHeaderProps) {
  const { token } = theme.useToken();
  return (
    <PageHeader
      title="Projects"
      description="Group repositories and teams. Projects scope access, automation, and quality gates."
      actions={
        <PermissionGate permission={PERMISSION.PROJECT_MANAGE}>
          <Button type="primary" onClick={onNewProject} style={{ boxShadow: token.boxShadowSecondary }}>
            <FaIcon icon="fa-plus" /> New project
          </Button>
        </PermissionGate>
      }
    />
  );
}
