'use client';

import { App, Flex, theme } from 'antd';
import { useState } from 'react';

import { useConfirm } from '@/commons/components/ConfirmDialog';
import type { TeamWithSummary, TeamDetail } from '@/commons/types/team';
import { TeamsPageHeader, TeamsTable, TeamFormModal, TeamDetailDrawer } from '@/features/teams';
import { errorMessage } from '@/lib/api/errors';
import { useTeamQuery, useCreateTeamMutation, useUpdateTeamMutation, useDeleteTeamMutation } from '@/modules/teams';
import type { TeamFormInput } from '@/modules/teams/types';

/**
 * Main teams page component.
 * Manages team list, create/edit modals, and detail drawer.
 */
export function TeamsPage() {
  const { message, modal: _modal } = App.useApp();
  const { token } = theme.useToken();
  const { confirm } = useConfirm();

  const createMutation = useCreateTeamMutation();
  const updateMutation = useUpdateTeamMutation();
  const deleteMutation = useDeleteTeamMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamWithSummary | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithSummary | null>(null);

  const membersQuery = useTeamQuery(selectedTeam?.id ?? '');

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

  const handleView = (team: TeamWithSummary) => { setSelectedTeam(team); setDetailOpen(true); };

  const handleDelete = (team: TeamWithSummary) => {
    confirm({
      title: 'Delete team?',
      content: `Delete "${team.name}"? This cannot be undone.`,
      danger: true,
      onOk: () => {
        deleteMutation.mutate(team.id, {
          onSuccess: () => { message.success(`Team "${team.name}" deleted`); },
          onError: (err) => message.error(errorMessage(err)),
        });
      },
    });
  };

  return (
    <Flex vertical gap={token.paddingXL}>
      <TeamsPageHeader onNewTeam={() => { setEditingTeam(null); setFormOpen(true); }} />

      <TeamsTable
        onView={handleView}
        onEdit={(team) => { setEditingTeam(team); setFormOpen(true); }}
        onDelete={handleDelete}
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
        members={membersQuery.data?.members ?? []}
        onClose={() => { setDetailOpen(false); setSelectedTeam(null); }}
      />
    </Flex>
  );
}
