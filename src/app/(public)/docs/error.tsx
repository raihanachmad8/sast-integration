'use client';

import { Result, Button } from 'antd';

export default function DocsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Result
        status="error"
        title="Failed to load documentation"
        subTitle={error.message || 'An error occurred while loading this page.'}
        extra={
          <Button type="primary" onClick={reset}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
