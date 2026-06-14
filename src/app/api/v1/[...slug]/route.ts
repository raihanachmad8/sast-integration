import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';

/**
 * Catch-all route for unmatched /api/v1/* paths.
 * Returns JSON 404 instead of Next.js default HTML 404 page.
 */
export function GET() {
  return ApiResponse.error('Route not found', 'NOT_FOUND', undefined, 404);
}

export function POST() {
  return ApiResponse.error('Route not found', 'NOT_FOUND', undefined, 404);
}

export function PUT() {
  return ApiResponse.error('Route not found', 'NOT_FOUND', undefined, 404);
}

export function DELETE() {
  return ApiResponse.error('Route not found', 'NOT_FOUND', undefined, 404);
}

export function PATCH() {
  return ApiResponse.error('Route not found', 'NOT_FOUND', undefined, 404);
}
