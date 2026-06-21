'use client';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { scheduleKeys } from './keys';
import { schedulesApi } from './api';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';
import type { CreateScheduleInput, UpdateScheduleInput } from '@/commons/schemas/schedule.schema';

export function useSchedulesQuery(params: ListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({ queryKey: scheduleKeys.list(params), queryFn: () => schedulesApi.list(workspaceId!, params), staleTime: STALE.DEFAULT, placeholderData: keepPreviousData, enabled: !!workspaceId });
}

export function useCreateScheduleMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (data: CreateScheduleInput) => schedulesApi.create(workspaceId!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
}

export function useUpdateScheduleMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleInput }) => schedulesApi.update(workspaceId!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
}

export function useDeleteScheduleMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => schedulesApi.delete(workspaceId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
}

export function useToggleScheduleMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => schedulesApi.toggle(workspaceId!, id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
}
