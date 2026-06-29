'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';

import { useDebouncedValue } from './useDebouncedValue';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    lastPage: number;
  };
}

type FetchFn<T> = (
  workspaceId: string,
  params: { page: number; perPage: number; search?: string },
) => Promise<PaginatedResponse<T>>;

interface UseLazySelectOptions<T> {
  workspaceId: string;
  fetchFn: FetchFn<T>;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  perPage?: number;
  debounceMs?: number;
  enabled?: boolean;
  /**
   * Base query key for cache invalidation.
   * Must match the module's key factory (e.g. repositoryKeys.all).
   * Infinite queries will use [...baseKey, 'infinite', { search, perPage }].
   *
   * @example
   * baseKey: ['repositories']  // matches repositoryKeys.all
   * baseKey: ['teams']         // matches teamKeys.all
   * baseKey: ['members']       // matches memberKeys.all
   */
  baseKey?: readonly (string | number)[];
}

/**
 * Generic lazy select hook — server-side search + infinite scroll.
 *
 * Replaces manual useState/useEffect/useCallback boilerplate for
 * filter dropdowns that fetch paginated options from the server.
 *
 * @example
 * ```tsx
 * import { repositoryKeys } from '@/modules/repositories/keys';
 *
 * const repos = useLazySelect({
 *   workspaceId,
 *   fetchFn: (ws, params) => repositoriesApi.list(ws, params),
 *   getId: (r) => r.id,
 *   getLabel: (r) => r.name,
 *   baseKey: repositoryKeys.all,  // ['repositories']
 * });
 *
 * // When mutation calls:
 * queryClient.invalidateQueries({ queryKey: repositoryKeys.all })
 * // It will also invalidate this infinite query because:
 * // [...repositoryKeys.all, 'infinite', ...] starts with ['repositories']
 *
 * <DataTable
 *   filters={[{
 *     key: 'repository',
 *     label: 'Repository',
 *     options: repos.options,
 *     onSearch: repos.handleSearch,
 *     onScroll: repos.handleScroll,
 *     isFetching: repos.isFetchingNextPage,
 *     hasMore: repos.hasNextPage,
 *   }]}
 * />
 * ```
 */
export function useLazySelect<T>({
  workspaceId,
  fetchFn,
  getId,
  getLabel,
  perPage = 10,
  debounceMs = 300,
  enabled = true,
  baseKey = ['lazy-select'],
}: UseLazySelectOptions<T>) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, debounceMs);

  const query = useInfiniteQuery({
    queryKey: [...baseKey, 'infinite', { workspaceId, search: debouncedSearch, perPage }],
    queryFn: ({ pageParam = 1 }) =>
      fetchFn(workspaceId, { page: pageParam, perPage, search: debouncedSearch || undefined }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, lastPage: totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    select: (data) => data.pages.flatMap((page) => page.data),
    enabled,
  });

  const options = useMemo(
    () => (query.data ?? []).map((item) => ({ value: getId(item), label: getLabel(item) })),
    [query.data, getId, getLabel],
  );

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const hasNextPage = query.hasNextPage ?? false;
  const isFetchingNextPage = query.isFetchingNextPage;
  const fetchNextPage = query.fetchNextPage;

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!hasNextPage || isFetchingNextPage) return;
      const target = event.target as HTMLDivElement;
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  return {
    data: query.data ?? [],
    options,
    isLoading: query.isLoading,
    isFetchingNextPage,
    hasNextPage,
    handleSearch,
    handleScroll,
  };
}
