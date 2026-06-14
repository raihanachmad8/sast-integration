'use client';

import { useState } from 'react';
import { App, Flex, theme } from 'antd';
import { useTeamMembersQuery, useCreateTeamMutation, useUpdateTeamMutation } from '@/modules/teams';
import { errorMessage } from '@/lib/api/errors';
import { TeamsPageHeader, TeamsTable, TeamFormModal, TeamDetailDrawer } from '@/features/teams';
import type { Team } from '@/commons/types';
import type { TeamFormInput } from '@/modules/teams/types';

/**
 * Main teams page component.
 * Manages team list, create/edit modals, and detail drawer.
 */
export function TeamsPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const createMutation = useCreateTeamMutation();
  const updateMutation = useUpdateTeamMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const membersQuery = useTeamMembersQuery(selectedTeam?.id ?? '');

  const handleCreate = (input: TeamFormInput) => {
    createMutation.mutate(input, {
      onSuccess: () => { setFormOpen(false); message.success(`Team "${input.name}" created`); },
      onError: (err) => message.error(errorMessage(err)),
    });
  };

  const handleEdit = (input: TeamFormInput) => {
    if (!editingTeam) return;
    updateMutation.mutate({ id: editingTeam.id, payload: input }, {
      onSuccess: () => { setFormOpen(false); setEditingTeam(null); message.success(`Team "${input.name}" updated`); },
      onError: (err) => message.error(errorMessage(err)),
    });
  };

  const handleView = (team: Team) => { setSelectedTeam(team); setDetailOpen(true); };
  const handleEditFromDetail = (team: Team) => { setEditingTeam(team); setFormOpen(true); setDetailOpen(false); };

  return (
    <Flex vertical gap={token.paddingXL}>
      <TeamsPageHeader onNewTeam={() => { setEditingTeam(null); setFormOpen(true); }} />

      <TeamsTable
        onView={handleView}
        onEdit={(team) => { setEditingTeam(team); setFormOpen(true); }}
      />

      <TeamFormModal
        open={formOpen}
        team={editingTeam}
        onCancel={() => { setFormOpen(false); setEditingTeam(null); }}
        onConfirm={editingTeam ? handleEdit : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <TeamDetailDrawer
        open={detailOpen}
        team={selectedTeam}
        members={membersQuery.data ?? []}
        onClose={() => { setDetailOpen(false); setSelectedTeam(null); }}
        onEdit={handleEditFromDetail}
      />
    </Flex>
  );
}
