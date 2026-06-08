'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { knowledgeKeys } from './keys';
import { knowledgeApi } from './api';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';
import type { CreateKnowledgeEntryInput, UpdateKnowledgeEntryInput, CreateKnowledgeSourceInput, UpdateKnowledgeSourceInput } from '@/commons/schemas/knowledge-base.schema';

export function useKnowledgeSourcesQuery(workspaceId: string, params: ListParams) {
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

export function useKnowledgeBaseQuery(workspaceId: string, params: ListParams) {
  return useQuery({
    queryKey: [...knowledgeKeys.entries(workspaceId), params],
    queryFn: () => knowledgeApi.listAllEntries(workspaceId, params),
    enabled: !!workspaceId,
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
  });
}

export function useCreateKnowledgeBaseEntryMutation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKnowledgeEntryInput) => knowledgeApi.createEntry(workspaceId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKeys.workspace(workspaceId) }),
  });
}

export function useDeleteKnowledgeBaseEntryMutation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => knowledgeApi.deleteEntry(workspaceId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKeys.workspace(workspaceId) }),
  });
}

export function useUpdateKnowledgeBaseEntryMutation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKnowledgeEntryInput }) => knowledgeApi.updateEntry(workspaceId, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKeys.workspace(workspaceId) }),
  });
}

export function useCreateKnowledgeSourceMutation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKnowledgeSourceInput) => knowledgeApi.createSource(workspaceId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKeys.workspace(workspaceId) }),
  });
}

export function useUpdateKnowledgeSourceMutation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKnowledgeSourceInput }) => knowledgeApi.updateSource(workspaceId, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKeys.workspace(workspaceId) }),
  });
}

export function useDeleteKnowledgeSourceMutation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => knowledgeApi.deleteSource(workspaceId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKeys.workspace(workspaceId) }),
  });
}

export function useSyncKnowledgeSourceMutation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => knowledgeApi.syncSource(workspaceId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKeys.workspace(workspaceId) }),
  });
}

export function useKnowledgeSourceBackfillQuery(workspaceId: string, id: string) {
  return useQuery({
    queryKey: knowledgeKeys.backfill(workspaceId, id),
    queryFn: () => knowledgeApi.listBackfillJobs(workspaceId, id),
    enabled: !!workspaceId && !!id,
    staleTime: STALE.DEFAULT,
  });
}

export function useStartKnowledgeBackfillMutation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => knowledgeApi.startBackfill(workspaceId, id),
    onSuccess: (_data, sourceId) => {
      qc.invalidateQueries({ queryKey: knowledgeKeys.workspace(workspaceId) });
      qc.invalidateQueries({ queryKey: knowledgeKeys.backfill(workspaceId, sourceId) });
    },
  });
}
