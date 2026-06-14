'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from './api';
import { profileKeys } from './keys';
import { STALE } from '@/commons/constants/query';

export function useProfileQuery(userId: string) {
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: () => profileApi.get(userId),
    enabled: !!userId,
    staleTime: STALE.DEFAULT,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: { name?: string; username?: string; bio?: string; timezone?: string; language?: string } }) =>
      profileApi.update(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

export function useSessionsQuery() {
  return useQuery({
    queryKey: [...profileKeys.all, 'sessions'],
    queryFn: () => profileApi.getSessions(),
    staleTime: STALE.DEFAULT,
  });
}

export function useRevokeSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => profileApi.revokeSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...profileKeys.all, 'sessions'] });
    },
  });
}

export function useAuditLogQuery() {
  return useQuery({
    queryKey: [...profileKeys.all, 'audit-log'],
    queryFn: () => profileApi.getAuditLog(),
    staleTime: STALE.DEFAULT,
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => profileApi.changePassword(data),
  });
}

export function useUploadAvatarMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

export function useRemoveAvatarMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => profileApi.removeAvatar(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}
