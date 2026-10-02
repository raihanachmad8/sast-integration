/**
 * A single field-level validation error from the API.
 */
export interface ApiFieldError {
  /** Name of the field that has the error */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Optional error code for programmatic identification */
  code?: string;
}

/**
 * Standard shape of an API response body.
 */
export interface ApiResponseBody {
  /** The response payload on success */
  data?: unknown;
  /** Optional message (used for success or error context) */
  message?: string;
  /** Error details when the request fails */
  error?: {
    /** Machine-readable error code */
    code?: string;
    /** Additional error details including field-level errors */
    details?: {
      /** Array of field-level error objects */
      fields?: unknown;
    };
  };
}

/**
 * Custom error class for API request failures.
 * Carries structured field-level error information for form display.
 */
export class ApiRequestError extends Error {
  /** Array of field-level errors parsed from the API response */
  fields: ApiFieldError[];

  /**
   * @param message - Human-readable error message
   * @param fields - Optional array of field-level errors
   */
  constructor(message: string, fields: ApiFieldError[] = []) {
    super(message);
    this.name = 'ApiRequestError';
    this.fields = fields;
    Object.setPrototypeOf(this, ApiRequestError.prototype);
  }
}

/**
 * Normalize an unknown value into a structured field error array.
 * Handles various API response shapes gracefully.
 *
 * @param value - Raw field errors from the API response
 * @returns Normalized array of {@link ApiFieldError} objects
 *
 * @example
 * normalizeFieldErrors([{ field: 'email', message: 'Required' }])
 * // [{ field: 'email', message: 'Required', code: undefined }]
 */
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

/**
 * Parse an API response and throw ApiRequestError on failure.
 * Returns the typed data on success.
 *
 * @typeParam T - Expected response data type
 * @param res - Fetch Response object
 * @returns Parsed data of type T
 * @throws {ApiRequestError} On non-OK response
 *
 * @example
 * const user = await parseApiResponse<User>(await fetch('/api/user'));
 */
export async function parseApiResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiResponseBody;
  if (!res.ok) {
    const fields = normalizeFieldErrors(json.error?.details?.fields);
    const fallbackMessage = fields.length
      ? 'Please fix the highlighted fields.'
      : `Error ${res.status}`;
    throw new ApiRequestError(json.message ?? fallbackMessage, fields);
  }
  return json.data as T;
}

/**
 * Extract field-level errors from an error (if it's an ApiRequestError).
 *
 * @param error - Any error value
 * @returns Array of {@link ApiFieldError} objects, or empty array if not an ApiRequestError
 *
 * @example
 * try { await api(); } catch (e) { console.log(fieldErrors(e)); }
 */
export function fieldErrors(error: unknown): ApiFieldError[] {
  return error instanceof ApiRequestError ? error.fields : [];
}

/**
 * Get the error message for a specific field from an error.
 *
 * @param error - Any error value
 * @param field - The field name to look up
 * @returns The error message for the field, or undefined if not found
 *
 * @example
 * const msg = fieldErrorMessage(error, 'email'); // "Email is required"
 */
export function fieldErrorMessage(error: unknown, field: string): string | undefined {
  return fieldErrors(error).find(e => e.field === field)?.message;
}

/**
 * Get a user-friendly error message from any error type.
 *
 * @param error - Any error value
 * @returns The error's message, or a generic fallback string
 *
 * @example
 * const msg = errorMessage(error); // "Something went wrong."
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
