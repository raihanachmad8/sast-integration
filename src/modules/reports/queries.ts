'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { reportKeys } from './keys';
import { reportsApi } from './api';
import { useWorkspace } from '@/hooks/use-workspace';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';

type GenerateReportInput = {
  type: string;
  title?: string;
  format?: string;
  range?: string;
};

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

export function useGenerateReportMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (data: GenerateReportInput) => reportsApi.generate(workspaceId!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export function useDeleteReportMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (reportId: string) => reportsApi.delete(workspaceId!, reportId),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.all }),
  });
}
