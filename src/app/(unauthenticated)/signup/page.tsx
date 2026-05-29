'use client';

import { Form, Input, Button, Card, Typography, Alert, Space, Result } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useSignupMutation, useConfigQuery } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const { Title, Text } = Typography;

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignupMutation();
  const config = useConfigQuery();

  if (config.data?.registrationMode === 'invite') {
    return (
      <Card style={{ width: 400 }}>
        <Result status="info" title="Invitation Only" subTitle="Registration is disabled. Please use an invitation link to join." />
      </Card>
    );
  }

  const onFinish = (values: { email: string; password: string; name: string }) => {
    signup.mutate(values, { onSuccess: () => router.push('/signin') });
  };

  return (
    <Card style={{ width: 400 }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Sign Up</Title>
          <Text type="secondary">Create your account</Text>
        </div>

        {signup.error && <Alert message={signup.error.message} type="error" showIcon closable />}

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
            <Button type="primary" htmlType="submit" loading={signup.isPending} block size="large">
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
