'use client';

import { Flex, theme } from 'antd';
import { PageHeader } from '@/commons/components/PageHeader';
import { TeamForm } from '@/features/teams';

export function NewTeamPage() {
  const { token } = theme.useToken();
  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader title="New team" description="Create a new team and add members." />
      <TeamForm />
    </Flex>
  );
}
