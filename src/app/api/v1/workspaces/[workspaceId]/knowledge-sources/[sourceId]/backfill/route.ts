import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { PERMISSION } from '@/commons/constants/permissions';
import { backfillBodySchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { knowledgeBackfillService } from '@/server/modules/knowledge-base';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string; sourceId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.knowledge.info('listBackfillJobs');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, sourceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const jobs = await knowledgeBackfillService.listJobs(sourceId);
    const jobsWithProgress = jobs.map((job) => ({
      ...job,
      progress: knowledgeBackfillService.getProgress(job),
    }));
    logger.knowledge.info('listBackfillJobs completed', { count: jobs.length });
    return ApiResponse.success('Knowledge backfill jobs retrieved', jobsWithProgress);
  } catch (error) {
    logger.knowledge.error('listBackfillJobs failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.knowledge.info('startOrResumeBackfill');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, sourceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.KNOWLEDGE_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    // Parse optional JSON body with Zod validation
    let payload: z.infer<typeof backfillBodySchema> = {};
    const text = await request.text();
    if (text.trim()) {
      const parsed = backfillBodySchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        const fieldErrors = parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: fieldErrors }, 422);
      }
      payload = parsed.data;
    }

    // If body has { resume: true }, resume the latest failed job
    if (payload.resume) {
      const job = await knowledgeBackfillService.resume(sourceId);
      logger.knowledge.info('resumeBackfill completed', { jobId: job.id });
      return ApiResponse.success('Knowledge backfill resumed', job);
    }

    const job = await knowledgeBackfillService.start(sourceId, payload);
    logger.knowledge.info('startBackfill completed', { jobId: job.id });
    return ApiResponse.created('Knowledge backfill queued', job);
  } catch (error) {
    logger.knowledge.error('startOrResumeBackfill failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
