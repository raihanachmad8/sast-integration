'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { STALE } from '@/commons/constants/query';
import { findingKeys } from './keys';
import { findingsApi } from './api';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
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
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useFindingsQuery({ status: 'open', page: 1 });
 * ```
 */
export function useFindingsQuery(params: FindingListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: findingKeys.list(params),
    queryFn: () => findingsApi.list(workspaceId!, params),
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
    enabled: !!workspaceId,
  });
}

/**
 * Query hook for grouped findings within a specific project.
 * Returns findings grouped by a common attribute (e.g., file path or rule).
 *
 * @param projectId - The project ID to fetch grouped findings for. Skipped if empty.
 *
 * @example
 * ```tsx
 * const { data: groups } = useFindingGroupsQuery('proj-123');
 * ```
 */
export function useFindingGroupsQuery(projectId: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: findingKeys.groups(projectId),
    queryFn: () => findingsApi.listGroups(workspaceId!, projectId),
    enabled: !!projectId && !!workspaceId,
    staleTime: STALE.DEFAULT,
  });
}

/**
 * Query hook for a single finding by ID.
 * Returns full finding details including metadata and history.
 *
 * @param id - The finding ID to fetch. Skipped if empty.
 *
 * @example
 * ```tsx
 * const { data: finding } = useFindingQuery('find-abc');
 * console.log(finding?.severity); // 'HIGH'
 * ```
 */
export function useFindingQuery(id: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: findingKeys.detail(id),
    queryFn: () => findingsApi.get(workspaceId!, id),
    enabled: !!id && !!workspaceId,
    staleTime: STALE.DEFAULT,
  });
}

/**
 * Mutation hook for updating a single finding (severity, verdict, status, assignment, or notes).
 * Invalidates all finding-related queries on success.
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
    onSuccess: () => {
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
 * verifyMutation.mutate('find-abc');
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
