'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { reportKeys } from './keys';
import { reportsApi } from './api';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';

type GenerateReportInput = {
  type: string;
  title?: string;
  format?: string;
  range?: string;
};

/**
 * Query hook for paginated reports in the current workspace.
 * Uses keepPreviousData to avoid layout shift during pagination.
 *
 * @param params - Pagination and filter parameters for report listing.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useReportsQuery({ page: 1, perPage: 10 });
 * ```
 */
export function useReportsQuery(params: ListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: reportKeys.list(params),
    queryFn: () => reportsApi.list(workspaceId!, params),
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
    enabled: !!workspaceId,
  });
}

/**
 * Mutation hook for generating a new report.
 * Invalidates all report queries on success so the new report appears in the list.
 *
 * @example
 * ```tsx
 * const generateMutation = useGenerateReportMutation();
 * generateMutation.mutate({ type: 'vulnerability', title: 'Q2 Report', format: 'pdf' });
 * ```
 */
export function useGenerateReportMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (data: GenerateReportInput) => reportsApi.generate(workspaceId!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

/**
 * Mutation hook for deleting a report by ID.
 * Invalidates all report queries on success.
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteReportMutation();
 * deleteMutation.mutate('report-abc');
 * ```
 */
export function useDeleteReportMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (reportId: string) => reportsApi.delete(workspaceId!, reportId),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.all }),
  });
}
