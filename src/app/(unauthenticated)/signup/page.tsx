'use client';

import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, Result } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '@/lib/auth/auth-provider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const { Title, Text } = Typography;

interface SignupForm {
  email: string;
  password: string;
  name: string;
}

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/config').then((r) => r.json()).then((data) => {
      setRegistrationMode(data.data.registrationMode);
    });
  }, []);

  if (registrationMode === 'invite') {
    return (
      <Card style={{ width: 400 }}>
        <Result status="info" title="Invitation Only" subTitle="Registration is disabled. Please use an invitation link to join." />
      </Card>
    );
  }

  const onFinish = async (values: SignupForm) => {
    setError(null);
    setLoading(true);
    try {
      await signup(values.email, values.password, values.name);
      router.push('/signin');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ width: 400 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Sign Up</Title>
          <Text type="secondary">Create your account</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />}

        <Form layout="vertical" onFinish={onFinish} autoComplete="off" requiredMark={false}>
          <Form.Item name="name" rules={[{ required: true, message: 'Name is required' }, { min: 2, message: 'Min 2 characters' }]}>
            <Input prefix={<UserOutlined />} placeholder="Full name" size="large" />
          </Form.Item>

          <Form.Item name="email" rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Invalid email' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: 'Password is required' }, { min: 8, message: 'Min 8 characters' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Sign Up
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              Already have an account? <Link href="/signin">Sign in</Link>
            </Text>
          </div>
        </Form>
      </Space>
    </Card>
  );
}
