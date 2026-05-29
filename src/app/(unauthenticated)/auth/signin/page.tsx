'use client';

import { Suspense } from 'react';
import { Form, Input, Button, Typography, Alert } from 'antd';
import { useSigninMutation } from '@/modules/auth/queries';
import { ROUTES, AUTH_THEME } from '@/commons/constants';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const { Title, Text } = Typography;

function resolvePostSigninPath(redirect: string | null, workspaceSlug?: string | null) {
  if (redirect?.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith(ROUTES.AUTH.SIGNIN)) {
    return redirect;
  }

  return workspaceSlug ? ROUTES.WORKSPACE.DASHBOARD(workspaceSlug) : '/';
}

function SigninForm() {
  const searchParams = useSearchParams();
  const signin = useSigninMutation();

  const onFinish = (values: { email: string; password: string }) => {
    signin.mutate(values, {
      onSuccess: (data) => {
        window.location.assign(resolvePostSigninPath(searchParams.get('redirect'), data.workspace?.slug));
      },
    });
  };

  return (
    <>
      <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Sign in</Title>
      <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>Workspace selection appears after authentication.</Text>

      {signin.error && <Alert title={signin.error.message} type="error" showIcon style={{ marginTop: 16 }} />}

      <Form layout="vertical" onFinish={onFinish} autoComplete="off" requiredMark={false} style={{ marginTop: 24 }}>
        <Form.Item
          name="email"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>Email</span>}
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email address' },
          ]}
        >
          <Input placeholder="you@company.com" size="large" autoComplete="email" />
        </Form.Item>

        <Form.Item
          name="password"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>Password</span>}
          rules={[{ required: true, message: 'Please enter your password' }]}
        >
          <Input.Password placeholder="Enter your password" size="large" autoComplete="current-password" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
          <Button type="primary" htmlType="submit" loading={signin.isPending} block size="large" style={{ width: '100%', height: 44, fontWeight: 600 }}>
            Sign in
          </Button>
        </Form.Item>
      </Form>

      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
        <Text type="secondary">
          New reviewer? <Link href={ROUTES.AUTH.SIGNUP} style={{ fontWeight: 600, color: AUTH_THEME.PRIMARY }}>Create an account</Link>
        </Text>
      </div>
    </>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={null}>
      <SigninForm />
    </Suspense>
  );
}

