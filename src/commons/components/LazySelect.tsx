'use client';

import { Select, Spin } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

interface LazySelectProps<_T> {
  /** Initial options to display (e.g. from parent query). */
  initialOptions?: { value: string; label: string }[];
  /** Search value from external source (e.g. useLazySelect.handleSearch). */
  onSearch?: (value: string) => void;
  /** Scroll handler for infinite loading (e.g. useLazySelect.handleScroll). */
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  /** Whether next page is being fetched. */
  isFetching?: boolean;
  /** Whether more pages are available. */
  hasMore?: boolean;
  /** Whether initial data is loading. */
  loading?: boolean;
  /** Selected value. */
  value?: string;
  /** Change handler. */
  onChange?: (value: string) => void;
  /** Placeholder text. */
  placeholder?: string;
  /** Whether the select is disabled. */
  disabled?: boolean;
  /** Debounce delay in ms. Default: 300. */
  debounceMs?: number;
}

/**
 * Lazy-loaded select with server-side search and infinite scroll.
 *
 * Wraps Ant Design Select with debounced search, infinite scroll loading,
 * and a loading spinner at the bottom of the dropdown.
 *
 * Can be used standalone (with local state) or connected to useLazySelect.
 *
 * @example Standalone (local state):
 * ```tsx
 * <LazySelect
 *   onSearch={handleSearch}
 *   onScroll={handleScroll}
 *   isFetching={isFetchingNextPage}
 *   hasMore={hasNextPage}
 *   loading={isLoading}
 *   value={value}
 *   onChange={setValue}
 *   placeholder="Select repository"
 * />
 * ```
 *
 * @example With useLazySelect:
 * ```tsx
 * const repos = useLazySelect({ workspaceId, fetchFn, getId, getLabel });
 * <LazySelect
 *   onSearch={repos.handleSearch}
 *   onScroll={repos.handleScroll}
 *   isFetching={repos.isFetchingNextPage}
 *   hasMore={repos.hasNextPage}
 *   loading={repos.isLoading}
 *   value={value}
 *   onChange={setValue}
 * />
 * ```
 */
export function LazySelect<T>({
  initialOptions = [],
  onSearch,
  onScroll,
  isFetching = false,
  hasMore: _hasMore = false,
  loading = false,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  debounceMs = 300,
}: LazySelectProps<T>) {
  const [localSearch, setLocalSearch] = useState('');
  const debouncedSearch = useDebouncedValue(localSearch, debounceMs);

  useEffect(() => {
    onSearch?.(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  const handleSearch = useCallback((searchValue: string) => {
    setLocalSearch(searchValue);
  }, []);

  const handleChange = useCallback(
    (selectedValue: string) => {
      setLocalSearch('');
      onChange?.(selectedValue);
    },
    [onChange],
  );

  return (
    <Select
      showSearch
      filterOption={false}
      onSearch={handleSearch}
      onPopupScroll={onScroll}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      loading={loading}
      options={initialOptions}
      popupRender={(menu) => (
        <>
          {menu}
          {isFetching && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <Spin size="small" />
            </div>
          )}
        </>
      )}
    />
  );
}
