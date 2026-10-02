'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduleKeys } from './keys';
import { listSchedules, createSchedule, updateSchedule, deleteSchedule, toggleSchedule } from './api';
import type { Schedule } from './api';

/** @example const { data } = use...(); */
export function useSchedulesQuery(workspaceId: string) {
  return useQuery({
    queryKey: scheduleKeys.list(workspaceId),
    queryFn: () => listSchedules(workspaceId),
    enabled: !!workspaceId,
  });
}

/** @example const { data } = use...(); */
export function useCreateScheduleMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Schedule>) => createSchedule(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.list(workspaceId) });
    },
  });
}

/** @example const { data } = use...(); */
export function useUpdateScheduleMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: Partial<Schedule> }) =>
      updateSchedule(workspaceId, scheduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.list(workspaceId) });
    },
  });
}

/** @example const { data } = use...(); */
export function useDeleteScheduleMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => deleteSchedule(workspaceId, scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.list(workspaceId) });
    },
  });
}

/** @example const { data } = use...(); */
export function useToggleScheduleMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, active }: { scheduleId: string; active: boolean }) =>
      toggleSchedule(workspaceId, scheduleId, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.list(workspaceId) });
    },
  });
}
