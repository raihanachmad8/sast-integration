/**
 * API response types — single source of truth for all API responses.
 */

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    requestId?: string;
    timestamp?: string;
    pagination?: {
      page: number;
      perPage: number;
      total: number;
      lastPage: number;
    };
    [key: string]: unknown;
  };
}
