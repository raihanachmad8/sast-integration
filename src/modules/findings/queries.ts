'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import { STALE } from '@/commons/constants/query';
import { useWorkspace } from '@/lib/hooks/useWorkspace';

import { findingsApi } from './api';
import { findingKeys } from './keys';
import type { FindingListParams } from './types';

type UpdateFindingPayload = {
  severity?: string;
  verdict?: string;
  status?: string;
  assignedTo?: string;
  notes?: string;
};

type BulkUpdateFindingsPayload = {
  severity?: string;
  verdict?: string;
  status?: string;
};

/**
 * Query hook for paginated findings list in the current workspace.
 * Supports filtering, sorting, and pagination. Uses keepPreviousData for smooth transitions.
 *
 * @param params - Filtering, sorting, and pagination parameters for findings.
 * @param enabled - Override to force-disable the query (default: !!workspaceId).
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useFindingsQuery({ page: 1, perPage: 10, status: 'open' });
 * ```
 */
export function useFindingsQuery(params?: Partial<FindingListParams>, enabled?: boolean) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: findingKeys.list(workspaceId!, params),
    queryFn: () => findingsApi.list(workspaceId!, params),
    staleTime: STALE.FILTER,
    placeholderData: keepPreviousData,
    enabled: enabled !== undefined ? enabled && !!workspaceId : !!workspaceId,
  });
}

/**
 * Query hook for a single finding by ID.
 * Returns full finding details including metadata and history.
 *
 * @param id - The finding ID to fetch. Skipped if empty.
 * @param enabled - Override to force-disable the query.
 *
 * @example
 * ```tsx
 * const { data: finding } = useFindingQuery('find-abc');
 * ```
 */
export function useFindingQuery(id: string, enabled?: boolean) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: findingKeys.detail(id),
    queryFn: () => findingsApi.get(workspaceId!, id),
    enabled: enabled !== undefined ? enabled && !!id && !!workspaceId : !!id && !!workspaceId,
    staleTime: STALE.DEFAULT,
  });
}

/**
 * Mutation hook for updating a single finding (severity, verdict, status, assignment, or notes).
 * Optimistically updates the cache, then rolls back on error.
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateFindingMutation();
 * updateMutation.mutate({ id: 'find-1', payload: { severity: 'CRITICAL' } });
 * ```
 */
export function useUpdateFindingMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFindingPayload }) =>
      findingsApi.update(workspaceId!, id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: findingKeys.all });
      const previous = qc.getQueriesData({ queryKey: findingKeys.all });
      qc.setQueriesData({ queryKey: findingKeys.all }, (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        // Optimistic update for list queries with data array
        const obj = old as { data?: unknown[] };
        if (Array.isArray(obj.data)) {
          return {
            ...obj,
            data: obj.data.map((item: unknown) => {
              const record = item as Record<string, unknown>;
              return record.id === id ? { ...record, ...payload } : record;
            }),
          };
        }
        return old;
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: findingKeys.all });
    },
  });
}

/**
 * Mutation hook for bulk-updating multiple findings at once.
 * Accepts an array of finding IDs and a partial payload to apply to all.
 * Invalidates all finding-related queries on success.
 *
 * @example
 * ```tsx
 * const bulkMutation = useBulkUpdateFindingsMutation();
 * bulkMutation.mutate({ ids: ['f1', 'f2'], payload: { status: 'dismissed' } });
 * ```
 */
export function useBulkUpdateFindingsMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ ids, payload }: { ids: string[]; payload: BulkUpdateFindingsPayload }) =>
      findingsApi.bulkUpdate(workspaceId!, ids, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: findingKeys.all });
    },
  });
}

/**
 * Mutation hook for triggering AI-powered verification on selected findings.
 * Sends finding IDs to the AI verification endpoint and invalidates all findings on success.
 *
 * @example
 * ```tsx
 * const aiVerify = useRunAiVerificationMutation();
 * aiVerify.mutate(['find-1', 'find-2']);
 * ```
 */
export function useRunAiVerificationMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (findingIds: string[]) => findingsApi.aiVerify(workspaceId!, findingIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: findingKeys.all });
    },
  });
}

/**
 * Mutation hook for manually verifying a single finding.
 * Sends the finding to the verification endpoint and invalidates all findings on success.
 *
 * @example
 * ```tsx
 * const verifyMutation = useVerifyFindingMutation();
 * verifyMutation.mutate({ findingId: 'find-abc', modelId: 'model-1' });
 * ```
 */
export function useVerifyFindingMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ findingId, modelId }: { findingId: string; modelId?: string }) =>
      findingsApi.verify(workspaceId!, findingId, modelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: findingKeys.all });
    },
  });
}
