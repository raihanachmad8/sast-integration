'use client';
import { useQuery } from '@tanstack/react-query';
import { auditKeys } from './keys';
import { auditApi } from './api';
import { STALE } from '@/commons/constants/query';

export function useAuditLogsQuery() {
  return useQuery({ queryKey: auditKeys.logs(), queryFn: () => auditApi.listAuditLogs(), staleTime: STALE.DEFAULT });
}

export function useActivityLogsQuery() {
  return useQuery({ queryKey: auditKeys.activity(), queryFn: () => auditApi.listActivityLogs(), staleTime: STALE.DEFAULT });
}
