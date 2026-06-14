'use client';

import { Suspense } from 'react';
import { Alert, Button, Result } from 'antd';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ROUTES } from '@/commons/constants';
import { LoadingState } from '@/components/shared/LoadingState';
import { useVerifyEmailQuery } from '@/modules/auth/queries';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { isLoading, isError, error } = useVerifyEmailQuery(token ?? '');

  if (!token) {
    return <Alert type="error" title="Invalid verification link" description="No token provided." showIcon />;
  }

  if (isLoading) {
    return <LoadingState text="Verifying your email..." fullHeight />;
  }

  if (isError) {
    return (
      <Result
        status="error"
        title="Verification failed"
        subTitle={error instanceof Error ? error.message : 'Verification failed'}
        extra={<Link href={ROUTES.AUTH.SIGNIN}><Button type="primary">Back to sign in</Button></Link>}
      />
    );
  }

  return (
    <Result
      status="success"
      title="Email verified"
      subTitle="Your email has been confirmed. You can now sign in."
      extra={<Link href={ROUTES.AUTH.SIGNIN}><Button type="primary">Sign in</Button></Link>}
    />
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingState text="Loading verification page..." />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
