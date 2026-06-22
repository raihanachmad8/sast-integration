'use client';

import { Button, theme } from 'antd';
import { PageHeader } from '@/commons/components/PageHeader';
import { PermissionGate } from '@/commons/components/PermissionGate';
import { FaIcon } from '@/commons/components/FaIcon';
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
