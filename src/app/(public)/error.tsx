'use client';

import { Result, Button } from 'antd';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Result
        status="error"
        title="Something went wrong"
        subTitle={error.message || 'An unexpected error occurred.'}
        extra={
          <Button type="primary" onClick={reset}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
