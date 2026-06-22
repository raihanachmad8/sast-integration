'use client';
import { useQuery } from '@tanstack/react-query';
import { auditKeys } from './keys';
import { auditApi } from './api';
import { STALE } from '@/commons/constants/query';

/**
 * Query hook for fetching audit logs in the workspace.
 * Returns a chronological list of security and configuration changes.
 *
 * @example
 * ```tsx
 * const { data: logs, isLoading } = useAuditLogsQuery();
 * ```
 */
export function useAuditLogsQuery() {
  return useQuery({ queryKey: auditKeys.logs(), queryFn: () => auditApi.listAuditLogs(), staleTime: STALE.DEFAULT });
}

/**
 * Query hook for fetching activity logs in the workspace.
 * Returns a chronological list of user actions and system events.
 *
 * @example
 * ```tsx
 * const { data: activities, isLoading } = useActivityLogsQuery();
 * ```
 */
export function useActivityLogsQuery() {
  return useQuery({ queryKey: auditKeys.activity(), queryFn: () => auditApi.listActivityLogs(), staleTime: STALE.DEFAULT });
}
