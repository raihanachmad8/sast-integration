'use client';

import { Flex, theme } from 'antd';
import { PageHeader } from '@/commons/components/PageHeader';
import { ProjectForm } from '@/features/projects';

export function NewProjectPage() {
  const { token } = theme.useToken();
  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader title="New project" description="Create a new project and attach teams and repositories." />
      <ProjectForm />
    </Flex>
  );
}
