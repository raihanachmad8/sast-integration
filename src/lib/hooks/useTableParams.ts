'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface TableParams {
  page: number;
  perPage: number;
  search: string;
  order: string;
  sortKey: string;
  sortDir: 'asc' | 'desc' | '';
  filters: Record<string, string>;
}

interface UseTableParamsOptions<T = unknown> {
  defaultPageSize?: number;
  searchKey?: string;
  orderKey?: string;
  filterKeys?: string[];
  data?: T[];
  searchField?: keyof T | ((item: T, search: string) => boolean);
  extraFilter?: (item: T, filters: Record<string, string>) => boolean;
  searchDebounceMs?: number;
}

interface UseTableParamsReturn<T> {
  params: TableParams;
  setPagination: (page: number, perPage: number) => void;
  setSearch: (search: string) => void;
  setOrder: (order: string) => void;
  setSort: (key: string, dir: 'asc' | 'desc' | '') => void;
  setFilter: (key: string, value: string) => void;
  setFilters: (filters: Record<string, string>) => void;
  reset: () => void;
  filtered?: T[];
  paginated?: T[];
}

function decode(sp: URLSearchParams, opts: { defaultPageSize: number; searchKey: string; orderKey: string; filterKeys: string[] }): TableParams {
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
  const perPage = Math.max(1, parseInt(sp.get('per_page') ?? String(opts.defaultPageSize), 10) || opts.defaultPageSize);
  const search = sp.get(opts.searchKey) ?? '';
  const order = sp.get(opts.orderKey) ?? '';
  const sortKey = sp.get('sort') ?? '';
  const rawDir = sp.get('order') ?? '';
  const sortDir: 'asc' | 'desc' | '' = rawDir.toUpperCase() === 'ASC' ? 'asc' : rawDir.toUpperCase() === 'DESC' ? 'desc' : '';
  const filters: Record<string, string> = {};
  for (const key of opts.filterKeys) {
    const v = sp.get(key);
    if (v) filters[key] = v;
  }
  return { page, perPage, search, order, sortKey, sortDir, filters };
}

function encode(p: TableParams, opts: { defaultPageSize: number; searchKey: string; orderKey: string }, existingParams?: URLSearchParams): string {
  const u = new URLSearchParams(existingParams?.toString() ?? '');
  if (p.page > 1) u.set('page', String(p.page)); else u.delete('page');
  if (p.perPage !== opts.defaultPageSize) u.set('per_page', String(p.perPage)); else u.delete('per_page');
  if (p.search) u.set(opts.searchKey, p.search); else u.delete(opts.searchKey);
  if (p.order) u.set(opts.orderKey, p.order); else u.delete(opts.orderKey);
  if (p.sortKey && p.sortDir) {
    u.set('sort', p.sortKey);
    u.set('order', p.sortDir.toUpperCase());
  } else {
    u.delete('sort');
    u.delete('order');
  }
  for (const [k, v] of Object.entries(p.filters)) {
    if (v && v !== 'all') u.set(k, v); else u.delete(k);
  }
  return u.toString();
}

function shallowEqual(a: TableParams, b: TableParams): boolean {
  if (a.page !== b.page || a.perPage !== b.perPage || a.search !== b.search || a.order !== b.order || a.sortKey !== b.sortKey || a.sortDir !== b.sortDir) return false;
  const aKeys = Object.keys(a.filters);
  const bKeys = Object.keys(b.filters);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => a.filters[k] === b.filters[k]);
}

