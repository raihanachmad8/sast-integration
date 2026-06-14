'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Flex, theme } from 'antd';
import { useSessionData } from '@/modules/auth/queries';
import { useCreateProjectMutation, useUpdateProjectMutation } from '@/modules/projects';
import { errorMessage } from '@/lib/api/errors';
import { ProjectsPageHeader, ProjectsTable, ProjectFormModal } from '@/features/projects';
import type { Project } from '@/commons/types';
import type { ProjectFormInput } from '@/modules/projects/types';

export function ProjectsPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const router = useRouter();
  const session = useSessionData();
  const workspaceSlug = session.data?.workspace?.slug ?? '';

  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleCreate = (input: ProjectFormInput) => {
    createMutation.mutate(input, {
      onSuccess: () => { setFormOpen(false); message.success(`Project "${input.name}" created`); },
      onError: (err) => message.error(errorMessage(err)),
    });
  };

  const handleEdit = (input: ProjectFormInput) => {
    if (!editingProject) return;
    updateMutation.mutate({ id: editingProject.id, payload: input }, {
      onSuccess: () => { setFormOpen(false); setEditingProject(null); message.success(`Project "${input.name}" updated`); },
      onError: (err) => message.error(errorMessage(err)),
    });
  };

  const handleView = (project: Project) => { router.push(`/${workspaceSlug}/projects/${project.id}`); };

  return (
    <Flex vertical gap={token.paddingXL}>
      <ProjectsPageHeader onNewProject={() => { setEditingProject(null); setFormOpen(true); }} />

      <ProjectsTable onView={handleView} />

      <ProjectFormModal
        open={formOpen}
        project={editingProject}
        onCancel={() => { setFormOpen(false); setEditingProject(null); }}
        onConfirm={editingProject ? handleEdit : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </Flex>
  );
}
