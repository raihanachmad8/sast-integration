'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useSessionData } from '@/modules/auth/queries';
import { useFindingsQuery, useUpdateFindingMutation, useRunAiVerificationMutation } from '@/modules/findings';
import { useMembersQuery } from '@/modules/members';
import { useTableParams } from '@/lib/hooks/useTableParams';
import type { Finding } from '@/commons/types';
import type { FindingListParams } from '@/modules/findings/types';

export function useFindingsPageState() {
  const { message } = App.useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSessionData();
  const workspaceSlug = session.data?.workspace?.slug ?? '';

  const { params, setPage, setPageSize, setSearch, setFilter } = useTableParams({
    filterKeys: ['severity', 'verdict', 'status'],
    defaultPageSize: 10,
  });

  const tableParams: FindingListParams = {
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
    severity: (params.filters.severity || undefined) as FindingListParams['severity'],
    verdict: (params.filters.verdict || undefined) as FindingListParams['verdict'],
    status: (params.filters.status || undefined) as FindingListParams['status'],
  };

  const findingsQuery = useFindingsQuery(tableParams);
  const membersQuery = useMembersQuery(session.data?.workspace?.id ?? '');
  const updateStatusMutation = useUpdateFindingMutation();
  const verifyMutation = useRunAiVerificationMutation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Finding | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignIds, setBulkAssignIds] = useState<string[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState<string | undefined>(undefined);

  const findings = useMemo(() => {
    const raw = (findingsQuery.data?.data ?? []) as unknown as Array<{
      id: string; scanId: string; groupId: string; cweId: string | null;
      severity: string; status: string; filePath: string | null; lineNumber: number | null;
      description: string | null; rule: string; scanner: string; message: string | null;
      assignedTo: string | null; createdAt: string;
      repositoryName: string | null; verdict: string | null; model: string | null; confidence: number | null;
      explanation: string | null; fixSuggestion: string | null; codeSnippet: string | null;
    }>;
    return raw.map((f) => ({
      id: f.id,
      rule: f.rule ?? '',
      repo: f.repositoryName ?? '',
      file: f.filePath ?? '',
      filePath: f.filePath ?? undefined,
      severity: f.severity as Finding['severity'],
      scanner: f.scanner ?? '',
      verdict: (f.verdict ?? 'Pending') as Finding['verdict'],
      confidence: f.confidence ?? null,
      model: f.model ?? '',
      assignee: f.assignedTo ?? null,
      status: (f.status ?? 'open') as Finding['status'],
      cwe: f.cweId ?? '',
      lineNumber: f.lineNumber ?? undefined,
      message: f.message ?? undefined,
      codeSnippet: f.codeSnippet ?? undefined,
      explanation: f.explanation ?? undefined,
      fixSuggestion: f.fixSuggestion ?? undefined,
    }));
  }, [findingsQuery.data]);
  const totalCount = findingsQuery.data?.meta?.total ?? 0;
  const members = useMemo(() => (membersQuery.data?.data ?? []) as unknown as Array<{ userId: string; name: string; email: string }>, [membersQuery.data]);
  const MEMBER_OPTIONS = useMemo(() => members.map((m) => ({ value: m.userId, label: `${m.name} (${m.email})` })), [members]);

  const handleRunAiVerification = useCallback(() => {
    const pending = findings.filter((f) => f.verdict === 'Pending');
    if (!pending.length) {
      message.info('No pending findings on this page');
      return;
    }
    let completed = 0;
    pending.forEach((f) => {
      verifyMutation.mutate([f.id], {
        onSuccess: () => {
          completed++;
          if (completed === pending.length) {
            message.success(`AI verification completed for ${pending.length} finding(s)`);
            findingsQuery.refetch();
          }
        },
      });
    });
  }, [findings, verifyMutation, message, findingsQuery]);

  const assignMutation = useMutation({
    mutationFn: async ({ id, assignedTo }: { id: string; assignedTo: string | null }) => {
      if (!session.data?.workspace?.id) throw new Error('No workspace');
      const result = await import('@/modules/findings/api').then((m) =>
        m.findingsApi.update(session.data!.workspace!.id, id, { assignedTo })
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
    },
  });

  const handleReview = useCallback((row: Finding) => {
    setSelected(row);
    setDrawerOpen(true);
  }, []);

  const handleAcceptVerdict = useCallback((id: string) => {
    updateStatusMutation.mutate({ id, payload: { status: 'accepted' } }, {
      onSuccess: () => {
        setSelected((prev) => prev && prev.id === id ? { ...prev, status: 'accepted' as const } : prev);
        message.success('AI verdict accepted');
        findingsQuery.refetch();
      },
    });
  }, [updateStatusMutation, message, findingsQuery]);

  const handleOverrideVerdict = useCallback((id: string, verdict: 'TP' | 'FP') => {
    const status = verdict === 'FP' ? 'false_positive' : 'open';
    updateStatusMutation.mutate({ id, payload: { status, verdict } }, {
      onSuccess: () => {
        setSelected((prev) => prev && prev.id === id ? { ...prev, verdict, confidence: 85 } : prev);
        message.success(`Verdict overridden to ${verdict}`);
        findingsQuery.refetch();
      },
    });
  }, [updateStatusMutation, message, findingsQuery]);

  const handleReverify = useCallback((id: string, model: string) => {
    verifyMutation.mutate([id], {
      onSuccess: () => {
        setSelected((prev) => prev && prev.id === id ? { ...prev, verdict: 'Pending' as const, model, confidence: null } : prev);
        message.info(`Re-verification queued with ${model}`);
        findingsQuery.refetch();
      },
    });
  }, [verifyMutation, message, findingsQuery]);

  const handleOpenFullPage = useCallback((id: string) => {
    setDrawerOpen(false);
    if (workspaceSlug) {
      router.push(`/${workspaceSlug}/findings/${id}`);
    }
  }, [router, workspaceSlug]);

  const handleAssign = useCallback((id: string, assignee: string | null) => {
    assignMutation.mutate({ id, assignedTo: assignee }, {
      onSuccess: () => {
        setSelected((prev) => prev && prev.id === id ? { ...prev, assignee } : prev);
        message.success(assignee ? 'Finding assigned' : 'Finding unassigned');
        findingsQuery.refetch();
      },
    });
  }, [assignMutation, message, findingsQuery]);

  const handleBulkAccept = useCallback((ids: string[]) => {
    let completed = 0;
    ids.forEach((id) => {
      updateStatusMutation.mutate({ id, payload: { status: 'accepted' } }, {
        onSuccess: () => {
          completed++;
          if (completed === ids.length) {
            message.success(`${ids.length} finding(s) accepted`);
            findingsQuery.refetch();
          }
        },
      });
    });
  }, [updateStatusMutation, message, findingsQuery]);

  const handleBulkReverify = useCallback((ids: string[]) => {
    let completed = 0;
    ids.forEach((id) => {
      verifyMutation.mutate([id], {
        onSuccess: () => {
          completed++;
          if (completed === ids.length) {
            message.info(`${ids.length} finding(s) queued for re-verification`);
            findingsQuery.refetch();
          }
        },
      });
    });
  }, [verifyMutation, message, findingsQuery]);

  const handleBulkAssign = useCallback((ids: string[]) => {
    setBulkAssignIds(ids);
    setBulkAssignee(undefined);
    setBulkAssignOpen(true);
  }, []);

  const handleBulkAssignConfirm = useCallback(() => {
    if (!bulkAssignee) return;
    let completed = 0;
    bulkAssignIds.forEach((id) => {
      assignMutation.mutate({ id, assignedTo: bulkAssignee }, {
        onSuccess: () => {
          completed++;
          if (completed === bulkAssignIds.length) {
            const member = members.find((m) => m.userId === bulkAssignee);
            message.success(`${bulkAssignIds.length} finding(s) assigned to ${member?.name ?? bulkAssignee}`);
            findingsQuery.refetch();
          }
        },
      });
    });
    setBulkAssignOpen(false);
  }, [bulkAssignIds, bulkAssignee, assignMutation, members, message, findingsQuery]);

  const handleTableChange = useCallback((page: number, perPage: number) => {
    setPage(page);
    setPageSize(perPage);
  }, [setPage, setPageSize]);

  const handleTableSearch = useCallback((search: string) => {
    setSearch(search);
  }, [setSearch]);

  const handleTableFilter = useCallback((key: string, value: string) => {
    setFilter(key, value);
  }, [setFilter]);

  return {
    findingsQuery,
    findings,
    totalCount,
    members,
    MEMBER_OPTIONS,
    tableParams,
    drawerOpen,
    setDrawerOpen,
    selected,
    setSelected,
    bulkAssignOpen,
    setBulkAssignOpen,
    bulkAssignee,
    setBulkAssignee,
    handleRunAiVerification,
    handleReview,
    handleAcceptVerdict,
    handleOverrideVerdict,
    handleReverify,
    handleOpenFullPage,
    handleAssign,
    handleBulkAccept,
    handleBulkReverify,
    handleBulkAssign,
    handleBulkAssignConfirm,
    handleTableChange,
    handleTableSearch,
    handleTableFilter,
  };
}
