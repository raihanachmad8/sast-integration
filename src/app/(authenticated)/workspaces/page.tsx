'use client';
import { Card, Button, Typography, Spin, Modal, Form, Input, Empty, Tag } from 'antd';
import { PlusOutlined, LogoutOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useWorkspacesQuery, useCreateWorkspaceMutation, useSwitchWorkspaceMutation } from '@/modules/workspace/queries';
import { useSessionQuery, useSignoutMutation } from '@/modules/auth/queries';
import { ROUTES, AUTH_THEME } from '@/commons/constants';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { useState } from 'react';
const { Title, Text } = Typography;
export default function WorkspaceChooserPage() {
  const router = useRouter();
  const session = useSessionQuery();
  const workspaces = useWorkspacesQuery();
  const switchMutation = useSwitchWorkspaceMutation();
  const createMutation = useCreateWorkspaceMutation();
  const signout = useSignoutMutation();
  const [showCreate, setShowCreate] = useState(false);
  const hasPersonal = workspaces.data?.some((ws) => ws.type === WORKSPACE.TYPE.PERSONAL);

  const handleSelect = (ws: { id: string; slug: string }) => {
    switchMutation.mutate(ws.id, { onSuccess: () => router.push(ROUTES.WORKSPACE.DASHBOARD(ws.slug)) });
  };
  const handleCreate = (values: { name: string }) => {
    createMutation.mutate(values, {
      onSuccess: () => { setShowCreate(false); workspaces.refetch(); },
    });
  };
  const handleSignout = () => {
    if (session.data?.accessToken) {
      signout.mutate(session.data.accessToken, { onSuccess: () => { window.location.href = ROUTES.AUTH.SIGNIN; } });
    }
  };
  if (workspaces.isLoading || session.isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><Spin size="large" /></div>;
  }
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafb', padding: '48px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Choose workspace</Title>
            <Text type="secondary">Data, permissions, and scans are scoped per workspace.</Text>
          </div>
          <Button icon={<LogoutOutlined />} onClick={handleSignout} loading={signout.isPending}>
            Sign out
          </Button>
        </div>
        {/* Workspace grid */}
        {workspaces.data && workspaces.data.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {workspaces.data.map((ws) => (
              <Card
                key={ws.id}
                hoverable
                onClick={() => handleSelect(ws)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: AUTH_THEME.PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{ws.slug}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Tag color={ws.type === WORKSPACE.TYPE.PERSONAL ? 'blue' : 'green'}>{ws.type}</Tag>
                  <Tag>{ws.role}</Tag>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty description="No workspaces yet" />
        )}
        {/* Create button */}
        {!hasPersonal && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setShowCreate(true)}>
              Create workspace
            </Button>
          </div>
        )}
        {hasPersonal && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
              Create organization workspace
            </Button>
          </div>
        )}
        {/* Create modal */}
        <Modal title="Create workspace" open={showCreate} onCancel={() => setShowCreate(false)} footer={null}>
          <Form layout="vertical" onFinish={handleCreate} requiredMark={false}>
            <Form.Item name="name" label="Workspace name" rules={[{ required: true, message: 'Name is required' }, { min: 2, message: 'Min 2 characters' }]}>
              <Input placeholder="My Team" size="large" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending} block>
                Create
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
