import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { validateBody } from '@/server/http/validate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { db } from '@/server/db/client';
import { repositories } from '@drizzle/schema/source-controls';
import { eq, and, isNull } from 'drizzle-orm';

type RouteContext = { params: Promise<{ workspaceId: string; repoId: string }> };

const updateRepoSchema = z.object({
  projectId: z.string().optional(),
});

/**
 * PATCH /api/v1/workspaces/:workspaceId/repositories/:repoId
 * Update a repository (e.g., assign to project).
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);

  const { workspaceId, repoId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPOSITORY_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, updateRepoSchema);
    if (!validation.success) return validation.response;
    const { projectId } = validation.data;

    const [existing] = await db
      .select()
      .from(repositories)
      .where(and(eq(repositories.id, repoId), eq(repositories.workspaceId, workspaceId), isNull(repositories.deletedAt)))
      .limit(1);

    if (!existing) {
      return ApiResponse.error('Repository not found', 'NOT_FOUND', undefined, 404);
    }

    const [updated] = await db
      .update(repositories)
      .set({
        projectId: projectId ?? existing.projectId,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(repositories.id, repoId))
      .returning();

    return ApiResponse.success('Repository updated', updated);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to update repository', 'INTERNAL_ERROR', undefined, 500);
  }
}
