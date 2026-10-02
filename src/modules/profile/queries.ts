'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileKeys } from './keys';
import { getProfile, updateProfile, getSessions, revokeSession, getAuditLog, changePassword } from './api';
import type { UserProfile } from './api';

/**
 * React Query hook to fetch the current user's profile.
 * @returns The query result containing the user profile.
 * @example
 * ```tsx
 * const { data: profile, isLoading } = useProfileQuery();
 * if (isLoading) return <LoadingState />;
 * return <div>{profile?.name}</div>;
 * ```
 */
export function useProfileQuery() {
  return useQuery({
    queryKey: profileKeys.profile,
    queryFn: getProfile,
  });
}

/**
 * React Query mutation hook to update the user's profile.
 * Invalidates the profile query on success.
 * @returns The mutation result for updating the profile.
 * @example
 * ```tsx
 * const { mutate: update } = useUpdateProfileMutation();
 * update({ name: 'Jane Doe', bio: 'Software engineer' });
 * ```
 */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserProfile>) => updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.profile });
    },
  });
}

/**
 * React Query hook to fetch active sessions for the current user.
 * @returns The query result containing the list of sessions.
 * @example
 * ```tsx
 * const { data: sessions, isLoading } = useSessionsQuery();
 * if (isLoading) return <LoadingState />;
 * return sessions?.map((s) => <SessionRow key={s.id} session={s} />);
 * ```
 */
export function useSessionsQuery() {
  return useQuery({
    queryKey: profileKeys.sessions,
    queryFn: getSessions,
  });
}

/**
 * React Query mutation hook to revoke an active session.
 * Invalidates the sessions query on success.
 * @returns The mutation result for revoking a session.
 * @example
 * ```tsx
 * const { mutate: revoke } = useRevokeSessionMutation();
 * revoke('sess-abc123');
 * ```
 */
export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.sessions });
    },
  });
}

/**
 * React Query hook to fetch the user's audit log.
 * @returns The query result containing audit log entries.
 * @example
 * ```tsx
 * const { data: logs, isLoading } = useAuditLogQuery();
 * if (isLoading) return <LoadingState />;
 * return logs?.map((entry) => <AuditRow key={entry.id} entry={entry} />);
 * ```
 */
export function useAuditLogQuery() {
  return useQuery({
    queryKey: profileKeys.auditLog,
    queryFn: getAuditLog,
  });
}

/**
 * React Query mutation hook to change the user's password.
 * @returns The mutation result for changing the password.
 * @example
 * ```tsx
 * const { mutate: changePw, isSuccess } = useChangePasswordMutation();
 * changePw({ currentPassword: 'oldPass', newPassword: 'newPass' });
 * if (isSuccess) toast.success('Password changed');
 * ```
 */
export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => changePassword(data),
  });
}
