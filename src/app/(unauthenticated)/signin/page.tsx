'use client';

import { Form, Input, Button, Typography, Alert } from 'antd';
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
    <>
      <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Sign in</Title>
      <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>Workspace selection appears after authentication.</Text>

      {signin.error && <Alert message={signin.error.message} type="error" showIcon style={{ marginTop: 16 }} />}

      <Form layout="vertical" onFinish={onFinish} autoComplete="off" requiredMark={false} style={{ marginTop: 24 }}>
        <Form.Item name="email" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Email</span>} rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Invalid email' }]}>
          <Input prefix={<MailOutlined />} size="large" />
        </Form.Item>

        <Form.Item name="password" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Password</span>} rules={[{ required: true, message: 'Password is required' }]}>
          <Input.Password prefix={<LockOutlined />} size="large" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={signin.isPending} block size="large">
            Sign in
          </Button>
        </Form.Item>
      </Form>

      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
        <Text type="secondary">
          New reviewer? <Link href="/signup" style={{ fontWeight: 600, color: '#0f766e' }}>Create an account</Link>
        </Text>
      </div>
    </>
  );
}