/**
 * Hook that syncs table pagination, search, sort, and filter state with URL search params.
 *
 * Provides setters that update the URL, and optionally filters client-side data.
 *
 * @param options - Configuration for page size, search/sort keys, filter keys, and optional client-side filtering.
 * @returns Table params, setter functions, and optionally filtered/paginated data.
 *
 * @example
 * const { params, setPagination, setSearch, setFilter } = useTableParams({
 *   filterKeys: ['status'],
 *   defaultPageSize: 10,
 * });
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const optsRef = useRef({ defaultPageSize, searchKey, orderKey, filterKeys });

  const qsOpts = useMemo(
    () => ({ defaultPageSize, searchKey, orderKey }),
    [defaultPageSize, searchKey, orderKey],
  );

  const [params, setParams] = useState<TableParams>(() => decode(searchParams, { defaultPageSize, searchKey, orderKey, filterKeys }));
  const paramsRef = useRef(params);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // Counter: skip re-sync for each URL change we caused ourselves
  const ownUpdateCountRef = useRef(0);

  // Re-sync from URL when it changes (back/forward, external edit)
  useEffect(() => {
    if (ownUpdateCountRef.current > 0) {
      ownUpdateCountRef.current -= 1;
      return;
    }
    const next = decode(searchParams, optsRef.current);
    setParams((prev) => (shallowEqual(prev, next) ? prev : next));
  }, [searchParams]);

  useEffect(() => () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); }, []);

  const pushUrl = useCallback((next: TableParams) => {
    ownUpdateCountRef.current += 1;
    const qs = encode(next, qsOpts, searchParams);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, qsOpts, searchParams]);

  const setPagination = useCallback((page: number, perPage: number) => {
    const next = { ...paramsRef.current, page, perPage };
    setParams(next);
    paramsRef.current = next;
    pushUrl(next);
  }, [pushUrl]);

  const setSearch = useCallback((search: string) => {
    const apply = () => {
      const next = { ...paramsRef.current, search, page: 1 };
      setParams(next);
      paramsRef.current = next;
      pushUrl(next);
    };
    if (searchDebounceMs <= 0) { apply(); return; }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(apply, searchDebounceMs);
  }, [pushUrl, searchDebounceMs]);

  const setOrder = useCallback((order: string) => {
    const next = { ...paramsRef.current, order, page: 1 };
    setParams(next);
    paramsRef.current = next;
    pushUrl(next);
  }, [pushUrl]);

  const setSort = useCallback((key: string, dir: 'asc' | 'desc' | '') => {
    const next = { ...paramsRef.current, sortKey: key, sortDir: dir, page: 1 };
    setParams(next);
    paramsRef.current = next;
    pushUrl(next);
  }, [pushUrl]);

  const setFilter = useCallback((key: string, value: string) => {
    const next = { ...paramsRef.current, filters: { ...paramsRef.current.filters, [key]: value }, page: 1 };
    setParams(next);
    paramsRef.current = next;
    pushUrl(next);
  }, [pushUrl]);

  const setFilters = useCallback((filters: Record<string, string>) => {
    const next = { ...paramsRef.current, filters, page: 1 };
    setParams(next);
    paramsRef.current = next;
    pushUrl(next);
  }, [pushUrl]);

  const reset = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const next: TableParams = { page: 1, perPage: defaultPageSize, search: '', order: '', sortKey: '', sortDir: '', filters: {} };
    setParams(next);
    paramsRef.current = next;
    pushUrl(next);
  }, [defaultPageSize, pushUrl]);

  const filtered = useMemo(() => {
    if (!data || !searchField) return undefined;
    const q = params.search.trim().toLowerCase();
    return data.filter((item) => {
      const matchSearch = !q || (typeof searchField === 'function' ? searchField(item, q) : String(item[searchField] ?? '').toLowerCase().includes(q));
      const matchExtra = extraFilter ? extraFilter(item, params.filters) : true;
      return matchSearch && matchExtra;
    });
  }, [data, searchField, params.search, params.filters, extraFilter]);

  const paginated = useMemo(() => {
    if (filtered === undefined) return undefined;
    return filtered.slice((params.page - 1) * params.perPage, params.page * params.perPage);
  }, [filtered, params.page, params.perPage]);

  return {
    params,
    setPagination,
    setSearch,
    setOrder,
    setSort,
    setFilter,
    setFilters,
    reset,
    ...(filtered !== undefined ? { filtered, paginated } : {}),
  } as UseTableParamsReturn<T>;
}
