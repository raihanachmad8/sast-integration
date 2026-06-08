/**
 * TanStack Query key factory for the notifications module.
 *
 * @example
 * ```ts
 * queryClient.invalidateQueries({ queryKey: notificationKeys.list('usr_01') });
 * queryClient.invalidateQueries({ queryKey: notificationKeys.all });
 * ```
 */
export const notificationKeys = {
  /** Root key — invalidates all notification queries. */
  all: ['notifications'] as const,
  /** Key for a user's notifications list. */
  list: (userId: string) => [...notificationKeys.all, 'list', userId] as const,
  /** Key for unread notification count. */
  unreadCount: (userId: string) => [...notificationKeys.all, 'unread', userId] as const,
};
