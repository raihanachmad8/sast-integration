import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface ResponseMeta {
  requestId: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

function buildMeta(pagination?: PaginationMeta): ResponseMeta {
  return {
    requestId: randomUUID(),
    timestamp: new Date().toISOString(),
    ...(pagination && { pagination }),
  };
}

/**
 * Standardized API response builder.
 * All responses include `meta.requestId` and `meta.timestamp` for tracing and debugging.
 */
export class ApiResponse {
  static success<T>(message: string, data: T) {
    return NextResponse.json({ success: true, message, data, meta: buildMeta() });
  }

  static error(message: string, code: string, details?: unknown, statusCode = 400) {
    return NextResponse.json(
      { success: false, message, data: null, meta: buildMeta(), error: { code, details: details ?? null } },
      { status: statusCode },
    );
  }

  static paginated<T>(message: string, data: T, pagination: PaginationMeta) {
    return NextResponse.json({ success: true, message, data, meta: buildMeta(pagination) });
  }

  static created<T>(message: string, data: T) {
    return NextResponse.json({ success: true, message, data, meta: buildMeta() }, { status: 201 });
  }

  static noContent() {
    return new NextResponse(null, { status: 204 });
  }
}

/** Build meta object for routes that use NextResponse.json directly (e.g. cookie-setting routes) */
export { buildMeta };
