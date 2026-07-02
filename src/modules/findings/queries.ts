'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { z } from 'zod';

import { STALE } from '@/commons/constants/query';
import type { updateFindingSchema } from '@/commons/schemas';
import { useWorkspace } from '@/lib/hooks/useWorkspace';

import { findingsApi } from './api';
import { findingKeys } from './keys';
import type { FindingListParams } from './types';

type UpdateFindingPayload = z.infer<typeof updateFindingSchema>;

/**
 * Query hook for paginated findings list in the current workspace.
 * Supports filtering, sorting, and pagination. Uses keepPreviousData for smooth transitions.
 *
 * @param params - Filtering, sorting, and pagination parameters for findings.
 * @param enabled - Override to force-disable the query (default: !!workspaceId).
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
 * Unified bulk action mutation for findings.
 * Supports dismiss, resolve, reverify, and assign actions.
 * All actions go through the unified /bulk endpoint → findingBulkService.
 *
 * @example
 * ```tsx
 * const bulkAction = useBulkFindingsMutation();
 * bulkAction.mutate({ ids: ['f1', 'f2'], action: 'dismiss' });
 * bulkAction.mutate({ ids: ['f1'], action: 'reverify' });
 * bulkAction.mutate({ ids: ['f1'], action: 'assign', assignedTo: 'user-1' });
 * ```
 */
export function useBulkFindingsMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ ids, action, assignedTo }: { ids: string[]; action: string; assignedTo?: string }) =>
      findingsApi.bulkAction(workspaceId!, ids, action, assignedTo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: findingKeys.all });
    },
  });
}

