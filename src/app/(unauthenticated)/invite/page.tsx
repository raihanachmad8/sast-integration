'use client';

import { Suspense, useState } from 'react';
import { Form, Input, Button, Typography, Alert, Spin } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';

const { Title, Text } = Typography;

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return <Alert type="error" message="Invalid invitation link" description="No token provided." showIcon />;
  }

  const onFinish = async (values: { name: string; password: string }) => {
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
    <>
      <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Accept Invitation</Title>
      <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>Set up your account to join the workspace.</Text>

      {error && <Alert message={error} type="error" showIcon style={{ marginTop: 16 }} />}

      <Form layout="vertical" onFinish={onFinish} autoComplete="off" requiredMark={false} style={{ marginTop: 24 }}>
        <Form.Item name="name" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Full name</span>} rules={[{ required: true, message: 'Name is required' }, { min: 2, message: 'Min 2 characters' }]}>
          <Input prefix={<UserOutlined />} size="large" />
        </Form.Item>

        <Form.Item name="password" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Password</span>} rules={[{ required: true, message: 'Password is required' }, { min: 8, message: 'Min 8 characters' }]}>
          <Input.Password prefix={<LockOutlined />} size="large" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Accept & Join
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<Spin />}>
      <AcceptInviteForm />
    </Suspense>
  );
}
