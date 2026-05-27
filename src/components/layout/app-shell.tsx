'use client';
import { Layout, Menu } from 'antd';
import { useState } from 'react';

const { Sider, Content } = Layout;

const menuItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'projects', label: 'Projects' },
  { key: 'findings', label: 'Findings' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ padding: 16, color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>SAST</div>
        <Menu theme="dark" mode="inline" items={menuItems} />
      </Sider>
      <Content style={{ padding: 24 }}>{children}</Content>
    </Layout>
  );
}