'use client';

import { Form, Input, Button, Typography, Alert, Result } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { API_BASE, ROUTES, AUTH_THEME } from '@/commons/constants';
import Link from 'next/link';

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const mutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
  });

  if (mutation.isSuccess) {
    return <Result status="success" title="Check your email" subTitle="If an account exists with that email, we have sent a password reset link." />;
  }

  return (
    <>
      <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Forgot password</Title>
      <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>Enter your email and we will send a reset link.</Text>

      {mutation.error && <Alert message={mutation.error.message} type="error" showIcon style={{ marginTop: 16 }} />}

      <Form layout="vertical" onFinish={(v) => mutation.mutate(v.email)} autoComplete="off" requiredMark={false} style={{ marginTop: 24 }}>
        <Form.Item
          name="email"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>Email</span>}
          rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Please enter a valid email' }]}
        >
          <Input placeholder="you@company.com" size="large" autoComplete="email" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
          <Button type="primary" htmlType="submit" loading={mutation.isPending} block size="large" style={{ height: 44, fontWeight: 600 }}>
            Send reset link
          </Button>
        </Form.Item>
      </Form>

      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
        <Text type="secondary">
          Remember your password? <Link href={ROUTES.AUTH.SIGNIN} style={{ fontWeight: 600, color: AUTH_THEME.PRIMARY }}>Sign in</Link>
        </Text>
      </div>
    </>
  );
}
