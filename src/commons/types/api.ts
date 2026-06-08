/**
 * API response types — single source of truth for all API responses.
 */

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

export interface ApiError {
  success: false;
  message: string;
  data: null;
  errors?: {
    code: string;
    detail?: string;
  };
}
