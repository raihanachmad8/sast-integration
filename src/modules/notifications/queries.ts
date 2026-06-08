'use client';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from './api';
import { notificationKeys } from './keys';
import { STALE } from '@/commons/constants/query';

export function useNotificationsQuery(userId: string) {
  return useQuery({ queryKey: notificationKeys.list(userId), queryFn: () => notificationsApi.list(userId), enabled: !!userId, staleTime: STALE.SHORT });
}

export function useUnreadNotificationCount(userId: string) {
  return useQuery({ queryKey: notificationKeys.unreadCount(userId), queryFn: () => notificationsApi.getUnreadCount(userId), enabled: !!userId, staleTime: STALE.SHORT });
}
