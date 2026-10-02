import type { NextRequest } from 'next/server';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { scans, scanResults } from '@drizzle/schema/scans';
import { repositories as projectRepositories } from '@drizzle/schema/source-controls';
import { projects } from '@drizzle/schema/projects';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { users } from '@drizzle/schema/users';

/**
 * GET /api/v1/scans
 * List all scans for the current user's workspace.
 * Returns data shaped as ScanRow[] for the frontend scan table.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  try {
    // Get user's current workspace
    const [user] = await db
      .select({ currentWorkspaceId: users.currentWorkspaceId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const workspaceId = user?.currentWorkspaceId;
    if (!workspaceId) {
      return ApiResponse.success('No workspace selected', []);
    }

    // Get all scans for projects in this workspace
    const workspaceScans = await db
      .select({
        scanId: scans.id,
        scanStatus: scans.status,
        scanOrigin: scans.origin,
        scanBranch: scans.branch,
        scanCommitSha: scans.commit_sha,
        scanStartedAt: scans.started_at,
        scanCompletedAt: scans.completed_at,
        scanCreatedAt: scans.created_at,
        repoId: projectRepositories.id,
        repoName: projectRepositories.name,
        repoUrl: projectRepositories.url,
        repoConnectionType: projectRepositories.connection_type,
        repoDefaultBranch: projectRepositories.default_branch,
        projectId: projects.id,
        projectName: projects.name,
      })
      .from(scans)
      .innerJoin(projectRepositories, eq(scans.repository_id, projectRepositories.id))
      .innerJoin(projects, eq(projectRepositories.project_id, projects.id))
      .where(eq(projects.workspace_id, workspaceId))
      .orderBy(desc(scans.created_at))
      .limit(100);

    // Get finding counts per scan
    const scanIds = workspaceScans.map((s) => s.scanId);
    const findingCounts: Record<string, { total: number; critical: number }> = {};

    if (scanIds.length > 0) {
      // Count findings from scan_results parsed_summary
      const results = await db
        .select({
          scanId: scanResults.scan_id,
          summary: scanResults.parsed_summary,
        })
        .from(scanResults)
        .where(sql`${scanResults.scan_id} = ANY(${scanIds})`);

      for (const r of results) {
        if (!r.scanId) continue;
        if (!findingCounts[r.scanId]) {
          findingCounts[r.scanId] = { total: 0, critical: 0 };
        }
        const summary = r.summary as Record<string, unknown> | null;
        if (summary) {
          const total = (summary.total_findings as number) ?? 0;
          const critical = (summary.critical as number) ?? 0;
          findingCounts[r.scanId].total += total;
          findingCounts[r.scanId].critical += critical;
        }
      }
    }

    // Map to ScanRow shape
    const rows = workspaceScans.map((s) => {
      const counts = findingCounts[s.scanId] ?? { total: 0, critical: 0 };
      const statusMap: Record<string, 'Running' | 'Completed' | 'Failed'> = {
        pending: 'Running',
        running: 'Running',
        completed: 'Completed',
        failed: 'Failed',
      };

      return {
        id: s.scanId,
        repository: s.repoName ?? 'Unknown',
        repoSub: [s.scanBranch ?? 'main', s.scanStartedAt ? new Date(s.scanStartedAt).toLocaleDateString() : '—'].join(' • '),
        status: statusMap[s.scanStatus] ?? 'Running',
        stage: s.scanStatus === 'completed' ? 'Done' : s.scanStatus === 'failed' ? 'Error' : 'Scanning',
        findings: counts.total,
        critical: counts.critical,
        ai: 'Pending',
        origin: s.scanOrigin === 'managed' ? 'managed' as const : 'external_upload' as const,
        provider: null,
        connectionType: (s.repoConnectionType ?? 'external') as 'scm' | 'external',
      };
    });

    return ApiResponse.success('Scans retrieved', rows);
  } catch (e) {
    console.error('[Scans] GET failed:', e);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
