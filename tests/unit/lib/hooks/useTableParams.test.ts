// @vitest-environment jsdom
/**
 * Purpose: Test useTableParams hook for correct default params,
 * URL state management via setter functions, and data filtering/pagination.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTableParams } from '@/lib/hooks/useTableParams';

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

describe('useTableParams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset URL to clean state
    window.history.replaceState({}, '', '/');
  });

  /**
   * Purpose: Verify hook returns correct default params when no URL params exist.
   */
  it('should return correct default params', () => {
    const { result } = renderHook(() => useTableParams({ defaultPageSize: 20 }));

    expect(result.current.params).toEqual({
      page: 1,
      per_page: 20,
      search: '',
      order: '',
      filters: {},
    });
  });

  /**
   * Purpose: Verify hook parses params from URL search string.
   */
  it('should parse params from URL', () => {
    window.history.replaceState({}, '', '/?page=3&per_page=25&search=test&order=name');

    const { result } = renderHook(() => useTableParams());

    expect(result.current.params).toEqual({
      page: 3,
      per_page: 25,
      search: 'test',
      order: 'name',
      filters: {},
    });
  });

  /**
   * Purpose: Verify hook parses filter params from URL.
   */
  it('should parse filter params from URL', () => {
    window.history.replaceState({}, '', '/?status=active&severity=high');

    const { result } = renderHook(() =>
      useTableParams({ filterKeys: ['status', 'severity'] })
    );

    expect(result.current.params.filters).toEqual({
      status: 'active',
      severity: 'high',
    });
  });

  /**
   * Purpose: Verify setPage updates page in URL.
   */
  it('setPage should update page in URL', async () => {
    const { result } = renderHook(() => useTableParams());

    act(() => {
      result.current.setPage(5);
    });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('page=5'),
      { scroll: false }
    );
  });

  /**
   * Purpose: Verify setSearch updates search and resets page to 1.
   */
  it('setSearch should update search and reset page to 1', async () => {
    window.history.replaceState({}, '', '/?page=3');

    const { result } = renderHook(() => useTableParams());

    act(() => {
      result.current.setSearch('query');
    });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('search=query'),
      { scroll: false }
    );
    // Should also set page=1
    const callArg = mockReplace.mock.calls[0][0];
    expect(callArg).toContain('page=1');
  });

  /**
   * Purpose: Verify setSearch with empty string removes search param from URL.
   */
  it('setSearch with empty string should remove search param', async () => {
    window.history.replaceState({}, '', '/?search=test&page=2');

    const { result } = renderHook(() => useTableParams());

    act(() => {
      result.current.setSearch('');
    });

    const callArg = mockReplace.mock.calls[0][0];
    expect(callArg).not.toContain('search');
  });

  /**
   * Purpose: Verify reset clears all params to defaults.
   */
  it('reset should clear all params', async () => {
    window.history.replaceState({}, '', '/?page=3&search=test&order=name');

    const { result } = renderHook(() => useTableParams());

    act(() => {
      result.current.reset();
    });

    // reset calls router.replace with just the pathname (no query string)
    expect(mockReplace).toHaveBeenCalledWith('/', { scroll: false });
  });

  /**
   * Purpose: Verify setFilter updates filter and resets page to 1.
   */
  it('setFilter should update filter and reset page to 1', async () => {
    window.history.replaceState({}, '', '/?page=5');

    const { result } = renderHook(() =>
      useTableParams({ filterKeys: ['status'] })
    );

    act(() => {
      result.current.setFilter('status', 'active');
    });

    const callArg = mockReplace.mock.calls[0][0];
    expect(callArg).toContain('status=active');
    expect(callArg).toContain('page=1');
  });

  /**
   * Purpose: Verify setOrder updates sort order and resets page to 1.
   */
  it('setOrder should update order and reset page to 1', async () => {
    window.history.replaceState({}, '', '/?page=3');

    const { result } = renderHook(() => useTableParams());

    act(() => {
      result.current.setOrder('desc');
    });

    const callArg = mockReplace.mock.calls[0][0];
    expect(callArg).toContain('order=desc');
    expect(callArg).toContain('page=1');
  });

  /**
   * Purpose: Verify setPageSize updates page size and resets page to 1.
   */
  it('setPageSize should update per_page and reset page to 1', async () => {
    window.history.replaceState({}, '', '/?page=3&per_page=10');

    const { result } = renderHook(() => useTableParams());

    act(() => {
      result.current.setPageSize(50);
    });

    const callArg = mockReplace.mock.calls[0][0];
    expect(callArg).toContain('per_page=50');
    expect(callArg).toContain('page=1');
  });

  /**
   * Purpose: Verify filtered returns matching items when search is active.
   */
  it('filtered should return matching items for search', () => {
    const data = [
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
      { id: 3, name: 'Alpha-Beta' },
    ];

    window.history.replaceState({}, '', '/?search=alpha');

    const { result } = renderHook(() =>
      useTableParams({
        data,
        searchField: 'name',
        defaultPageSize: 10,
      })
    );

    expect(result.current.filtered).toEqual([
      { id: 1, name: 'Alpha' },
      { id: 3, name: 'Alpha-Beta' },
    ]);
  });

  /**
   * Purpose: Verify paginated returns correct slice of filtered data.
   */
  it('paginated should return correct page slice', () => {
    const data = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
    }));

    window.history.replaceState({}, '', '/?page=2&per_page=10');

    const { result } = renderHook(() =>
      useTableParams({
        data,
        searchField: 'name',
        defaultPageSize: 10,
      })
    );

    expect(result.current.paginated).toHaveLength(10);
    expect(result.current.paginated?.[0]).toEqual({ id: 11, name: 'Item 11' });
    expect(result.current.paginated?.[9]).toEqual({ id: 20, name: 'Item 20' });
  });

  /**
   * Purpose: Verify filtered returns empty array when no items match.
   */
  it('filtered should return empty array when no match', () => {
    const data = [
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ];

    window.history.replaceState({}, '', '/?search=gamma');

    const { result } = renderHook(() =>
      useTableParams({
        data,
        searchField: 'name',
        defaultPageSize: 10,
      })
    );

    expect(result.current.filtered).toEqual([]);
    expect(result.current.paginated).toEqual([]);
  });

  /**
   * Purpose: Verify filtered and paginated are undefined when no data provided.
   */
  it('should not return filtered/paginated when data is not provided', () => {
    const { result } = renderHook(() => useTableParams());

    expect(result.current.filtered).toBeUndefined();
    expect(result.current.paginated).toBeUndefined();
  });

  /**
   * Purpose: Verify extraFilter predicate is applied to filter results.
   */
  it('extraFilter should filter results based on filter state', () => {
    const data = [
      { id: 1, name: 'Alpha', status: 'active' },
      { id: 2, name: 'Beta', status: 'inactive' },
      { id: 3, name: 'Gamma', status: 'active' },
    ];

    window.history.replaceState({}, '', '/?status=active');

    const { result } = renderHook(() =>
      useTableParams({
        data,
        searchField: 'name',
        filterKeys: ['status'],
        defaultPageSize: 10,
        extraFilter: (item, filters) =>
          !filters.status || filters.status === 'all' || item.status === filters.status,
      })
    );

    expect(result.current.filtered).toEqual([
      { id: 1, name: 'Alpha', status: 'active' },
      { id: 3, name: 'Gamma', status: 'active' },
    ]);
  });

  /**
   * Purpose: Verify page defaults to 1 for invalid URL values.
   */
  it('should default to page 1 for invalid page values', () => {
    window.history.replaceState({}, '', '/?page=abc');

    const { result } = renderHook(() => useTableParams());

    expect(result.current.params.page).toBe(1);
  });

  /**
   * Purpose: Verify page defaults to 1 for zero or negative values.
   */
  it('should default to page 1 for zero or negative values', () => {
    window.history.replaceState({}, '', '/?page=0');

    const { result } = renderHook(() => useTableParams());

    expect(result.current.params.page).toBe(1);
  });

  /**
   * Purpose: Verify per_page defaults to configured default for invalid URL values.
   */
  it('should default to configured per_page for invalid values', () => {
    window.history.replaceState({}, '', '/?per_page=xyz');

    const { result } = renderHook(() => useTableParams({ defaultPageSize: 25 }));

    expect(result.current.params.per_page).toBe(25);
  });
});
