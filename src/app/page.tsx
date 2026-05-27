'use client';

import { Button, Space, Typography } from 'antd';
import { SecurityScanOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function Home() {
  return (
    <main style={{ padding: 48, textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Space direction="vertical" size="large">
        <SecurityScanOutlined style={{ fontSize: 64, color: '#2563eb' }} />
        <Title level={1}>SAST Integration</Title>
        <Paragraph type="secondary">
          Intelligent SAST platform for C/C++ with AI-powered verification
        </Paragraph>
        <Space>
          <Button type="primary" size="large">Get Started</Button>
          <Button size="large">Documentation</Button>
        </Space>
      </Space>
    </main>
  );
}