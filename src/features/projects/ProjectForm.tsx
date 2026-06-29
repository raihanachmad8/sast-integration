'use client';

import { App, Button, Form, Input, Flex, theme, Select } from 'antd';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { projectFormSchema } from '@/commons/schemas';
import type { ProjectFormInput } from '@/commons/schemas/project.schema';
import type { Project } from '@/commons/types';
import { errorMessage } from '@/lib/api/errors';
import { useLazySelect } from '@/lib/hooks/useLazySelect';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { createZodSync } from '@/lib/utils/zod-sync';
import { membersApi } from '@/modules/members/api';
import { memberKeys } from '@/modules/members/keys';
import { useCreateProjectMutation, useUpdateProjectMutation, useProjectQuery } from '@/modules/projects';
import { repositoriesApi } from '@/modules/repositories/api';
import { repositoryKeys } from '@/modules/repositories/keys';
import { teamsApi } from '@/modules/teams/api';
import { teamKeys } from '@/modules/teams/keys';

const rule = createZodSync(projectFormSchema);

interface ProjectFormProps {
  project?: Project | null;
}

/**
 * Inline form for creating or editing a project with Zod-validated fields.
 *
 * Navigates to the project detail page on successful creation/update.
 *
 * @param props - {@link ProjectFormProps}
 * @returns JSX element rendering the project form with submit button.
 *
 * @example
 * <ProjectForm project={existingProject} />
 */
export function ProjectForm({ project }: ProjectFormProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const { token } = theme.useToken();
  const { workspaceId } = useWorkspace();
  const [form] = Form.useForm();
  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();

  // Fetch full project data when editing
  const { data: fullProject } = useProjectQuery(project?.id ?? '');
  const activeProject = fullProject ?? project;

  // Lazy select hooks (simple generic types, same as ProjectsTable)
  const members = useLazySelect<{ userId: string; name: string; email: string }>({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, params) => membersApi.list(ws, params),
    getId: (m) => m.userId,
    getLabel: (m) => `${m.name} (${m.email})`,
    perPage: 100,
    baseKey: memberKeys.all,
  });

  const teams = useLazySelect<{ id: string; name: string }>({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, params) => teamsApi.list(ws, params),
    getId: (t) => t.id,
    getLabel: (t) => t.name,
    perPage: 100,
    baseKey: teamKeys.all,
  });

  const repositories = useLazySelect<{ id: string; name: string }>({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, params) => repositoriesApi.list(ws, params),
    getId: (r) => r.id,
    getLabel: (r) => r.name,
    perPage: 100,
    baseKey: repositoryKeys.all,
  });

  useEffect(() => {
    if (activeProject) {
      form.setFieldsValue({
        name: activeProject.name,
        description: activeProject.description,
        lead: activeProject.lead ?? '',
        teamIds: activeProject.teams?.map((t) => t.id) ?? [],
        memberIds: activeProject.members?.map((m) => m.id) ?? [],
        repositoryIds: activeProject.repositories?.map((r) => r.id) ?? [],
      });
    } else {
      form.resetFields();
    }
  }, [activeProject, form]);

  const handleFinish = (values: ProjectFormInput) => {
    if (activeProject) {
      updateMutation.mutate(
        { id: activeProject.id, payload: values },
        {
          onSuccess: () => {
            message.success(`Project "${values.name}" updated`);
            router.push('/' + window.location.pathname.split('/')[1] + '/projects');
          },
          onError: (err: Error) => message.error(errorMessage(err)),
        },
      );
    } else {
      createMutation.mutate(
        values,
        {
          onSuccess: () => {
            message.success(`Project "${values.name}" created`);
            router.push('/' + window.location.pathname.split('/')[1] + '/projects');
          },
          onError: (err: Error) => message.error(errorMessage(err)),
        },
      );
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      style={{ display: 'grid', gap: token.paddingXL, maxWidth: 600 }}
    >
      <Form.Item
        label="Project name"
        name="name"
        rules={[rule]}
      >
        <Input placeholder="e.g. Backend API" />
      </Form.Item>

      <Form.Item label="Description" name="description">
        <Input.TextArea
          placeholder="Optional description"
          rows={3}
          style={{ resize: 'vertical' }}
        />
      </Form.Item>

      <Form.Item label="Teams" name="teamIds">
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Select teams to assign"
          options={teams.options}
          showSearch
          onSearch={teams.handleSearch}
          onPopupScroll={teams.handleScroll}
          filterOption={false}
          loading={teams.isLoading}
          notFoundContent={teams.isFetchingNextPage ? 'Loading...' : 'No teams found'}
        />
      </Form.Item>

      <Form.Item label="Members" name="memberIds">
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Select members to assign"
          options={members.options}
          showSearch
          onSearch={members.handleSearch}
          onPopupScroll={members.handleScroll}
          filterOption={false}
          loading={members.isLoading}
          notFoundContent={members.isFetchingNextPage ? 'Loading...' : 'No members found'}
        />
      </Form.Item>

      <Form.Item label="Repositories" name="repositoryIds">
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Select repositories to assign"
          options={repositories.options}
          showSearch
          onSearch={repositories.handleSearch}
          onPopupScroll={repositories.handleScroll}
          filterOption={false}
          loading={repositories.isLoading}
          notFoundContent={repositories.isFetchingNextPage ? 'Loading...' : 'No repositories found'}
        />
      </Form.Item>

      <Flex gap={token.paddingMD} style={{ paddingTop: token.paddingLG }}>
        <Button type="primary" htmlType="submit" loading={isSubmitting}>
          {activeProject ? 'Save project' : 'Create project'}
        </Button>
        <Button onClick={() => router.back()}>Cancel</Button>
      </Flex>
    </Form>
  );
}
