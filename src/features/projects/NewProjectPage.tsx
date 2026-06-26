'use client';

import { Flex, theme } from 'antd';
import { PageHeader } from '@/commons/components/PageHeader';
import { ProjectForm } from '@/features/projects';

/**
 * Full-page wrapper for creating a new project with a page header and the ProjectForm.
 *
 * @returns JSX element rendering the new project creation page.
 *
 * @example
 * <NewProjectPage />
 */
export function NewProjectPage() {
  const { token } = theme.useToken();
  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader title="New project" description="Create a new project and attach teams and repositories." />
      <ProjectForm />
    </Flex>
  );
}
