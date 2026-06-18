'use client';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from './api';
import { notificationKeys } from './keys';
import { STALE } from '@/commons/constants/query';

/**
 * Query hook for fetching notifications for a specific user.
 * Uses STALE.SHORT for frequent refreshes so the notification list stays current.
 *
 * @param userId - The user ID to fetch notifications for. Skipped if empty.
 *
 * @example
 * ```tsx
 * const { data: notifications, isLoading } = useNotificationsQuery('user-123');
 * ```
 */
export function useNotificationsQuery(userId: string) {
  return useQuery({ queryKey: notificationKeys.list(userId), queryFn: () => notificationsApi.list(userId), enabled: !!userId, staleTime: STALE.SHORT });
}

/**
 * Query hook for fetching the unread notification count badge.
 * Uses STALE.SHORT so the badge updates quickly after new notifications arrive.
 *
 * @param userId - The user ID to fetch the unread count for. Skipped if empty.
 *
 * @example
 * ```tsx
 * const { data: { count } } = useUnreadNotificationCount('user-123');
 * ```
 */
export function useUnreadNotificationCount(userId: string) {
  return useQuery({ queryKey: notificationKeys.unreadCount(userId), queryFn: () => notificationsApi.getUnreadCount(userId), enabled: !!userId, staleTime: STALE.SHORT });
}
