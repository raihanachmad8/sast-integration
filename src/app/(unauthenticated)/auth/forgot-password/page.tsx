'use client';

import { Input, Result } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { API_BASE, ROUTES } from '@/commons/constants';
import { AuthForm, AuthField } from '@/features/auth';

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
    <AuthForm
      title="Forgot password"
      subtitle="Enter your email and we will send a reset link."
      submitLabel="Send reset link"
      onFinish={(v) => mutation.mutate(v.email)}
      loading={mutation.isPending}
      error={mutation.error}
      footerLink={{ text: 'Remember your password?', href: ROUTES.AUTH.SIGNIN, label: 'Sign in' }}
    >
      <AuthField
        name="email"
        label="Email"
        rules={[
          { required: true, message: 'Please enter your email' },
          { type: 'email', message: 'Please enter a valid email' },
        ]}
      >
        <Input placeholder="you@company.com" size="large" autoComplete="email" />
      </AuthField>
    </AuthForm>
  );
}
