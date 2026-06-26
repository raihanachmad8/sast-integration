'use client';

import { Typography, Flex, theme } from 'antd';
import { useTeamQuery } from '@/modules/teams';
import { PageHeader } from '@/commons/components/PageHeader';
import { TeamForm } from '@/features/teams';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorState } from '@/commons/components/ErrorState';
import { errorMessage } from '@/lib/api/errors';

/**
 * Full-page team editor with the TeamForm component.
 *
 * Loads the team by ID and renders the TeamForm for editing.
 *
 * @param props - Component props.
 * @param props.teamId - The unique identifier of the team to edit.
 * @returns JSX element rendering the team edit page with loading/error states.
 *
 * @example
 * <EditTeamPage teamId="team_456" />
 */
export function EditTeamPage({ teamId }: { teamId: string }) {
  const { token } = theme.useToken();
  const teamQuery = useTeamQuery(teamId);
  const team = teamQuery.data ?? null;

  if (teamQuery.isLoading) {
    return <LoadingState text="Loading team..." />;
  }

  if (teamQuery.isError) {
    return (
      <Flex vertical gap={token.paddingXL}>
        <PageHeader title="Edit team" description="Failed to load team." />
        <ErrorState title="Failed to load team" description={errorMessage(teamQuery.error)} onRetry={() => teamQuery.refetch()} />
      </Flex>
    );
  }

  if (!team) {
    return (
      <div style={{ textAlign: 'center', padding: token.paddingXL }}>
        <Typography.Title level={2} style={{ fontWeight: token.fontWeightStrong }}>Team not found</Typography.Title>
        <Typography.Paragraph type="secondary">The team you are looking for does not exist.</Typography.Paragraph>
      </div>
    );
  }

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader title="Edit team" description={`Update team details and members for ${team.name}.`} />
      <TeamForm team={team} />
    </Flex>
  );
}
