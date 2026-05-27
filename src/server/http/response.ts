import { NextResponse } from 'next/server';

export class ApiResponse {
  static success(message: string, data: unknown, meta?: Record<string, unknown>) {
    const body: Record<string, unknown> = { success: true, message, data };
    if (meta) body.meta = meta;
    return NextResponse.json(body);
  }

  static error(message: string, code: string, details?: unknown, statusCode = 400) {
    const body: Record<string, unknown> = { success: false, message, error: { code } };
    if (details) body.error = { code, details };
    return NextResponse.json(body, { status: statusCode });
  }

  static paginated(message: string, data: unknown, pagination: Record<string, unknown>) {
    return NextResponse.json({ success: true, message, data, meta: { pagination } });
  }
}