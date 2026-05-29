'use client';

import { Suspense, useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, Spin } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';

const { Title, Text } = Typography;

interface AcceptForm {
  name: string;
  password: string;
}

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <Card style={{ width: 400 }}>
        <Alert type="error" message="Invalid invitation link" description="No token provided." showIcon />
      </Card>
    );
  }

  const onFinish = async (values: AcceptForm) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password, name: values.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      router.push('/signin');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ width: 400 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Accept Invitation</Title>
          <Text type="secondary">Set up your account to join the workspace</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />}

        <Form layout="vertical" onFinish={onFinish} autoComplete="off" requiredMark={false}>
          <Form.Item name="name" rules={[{ required: true, message: 'Name is required' }, { min: 2, message: 'Min 2 characters' }]}>
            <Input prefix={<UserOutlined />} placeholder="Full name" size="large" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: 'Password is required' }, { min: 8, message: 'Min 8 characters' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Accept & Join
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<Card style={{ width: 400 }}><Spin /></Card>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
