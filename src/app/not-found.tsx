'use client';

import { Button, Result } from 'antd';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Result
        status="404"
        title="404"
        subTitle="The page you visited does not exist."
        extra={
          <Button type="primary" onClick={() => router.push('/')}>
            Back Home
          </Button>
        }
      />
    </div>
  );
}
