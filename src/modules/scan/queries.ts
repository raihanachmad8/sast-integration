'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { scanApi } from './api';
import { scanKeys } from './keys';
import { useWorkspace } from '@/hooks/use-workspace';
import { STALE } from '@/commons/constants/query';
import type { TriggerScanPayload } from './types';
import type { ListParams } from '@/commons/types/pagination';

/**
 * Query hook for fetching all scan rows in the workspace.
 */
export function useScanListQuery(params: ListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: scanKeys.list(params),
    queryFn: () => scanApi.list(workspaceId!, params),
    staleTime: STALE.SHORT,
    placeholderData: keepPreviousData,
    enabled: !!workspaceId,
  });
}

/**
 * Query hook for fetching scan detail with timeline.
 */
export function useScanDetailQuery(scanId: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: scanKeys.detail(scanId),
    queryFn: () => scanApi.getDetail(workspaceId!, scanId),
    enabled: !!scanId && !!workspaceId,
    staleTime: STALE.SHORT,
  });
}

/**
 * Query hook for fetching findings within a scan.
 */
export function useScanFindingsQuery(scanId: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: scanKeys.findings(scanId),
    queryFn: () => scanApi.getFindings(workspaceId!, scanId),
    enabled: !!scanId && !!workspaceId,
    staleTime: STALE.SHORT,
  });
}

/**
 * Mutation hook for triggering a new scan.
 */
export function useTriggerScanMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (payload: TriggerScanPayload & { projectId: string; repoId: string }) =>
      scanApi.trigger(workspaceId!, payload.projectId, payload.repoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanKeys.list() });
    },
  });
}

export function useScanRowsQuery(params: ListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: scanKeys.list(params),
    queryFn: () => scanApi.list(workspaceId!, params),
    staleTime: STALE.SHORT,
    placeholderData: keepPreviousData,
    enabled: !!workspaceId,
  });
}
