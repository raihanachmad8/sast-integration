'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from './api';
import { profileKeys } from './keys';
import { STALE } from '@/commons/constants/query';

/**
 * Query hook for fetching a user profile by ID.
 * Skipped if userId is empty.
 *
 * @param userId - The user ID to fetch the profile for. Skipped if empty.
 *
 * @example
 * ```tsx
 * const { data: profile, isLoading } = useProfileQuery('user-123');
 * ```
 */
export function useProfileQuery(userId: string) {
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: () => profileApi.get(userId),
    enabled: !!userId,
    staleTime: STALE.DEFAULT,
  });
}

/**
 * Mutation hook for updating user profile fields (name, username, bio, timezone, language).
 * Invalidates all profile-related queries on success.
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateProfileMutation();
 * updateMutation.mutate({ userId: 'user-1', payload: { name: 'Alice Chen' } });
 * ```
 */
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

/**
 * Query hook for fetching active sessions for the current user.
 * Returns a list of all active sessions including device and IP info.
 *
 * @example
 * ```tsx
 * const { data: sessions, isLoading } = useSessionsQuery();
 * ```
 */
export function useSessionsQuery() {
  return useQuery({
    queryKey: [...profileKeys.all, 'sessions'],
    queryFn: () => profileApi.getSessions(),
    staleTime: STALE.DEFAULT,
  });
}

/**
 * Mutation hook for revoking a specific user session.
 * Invalidates the sessions list on success.
 *
 * @example
 * ```tsx
 * const revokeMutation = useRevokeSessionMutation();
 * revokeMutation.mutate('session-abc');
 * ```
 */
export function useRevokeSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => profileApi.revokeSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...profileKeys.all, 'sessions'] });
    },
  });
}

/**
 * Query hook for fetching the current user's audit log.
 * Returns a chronological list of the user's own actions.
 *
 * @example
 * ```tsx
 * const { data: log, isLoading } = useAuditLogQuery();
 * ```
 */
export function useAuditLogQuery() {
  return useQuery({
    queryKey: [...profileKeys.all, 'audit-log'],
    queryFn: () => profileApi.getAuditLog(),
    staleTime: STALE.DEFAULT,
  });
}

/**
 * Mutation hook for changing the current user's password.
 * No automatic cache invalidation; requires user to re-authenticate.
 *
 * @example
 * ```tsx
 * const changeMutation = useChangePasswordMutation();
 * changeMutation.mutate({ currentPassword: 'old', newPassword: 'new', confirmPassword: 'new' });
 * ```
 */
export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => profileApi.changePassword(data),
  });
}

/**
 * Mutation hook for uploading a new avatar image.
 * Invalidates all profile queries on success to refresh the avatar URL.
 *
 * @example
 * ```tsx
 * const uploadMutation = useUploadAvatarMutation();
 * uploadMutation.mutate(file);
 * ```
 */
export function useUploadAvatarMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

/**
 * Mutation hook for removing the current user's avatar.
 * Invalidates all profile queries on success.
 *
 * @example
 * ```tsx
 * const removeMutation = useRemoveAvatarMutation();
 * removeMutation.mutate();
 * ```
 */
export function useRemoveAvatarMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => profileApi.removeAvatar(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}
