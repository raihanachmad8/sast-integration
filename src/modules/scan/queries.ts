'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scanKeys } from './keys';
import {
  listProjects,
  listRepositories,
  listScanProfiles,
  getRepositoryScans,
  runManagedScan,
  configureRepositorySchedule,
  listScanRows,
  listScanRepositories,
  getScanDetail,
  listScanFindings,
} from './api';

function useInvalidateScanDependencies() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: scanKeys.all }),
    ]);
}

export function useScanProjectsQuery(workspaceId: string) {
  return useQuery({
    queryKey: scanKeys.projects(workspaceId),
    queryFn: () => listProjects(workspaceId),
    enabled: workspaceId.length > 0,
  });
}

export function useScanRepositoriesQuery(workspaceId: string, projectId: string) {
  return useQuery({
    queryKey: scanKeys.repositories(workspaceId, projectId),
    queryFn: () => listRepositories(workspaceId, projectId),
    enabled: workspaceId.length > 0 && projectId.length > 0,
  });
}

export function useScanProfilesQuery(workspaceId: string) {
  return useQuery({
    queryKey: scanKeys.profiles(workspaceId),
    queryFn: () => listScanProfiles(workspaceId),
    enabled: workspaceId.length > 0,
  });
}

export function useRepositoryScansQuery(
  workspaceId: string,
  projectId: string,
  repositoryId: string,
) {
  return useQuery({
    queryKey: scanKeys.repositoryScans(workspaceId, projectId, repositoryId),
    queryFn: () => getRepositoryScans(workspaceId, projectId, repositoryId),
    enabled: workspaceId.length > 0 && projectId.length > 0 && repositoryId.length > 0,
  });
}

export function useRunManagedScanMutation() {
  const invalidate = useInvalidateScanDependencies();
  return useMutation({
    mutationFn: ({
      workspaceId,
      projectId,
      repositoryId,
      branch,
    }: {
      workspaceId: string;
      projectId: string;
      repositoryId: string;
      branch: string;
    }) => runManagedScan(workspaceId, projectId, repositoryId, branch),
    onSuccess: invalidate,
  });
}

export function useConfigureScheduleMutation() {
  const invalidate = useInvalidateScanDependencies();
  return useMutation({
    mutationFn: ({
      workspaceId,
      projectId,
      repositoryId,
      payload,
    }: {
      workspaceId: string;
      projectId: string;
      repositoryId: string;
      payload: { active: boolean; cronExpression: string; timezone: string; branch: string };
    }) => configureRepositorySchedule(workspaceId, projectId, repositoryId, payload),
    onSuccess: invalidate,
  });
}

// ============================================
// Scan Table View Queries
// ============================================

export function useScanRowsQuery() {
  return useQuery({
    queryKey: scanKeys.lists(),
    queryFn: listScanRows,
  });
}

export function useScanRepositoriesListQuery(workspaceId: string) {
  return useQuery({
    queryKey: [...scanKeys.all, 'scan-repos', workspaceId],
    queryFn: () => listScanRepositories(workspaceId),
    enabled: workspaceId.length > 0,
  });
}

export function useScanDetailQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: scanKeys.detail(id),
    queryFn: () => getScanDetail(id),
    enabled: enabled && id.length > 0,
  });
}

export function useScanFindingsQuery(scanId: string, enabled = true) {
  return useQuery({
    queryKey: [...scanKeys.all, 'scan-findings', scanId],
    queryFn: () => listScanFindings(scanId),
    enabled: enabled && scanId.length > 0,
  });
}
