'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Alert, Button, Result } from 'antd';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE, ROUTES } from '@/commons/constants';
import { LoadingState } from '@/components/shared/LoadingState';

type VerifyState =
  | { status: 'idle' | 'pending' | 'success' }
  | { status: 'error'; message: string };

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const requestedToken = useRef<string | null>(null);
  const [state, setState] = useState<VerifyState>({ status: 'idle' });

  useEffect(() => {
    if (!token || requestedToken.current === token) return;

    requestedToken.current = token;
    let cancelled = false;
    setState({ status: 'pending' });

    fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        if (!cancelled) setState({ status: 'success' });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ status: 'error', message: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return <Alert type="error" title="Invalid verification link" description="No token provided." showIcon />;
  }

  if (state.status === 'success') {
    return (
      <Result
        status="success"
        title="Email verified"
        subTitle="Your email has been confirmed. You can now sign in."
        extra={<Link href={ROUTES.AUTH.SIGNIN}><Button type="primary">Sign in</Button></Link>}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <Result
        status="error"
        title="Verification failed"
        subTitle={state.message}
        extra={<Link href={ROUTES.AUTH.SIGNIN}><Button type="primary">Back to sign in</Button></Link>}
      />
    );
  }

  return <LoadingState text="Verifying your email..." fullHeight />;
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingState text="Loading verification page..." />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
