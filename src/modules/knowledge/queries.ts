'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { knowledgeKeys } from './keys';
import { knowledgeApi, type KnowledgeEntriesParams } from './api';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';

/**
 * Query hook for paginated knowledge sources in a workspace.
 * Returns the list of uploaded or connected knowledge sources.
 *
 * @param workspaceId - The workspace ID to fetch sources for.
 * @param params - Optional pagination and filter parameters.
 *
 * @example
 * ```tsx
 * const { data: sources, isLoading } = useKnowledgeSourcesQuery('ws-1', { page: 1 });
 * ```
 */
export function useKnowledgeSourcesQuery(workspaceId: string, params?: ListParams) {
  return useQuery({
    queryKey: [...knowledgeKeys.sources(workspaceId), params],
    queryFn: () => knowledgeApi.listSources(workspaceId, params),
    enabled: !!workspaceId,
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
  });
}

/**
 * Query hook for fetching knowledge entries belonging to a specific source.
 *
 * @param workspaceId - The workspace ID containing the source.
 * @param sourceId - The knowledge source ID to fetch entries for. Skipped if empty.
 *
 * @example
 * ```tsx
 * const { data: entries } = useKnowledgeEntriesQuery('ws-1', 'src-abc');
 * ```
 */
export function useKnowledgeEntriesQuery(workspaceId: string, sourceId: string) {
  return useQuery({
    queryKey: knowledgeKeys.sourceEntries(workspaceId, sourceId),
    queryFn: () => knowledgeApi.listEntries(workspaceId, sourceId),
    enabled: !!workspaceId && !!sourceId,
    staleTime: STALE.DEFAULT,
  });
}

/**
 * Query hook for the full knowledge base across all sources.
 * Supports filtering, search, and pagination.
 *
 * @param workspaceId - The workspace ID to query the knowledge base for.
 * @param params - Filtering, search, and pagination parameters.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useKnowledgeBaseQuery('ws-1', { search: 'auth', page: 1 });
 * ```
 */
export function useKnowledgeBaseQuery(workspaceId: string, params: KnowledgeEntriesParams) {
  return useQuery({
    queryKey: [...knowledgeKeys.entries(workspaceId), params],
    queryFn: () => knowledgeApi.listAllEntries(workspaceId, params),
    enabled: !!workspaceId,
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
  });
}

/**
 * Mutation hook for updating a knowledge entry.
 * Invalidates all knowledge entries queries in the workspace on success.
 *
 * @param workspaceId - The workspace ID containing the entry.
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateKnowledgeEntryMutation('ws-1');
 * updateMutation.mutate({ id: 'entry-1', data: { content: 'Updated text' } });
 * ```
 */
export function useUpdateKnowledgeEntryMutation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      knowledgeApi.updateEntry(workspaceId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeKeys.entries(workspaceId) });
    },
  });
}

/**
 * Mutation hook for muting (suppressing) a knowledge entry.
 * Muted entries are hidden from active knowledge base queries.
 * Invalidates all knowledge entries queries on success.
 *
 * @param workspaceId - The workspace ID containing the entry.
 *
 * @example
 * ```tsx
 * const muteMutation = useMuteKnowledgeEntryMutation('ws-1');
 * muteMutation.mutate('entry-abc');
 * ```
 */
export function useMuteKnowledgeEntryMutation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => knowledgeApi.muteEntry(workspaceId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeKeys.entries(workspaceId) });
    },
  });
}

/**
 * Mutation hook for deleting a knowledge entry.
 * Invalidates all knowledge entries queries on success.
 *
 * @param workspaceId - The workspace ID containing the entry.
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteKnowledgeEntryMutation('ws-1');
 * deleteMutation.mutate('entry-abc');
 * ```
 */
export function useDeleteKnowledgeEntryMutation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => knowledgeApi.deleteEntry(workspaceId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeKeys.entries(workspaceId) });
    },
  });
}


