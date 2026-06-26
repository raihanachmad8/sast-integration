import { NextRequest } from 'next/server';
import { getStorageDriver } from '@/server/modules/storage/storage.service';

/**
 * GET /storage/[...path]
 * Serves files from the configured storage driver (local/S3/Cloudinary).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join('/');

  if (!key) {
    return new Response('No file path', { status: 400 });
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
    return new Response('File not found', { status: 404 });
  }
}
