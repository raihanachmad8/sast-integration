'use client';

import { use } from 'react';
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage';

export default function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return <ProjectDetailPage projectId={projectId} />;
}
