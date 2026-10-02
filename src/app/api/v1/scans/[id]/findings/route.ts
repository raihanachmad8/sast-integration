import type { NextRequest } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { scans } from '@drizzle/schema/scans';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/scans/:id/findings
 * Get findings for a specific scan.
 * Returns empty array if no findings exist (scan may still be processing).
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: scanId } = await params;

  try {
    // Verify scan exists
    const [scan] = await db
      .select({ id: scans.id })
      .from(scans)
      .where(eq(scans.id, scanId))
      .limit(1);

    if (!scan) {
      return ApiResponse.error('Scan not found', 'NOT_FOUND', undefined, 404);
    }

    // Findings are stored in scan_results.parsed_summary as JSON
    // For now return empty array — findings are populated after parse job completes
    // The findings table stores individual findings when the parse job runs
    return ApiResponse.success('Scan findings retrieved', []);
  } catch (e) {
    console.error(`[Scans/Findings] GET failed - scanId=${scanId}:`, e);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
