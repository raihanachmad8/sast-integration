'use client';

import { Suspense } from 'react';
import { Input, Typography, theme } from 'antd';
import Link from 'next/link';
import { useSigninMutation } from '@/modules/auth/queries';
import { clientEnv } from '@/config/client-env';
import { ROUTES } from '@/commons/constants';
import { useSearchParams } from 'next/navigation';
import { AuthForm, AuthField } from '@/features/auth/AuthForm';
import { createZodSync } from '@/lib/utils/zod-sync';
import { signinSchema } from '@/commons/schemas';

const { } = Typography;

/** Zod-powered form rule — validates email + password from single schema. */
const rule = createZodSync(signinSchema);

function resolvePostSigninPath(redirect: string | null, inviteToken: string | null) {
  if (inviteToken) {
    return `${ROUTES.AUTH.INVITE}?token=${encodeURIComponent(inviteToken)}`;
  }

  if (redirect?.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith(ROUTES.AUTH.SIGNIN)) {
    return redirect;
  }

  return ROUTES.CHOOSER;
}

function SigninForm() {
  const searchParams = useSearchParams();
  const signin = useSigninMutation();
  const showSignupLink = clientEnv.workspaceMode === 'multiple';
  const { token } = theme.useToken();
  const inviteToken = searchParams.get('invite_token');

  const onFinish = (values: Record<string, string>) => {
    signin.mutate(values as { email: string; password: string }, {
      onSuccess: () => {
        window.location.assign(resolvePostSigninPath(searchParams.get('redirect'), inviteToken));
      },
    });
  };

  return (
    <AuthForm
      title="Sign in"
      subtitle="Workspace selection appears after authentication."
      onFinish={onFinish}
      loading={signin.isPending}
      error={signin.error}
      footerLink={showSignupLink ? { text: 'New reviewer?', href: ROUTES.AUTH.SIGNUP, label: 'Create an account' } : undefined}
    >
      <AuthField name="email" label="Email" rules={[rule]}>
        <Input placeholder="you@company.com" size="large" autoComplete="email" />
      </AuthField>

      <AuthField name="password" label="Password" rules={[rule]}>
        <Input.Password placeholder="Enter your password" size="large" autoComplete="current-password" />
      </AuthField>

      <div style={{ marginTop: -8, marginBottom: token.marginXS, textAlign: 'right' }}>
        <Link href={ROUTES.AUTH.FORGOT_PASSWORD} style={{ fontSize: token.fontSizeSM, color: token.colorPrimary }}>
          Forgot password?
        </Link>
      </div>
    </AuthForm>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={null}>
      <SigninForm />
    </Suspense>
  );
}
