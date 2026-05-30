'use client';

import { PasswordStrength } from '@/components/shared/password-strength';

import { Suspense, useState } from 'react';
import { Form, Input, Button, Typography, Alert, Spin } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE, ROUTES } from '@/commons/constants';

const { Title, Text } = Typography;

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [passwordValue, setPasswordValue] = useState('');

  const accept = useMutation({
    mutationFn: async (values: { name: string; password: string }) => {
      const res = await fetch(`${API_BASE}/auth/invite/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password, name: values.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json.data;
    },
    onSuccess: () => router.push(ROUTES.AUTH.SIGNIN),
  });

  if (!token) {
    return <Alert type="error" title="Invalid invitation link" description="No token provided." showIcon />;
  }

  return (
    <>
      <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Accept Invitation</Title>
      <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>Set up your account to join the workspace.</Text>

      {accept.error && <Alert title={accept.error.message} type="error" showIcon style={{ marginTop: 16 }} />}

      <Form layout="vertical" onFinish={(v) => accept.mutate(v)} autoComplete="off" requiredMark={false} style={{ marginTop: 24 }}>
        <Form.Item
          name="name"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>Full name</span>}
          rules={[{ required: true, message: 'Please enter your full name' }, { min: 2, message: 'Name must be at least 2 characters' }]}
        >
          <Input placeholder="John Doe" size="large" autoComplete="name" />
        </Form.Item>

        <Form.Item
          name="password"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>Password</span>}
          rules={[{ required: true, message: 'Please enter a password' }, { min: 8, message: 'Password must be at least 8 characters' }]}
        >
          <Input.Password placeholder="Minimum 8 characters" size="large" autoComplete="new-password" onChange={(e) => setPasswordValue(e.target.value)} />
        </Form.Item>
        <PasswordStrength value={passwordValue} />

        <Form.Item
          name="confirmPassword"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>Confirm password</span>}
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('Passwords do not match')); } }),
          ]}
        >
          <Input.Password placeholder="Repeat your password" size="large" autoComplete="new-password" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
          <Button type="primary" htmlType="submit" loading={accept.isPending} block size="large" style={{ width: '100%', height: 44, fontWeight: 600 }}>
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


