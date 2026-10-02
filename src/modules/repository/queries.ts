'use client';

import { useQuery } from '@tanstack/react-query';
import { repositoryKeys } from './keys';
import { listRepositories, getRepository } from './api';

export function useRepositoriesQuery(workspaceId: string) {
  return useQuery({
    queryKey: repositoryKeys.list(workspaceId),
    queryFn: () => listRepositories(workspaceId),
    enabled: workspaceId.length > 0,
  });
}

export function useRepositoryQuery(repositoryId: string, enabled = true) {
  return useQuery({
    queryKey: repositoryKeys.detail(repositoryId),
    queryFn: () => getRepository('', repositoryId),
    enabled: enabled && repositoryId.length > 0,
  });
}
