'use client';

import { useState, useMemo } from 'react';
import { useDebouncedValue } from './useDebouncedValue';
import { useMembersQuery } from '@/modules/members/queries';
import { useProjectsQuery } from '@/modules/projects/queries';
import { useRepositoriesQuery } from '@/modules/repositories/queries';

interface FilterOption {
  value: string;
  label: string;
}

interface UseLazyFilterOptionsParams {
  workspaceId: string;
  search?: string;
  initialLoad?: number;
}

/**
 * Hook for lazy-loading filter dropdown options from the database.
 * Fetches only initial N items on mount, then fetches more as user types (debounced).
 *
 * @param params - workspaceId, optional search term, initial load count
 * @returns Object with members, projects, repositories option arrays and loading states
 *
 * @example
 * const { memberOptions, projectOptions, repoOptions, isMembersLoading } = useLazyFilterOptions({
 *   workspaceId: 'ws-123',
 *   search: debouncedSearch,
 * });
 */
export function useLazyFilterOptions({ workspaceId, search = '', initialLoad = 20 }: UseLazyFilterOptionsParams) {
  const debouncedSearch = useDebouncedValue(search, 300);
  const perPage = debouncedSearch ? 100 : initialLoad;

  const membersQuery = useMembersQuery(workspaceId, {
    page: 1,
    perPage,
    search: debouncedSearch || undefined,
  });

  const projectsQuery = useProjectsQuery({
    page: 1,
    perPage,
    search: debouncedSearch || undefined,
  });

  const reposQuery = useRepositoriesQuery({
    page: 1,
    perPage,
    search: debouncedSearch || undefined,
  });

  const memberOptions: FilterOption[] = useMemo(() =>
    (membersQuery.data?.data ?? []).map((m: { userId: string; name: string; email: string }) => ({
      value: m.userId,
      label: `${m.name} (${m.email})`,
    })),
    [membersQuery.data]
  );

  const projectOptions: FilterOption[] = useMemo(() =>
    (projectsQuery.data?.data ?? []).map((p: { id: string; name: string }) => ({
      value: p.id,
      label: p.name,
    })),
    [projectsQuery.data]
  );

  const repoOptions: FilterOption[] = useMemo(() =>
    (reposQuery.data?.data ?? []).map((r: { id: string; name: string }) => ({
      value: r.id,
      label: r.name,
    })),
    [reposQuery.data]
  );

  const members = useMemo(() =>
    (membersQuery.data?.data ?? []) as unknown as Array<{ userId: string; name: string; email: string }>,
    [membersQuery.data]
  );

  return {
    members,
    memberOptions,
    projectOptions,
    repoOptions,
    isMembersLoading: membersQuery.isLoading,
    isProjectsLoading: projectsQuery.isLoading,
    isReposLoading: reposQuery.isLoading,
    memberTotal: membersQuery.data?.meta?.total ?? 0,
    projectTotal: projectsQuery.data?.meta?.total ?? 0,
    repoTotal: reposQuery.data?.meta?.total ?? 0,
  };
}
