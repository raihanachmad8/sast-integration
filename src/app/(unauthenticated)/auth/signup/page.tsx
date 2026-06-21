'use client';

import { useState } from 'react';
import { Input, Result } from 'antd';
import { PasswordStrength } from '@/commons/components/PasswordStrength';
import { useSignupMutation } from '@/modules/auth/queries';
import { clientEnv } from '@/config/client-env';
import { ROUTES } from '@/commons/constants';
import { useRouter } from 'next/navigation';
import { AuthForm, AuthField } from '@/features/auth/AuthForm';
import { createZodSync } from '@/lib/utils/zod-sync';
import { signupSchema } from '@/commons/schemas';

/** Zod-powered form rule — validates name, email, password, confirmPassword from single schema. */
const rule = createZodSync(signupSchema);

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignupMutation();
  const [passwordValue, setPasswordValue] = useState('');

  if (clientEnv.workspaceMode === 'single') {
    return <Result status="info" title="Invitation Only" subTitle="Registration is disabled. Please use an invitation link to join." />;
  }

  const onFinish = (values: Record<string, string>) => {
    signup.mutate(values as { email: string; password: string; name: string }, {
      onSuccess: () => router.push(ROUTES.AUTH.SIGNIN),
    });
  };

  return (
    <AuthForm
      title="Create account"
      subtitle="A Personal Workspace will be available immediately."
      submitLabel="Create account"
      onFinish={onFinish}
      loading={signup.isPending}
      error={signup.error}
      footerLink={{ text: 'Already registered?', href: ROUTES.AUTH.SIGNIN, label: 'Sign in' }}
    >
      <AuthField name="name" label="Full name" rules={[rule]}>
        <Input placeholder="John Doe" size="large" autoComplete="name" />
      </AuthField>

      <AuthField name="email" label="Email" rules={[rule]}>
        <Input placeholder="you@company.com" size="large" autoComplete="email" />
      </AuthField>

      <AuthField name="password" label="Password" rules={[rule]}>
        <Input.Password placeholder="Minimum 8 characters" size="large" autoComplete="new-password" onChange={(e) => setPasswordValue(e.target.value)} />
      </AuthField>
      <PasswordStrength value={passwordValue} />

      <AuthField name="confirmPassword" label="Confirm password" dependencies={['password']} rules={[rule]}>
        <Input.Password placeholder="Repeat your password" size="large" autoComplete="new-password" />
      </AuthField>
    </AuthForm>
  );
}
