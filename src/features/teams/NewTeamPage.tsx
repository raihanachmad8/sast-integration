'use client';

import { Flex, theme } from 'antd';
import { PageHeader } from '@/commons/components/PageHeader';
import { TeamForm } from '@/features/teams';

/**
 * Full-page wrapper for creating a new team with a page header and the TeamForm.
 *
 * @returns JSX element rendering the new team creation page.
 *
 * @example
 * <NewTeamPage />
 */
export function NewTeamPage() {
  const { token } = theme.useToken();
  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader title="New team" description="Create a new team and add members." />
      <TeamForm />
    </Flex>
  );
}
