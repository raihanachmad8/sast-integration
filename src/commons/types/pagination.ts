/**
 * Shared types for server-side pagination, filtering, and sorting.
 *
 * @module shared-types
 */

/** Parameters for paginated list endpoints. */
export interface ListParams {
  page: number;
  per_page: number;
  search?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
  [key: string]: string | number | undefined;
}

/** Paginated response shape from the API. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    last_page: number;
  };
}
