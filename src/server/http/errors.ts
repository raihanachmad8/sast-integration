import { HTTP } from '@/server/http/constants';
import { type ZodSchema, ZodError } from 'zod';

/**
 * Base application error with HTTP status code and machine-readable error code.
 * Thrown by services, caught by route handlers to produce consistent API responses.
 */
export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
  }
}

/** 404 Not Found */
export class NotFoundError extends AppError {
  constructor(message = HTTP.MESSAGES.NOT_FOUND) {
    super(message, 404, HTTP.ERROR_CODES.NOT_FOUND);
  }
}

/** 422 Unprocessable Entity */
export class ValidationError extends AppError {
  constructor(message = HTTP.MESSAGES.VALIDATION_FAILED) {
    super(message, 422, HTTP.ERROR_CODES.VALIDATION);
  }
}

/** 401 Unauthorized */
export class UnauthorizedError extends AppError {
  constructor(message = HTTP.MESSAGES.UNAUTHORIZED) {
    super(message, 401, HTTP.ERROR_CODES.UNAUTHORIZED);
  }
}

/** 403 Forbidden */
export class ForbiddenError extends AppError {
  constructor(message = HTTP.MESSAGES.FORBIDDEN) {
    super(message, 403, HTTP.ERROR_CODES.FORBIDDEN);
  }
}

/**
 * Validate data against a Zod schema, throwing AppError on failure.
 * Use in service layer to ensure consistent error format.
 */
export function validateSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (e) {
    if (e instanceof ZodError) {
      const message = e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new AppError(message, 422, HTTP.ERROR_CODES.VALIDATION);
    }
    throw e;
  }
}
