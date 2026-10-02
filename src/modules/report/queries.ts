'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportKeys } from './keys';
import { listReports, generateReport, deleteReport } from './api';

function useInvalidateReportDependencies() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: reportKeys.all }),
    ]);
}

export function useReportsQuery(workspaceId: string) {
  return useQuery({
    queryKey: reportKeys.list(workspaceId),
    queryFn: () => listReports(workspaceId),
    enabled: workspaceId.length > 0,
  });
}

export function useGenerateReportMutation(workspaceId: string) {
  const invalidate = useInvalidateReportDependencies();
  return useMutation({
    mutationFn: (payload: { name: string; type: string; range: string; format: string }) =>
      generateReport(workspaceId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteReportMutation(workspaceId: string) {
  const invalidate = useInvalidateReportDependencies();
  return useMutation({
    mutationFn: (reportId: string) => deleteReport(workspaceId, reportId),
    onSuccess: invalidate,
  });
}
