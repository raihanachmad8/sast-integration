import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { scans, scanResults } from '@drizzle/schema/scans';
import { repositories as projectRepositories } from '@drizzle/schema/source-controls';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/scans/:id
 * Get scan detail with scanner results and timeline.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id } = await params;

  try {
    const [scan] = await db
      .select()
      .from(scans)
      .where(eq(scans.id, id))
      .limit(1);

    if (!scan) {
      return ApiResponse.error('Scan not found', 'NOT_FOUND', undefined, 404);
    }

    // Get repository info
    let repoName = 'Unknown';
    if (scan.repository_id) {
      const [repo] = await db
        .select({ name: projectRepositories.name })
        .from(projectRepositories)
        .where(eq(projectRepositories.id, scan.repository_id))
        .limit(1);
      repoName = repo?.name ?? 'Unknown';
    }

    // Get scan results
    const results = await db
      .select()
      .from(scanResults)
      .where(eq(scanResults.scan_id, id));

    const scannerResults = results.map((r) => ({
      scanner: r.scanner,
      format: r.format ?? 'json',
      fileKey: r.file_key,
      fileSize: r.file_size,
      summary: r.parsed_summary,
      createdAt: r.created_at?.toISOString(),
    }));

    // Compute severity breakdown from parsed summaries
    const severityBreakdown = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    let totalFindings = 0;

    for (const r of results) {
      const summary = r.parsed_summary as Record<string, unknown> | null;
      if (summary) {
        totalFindings += (summary.total_findings as number) ?? 0;
        severityBreakdown.critical += (summary.critical as number) ?? 0;
        severityBreakdown.high += (summary.high as number) ?? 0;
        severityBreakdown.medium += (summary.medium as number) ?? 0;
        severityBreakdown.low += (summary.low as number) ?? 0;
        severityBreakdown.info += (summary.info as number) ?? 0;
      }
    }

    const statusMap: Record<string, 'queued' | 'processing' | 'completed' | 'failed'> = {
      pending: 'queued',
      running: 'processing',
      completed: 'completed',
      failed: 'failed',
    };

    const durationSeconds = scan.started_at && scan.completed_at
      ? Math.round((new Date(scan.completed_at).getTime() - new Date(scan.started_at).getTime()) / 1000)
      : undefined;

    const detail = {
      id: scan.id,
      repository: repoName,
      branch: scan.branch ?? 'main',
      commitSha: scan.commit_sha ?? '—',
      origin: scan.origin === 'managed' ? 'managed' as const : 'external_upload' as const,
      status: statusMap[scan.status] ?? 'queued',
      startedAt: scan.started_at ? new Date(scan.started_at).toISOString() : new Date(scan.created_at ?? Date.now()).toISOString(),
      completedAt: scan.completed_at ? new Date(scan.completed_at).toISOString() : undefined,
      durationSeconds,
      scannerResults,
      totalFindings,
      severityBreakdown,
      timeline: [],
    };

    return ApiResponse.success('Scan detail retrieved', detail);
  } catch (e) {
    console.error(`[Scans] GET detail failed - id=${id}:`, e);
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
