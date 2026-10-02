'use client';

import { useState } from 'react';
import { App, Flex, theme } from 'antd';
import { useProjectsQuery } from '@/modules/project';
import { errorMessage } from '@/lib/api/errors';
import { ProjectsPageHeader, ProjectsTable, ProjectFormModal, ProjectDetailDrawer } from '@/features/projects';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import type { Project } from '@/commons/types';
import type { ProjectFormInput } from '@/modules/project/types';

export function ProjectsPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const projectsQuery = useProjectsQuery();

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleCreate = (input: ProjectFormInput) => { setFormOpen(false); message.success(`Project "${input.name}" created`); };
  const handleEdit = (input: ProjectFormInput) => { setFormOpen(false); setEditingProject(null); message.success(`Project "${input.name}" updated`); };
  const handleView = (project: Project) => { setSelectedProject(project); setDetailOpen(true); };
  const handleEditFromDetail = (project: Project) => { setEditingProject(project); setFormOpen(true); setDetailOpen(false); };

  if (projectsQuery.isLoading) {
    return <LoadingState text="Loading projects..." />;
  }

  if (projectsQuery.isError) {
    return (
      <Flex vertical gap={token.paddingXL * 2}>
        <ProjectsPageHeader onNewProject={() => { setEditingProject(null); setFormOpen(true); }} />
        <ErrorState title="Failed to load projects" description={errorMessage(projectsQuery.error)} onRetry={() => projectsQuery.refetch()} />
      </Flex>
    );
  }

  const projects = projectsQuery.data ?? [];

  return (
    <Flex vertical gap={token.paddingXL * 2}>
      <ProjectsPageHeader onNewProject={() => { setEditingProject(null); setFormOpen(true); }} />

      <ProjectsTable rows={projects} onView={handleView} onEdit={(project) => { setEditingProject(project); setFormOpen(true); }} />

      <ProjectFormModal open={formOpen} project={editingProject} onCancel={() => { setFormOpen(false); setEditingProject(null); }} onConfirm={editingProject ? handleEdit : handleCreate} />

      <ProjectDetailDrawer open={detailOpen} project={selectedProject} onClose={() => { setDetailOpen(false); setSelectedProject(null); }} onEdit={handleEditFromDetail} />
    </Flex>
  );
}
