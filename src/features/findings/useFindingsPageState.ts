'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useMemo, useCallback } from 'react';

import type { MemberListQuery as _MemberListQuery } from '@/commons/schemas/member.schema';
import type { Finding } from '@/commons/types';
import { normalizeFinding } from '@/commons/types/findings';
import { useLazySelect } from '@/lib/hooks/useLazySelect';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { useSessionData } from '@/modules/auth/queries';
import { useFindingsQuery, useUpdateFindingMutation, useBulkFindingsMutation, findingsApi } from '@/modules/findings';
import type { FindingListParams } from '@/modules/findings/types';
import { membersApi } from '@/modules/members/api';
import { memberKeys } from '@/modules/members/keys';
import { projectsApi } from '@/modules/projects/api';
import { projectKeys } from '@/modules/projects/keys';
import { repositoriesApi } from '@/modules/repositories/api';
import { repositoryKeys } from '@/modules/repositories/keys';

export function useFindingsPageState() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const session = useSessionData();
  const workspaceSlug = session.data?.workspace?.slug ?? '';
  const { workspaceId } = useWorkspace();

  const scanIdFromUrl = searchParams.get('scanId') || undefined;

  const { params, setPagination, setSearch, setFilter, setSort } = useTableParams({
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
    sort: params.sortKey || undefined,
    order: params.sortDir ? params.sortDir.toUpperCase() as 'ASC' | 'DESC' : undefined,
  };

  const findingsQuery = useFindingsQuery(tableParams);

  // Lazy-loaded filter options via useLazySelect
  const members = useLazySelect<{ userId: string; name: string; email: string }>({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, p) => membersApi.list(ws, { page: p.page, perPage: p.perPage, search: p.search }),
    getId: (m) => m.userId,
    getLabel: (m) => `${m.name} (${m.email})`,
    baseKey: memberKeys.all,
  });

  const projects = useLazySelect<{ id: string; name: string }>({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, p) => projectsApi.list(ws, { page: p.page, perPage: p.perPage, search: p.search }),
    getId: (p) => p.id,
    getLabel: (p) => p.name,
    baseKey: projectKeys.all,
  });

  const repos = useLazySelect<{ id: string; name: string }>({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, p) => repositoriesApi.list(ws, { page: p.page, perPage: p.perPage, search: p.search }),
    getId: (r) => r.id,
    getLabel: (r) => r.name,
    baseKey: repositoryKeys.all,
  });

  const updateStatusMutation = useUpdateFindingMutation();
  const bulkMutation = useBulkFindingsMutation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Finding | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignIds, setBulkAssignIds] = useState<string[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState<string | undefined>(undefined);

  const sort: { key: string; dir: 'asc' | 'desc' } | null = params.sortKey && params.sortDir
    ? { key: params.sortKey, dir: params.sortDir }
    : null;

  const findings: Finding[] = useMemo(() => {
    const raw = (findingsQuery.data?.data ?? []) as unknown as Record<string, unknown>[];
    return raw.map(normalizeFinding);
  }, [findingsQuery.data]);
  const totalCount = findingsQuery.data?.meta?.total ?? 0;

  const handleRunAiVerification = useCallback(() => {
    const pending = findings.filter((f) => f.verdict === 'Pending');
    if (!pending.length) {
      message.info('No pending findings on this page');
      return;
    }
    bulkMutation.mutate({ ids: pending.map((f) => f.id), action: 'reverify' }, {
      onSuccess: () => message.success(`AI verification queued for ${pending.length} finding(s)`),
    });
  }, [findings, bulkMutation, message]);

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
      },
    });
  }, [updateStatusMutation, message]);

  const handleResolve = useCallback((id: string) => {
    updateStatusMutation.mutate({ id, payload: { status: 'resolved' } }, {
      onSuccess: () => {
        setSelected((prev) => prev && prev.id === id ? { ...prev, status: 'resolved' as const } : prev);
        message.success('Finding resolved');
      },
    });
  }, [updateStatusMutation, message]);

  const handleReverify = useCallback((id: string) => {
    bulkMutation.mutate({ ids: [id], action: 'reverify' }, {
      onSuccess: () => {
        setSelected((prev) => prev && prev.id === id ? { ...prev, verdict: 'Pending' as const, confidence: null } : prev);
        message.info('Re-verification queued');
      },
    });
  }, [bulkMutation, message]);

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
      },
    });
  }, [assignMutation, message]);

  const handleBulkDismiss = useCallback((ids: string[]) => {
    bulkMutation.mutate({ ids, action: 'dismiss' }, {
      onSuccess: () => message.success(`${ids.length} finding(s) dismissed`),
    });
  }, [bulkMutation, message]);

  const handleBulkResolve = useCallback((ids: string[]) => {
    bulkMutation.mutate({ ids, action: 'resolve' }, {
      onSuccess: () => message.success(`${ids.length} finding(s) resolved`),
    });
  }, [bulkMutation, message]);

  const handleBulkReverify = useCallback((ids: string[]) => {
    bulkMutation.mutate({ ids, action: 'reverify' }, {
      onSuccess: () => message.info(`${ids.length} finding(s) queued for re-verification`),
    });
  }, [bulkMutation, message]);

  const handleBulkAssign = useCallback((ids: string[]) => {
    setBulkAssignIds(ids);
    setBulkAssignee(undefined);
    setBulkAssignOpen(true);
  }, []);

  const handleBulkAssignConfirm = useCallback(() => {
    if (!bulkAssignee) return;
    bulkMutation.mutate(
      { ids: bulkAssignIds, action: 'assign', assignedTo: bulkAssignee },
      {
        onSuccess: () => {
          const member = members.data.find((m) => m.userId === bulkAssignee);
          message.success(`${bulkAssignIds.length} finding(s) assigned to ${member?.name ?? bulkAssignee}`);
        },
      }
    );
    setBulkAssignOpen(false);
  }, [bulkAssignIds, bulkAssignee, bulkMutation, members, message]);

  const handleTableChange = useCallback((page: number, perPage: number) => {
    setPagination(page, perPage);
  }, [setPagination]);

  const handleTableSearch = useCallback((search: string) => {
    setSearch(search);
  }, [setSearch]);

  const handleTableFilter = useCallback((key: string, value: string) => {
    setFilter(key, value);
  }, [setFilter]);

  const handleSortChange = useCallback((sort: { key: string; dir: 'asc' | 'desc' } | null) => {
    setSort(sort?.key ?? '', sort?.dir ?? '');
  }, [setSort]);

  return {
    findingsQuery,
    findings,
    totalCount,
    members: members.data,
    memberOptions: members.options,
    projectOptions: projects.options,
    repositoryOptions: repos.options,
    handleMemberSearch: members.handleSearch,
    handleMemberScroll: members.handleScroll,
    isMemberFetching: members.isFetchingNextPage,
    hasMoreMembers: members.hasNextPage,
    handleProjectSearch: projects.handleSearch,
    handleProjectScroll: projects.handleScroll,
    isProjectFetching: projects.isFetchingNextPage,
    hasMoreProjects: projects.hasNextPage,
    handleRepoSearch: repos.handleSearch,
    handleRepoScroll: repos.handleScroll,
    isRepoFetching: repos.isFetchingNextPage,
    hasMoreRepos: repos.hasNextPage,
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
    handleSortChange,
    sort,
  };
}
