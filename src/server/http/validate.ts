import { NextRequest } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

import { HTTP } from '@/server/http/constants';
import { ApiResponse } from '@/server/http/response';

interface ValidationResult<T> {
  success: true;
  data: T;
}

interface ValidationFailure {
  success: false;
  response: ReturnType<typeof ApiResponse.error>;
}

interface PaginationParams {
  page: number;
  perPage: number;
}

const MAX_PER_PAGE = 100;
const MAX_BODY_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Parse and validate pagination query parameters.
 * Returns safe defaults for missing/invalid values.
 */
export function parsePagination(searchParams: URLSearchParams, defaults: { page?: number; perPage?: number } = {}): PaginationParams {
  const rawPage = parseInt(searchParams.get('page') ?? String(defaults.page ?? 1), 10);
  const rawPerPage = parseInt(searchParams.get('per_page') ?? searchParams.get('perPage') ?? searchParams.get('limit') ?? String(defaults.perPage ?? 10), 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const perPage = Number.isFinite(rawPerPage) && rawPerPage >= 1 ? Math.min(rawPerPage, MAX_PER_PAGE) : 10;
  return { page, perPage };
}

/**
 * Parse query parameters against a Zod schema with optional overrides.
 * Useful for list endpoints that accept query params + path params (e.g. workspace_id).
 * Returns field-level errors (400) on failure, parsed data on success.
 */
export function parseQueryParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>,
  overrides?: Record<string, unknown>,
): ValidationResult<T> | ValidationFailure {
  try {
    // Convert URLSearchParams to a plain object (arrays for repeated keys)
    const raw: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      // Handle repeated keys by collecting into arrays
      if (raw[key] !== undefined) {
        raw[key] = Array.isArray(raw[key]) ? [...(raw[key] as string[]), value] : [raw[key] as string, value];
      } else {
        raw[key] = value;
      }
    });
    // Merge overrides (path params like workspace_id) — overrides take precedence
    const merged = { ...raw, ...overrides };
    const data = schema.parse(merged);
    return { success: true, data };
  } catch (e) {
    if (e instanceof ZodError) {
      const fieldErrors = e.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      return {
        success: false,
        response: ApiResponse.error(HTTP.MESSAGES.VALIDATION_FAILED, HTTP.ERROR_CODES.VALIDATION, { fields: fieldErrors }, 400),
      };
    }
    return {
      success: false,
      response: ApiResponse.error(HTTP.MESSAGES.INVALID_BODY, HTTP.ERROR_CODES.VALIDATION, undefined, 400),
    };
  }
}

/**
 * Validate request body against a Zod schema.
 * Returns field-level errors (422) on failure, parsed data on success.
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
): Promise<ValidationResult<T> | ValidationFailure> {
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE_BYTES) {
      return {
        success: false,
        response: ApiResponse.error('Request body too large', HTTP.ERROR_CODES.VALIDATION, undefined, 413),
      };
    }
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (e) {
    if (e instanceof ZodError) {
      const fieldErrors = e.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      return {
        success: false,
        response: ApiResponse.error(HTTP.MESSAGES.VALIDATION_FAILED, HTTP.ERROR_CODES.VALIDATION, { fields: fieldErrors }, 422),
      };
    }
    return {
      success: false,
      response: ApiResponse.error(HTTP.MESSAGES.INVALID_BODY, HTTP.ERROR_CODES.VALIDATION, undefined, 400),
    };
  }
}
