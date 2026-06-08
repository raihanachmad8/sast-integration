'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { reportKeys } from './keys';
import { reportsApi } from './api';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';

type GenerateReportInput = {
  type: string;
  name: string;
  format: string;
  range?: string;
};

export function useReportsQuery(params: ListParams) {
  return useQuery({     queryKey: reportKeys.list(params), queryFn: () => reportsApi.list(params), staleTime: STALE.DEFAULT, placeholderData: keepPreviousData });
}

export function useGenerateReportMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateReportInput) => reportsApi.generate(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.list() }),
  });
}

export function useDeleteReportMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => reportsApi.delete(reportId),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.list() }),
  });
}
