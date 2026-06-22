'use client';

import { useState } from 'react';
import { App, Modal, Select, Form, Flex, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/commons/components/PageHeader';
import { RepositoriesTable, RepositoryDetailDrawer } from '@/features/repositories';
import { useProjectsQuery } from '@/modules/projects/queries';
import { useUpdateRepositoryMutation } from '@/modules/repositories';
import { useTriggerScanMutation } from '@/modules/scan/queries';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import type { Repository } from '@/commons/types';

export default function RepositoriesPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const updateRepoMutation = useUpdateRepositoryMutation();
  const triggerScanMutation = useTriggerScanMutation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Repository | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRepo, setAssignRepo] = useState<Repository | null>(null);
  const [form] = Form.useForm();

  const projectsQuery = useProjectsQuery({ page: 1, perPage: 200 });
  const projectOptions = (projectsQuery.data?.data ?? []).map((p: { id: string; name: string }) => ({ value: p.id, label: p.name }));

  const handleRowClick = (row: Repository) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleAssignProject = (row: Repository) => {
    setAssignRepo(row);
    setAssignOpen(true);
    form.resetFields();
  };

  const handleAssignSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!assignRepo?.id || !workspaceId) return;
      updateRepoMutation.mutate(
        { id: assignRepo.id, data: { projectId: values.projectId } },
        {
          onSuccess: () => {
            message.success(`${assignRepo?.name} assigned to project`);
            setAssignOpen(false);
          },
          onError: () => message.error('Failed to assign project'),
        }
      );
    } catch {
      message.error('Failed to assign project');
    }
  };

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Repositories"
        description="All imported repositories across projects. Import via Source Control page."
      />

      <RepositoriesTable onRowClick={handleRowClick} onAssignProject={handleAssignProject} />

      <RepositoryDetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        repository={selected}
        onRunScan={(repoId) => {
          triggerScanMutation.mutate({ repositoryId: repoId, branch: 'main', scanners: ['semgrep', 'gitleaks'] }, {
            onSuccess: () => message.success('Scan started'),
            onError: (_err) => message.error('Failed to start scan'),
          });
        }}
        onViewHistory={(repoId) => {
          router.push(`/${workspaceId || ''}/scans?repositoryId=${repoId}`);
        }}
      />

      <Modal
        title={`Assign ${assignRepo?.name} to project`}
        open={assignOpen}
        onOk={handleAssignSubmit}
        onCancel={() => setAssignOpen(false)}
        okText="Assign"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Project" name="projectId" rules={[{ required: true, message: 'Please select a project' }]}>
            <Select
              placeholder="Select a project"
              options={projectOptions}
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              loading={projectsQuery.isLoading}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
}
