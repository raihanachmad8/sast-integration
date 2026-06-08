/**
 * API error classes and helpers — typed errors for consistent error handling.
 */

// ─── Field-level Error Types ────────────────────────────────────────────

export interface ApiFieldError {
  field: string;
  message: string;
  code?: string;
}

export interface ApiResponseBody {
  data?: unknown;
  message?: string;
  error?: {
    code?: string;
    details?: {
      fields?: unknown;
    };
  };
}

// ─── Error Classes ──────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super(401, 'Unauthorized', 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super(403, 'Forbidden', 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class ApiRequestError extends Error {
  fields: ApiFieldError[];

  constructor(message: string, fields: ApiFieldError[] = []) {
    super(message);
    this.name = 'ApiRequestError';
    this.fields = fields;
    Object.setPrototypeOf(this, ApiRequestError.prototype);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

export function normalizeFieldErrors(value: unknown): ApiFieldError[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const field = typeof record.field === 'string' ? record.field : 'field';
    const message = typeof record.message === 'string' ? record.message : '';
    const code = typeof record.code === 'string' ? record.code : undefined;
    return message ? [{ field, message, code }] : [];
  });
}

export function fieldErrors(error: unknown): ApiFieldError[] {
  return error instanceof ApiRequestError ? error.fields : [];
}

export function fieldErrorMessage(error: unknown, field: string): string | undefined {
  return fieldErrors(error).find(e => e.field === field)?.message;
}

/**
 * Get a user-friendly error message from any error type.
 * Extracts the server message from AxiosError responses when available.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError || error instanceof AppError) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong.';
}

/**
 * Parse a fetch Response into typed JSON.
 * Throws if the response is not ok.
 */
export async function parseApiResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new AppError(res.status, body.message ?? `Request failed with status ${res.status}`, body.error?.code);
  }
  return res.json();
}
