'use client';

import { useEffect } from 'react';
import { Button, Result } from 'antd';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Result
        status="error"
        title="Something went wrong"
        subTitle={error.message || 'An unexpected error occurred.'}
        extra={[
          <Button key="retry" type="primary" onClick={reset}>
            Try again
          </Button>,
          <Button key="home" onClick={() => router.push('/')}>
            Back Home
          </Button>,
        ]}
      />
    </div>
  );
}
