'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Modal, Input, Select, Form, Flex, Card, theme } from 'antd';
import { API_BASE } from '@/commons/constants';
import { useSessionQuery } from '@/modules/auth/queries';
import { useAuthHeaders } from '@/modules/auth/hooks';
import { parseApiResponse, errorMessage } from '@/lib/api/errors';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/fa-icon';
import { useRepositoriesQuery } from '@/modules/repository';
import { useTableParams } from '@/lib/hooks/useTableParams';
import type { Repository } from '@/commons/types';
import { RepositoriesTable, RepositoryDetailDrawer } from '@/features/repositories';

export default function RepositoriesPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id;
  const headers = useAuthHeaders();
  const queryClient = useQueryClient();

  const reposQuery = useRepositoriesQuery(workspaceId ?? '');
  const connectMutation = useMutation<Repository, Error, { url: string; project: string }>({
    mutationFn: async (payload) =>
      parseApiResponse<Repository>(
        await fetch(`${API_BASE}/workspaces/${workspaceId}/repositories`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['repositories', workspaceId] }),
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Repository | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectProject, setConnectProject] = useState('');
  const [connectRepo, setConnectRepo] = useState('');

  const { params, setPage, setPageSize, setSearch } = useTableParams({
    defaultPageSize: 10,
  });

  const handleRowClick = (row: Repository) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleConnect = () => {
    if (!connectRepo || !connectProject) {
      message.warning('Please fill all fields');
      return;
    }
    connectMutation.mutate(
      { url: connectRepo, project: connectProject },
      {
        onSuccess: () => {
          setConnectOpen(false);
          message.success(`${connectRepo} connected to ${connectProject}`);
          setConnectRepo('');
          setConnectProject('');
        },
        onError: (err) => message.error(errorMessage(err)),
      },
    );
  };

  if (reposQuery.isLoading) {
    return (
      <Flex vertical gap={token.paddingXL} style={{ minHeight: 400 }} align="center" justify="center">
        <div style={{ color: token.colorTextSecondary }}>Loading repositories...</div>
      </Flex>
    );
  }

  if (reposQuery.error) {
    return (
      <Flex vertical gap={token.paddingXL}>
        <PageHeader
          title="Repositories"
          description="All connected repositories across projects. Run scans, view findings, and manage policies."
        />
        <Card>
          <Flex vertical align="center" gap={token.padding}>
            <FaIcon icon="fa-triangle-exclamation" style={{ color: token.colorError, fontSize: 32 }} />
            <div style={{ color: token.colorError, fontWeight: 500 }}>Failed to load repositories</div>
            <div style={{ color: token.colorTextSecondary }}>{errorMessage(reposQuery.error)}</div>
          </Flex>
        </Card>
      </Flex>
    );
  }

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Repositories"
        description="All connected repositories across projects. Run scans, view findings, and manage policies."
        actions={
          <Button type="primary" onClick={() => setConnectOpen(true)}>
            <FaIcon icon="fa-plus" /> Connect repository
          </Button>
        }
      />

      <RepositoriesTable
        rows={reposQuery.data ?? []}
        isLoading={reposQuery.isLoading}
        error={reposQuery.error instanceof Error ? reposQuery.error.message : null}
        onRowClick={handleRowClick}
      />

      <RepositoryDetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        repository={selected}
      />

      <Modal title="Connect repository" open={connectOpen} onOk={handleConnect} onCancel={() => setConnectOpen(false)} okText="Connect" confirmLoading={connectMutation.isPending}>
        <Form layout="vertical">
          <Form.Item label="Project" required>
            <Select value={connectProject || undefined} onChange={setConnectProject} placeholder="Select a project" options={[{ value: 'Commerce Platform', label: 'Commerce Platform' }, { value: 'Mobile Delivery', label: 'Mobile Delivery' }, { value: 'Internal Tools', label: 'Internal Tools' }]} />
          </Form.Item>
          <Form.Item label="Repository URL" required>
            <Input value={connectRepo} onChange={(e) => setConnectRepo(e.target.value)} placeholder="https://github.com/org/repo" />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
}
