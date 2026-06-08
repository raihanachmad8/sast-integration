'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Modal, Input, Select, Form, Flex, theme } from 'antd';
import { errorMessage } from '@/lib/api/errors';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/FaIcon';
import { RepositoriesTable, RepositoryDetailDrawer } from '@/features/repositories';
import type { Repository } from '@/commons/types';

export default function RepositoriesPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();

  const connectMutation = useMutation({
    mutationFn: async (payload: { url: string; project: string }) => {
      await new Promise((r) => setTimeout(r, 500));
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Repository | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectProject, setConnectProject] = useState('');
  const [connectRepo, setConnectRepo] = useState('');

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

      <RepositoriesTable onRowClick={handleRowClick} />

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
