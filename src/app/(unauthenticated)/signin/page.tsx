'use client';

import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useSigninMutation } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const { Title, Text } = Typography;

export default function SigninPage() {
  const router = useRouter();
  const signin = useSigninMutation();

  const onFinish = (values: { email: string; password: string }) => {
    signin.mutate(values, { onSuccess: () => router.push('/') });
  };

  return (
    <Card style={{ width: 400 }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Sign In</Title>
          <Text type="secondary">Enter your credentials to continue</Text>
        </div>

        {signin.error && <Alert message={signin.error.message} type="error" showIcon closable />}

        <Form layout="vertical" onFinish={onFinish} autoComplete="off" requiredMark={false}>
          <Form.Item name="email" rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Invalid email' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: 'Password is required' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button type="primary" htmlType="submit" loading={signin.isPending} block size="large">
              Sign In
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              Don&apos;t have an account? <Link href="/signup">Sign up</Link>
            </Text>
          </div>
        </Form>
      </Space>
    </Card>
  );
}
