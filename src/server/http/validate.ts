import { NextRequest } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { HTTP } from '@/server/http/constants';

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
 * Validate request body against a Zod schema.
 * Returns field-level errors (422) on failure, parsed data on success.
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
): Promise<ValidationResult<T> | ValidationFailure> {
  try {
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
