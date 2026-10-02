'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { knowledgeBaseKeys, knowledgeSourceKeys } from './keys';
import {
  listKnowledgeBase,
  getKnowledgeBaseEntry,
  createKnowledgeBaseEntry,
  updateKnowledgeBaseEntry,
  deleteKnowledgeBaseEntry,
  listKnowledgeSources,
  createKnowledgeSource,
  updateKnowledgeSource,
  deleteKnowledgeSource,
  syncKnowledgeSourceById,
  getKnowledgeSourceBackfill,
  startKnowledgeSourceBackfill,
} from './api';
import type { KnowledgeBaseEntry, KnowledgeBaseSource } from './api';

// ── Knowledge Base Entries ─────────────────────────────────

/** @example const { data } = use...(); */
export function useKnowledgeBaseQuery(workspaceId: string) {
  return useQuery({
    queryKey: knowledgeBaseKeys.list(workspaceId),
    queryFn: () => listKnowledgeBase(workspaceId),
    enabled: !!workspaceId,
  });
}

/** @example const { data } = use...(); */
export function useKnowledgeBaseEntryQuery(workspaceId: string, entryId: string) {
  return useQuery({
    queryKey: knowledgeBaseKeys.detail(workspaceId, entryId),
    queryFn: () => getKnowledgeBaseEntry(workspaceId, entryId),
    enabled: !!workspaceId && !!entryId,
  });
}

/** @example const { data } = use...(); */
export function useCreateKnowledgeBaseEntryMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<KnowledgeBaseEntry>) => createKnowledgeBaseEntry(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.list(workspaceId) });
    },
  });
}

/** @example const { data } = use...(); */
export function useUpdateKnowledgeBaseEntryMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: Partial<KnowledgeBaseEntry> }) =>
      updateKnowledgeBaseEntry(workspaceId, entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.list(workspaceId) });
    },
  });
}

/** @example const { data } = use...(); */
export function useDeleteKnowledgeBaseEntryMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => deleteKnowledgeBaseEntry(workspaceId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.list(workspaceId) });
    },
  });
}

// ── Knowledge Sources ─────────────────────────────────────

/** List all knowledge sources in a workspace */
export function useKnowledgeSourcesQuery(workspaceId: string) {
  return useQuery({
    queryKey: knowledgeSourceKeys.list(workspaceId),
    queryFn: () => listKnowledgeSources(workspaceId),
    enabled: !!workspaceId,
  });
}

/** Create a new knowledge source */
export function useCreateKnowledgeSourceMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type: string; url?: string }) =>
      createKnowledgeSource(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeSourceKeys.list(workspaceId) });
    },
  });
}

/** Update an existing knowledge source */
export function useUpdateKnowledgeSourceMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, data }: { sourceId: string; data: Partial<Pick<KnowledgeBaseSource, 'name' | 'type' | 'url'>> }) =>
      updateKnowledgeSource(workspaceId, sourceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeSourceKeys.list(workspaceId) });
    },
  });
}

/** Delete a knowledge source */
export function useDeleteKnowledgeSourceMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => deleteKnowledgeSource(workspaceId, sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeSourceKeys.list(workspaceId) });
    },
  });
}

/** Trigger sync for a knowledge source */
export function useSyncKnowledgeSourceMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => syncKnowledgeSourceById(workspaceId, sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeSourceKeys.list(workspaceId) });
    },
  });
}

/** Get latest historical backfill status for a source */
export function useKnowledgeSourceBackfillQuery(workspaceId: string, sourceId: string) {
  return useQuery({
    queryKey: knowledgeSourceKeys.backfill(workspaceId, sourceId),
    queryFn: () => getKnowledgeSourceBackfill(workspaceId, sourceId),
    enabled: !!workspaceId && !!sourceId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'queued' || status === 'running' ? 5000 : false;
    },
  });
}

/** Start or resume historical NVD backfill for a source */
export function useStartKnowledgeBackfillMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => startKnowledgeSourceBackfill(workspaceId, sourceId),
    onSuccess: (job, sourceId) => {
      queryClient.setQueryData(knowledgeSourceKeys.backfill(workspaceId, sourceId), job);
      queryClient.invalidateQueries({ queryKey: knowledgeSourceKeys.list(workspaceId) });
    },
  });
}
