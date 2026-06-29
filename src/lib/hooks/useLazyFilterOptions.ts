'use client';

import { useMemo } from 'react';

import type { MemberListQuery as _MemberListQuery } from '@/commons/schemas/member.schema';
import { membersApi } from '@/modules/members/api';
import { memberKeys } from '@/modules/members/keys';
import { projectsApi } from '@/modules/projects/api';
import { projectKeys } from '@/modules/projects/keys';
import { repositoriesApi } from '@/modules/repositories/api';
import { repositoryKeys } from '@/modules/repositories/keys';

import { useLazySelect } from './useLazySelect';
import { useWorkspace } from './useWorkspace';

interface UseLazyFilterOptionsParams {
  initialLoad?: number;
}

/**
 * Infinite scroll filter options for members, projects, and repositories.
 *
 * Uses useLazySelect internally to reduce boilerplate.
 * Maintains backward compatibility with existing callers (e.g. FindingsPage).
 */
export function useLazyFilterOptions({ initialLoad = 10 }: UseLazyFilterOptionsParams = {}) {
  const { workspaceId } = useWorkspace();

  const members = useLazySelect<{ userId: string; name: string; email: string }>({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, p) => membersApi.list(ws, { page: p.page, perPage: p.perPage, search: p.search }),
    getId: (m) => m.userId,
    getLabel: (m) => `${m.name} (${m.email})`,
    perPage: initialLoad,
    baseKey: memberKeys.all,
  });

  const projects = useLazySelect<{ id: string; name: string }>({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, p) => projectsApi.list(ws, { page: p.page, perPage: p.perPage, search: p.search }),
    getId: (p) => p.id,
    getLabel: (p) => p.name,
    perPage: initialLoad,
    baseKey: projectKeys.all,
  });

  const repos = useLazySelect<{ id: string; name: string }>({
    workspaceId: workspaceId ?? '',
    fetchFn: (ws, p) => repositoriesApi.list(ws, { page: p.page, perPage: p.perPage, search: p.search }),
    getId: (r) => r.id,
    getLabel: (r) => r.name,
    perPage: initialLoad,
    baseKey: repositoryKeys.all,
  });

  return useMemo(() => ({
    members: members.data,
    memberOptions: members.options,
    projectOptions: projects.options,
    repoOptions: repos.options,
    isMembersLoading: members.isLoading,
    isProjectsLoading: projects.isLoading,
    isReposLoading: repos.isLoading,
    isMemberFetching: members.isFetchingNextPage,
    isProjectFetching: projects.isFetchingNextPage,
    isRepoFetching: repos.isFetchingNextPage,
    hasMoreMembers: members.hasNextPage,
    hasMoreProjects: projects.hasNextPage,
    hasMoreRepos: repos.hasNextPage,
    handleMemberSearch: members.handleSearch,
    handleProjectSearch: projects.handleSearch,
    handleRepoSearch: repos.handleSearch,
    handleMemberScroll: members.handleScroll,
    handleProjectScroll: projects.handleScroll,
    handleRepoScroll: repos.handleScroll,
  }), [
    members.data, members.options, members.isLoading, members.isFetchingNextPage, members.hasNextPage, members.handleSearch, members.handleScroll,
    projects.options, projects.isLoading, projects.isFetchingNextPage, projects.hasNextPage, projects.handleSearch, projects.handleScroll,
    repos.options, repos.isLoading, repos.isFetchingNextPage, repos.hasNextPage, repos.handleSearch, repos.handleScroll,
  ]);
}
