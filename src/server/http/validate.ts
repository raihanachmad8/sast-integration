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

/**
 * Validate request body against a Zod schema.
 * Returns field-level errors (422) on failure, parsed data on success.
 *
 * @example
 * const validation = await validateBody(request, signupSchema);
 * if (!validation.success) return validation.response;
 * // validation.data is typed
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
