'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LoadingState } from '@/components/shared/LoadingState';

export default function SecurityPage() {
  const router = useRouter();
  const params = useParams<{ workspace: string }>();

  useEffect(() => {
    router.replace(`/${params.workspace}/profile`);
  }, [router, params.workspace]);

  return <LoadingState text="Redirecting to profile..." />;
}
