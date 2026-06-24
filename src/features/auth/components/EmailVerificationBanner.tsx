'use client';

import { Alert, App, Button, theme } from 'antd';
import { useEmailVerificationStatus, useSessionQuery } from '@/modules/auth/queries';
import { authApi } from '@/modules/auth/api';
import { FaIcon } from '@/commons/components/FaIcon';

/**
 * Global banner shown to authenticated users who have not verified their email.
 *
 * Current policy (M4+):
 * - Login is allowed without verification (better onboarding UX during thesis phase).
 * - This banner provides a persistent, non-blocking reminder.
 * - The banner can later be used to enforce stricter verification flows.
 */
export function EmailVerificationBanner() {
  const { isVerified, isLoading } = useEmailVerificationStatus();
  const session = useSessionQuery();
  const { message } = App.useApp();
  const { token } = theme.useToken();

  if (isLoading || isVerified) {
    return null;
  }

  const handleResend = async () => {
    const token = session.data?.accessToken;
    if (!token) {
      message.error('You are not authenticated.');
      return;
    }

    try {
      await authApi.resendVerification();
      message.success('Verification email has been sent. Please check your inbox.');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to send verification email. Please try again later.';
      message.error(msg);
    }
  };

  return (
    <Alert
      type="warning"
      showIcon
      icon={<FaIcon icon="fa-envelope" />}
      title="Please verify your email address"
      description="Your email has not been verified yet. You can still use the platform, but some features may be limited until verification is complete."
      action={
        <Button size="small" type="primary" onClick={handleResend}>
          Resend verification email
        </Button>
      }
      style={{ marginBottom: token.margin }}
    />
  );
}
