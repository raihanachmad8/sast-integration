'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Supported URL query parameter keys for table state. */
interface TableParams {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  perPage: number;
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
  /** Debounce delay for search URL updates in ms (defaults to 300, 0 = no debounce) */
  searchDebounceMs?: number;
}

/** Return type for useTableParams. */
interface UseTableParamsReturn<T> {
  params: TableParams;
  setPage: (page: number) => void;
  setPageSize: (perPage: number) => void;
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
 * - Debounced search to prevent excessive URL updates
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
    searchDebounceMs = 550,
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Parse params from URL
  const params: TableParams = useMemo(() => {
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const perPage = Math.max(1, parseInt(searchParams.get('per_page') ?? String(defaultPageSize), 10) || defaultPageSize);
    const search = searchParams.get(searchKey) ?? '';
    const order = searchParams.get(orderKey) ?? '';

    const filters: Record<string, string> = {};
    for (const key of filterKeys) {
      const value = searchParams.get(key);
      if (value) filters[key] = value;
    }

    return { page, perPage, search, order, filters };
  }, [searchParams, defaultPageSize, searchKey, orderKey, filterKeys]);

  // Build URLSearchParams from updates (pure function, no side effects)
  const buildNewParams = useCallback((updates: Partial<TableParams> & { filters?: Record<string, string> }) => {
    const newParams = new URLSearchParams(searchParams.toString());

    if (updates.page !== undefined) {
      newParams.set('page', String(updates.page));
    }
    if (updates.perPage !== undefined) {
      newParams.set('per_page', String(updates.perPage));
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

    return newParams;
  }, [searchParams, searchKey, orderKey]);

  // Navigate to new URL
  const navigate = useCallback((newParams: URLSearchParams) => {
    const queryString = newParams.toString();
    const newPath = queryString ? `?${queryString}` : window.location.pathname;
    router.replace(newPath, { scroll: false });
  }, [router]);

  // Update URL immediately (for non-search params)
  const updateParamsImmediate = useCallback((updates: Partial<TableParams> & { filters?: Record<string, string> }) => {
    navigate(buildNewParams(updates));
  }, [navigate, buildNewParams]);

  /** Set current page */
  const setPage = useCallback((page: number) => {
    updateParamsImmediate({ page });
  }, [updateParamsImmediate]);

  /** Set page size and reset to page 1 */
  const setPageSize = useCallback((perPage: number) => {
    updateParamsImmediate({ perPage, page: 1 });
  }, [updateParamsImmediate]);

  /** Set search query and reset to page 1 (debounced) */
  const setSearch = useCallback((search: string) => {
    if (searchDebounceMs <= 0) {
      updateParamsImmediate({ search, page: 1 });
      return;
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce URL update but apply search to params immediately for local filtering
    debounceTimerRef.current = setTimeout(() => {
      navigate(buildNewParams({ search, page: 1 }));
    }, searchDebounceMs);
  }, [navigate, buildNewParams, updateParamsImmediate, searchDebounceMs]);

  /** Set sort order and reset to page 1 */
  const setOrder = useCallback((order: string) => {
    updateParamsImmediate({ order, page: 1 });
  }, [updateParamsImmediate]);

  /** Set a filter value and reset to page 1 */
  const setFilter = useCallback((key: string, value: string) => {
    updateParamsImmediate({ filters: { [key]: value }, page: 1 });
  }, [updateParamsImmediate]);

  /** Set multiple filters at once and reset to page 1 */
  const setFilters = useCallback((filters: Record<string, string>) => {
    updateParamsImmediate({ filters, page: 1 });
  }, [updateParamsImmediate]);

  /** Reset all params to defaults */
  const reset = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
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
    return filtered.slice((params.page - 1) * params.perPage, params.page * params.perPage);
  }, [filtered, params.page, params.perPage]);

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
