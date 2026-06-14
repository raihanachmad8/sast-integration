'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { knowledgeKeys } from './keys';
import { knowledgeApi, type KnowledgeEntriesParams } from './api';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';

export function useKnowledgeSourcesQuery(workspaceId: string, params?: ListParams) {
  return useQuery({
    queryKey: [...knowledgeKeys.sources(workspaceId), params],
    queryFn: () => knowledgeApi.listSources(workspaceId, params),
    enabled: !!workspaceId,
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
  });
}

export function useKnowledgeEntriesQuery(workspaceId: string, sourceId: string) {
  return useQuery({
    queryKey: knowledgeKeys.sourceEntries(workspaceId, sourceId),
    queryFn: () => knowledgeApi.listEntries(workspaceId, sourceId),
    enabled: !!workspaceId && !!sourceId,
    staleTime: STALE.DEFAULT,
  });
}

export function useKnowledgeBaseQuery(workspaceId: string, params: KnowledgeEntriesParams) {
  return useQuery({
    queryKey: [...knowledgeKeys.entries(workspaceId), params],
    queryFn: () => knowledgeApi.listAllEntries(workspaceId, params),
    enabled: !!workspaceId,
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
  });
}
