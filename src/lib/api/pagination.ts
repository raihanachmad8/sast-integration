import type { ApiResponse } from '@/commons/types/api';
import type { PaginatedResponse } from '@/commons/types/pagination';

/**
 * Extract paginated data from an API response.
 * Handles the server's ApiResponse format where pagination lives in meta.pagination.
 */
export function extractPaginated<T>(response: ApiResponse<PaginatedResponse<T>>): PaginatedResponse<T> {
  const pagination = response.meta?.pagination;
  // Server puts array directly in response.data, not nested in response.data.data
  const data = Array.isArray(response.data) ? response.data : response.data?.data ?? [];
  return {
    data,
    meta: {
      page: pagination?.page ?? 1,
      perPage: pagination?.perPage ?? 10,
      total: pagination?.total ?? 0,
      lastPage: pagination?.totalPages ?? 1,
    },
  };
}
