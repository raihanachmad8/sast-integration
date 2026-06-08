'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Flex, theme } from 'antd';
import { useSessionQuery } from '@/modules/auth/queries';
import { ProjectsPageHeader, ProjectsTable, ProjectFormModal } from '@/features/projects';
import type { Project } from '@/commons/types';
import type { ProjectFormInput } from '@/modules/projects/types';

export function ProjectsPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const router = useRouter();
  const session = useSessionQuery();
  const workspaceSlug = session.data?.workspace?.slug ?? '';

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleCreate = (input: ProjectFormInput) => { setFormOpen(false); message.success(`Project "${input.name}" created`); };
  const handleEdit = (input: ProjectFormInput) => { setFormOpen(false); setEditingProject(null); message.success(`Project "${input.name}" updated`); };
  const handleView = (project: Project) => { router.push(`/${workspaceSlug}/projects/${project.id}`); };

  return (
    <Flex vertical gap={token.paddingXL}>
      <ProjectsPageHeader onNewProject={() => { setEditingProject(null); setFormOpen(true); }} />

      <ProjectsTable onView={handleView} />

      <ProjectFormModal open={formOpen} project={editingProject} onCancel={() => { setFormOpen(false); setEditingProject(null); }} onConfirm={editingProject ? handleEdit : handleCreate} />
    </Flex>
  );
}
