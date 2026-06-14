'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { scanApi, type ScannerAvailability } from './api';
import { scanKeys } from './keys';
import { useWorkspace } from '@/hooks/use-workspace';
import { STALE } from '@/commons/constants/query';
import type { TriggerScanPayload } from './types';
import type { ListParams } from '@/commons/types/pagination';

/** Poll every 3 seconds while a scan is in progress. */
const SCAN_POLL_INTERVAL = 3_000;
/** Poll findings less frequently while scan is active. */
const FINDINGS_POLL_INTERVAL = 5_000;

/** Check if a scan status is still in-progress (needs polling). */
function isActiveStatus(status?: string): boolean {
  return status === 'queued' || status === 'processing' || status === 'running' || status === 'parsing';
}

/**
 * Query hook for fetching all scan rows in the workspace.
 * Polls every 3s while any scan is queued or running.
 */
export function useScanListQuery(params: ListParams) {
  const { workspaceId } = useWorkspace();

  // Read current data to check for active scans (without triggering extra fetch)
  const queryClient = useQueryClient();
  const currentData = queryClient.getQueryData<{ data: Array<{ status?: string }> }>(scanKeys.list(params));
  const hasActiveScans = (currentData?.data ?? []).some((s) => isActiveStatus(s.status));

  const query = useQuery({
    queryKey: scanKeys.list(params),
    queryFn: () => scanApi.list(workspaceId!, params),
    staleTime: STALE.SHORT,
    placeholderData: keepPreviousData,
    enabled: !!workspaceId,
    refetchInterval: hasActiveScans ? SCAN_POLL_INTERVAL : false,
  });

  return query;
}

/**
 * Query hook for fetching scan detail with timeline.
 * Polls every 3s while the scan is queued or running.
 */
export function useScanDetailQuery(scanId: string) {
  const { workspaceId } = useWorkspace();

  // Read current data to check status (without triggering extra fetch)
  const queryClient = useQueryClient();
  const currentData = queryClient.getQueryData<{ status?: string }>(scanKeys.detail(scanId));
  const isActive = isActiveStatus(currentData?.status);

  const query = useQuery({
    queryKey: scanKeys.detail(scanId),
    queryFn: () => scanApi.getDetail(workspaceId!, scanId),
    enabled: !!scanId && !!workspaceId,
    staleTime: STALE.SHORT,
    refetchInterval: isActive ? SCAN_POLL_INTERVAL : false,
  });

  return query;
}

/**
 * Query hook for fetching findings within a scan.
 * Polls every 5s while the parent scan is still active.
 */
export function useScanFindingsQuery(scanId: string) {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  // Read scan detail from cache to check status (don't trigger a fetch)
  const scanDetail = queryClient.getQueryData<{ status?: string }>(scanKeys.detail(scanId));
  const isActive = isActiveStatus(scanDetail?.status);

  const query = useQuery({
    queryKey: scanKeys.findings(scanId),
    queryFn: () => scanApi.getFindings(workspaceId!, scanId),
    enabled: !!scanId && !!workspaceId,
    staleTime: STALE.SHORT,
    refetchInterval: isActive ? FINDINGS_POLL_INTERVAL : false,
  });

  return query;
}

/**
 * Query hook for checking scanner availability on the host system.
 * Returns a map of scanner ID to availability boolean.
 */
export function useScannerAvailabilityQuery() {
  const { workspaceId } = useWorkspace();
  return useQuery<ScannerAvailability>({
    queryKey: scanKeys.availability(),
    queryFn: () => scanApi.getAvailability(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Mutation hook for triggering a new scan.
 */
export function useTriggerScanMutation() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (payload: TriggerScanPayload) =>
      scanApi.trigger(workspaceId!, 'default', payload.repositoryId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanKeys.all });
    },
  });
}

/**
 * Query hook for fetching branches from a repository's SCM provider.
 */
export function useRepositoryBranchesQuery(repoId: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: scanKeys.branches(repoId),
    queryFn: () => scanApi.listBranches(workspaceId!, repoId),
    enabled: !!workspaceId && !!repoId,
    staleTime: STALE.SHORT,
  });
}
