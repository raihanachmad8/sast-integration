import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { aiModelsService } from '@/server/modules/ai-models';
import { db } from '@/server/db/client';
import { models } from '@drizzle/schema/integrations';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/server/lib/logger';
import { isPrivateOrInternal } from '@/server/lib/ssrf';

type RouteContext = { params: Promise<{ workspaceId: string; modelId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.model.info('testAiModel');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, modelId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.AI_MODEL_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const model = await aiModelsService.getModelById(modelId, workspaceId);

    // Attempt a lightweight health check against the model's base URL
    let baseUrl = model.baseUrl;
    // Ensure baseUrl has a protocol prefix
    if (!/^https?:\/\//i.test(baseUrl)) {
      baseUrl = `http://${baseUrl}`;
    }
    const modelsUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`;

    // Validate URL format
    let urlObj: URL;
    try {
      urlObj = new URL(modelsUrl);
    } catch {
      return ApiResponse.error('Invalid model URL format', 'VALIDATION_ERROR', undefined, 400);
    }

    // SSRF protection: block external private/internal URLs
    // Allow localhost for local Ollama instances
    const isLocalOllama = /^(localhost|127\.0\.0\.1|::1)$/i.test(urlObj.hostname) && urlObj.port === '11434';
    if (!isLocalOllama && isPrivateOrInternal(urlObj.hostname)) {
      return ApiResponse.error('Testing internal/private URLs is not allowed', 'SSRF_BLOCKED', undefined, 400);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          ...(model.apiKeyEncrypted ? { Authorization: `Bearer ${model.apiKeyEncrypted}` } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const status = res.ok ? 'reachable' : 'unreachable';

      // For Ollama: also check if the specific model exists
      let modelExists = true;
      let modelList: string[] = [];
      if (res.ok && /^(localhost|127\.0\.0\.1|::1)$/i.test(urlObj.hostname)) {
        try {
          const listData = await res.json();
          modelList = (listData.data ?? []).map((m: { id?: string }) => m.id ?? '');
          modelExists = modelList.some((id) => id === model.name || id.startsWith(model.name + ':'));
        } catch {
          // ignore parse errors
        }
      }

      await db
        .update(models)
        .set({ status, lastTestedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(models.id, modelId), eq(models.workspaceId, workspaceId)));

      logger.model.info('testAiModel completed', { modelId, status, modelExists });
      return ApiResponse.success(`Model is ${status}`, {
        status,
        modelExists,
        modelId: model.id,
        modelName: model.name,
        provider: model.provider,
        baseUrl: modelsUrl,
        httpStatus: res.status,
        ...(modelList.length > 0 ? { availableModels: modelList } : {}),
      });
    } catch (fetchErr) {
      clearTimeout(timeout);

      await db
        .update(models)
        .set({ status: 'unreachable', lastTestedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(models.id, modelId), eq(models.workspaceId, workspaceId)));

      logger.model.info('testAiModel completed', { modelId, status: 'unreachable' });
      return ApiResponse.success('Model is unreachable', {
        status: 'unreachable',
        modelId: model.id,
        modelName: model.name,
        provider: model.provider,
        baseUrl: modelsUrl,
        error: fetchErr instanceof Error ? fetchErr.message : 'Network error',
      });
    }
  } catch (e) {
    logger.model.error('testAiModel failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
