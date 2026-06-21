'use client';

import { LoadingState } from '@/commons/components/LoadingState';
import { PasswordStrength } from '@/commons/components/PasswordStrength';
import { Suspense, useState } from 'react';
import { Form, Input, Button, Result, Alert, Typography, theme } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE, ROUTES } from '@/commons/constants';
import { useSessionQuery } from '@/modules/auth/queries';

const { Title, Text } = Typography;

function AcceptInviteFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const session = useSessionQuery();
  const { token: antdToken } = theme.useToken();
  const [passwordValue, setPasswordValue] = useState('');

  const isLoggedIn = Boolean(session.data?.accessToken);

  const acceptLoggedIn = useMutation({
    mutationFn: async (inviteToken: string) => {
      const res = await fetch(`${API_BASE}/auth/invite/accept-logged-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json.data as { workspaceId: string; role: string };
    },
    onSuccess: () => {
      router.push(ROUTES.CHOOSER);
    },
  });

  const tokenCheck = useQuery({
    queryKey: ['invite-token', token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/auth/invite?token=${token}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json.data as { email: string; role: string; workspaceId: string };
    },
    enabled: !!token,
    retry: false,
    staleTime: 0,
  });

  // Auto-accept invite for logged-in users when token is validated
  if (tokenCheck.isSuccess && isLoggedIn && token && !acceptLoggedIn.isSuccess && !acceptLoggedIn.isPending) {
    acceptLoggedIn.mutate(token);
  }

  const acceptNewUser = useMutation({
    mutationFn: async (values: { name: string; password: string; confirmPassword: string }) => {
      const res = await fetch(`${API_BASE}/auth/invite/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password, confirmPassword: values.confirmPassword, name: values.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json.data;
    },
    onSuccess: () => {
      router.push(ROUTES.AUTH.SIGNIN);
    },
  });

  if (!token) {
    return (
      <Result
        status="error"
        title="Invalid invitation link"
        subTitle="No token provided. Please check your invitation email for the correct link."
        extra={<Button type="primary" onClick={() => router.push(ROUTES.AUTH.SIGNIN)}>Go to Sign In</Button>}
      />
    );
  }

  if (session.isLoading || tokenCheck.isLoading) {
    return <LoadingState size="small" compact text="Verifying invitation..." />;
  }

  if (tokenCheck.error) {
    return (
      <Result
        status="error"
        title="Invalid or expired invitation"
        subTitle={tokenCheck.error.message || 'This invitation link is no longer valid. Please request a new one.'}
        extra={<Button type="primary" onClick={() => router.push(ROUTES.AUTH.SIGNIN)}>Go to Sign In</Button>}
      />
    );
  }

  if (isLoggedIn) {
    if (acceptLoggedIn.isPending) {
      return <LoadingState size="small" compact text="Accepting invitation..." />;
    }
    if (acceptLoggedIn.error) {
      return (
        <Result
          status="error"
          title="Could not accept invitation"
          subTitle={acceptLoggedIn.error.message || 'Something went wrong.'}
          extra={<Button type="primary" onClick={() => router.push(ROUTES.CHOOSER)}>Go to Workspace</Button>}
        />
      );
    }
    return <LoadingState size="small" compact text="Accepting invitation..." />;
  }

  return (
    <>
      <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Accept Invitation</Title>
      <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
        You&apos;ve been invited to join as <Text strong>{(tokenCheck.data as { role?: string })?.role ?? 'member'}</Text>. Set up your account to get started.
      </Text>

      {acceptNewUser.error && <Alert title={acceptNewUser.error.message} type="error" showIcon style={{ marginTop: 16 }} />}

      <Form layout="vertical" onFinish={(v) => acceptNewUser.mutate(v)} autoComplete="off" requiredMark={false} style={{ marginTop: antdToken.paddingXL }}>
        <Form.Item
          name="name"
          label={<span style={{ fontWeight: 600, fontSize: antdToken.fontSizeSM }}>Full name</span>}
          rules={[{ required: true, message: 'Please enter your full name' }, { min: 2, message: 'Name must be at least 2 characters' }]}
        >
          <Input placeholder="John Doe" size="large" autoComplete="name" />
        </Form.Item>

        <Form.Item
          name="password"
          label={<span style={{ fontWeight: 600, fontSize: antdToken.fontSizeSM }}>Password</span>}
          rules={[{ required: true, message: 'Please enter a password' }, { min: 8, message: 'Password must be at least 8 characters' }]}
        >
          <Input.Password placeholder="Minimum 8 characters" size="large" autoComplete="new-password" onChange={(e) => setPasswordValue(e.target.value)} />
        </Form.Item>
        <PasswordStrength value={passwordValue} />

        <Form.Item
          name="confirmPassword"
          label={<span style={{ fontWeight: 600, fontSize: antdToken.fontSizeSM }}>Confirm password</span>}
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('Passwords do not match')); } }),
          ]}
        >
          <Input.Password placeholder="Repeat your password" size="large" autoComplete="new-password" />
        </Form.Item>

        <Form.Item style={{ marginTop: antdToken.paddingXS }}>
          <Button type="primary" htmlType="submit" loading={acceptNewUser.isPending} block size="large" style={{ width: '100%', height: 48, fontWeight: 600 }}>
            Accept & Join
          </Button>
        </Form.Item>
      </Form>

      <div style={{ marginTop: antdToken.marginLG, textAlign: 'center', fontSize: antdToken.fontSizeSM }}>
        <Text type="secondary">
          Already have an account?{' '}
          <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => router.push(`${ROUTES.AUTH.SIGNIN}?invite_token=${encodeURIComponent(token)}`)}>
            Sign in
          </Button>
        </Text>
      </div>
    </>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<LoadingState size="small" compact text="Loading invitation..." />}>
      <AcceptInviteFlow />
    </Suspense>
  );
}
