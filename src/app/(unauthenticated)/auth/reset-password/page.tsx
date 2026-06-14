'use client';

import { Suspense, useState } from 'react';
import { PasswordStrength } from '@/components/shared/PasswordStrength';
import { LoadingState } from '@/components/shared/LoadingState';
import { Form, Input, Button, Typography, Alert, Result, theme } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { API_BASE, ROUTES } from '@/commons/constants';
import Link from 'next/link';
import { createZodSync } from '@/lib/utils/zod-sync';
import { resetPasswordSchema } from '@/commons/schemas';

const { Title, Text } = Typography;

/** Zod-powered form rule — validates password + confirmPassword match. */
const rule = createZodSync(resetPasswordSchema);

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [passwordValue, setPasswordValue] = useState('');
  const { token: antdToken } = theme.useToken();

  const tokenCheck = useQuery({
    queryKey: ['reset-token', token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/auth/reset-password?token=${token}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json.data;
    },
    enabled: !!token,
    retry: false,
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: async (values: { password: string; confirmPassword: string }) => {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password, confirmPassword: values.confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
  });

  if (!token) {
    return (
      <Result
        status="error"
        title="Invalid reset link"
        subTitle="No token provided. Please check your email for the correct link."
        extra={<Button type="primary" onClick={() => window.location.href = ROUTES.AUTH.FORGOT_PASSWORD}>Request New Link</Button>}
      />
    );
  }

  if (tokenCheck.isLoading) {
    return <LoadingState size="small" compact text="Verifying reset link..." />;
  }

  if (tokenCheck.error) {
    return (
      <Result
        status="error"
        title="Invalid or expired reset link"
        subTitle={tokenCheck.error.message || 'This reset link is no longer valid. Please request a new one.'}
        extra={<Button type="primary" onClick={() => window.location.href = ROUTES.AUTH.FORGOT_PASSWORD}>Request New Link</Button>}
      />
    );
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

      <Form layout="vertical" onFinish={(v) => mutation.mutate(v)} autoComplete="off" requiredMark={false} style={{ marginTop: antdToken.paddingXL }}>
        <Form.Item
          name="password"
          label={<span style={{ fontWeight: 600, fontSize: antdToken.fontSizeSM }}>New password</span>}
          rules={[rule]}
        >
          <Input.Password placeholder="Minimum 8 characters" size="large" autoComplete="new-password" onChange={(e) => setPasswordValue(e.target.value)} />
        </Form.Item>
        <PasswordStrength value={passwordValue} />

        <Form.Item
          name="confirmPassword"
          label={<span style={{ fontWeight: 600, fontSize: antdToken.fontSizeSM }}>Confirm password</span>}
          dependencies={['password']}
          rules={[rule]}
        >
          <Input.Password placeholder="Repeat your password" size="large" autoComplete="new-password" />
        </Form.Item>

        <Form.Item style={{ marginTop: antdToken.paddingXS }}>
          <Button type="primary" htmlType="submit" loading={mutation.isPending} block size="large" style={{ width: '100%', height: 48, fontWeight: 600 }}>
            Reset password
          </Button>
        </Form.Item>
      </Form>

      <div style={{ marginTop: antdToken.paddingMD, textAlign: 'center', fontSize: antdToken.fontSizeSM }}>
        <Text type="secondary">
          <Link href={ROUTES.AUTH.SIGNIN} style={{ fontWeight: 600, color: antdToken.colorPrimary }}>Back to sign in</Link>
        </Text>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState size="small" compact text="Loading reset form..." />}>
      <ResetForm />
    </Suspense>
  );
}

