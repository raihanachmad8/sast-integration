'use client';

import { useTableParams } from './useTableParams';
import { type TableSource, type FilterConfig } from '@/components/shared/DataTable';
import type { ListParams } from '@/commons/types/pagination';

interface UseDataTableOptions {
  /** Filter keys to sync with URL */
  filterKeys?: string[];
  /** Default page size */
  defaultPageSize?: number;
  /** Filter configs for the DataTable */
  filterConfigs?: FilterConfig[];
}

interface UseDataTableReturn<T> {
  /** Pass as DataTable's source prop */
  source: TableSource<T>;
  /** Pass as DataTable's searchValue prop */
  searchValue: string;
  /** Pass as DataTable's onSearchChange prop */
  onSearchChange: (value: string) => void;
  /** Pass as DataTable's filterValues prop */
  filterValues: Record<string, string>;
  /** Pass as DataTable's onFilterChange prop */
  onFilterChange: (key: string, value: string) => void;
  /** Pass as DataTable's onChange prop */
  onChange: (page: number, pageSize: number) => void;
  /** Pass as DataTable's filters prop */
  filters: FilterConfig[];
  /** Raw API params to pass to your query hook */
  params: ListParams;
}

/**
 * Hook that manages table state via URL. Pass `params` to your query hook,
 * then pass the returned props to DataTable.
 *
 * @example
 * ```tsx
 * const { source, params, searchValue, onSearchChange, filterValues, onFilterChange, onChange, filters } = useDataTable({
 *   filterConfigs: [{ key: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }] }],
 * });
 *
 * const query = useWebhooksQuery(params);
 *
 * <DataTable
 *   source={makeSource(query.data) ?? source}
 *   searchable
 *   searchValue={searchValue}
 *   onSearchChange={onSearchChange}
 *   filters={filters}
 *   filterValues={filterValues}
 *   onFilterChange={onFilterChange}
 *   onChange={onChange}
 * />
 * ```
 */
export function useDataTable<T = unknown>({
  filterKeys = [],
  defaultPageSize = 10,
  filterConfigs = [],
}: UseDataTableOptions = {}): UseDataTableReturn<T> {
  const { params, setPage, setPageSize, setSearch, setFilter } = useTableParams({
    filterKeys,
    defaultPageSize,
  });

  return {
    source: { data: [], meta: { page: params.page, pageSize: params.perPage, total: 0 } },
    searchValue: params.search,
    onSearchChange: setSearch,
    filterValues: params.filters,
    onFilterChange: setFilter,
    onChange: (page, pageSize) => { setPage(page); setPageSize(pageSize); },
    filters: filterConfigs,
    params: {
      page: params.page,
      perPage: params.perPage,
      search: params.search || undefined,
      ...Object.fromEntries(
        Object.entries(params.filters).map(([k, v]) => [k, v || undefined])
      ),
    },
  };
}
