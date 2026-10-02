'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Supported URL query parameter keys for table state. */
interface TableParams {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  per_page: number;
  /** Search query string */
  search: string;
  /** Sort field */
  order: string;
  /** Additional filter values */
  filters: Record<string, string>;
}

/** Options for the useTableParams hook. */
interface UseTableParamsOptions<T = unknown> {
  /** Default page size (defaults to 10) */
  defaultPageSize?: number;
  /** Default search key (defaults to 'search') */
  searchKey?: string;
  /** Default order key (defaults to 'order') */
  orderKey?: string;
  /** Additional filter keys to sync with URL */
  filterKeys?: string[];
  /** Data array to filter/paginate (enables filtered & paginated return values) */
  data?: T[];
  /** Field name or accessor to search against (e.g. 'name' or a function) */
  searchField?: keyof T | ((item: T, search: string) => boolean);
  /** Extra filter predicate (receives params.filters) */
  extraFilter?: (item: T, filters: Record<string, string>) => boolean;
}

/** Return type for useTableParams. */
interface UseTableParamsReturn<T> {
  params: TableParams;
  setPage: (page: number) => void;
  setPageSize: (per_page: number) => void;
  setSearch: (search: string) => void;
  setOrder: (order: string) => void;
  setFilter: (key: string, value: string) => void;
  setFilters: (filters: Record<string, string>) => void;
  reset: () => void;
  filtered?: T[];
  paginated?: T[];
}

/**
 * Hook that syncs table pagination, search, sort, and filter state with URL search params.
 *
 * URL format: `?page=1&per_page=10&search=&order=&filter_key=filter_value`
 *
 * Features:
 * - Page resets to 1 when search or filters change
 * - State persists across page refreshes via URL
 * - Back/forward navigation preserves table state
 * - Optional `data`/`searchField` for built-in filtered & paginated outputs
 *
 * @param options - Configuration for default values, filter keys, and data
 * @returns Table params state, setter functions, and optionally filtered/paginated arrays
 *
 * @example
 * ```tsx
 * // Simple usage (no built-in filtering)
 * const { params, setPage, setPageSize, setSearch } = useTableParams({ defaultPageSize: 10 });
 *
 * // With built-in filtering
 * const { params, setPage, setPageSize, setSearch, filtered, paginated } = useTableParams({
 *   data: policies,
 *   searchField: 'name',
 *   defaultPageSize: 10,
 * });
 * ```
 */
export function useTableParams<T = unknown>(options: UseTableParamsOptions<T> = {}) {
  const {
    defaultPageSize = 10,
    searchKey = 'search',
    orderKey = 'order',
    filterKeys = [],
    data,
    searchField,
    extraFilter,
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse params from URL
  const params: TableParams = useMemo(() => {
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const per_page = Math.max(1, parseInt(searchParams.get('per_page') ?? String(defaultPageSize), 10) || defaultPageSize);
    const search = searchParams.get(searchKey) ?? '';
    const order = searchParams.get(orderKey) ?? '';

    const filters: Record<string, string> = {};
    for (const key of filterKeys) {
      const value = searchParams.get(key);
      if (value) filters[key] = value;
    }

    return { page, per_page, search, order, filters };
  }, [searchParams, defaultPageSize, searchKey, orderKey, filterKeys]);

  // Update URL with new params
  const updateParams = useCallback((updates: Partial<TableParams> & { filters?: Record<string, string> }) => {
    const newParams = new URLSearchParams(searchParams.toString());

    if (updates.page !== undefined) {
      newParams.set('page', String(updates.page));
    }
    if (updates.per_page !== undefined) {
      newParams.set('per_page', String(updates.per_page));
    }
    if (updates.search !== undefined) {
      if (updates.search) {
        newParams.set(searchKey, updates.search);
      } else {
        newParams.delete(searchKey);
      }
    }
    if (updates.order !== undefined) {
      if (updates.order) {
        newParams.set(orderKey, updates.order);
      } else {
        newParams.delete(orderKey);
      }
    }
    if (updates.filters !== undefined) {
      for (const [key, value] of Object.entries(updates.filters)) {
        if (value && value !== 'all') {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      }
    }

    // Clean up empty params
    for (const [key, value] of [...newParams.entries()]) {
      if (!value) newParams.delete(key);
    }

    const queryString = newParams.toString();
    const newPath = queryString ? `?${queryString}` : window.location.pathname;
    router.replace(newPath, { scroll: false });
  }, [router, searchParams, searchKey, orderKey]);

  /** Set current page */
  const setPage = useCallback((page: number) => {
    updateParams({ page });
  }, [updateParams]);

  /** Set page size and reset to page 1 */
  const setPageSize = useCallback((per_page: number) => {
    updateParams({ per_page, page: 1 });
  }, [updateParams]);

  /** Set search query and reset to page 1 */
  const setSearch = useCallback((search: string) => {
    updateParams({ search, page: 1 });
  }, [updateParams]);

  /** Set sort order and reset to page 1 */
  const setOrder = useCallback((order: string) => {
    updateParams({ order, page: 1 });
  }, [updateParams]);

  /** Set a filter value and reset to page 1 */
  const setFilter = useCallback((key: string, value: string) => {
    updateParams({ filters: { [key]: value }, page: 1 });
  }, [updateParams]);

  /** Set multiple filters at once and reset to page 1 */
  const setFilters = useCallback((filters: Record<string, string>) => {
    updateParams({ filters, page: 1 });
  }, [updateParams]);

  /** Reset all params to defaults */
  const reset = useCallback(() => {
    router.replace(window.location.pathname, { scroll: false });
  }, [router]);

  // Build filtered & paginated arrays when data + searchField are provided
  const filtered = useMemo(() => {
    if (!data || !searchField) return undefined;
    const q = params.search.trim().toLowerCase();
    return data.filter((item) => {
      const matchesSearch = !q || (
        typeof searchField === 'function'
          ? searchField(item, q)
          : String(item[searchField] ?? '').toLowerCase().includes(q)
      );
      const matchesExtra = extraFilter ? extraFilter(item, params.filters) : true;
      return matchesSearch && matchesExtra;
    });
  }, [data, searchField, params.search, params.filters, extraFilter]);

  const paginated = useMemo(() => {
    if (filtered === undefined) return undefined;
    return filtered.slice((params.page - 1) * params.per_page, params.page * params.per_page);
  }, [filtered, params.page, params.per_page]);

  return {
    params,
    setPage,
    setPageSize,
    setSearch,
    setOrder,
    setFilter,
    setFilters,
    reset,
    ...(filtered !== undefined ? { filtered, paginated } : {}),
  } as UseTableParamsReturn<T>;
}
