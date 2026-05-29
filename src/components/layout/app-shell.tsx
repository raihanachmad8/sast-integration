'use client';

import { Layout, Menu, Dropdown, Button, Typography } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspacesQuery, useSwitchWorkspaceMutation } from '@/modules/workspace/queries';
import { useSessionQuery } from '@/modules/auth/queries';
import { ROUTES, AUTH_THEME } from '@/commons/constants';

const { Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'projects', label: 'Projects' },
  { key: 'findings', label: 'Findings' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const session = useSessionQuery();
  const workspaces = useWorkspacesQuery();
  const switchMutation = useSwitchWorkspaceMutation();

  const currentWorkspace = session.data?.workspace;

  const handleSwitch = (wsId: string, slug: string) => {
    switchMutation.mutate(wsId, { onSuccess: () => router.push(ROUTES.WORKSPACE.DASHBOARD(slug)) });
  };

  const workspaceMenuItems = workspaces.data?.map((ws) => ({
    key: ws.id,
    label: ws.name,
    onClick: () => handleSwitch(ws.id, ws.slug),
  })) ?? [];

  workspaceMenuItems.push({
    key: 'all',
    label: 'All workspaces',
    onClick: () => router.push(ROUTES.CHOOSER),
  });

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        {/* Workspace switcher */}
        <div style={{ padding: collapsed ? 8 : 16 }}>
          <Dropdown menu={{ items: workspaceMenuItems }} trigger={['click']}>
            <Button
              type="text"
              block
              style={{ height: 'auto', padding: '8px', textAlign: 'left', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 6, background: AUTH_THEME.PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                {currentWorkspace?.name?.charAt(0)?.toUpperCase() ?? 'W'}
              </div>
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text ellipsis style={{ color: '#fff', fontSize: 13, fontWeight: 600, display: 'block' }}>
                    {currentWorkspace?.name ?? 'Select workspace'}
                  </Text>
                </div>
              )}
              {!collapsed && <SwapOutlined style={{ color: '#94a3b8', fontSize: 12 }} />}
            </Button>
          </Dropdown>
        </div>

        <Menu theme="dark" mode="inline" items={menuItems} selectedKeys={[pathname.split('/')[2] ?? 'dashboard']} />
      </Sider>
      <Content style={{ padding: 24 }}>{children}</Content>
    </Layout>
  );
}
