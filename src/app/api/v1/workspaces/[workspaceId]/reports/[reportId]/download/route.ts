import { NextRequest } from 'next/server';
import { Readable } from 'node:stream';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { reportsService } from '@/server/modules/reports/reports.service';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { ApiResponse } from '@/server/http/response';

type RouteContext = { params: Promise<{ workspaceId: string; reportId: string }> };

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
};

/**
 * Convert a Node.js Readable stream to a Web ReadableStream.
 */
function nodeToWebStream(nodeStream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        controller.enqueue(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
      });
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

/**
 * GET /api/v1/workspaces/:workspaceId/reports/:reportId/download
 * Serves a generated report file from storage.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const start = Date.now();
  logger.report.info('download:start');

  const auth = await authenticate(request);
  if (!auth.success) {
    logger.report.warn('download:authFailed');
    return auth.response;
  }

  const { workspaceId, reportId } = await params;
  logger.report.info('download:params', { workspaceId, reportId });

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPORT_VIEW);
  if (!workspace.success) {
    logger.report.warn('download:permissionDenied', { workspaceId });
    return workspace.response;
  }

  try {
    // Step 1: Fetch report record
    const report = await reportsService.getById(reportId, workspaceId);
    logger.report.info('download:reportFound', { status: report.status, filePath: report.filePath, format: report.format });

    if (report.status !== 'ready') {
      logger.report.warn('download:notReady', { status: report.status, reportId });
      return ApiResponse.error('Report is not ready yet', 'NOT_READY', undefined, 425);
    }

    if (!report.filePath) {
      logger.report.warn('download:noFilePath', { reportId });
      return ApiResponse.error('Report file not found', 'NOT_FOUND', undefined, 404);
    }

    // Step 2: Get file stream from storage
    const storage = await getStorageDriver();
    logger.report.info('download:storageResolved', { filePath: report.filePath });

    const nodeStream = await storage.getStream(report.filePath);
    logger.report.info('download:streamReady', { filePath: report.filePath, ms: Date.now() - start });

    // Step 3: Convert Node.js stream to Web ReadableStream and respond
    const webStream = nodeToWebStream(nodeStream);
    const ext = report.format ?? 'pdf';
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.${ext}`;

    logger.report.info('download:sending', { filename, contentType: CONTENT_TYPES[ext], ms: Date.now() - start });

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=0',
      },
    });
  } catch (error) {
    logger.report.error('download:failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ms: Date.now() - start,
    });
    if (error instanceof AppError) {
      return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
