'use client';

import { Suspense, useState } from 'react';
import { PasswordStrength } from '@/components/shared/password-strength';
import { Form, Input, Button, Typography, Alert, Result, Spin } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { API_BASE, ROUTES, AUTH_THEME } from '@/commons/constants';
import Link from 'next/link';

const { Title, Text } = Typography;

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [passwordValue, setPasswordValue] = useState('');

  const mutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
  });

  if (!token) {
    return <Alert type="error" title="Invalid reset link" description="No token provided." showIcon />;
  }

  if (mutation.isSuccess) {
    return (
      <Result
        status="success"
        title="Password reset"
        subTitle="Your password has been changed. You can now sign in."
        extra={<Link href={ROUTES.AUTH.SIGNIN}><Button type="primary">Sign in</Button></Link>}
      />
    );
  }

  return (
    <>
      <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Reset password</Title>
      <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>Enter your new password below.</Text>

      {mutation.error && <Alert title={mutation.error.message} type="error" showIcon style={{ marginTop: 16 }} />}

      <Form layout="vertical" onFinish={(v) => mutation.mutate(v.password)} autoComplete="off" requiredMark={false} style={{ marginTop: 24 }}>
        <Form.Item
          name="password"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>New password</span>}
          rules={[{ required: true, message: 'Please enter a new password' }, { min: 8, message: 'Minimum 8 characters' }]}
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
          <Button type="primary" htmlType="submit" loading={mutation.isPending} block size="large" style={{ width: '100%', height: 44, fontWeight: 600 }}>
            Reset password
          </Button>
        </Form.Item>
      </Form>

      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
        <Text type="secondary">
          <Link href={ROUTES.AUTH.SIGNIN} style={{ fontWeight: 600, color: AUTH_THEME.PRIMARY }}>Back to sign in</Link>
        </Text>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spin />}>
      <ResetForm />
    </Suspense>
  );
}

