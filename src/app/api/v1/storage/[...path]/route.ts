import { NextRequest } from 'next/server';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { authenticate } from '@/server/http/authenticate';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';

/**
 * GET /api/v1/storage/[...path]
 * Serves files from the configured storage driver (local/S3/Cloudinary).
 * Requires authentication.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  logger.storage.info('get file request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { path } = await params;
  const key = path.join('/');

  if (!key) {
    return ApiResponse.error('No file path provided', 'VALIDATION_ERROR', undefined, 400);
  }

  // Path traversal protection
  if (key.includes('..') || key.startsWith('/')) {
    return ApiResponse.error('Invalid file path', 'VALIDATION_ERROR', undefined, 400);
  }

  try {
    const storage = await getStorageDriver();
    const stream = await storage.getStream(key);

    const ext = key.split('.').pop()?.toLowerCase() ?? '';
    const contentTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      json: 'application/json',
    };

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': contentTypes[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return ApiResponse.error('File not found', 'NOT_FOUND', undefined, 404);
  }
}
