'use client';

import { Form, Button, Typography, Alert, Flex, theme } from 'antd';
import Link from 'next/link';
import { errorMessage } from '@/lib/api/errors';

const { Title, Text } = Typography;

interface AuthFormProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  submitLabel?: string;
  onFinish: (values: Record<string, string>) => void;
  loading?: boolean;
  error?: unknown;
  footerLink?: { text: string; href: string; label: string };
}

/**
 * Reusable auth form with Ant Design Form + tokens.
 *
 * @example
 * <AuthForm
 *   title="Sign in"
 *   subtitle="Workspace selection appears after authentication."
 *   onFinish={handleSignin}
 *   loading={signin.isPending}
 *   error={signin.error}
 *   footerLink={{ text: 'New reviewer?', href: '/auth/signup', label: 'Create an account' }}
 * >
 *   <AuthField name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
 *     <Input placeholder="you@company.com" size="large" />
 *   </AuthField>
 * </AuthForm>
 */
export function AuthForm({
  title,
  subtitle,
  children,
  submitLabel = 'Sign in',
  onFinish,
  loading = false,
  error,
  footerLink,
}: AuthFormProps) {
  const { token } = theme.useToken();

  return (
    <Flex vertical gap={0}>
      <Title level={2} style={{ margin: 0, fontWeight: token.fontWeightStrong }}>{title}</Title>
      {subtitle && (
        <Text type="secondary" style={{ display: 'block', marginTop: token.marginXS }}>{subtitle}</Text>
      )}

      {error != null && <Alert title={errorMessage(error)} type="error" showIcon style={{ marginTop: token.marginLG }} />}

      <Form layout="vertical" onFinish={onFinish} autoComplete="off" requiredMark={false} style={{ marginTop: token.marginLG }}>
        {children}

        <Form.Item style={{ marginBottom: 0, marginTop: token.marginXS }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            style={{ height: token.controlHeightLG, fontWeight: token.fontWeightStrong }}
          >
            {submitLabel}
          </Button>
        </Form.Item>
      </Form>

      {footerLink && (
        <div style={{ marginTop: token.marginLG, textAlign: 'center', fontSize: token.fontSizeSM }}>
          <Text type="secondary">
            {footerLink.text}{' '}
            <Link href={footerLink.href} style={{ fontWeight: token.fontWeightStrong, color: token.colorPrimary }}>
              {footerLink.label}
            </Link>
          </Text>
        </div>
      )}
    </Flex>
  );
}

/**
 * Standard auth form field with consistent label styling.
 */
export function AuthField({
  name,
  label,
  rules,
  dependencies,
  children,
}: {
  name: string;
  label: string;
  rules?: React.ComponentProps<typeof Form.Item>['rules'];
  dependencies?: string[];
  children: React.ReactNode;
}) {
  const { token } = theme.useToken();

  return (
    <Form.Item
      name={name}
      label={<span style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSizeSM }}>{label}</span>}
      rules={rules}
      dependencies={dependencies}
    >
      {children}
    </Form.Item>
  );
}
