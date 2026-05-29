'use client';

import { useState } from 'react';
import { PasswordStrength } from '@/components/shared/password-strength';

import { Form, Input, Button, Typography, Alert, Result } from 'antd';
import { useSignupMutation, useConfigQuery } from '@/modules/auth/queries';
import { ROUTES, AUTH_THEME } from '@/commons/constants';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const { Title, Text } = Typography;

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignupMutation();
  const config = useConfigQuery();
  const [passwordValue, setPasswordValue] = useState('');

  if (config.isSuccess && config.data?.registrationMode === 'invite') {
    return <Result status="info" title="Invitation Only" subTitle="Registration is disabled. Please use an invitation link to join." />;
  }

  const onFinish = (values: { email: string; password: string; name: string }) => {
    signup.mutate(values, { onSuccess: () => router.push(ROUTES.AUTH.SIGNIN) });
  };

  return (
    <>
      <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Create account</Title>
      <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>A Personal Workspace will be available immediately.</Text>

      {signup.error && <Alert title={signup.error.message} type="error" showIcon style={{ marginTop: 16 }} />}

      <Form layout="vertical" onFinish={onFinish} autoComplete="off" requiredMark={false} style={{ marginTop: 24 }}>
        <Form.Item
          name="name"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>Full name</span>}
          rules={[
            { required: true, message: 'Please enter your full name' },
            { min: 2, message: 'Name must be at least 2 characters' },
          ]}
        >
          <Input placeholder="John Doe" size="large" autoComplete="name" />
        </Form.Item>

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
          rules={[
            { required: true, message: 'Please enter a password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
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
          <Button type="primary" htmlType="submit" loading={signup.isPending} block size="large" style={{ width: '100%', height: 44, fontWeight: 600 }}>
            Create account
          </Button>
        </Form.Item>
      </Form>

      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
        <Text type="secondary">
          Already registered? <Link href={ROUTES.AUTH.SIGNIN} style={{ fontWeight: 600, color: AUTH_THEME.PRIMARY }}>Sign in</Link>
        </Text>
      </div>
    </>
  );
}



