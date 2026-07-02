import { NextRequest } from 'next/server';

import { authenticate } from '@/server/http/authenticate';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { isPrivateOrInternal } from '@/server/lib/ssrf';

/**
 * Server-side proxy to fetch available models from a provider URL.
 *
 * Solves CORS issues when the frontend needs to query local providers (e.g. Ollama)
 * that do not set Access-Control-Allow-Origin headers.
 *
 * @example GET /api/v1/model-providers?baseUrl=http://localhost:11434
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  let baseUrl = searchParams.get('baseUrl');

  if (!baseUrl) {
    return ApiResponse.error('baseUrl is required', 'VALIDATION_ERROR', undefined, 422);
  }

  // Ensure baseUrl has a protocol prefix
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `http://${baseUrl}`;
  }

  let urlObj: URL;
  try {
    urlObj = new URL(baseUrl);
  } catch {
    return ApiResponse.error('Invalid URL format', 'VALIDATION_ERROR', undefined, 400);
  }

  // SSRF protection: block private/internal URLs except local AI models when ALLOW_LOCAL_AI_MODELS=true
  const allowLocal = process.env.ALLOW_LOCAL_AI_MODELS === 'true';
  if (!allowLocal && isPrivateOrInternal(urlObj.hostname)) {
    return ApiResponse.error('Fetching from internal/private URLs is not allowed. Set ALLOW_LOCAL_AI_MODELS=true in .env for local Ollama.', 'SSRF_BLOCKED', undefined, 400);
  }

  const modelsUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(modelsUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      logger.model.warn('model-providers: upstream returned error', { baseUrl, status: res.status });
      return ApiResponse.error(`Provider returned HTTP ${res.status}`, 'PROVIDER_ERROR', { httpStatus: res.status }, 400);
    }

    const json = await res.json();
    const models: string[] = (json.data ?? json.models ?? [])
      .map((m: { id?: string; name?: string }) => m.id ?? m.name)
      .filter(Boolean);

    return ApiResponse.success('Models fetched', { models });
  } catch (err) {
    logger.model.error('model-providers: fetch failed', { baseUrl, error: err instanceof Error ? err.message : String(err) });
    return ApiResponse.error(
      err instanceof Error && err.name === 'AbortError'
        ? 'Provider request timed out'
        : 'Failed to connect to provider',
      'PROVIDER_ERROR',
      undefined,
      502,
    );
  }
}
