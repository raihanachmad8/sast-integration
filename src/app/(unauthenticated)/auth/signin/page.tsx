'use client';

import { Input, theme } from 'antd';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { ROUTES } from '@/commons/constants';
import { signinSchema } from '@/commons/schemas';
import { clientEnv } from '@/config/client-env';
import { AuthForm, AuthField } from '@/features/auth';
import { createZodSync } from '@/lib/utils/zod-sync';
import { useSigninMutation } from '@/modules/auth/queries';

/** Zod-powered form rule — validates email + password from single schema. */
const rule = createZodSync(signinSchema);

/**
 * Resolve the post-signin redirect path.
 *
 * Priority:
 * 1. Invite token → invite page
 * 2. Explicit ?redirect= param
 * 3. Last workspace from API response (server-validated) → its dashboard
 * 4. Fallback → workspace chooser
 *
 * LocalStorage cache tidak dipakai di sini karena workspace mungkin sudah dihapus.
 * Chooser page nanti yang akan auto-redirect jika cache masih valid.
 */
function resolvePostSigninPath(redirect: string | null, inviteToken: string | null, workspaceSlug?: string | null) {
  if (inviteToken) {
    return `${ROUTES.AUTH.INVITE}?token=${encodeURIComponent(inviteToken)}`;
  }

  if (redirect?.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith(ROUTES.AUTH.SIGNIN)) {
    return redirect;
  }

  // Last workspace from API response — sudah divalidasi server
  if (workspaceSlug) {
    return ROUTES.WORKSPACE.DASHBOARD(workspaceSlug);
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
      onSuccess: (data) => {
        const workspaceSlug = data.workspace?.slug;
        window.location.assign(resolvePostSigninPath(searchParams.get('redirect'), inviteToken, workspaceSlug));
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
        <Link href={ROUTES.AUTH.FORGOT_PASSWORD} style={{ fontSize: token.fontSize, color: token.colorPrimary }}>
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
