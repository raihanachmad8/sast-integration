'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useSessionData } from '@/modules/auth/queries';
import { useFindingsQuery, useUpdateFindingMutation, useRunAiVerificationMutation, useBulkUpdateFindingsMutation, findingsApi } from '@/modules/findings';
import { useMembersQuery } from '@/modules/members';
import { useProjectsQuery } from '@/modules/projects';
import { useRepositoriesQuery } from '@/modules/repositories';
import { useTableParams } from '@/lib/hooks/useTableParams';
import type { Finding } from '@/commons/types';
import type { FindingListParams } from '@/modules/findings/types';

export function useFindingsPageState() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const session = useSessionData();
  const workspaceSlug = session.data?.workspace?.slug ?? '';

  const scanIdFromUrl = searchParams.get('scanId') || undefined;

  const { params, setPagination, setSearch, setFilter } = useTableParams({
    filterKeys: ['severity', 'verdict', 'status', 'project', 'repository'],
    defaultPageSize: 10,
  });

  const tableParams: FindingListParams = {
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
    severity: (params.filters.severity || undefined) as FindingListParams['severity'],
    verdict: (params.filters.verdict || undefined) as FindingListParams['verdict'],
    status: (params.filters.status || undefined) as FindingListParams['status'],
    projectId: params.filters.project || undefined,
    repositoryId: params.filters.repository || undefined,
    scanId: scanIdFromUrl,
  };

  const findingsQuery = useFindingsQuery(tableParams);
  const membersQuery = useMembersQuery(session.data?.workspace?.id ?? '');
  const projectsQuery = useProjectsQuery({ page: 1, perPage: 200 });
  const repositoriesQuery = useRepositoriesQuery({ page: 1, perPage: 200 });
  const updateStatusMutation = useUpdateFindingMutation();
  const verifyMutation = useRunAiVerificationMutation();
  const bulkUpdateMutation = useBulkUpdateFindingsMutation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Finding | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignIds, setBulkAssignIds] = useState<string[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState<string | undefined>(undefined);

  const findings = useMemo(() => {
    const raw = (findingsQuery.data?.data ?? []) as unknown as Array<{
      id: string; scanId: string; groupId: string; projectId: string; cweId: string | null;
      severity: string; groupStatus: string; filePath: string | null; lineNumber: number | null;
      description: string | null; rule: string; scanner: string; message: string | null;
      assignedTo: string | null; createdAt: string;
      repositoryName: string | null; verdict: string | null; model: string | null; confidence: number | null;
      explanation: string | null; fixSuggestion: string | null; codeSnippet: string | null;
      matchDetail: string | null; likelyCwe: string[] | null;
      dataFlow: string | null; taintSource: string | null;
    }>;
    return raw.map((f) => ({
      id: f.id,
      projectId: f.projectId ?? undefined,
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
      status: (f.groupStatus ?? 'open') as Finding['status'],
      cwe: f.cweId ?? '',
      lineNumber: f.lineNumber ?? undefined,
      message: f.message ?? undefined,
      codeSnippet: f.codeSnippet ?? undefined,
      explanation: f.explanation ?? undefined,
      fixSuggestion: f.fixSuggestion ?? undefined,
      matchDetail: f.matchDetail ?? undefined,
      likelyCwe: f.likelyCwe ?? undefined,
      dataFlow: f.dataFlow ?? undefined,
      taintSource: f.taintSource ?? undefined,
    }));
  }, [findingsQuery.data]);
  const totalCount = findingsQuery.data?.meta?.total ?? 0;
  const members = useMemo(() => (membersQuery.data?.data ?? []) as unknown as Array<{ userId: string; name: string; email: string }>, [membersQuery.data]);
  const MEMBER_OPTIONS = useMemo(() => members.map((m) => ({ value: m.userId, label: `${m.name} (${m.email})` })), [members]);
  const PROJECT_OPTIONS = useMemo(() => (projectsQuery.data?.data ?? []).map((p) => ({ value: p.id, label: p.name })), [projectsQuery.data]);
  const REPOSITORY_OPTIONS = useMemo(() => (repositoriesQuery.data?.data ?? []).map((r) => ({ value: r.id, label: r.name })), [repositoriesQuery.data]);

  const handleRunAiVerification = useCallback(() => {
    const pending = findings.filter((f) => f.verdict === 'Pending');
    if (!pending.length) {
      message.info('No pending findings on this page');
      return;
    }
    verifyMutation.mutate(pending.map((f) => f.id), {
      onSuccess: () => {
        message.success(`AI verification queued for ${pending.length} finding(s)`);
        findingsQuery.refetch();
      },
    });
  }, [findings, verifyMutation, message, findingsQuery]);

  const assignMutation = useMutation({
    mutationFn: async ({ id, assignedTo }: { id: string; assignedTo: string | null }) => {
      if (!session.data?.workspace?.id) throw new Error('No workspace');
      return findingsApi.update(session.data!.workspace!.id, id, { assignedTo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
    },
  });

  const handleReview = useCallback((row: Finding) => {
    setSelected(row);
    setDrawerOpen(true);
  }, []);

  const handleDismiss = useCallback((id: string) => {
    updateStatusMutation.mutate({ id, payload: { status: 'dismissed' } }, {
      onSuccess: () => {
        setSelected((prev) => prev && prev.id === id ? { ...prev, status: 'dismissed' as const } : prev);
        message.success('Finding dismissed');
        findingsQuery.refetch();
      },
    });
  }, [updateStatusMutation, message, findingsQuery]);

  const handleResolve = useCallback((id: string) => {
    updateStatusMutation.mutate({ id, payload: { status: 'resolved' } }, {
      onSuccess: () => {
        setSelected((prev) => prev && prev.id === id ? { ...prev, status: 'resolved' as const } : prev);
        message.success('Finding resolved');
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

  const handleBulkDismiss = useCallback((ids: string[]) => {
    bulkUpdateMutation.mutate({ ids, payload: { status: 'dismissed' } }, {
      onSuccess: () => {
        message.success(`${ids.length} finding(s) dismissed`);
        findingsQuery.refetch();
      },
    });
  }, [bulkUpdateMutation, message, findingsQuery]);

  const handleBulkResolve = useCallback((ids: string[]) => {
    bulkUpdateMutation.mutate({ ids, payload: { status: 'resolved' } }, {
      onSuccess: () => {
        message.success(`${ids.length} finding(s) resolved`);
        findingsQuery.refetch();
      },
    });
  }, [bulkUpdateMutation, message, findingsQuery]);

  const handleBulkReverify = useCallback((ids: string[]) => {
    verifyMutation.mutate(ids, {
      onSuccess: () => {
        message.info(`${ids.length} finding(s) queued for re-verification`);
        findingsQuery.refetch();
      },
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
    setPagination(page, perPage);
  }, [setPagination]);

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
    PROJECT_OPTIONS,
    REPOSITORY_OPTIONS,
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
    handleDismiss,
    handleResolve,
    handleReverify,
    handleOpenFullPage,
    handleAssign,
    handleBulkDismiss,
    handleBulkResolve,
    handleBulkReverify,
    handleBulkAssign,
    handleBulkAssignConfirm,
    handleTableChange,
    handleTableSearch,
    handleTableFilter,
  };
}
