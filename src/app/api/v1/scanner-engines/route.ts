import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { SCANNER_COMMANDS } from '@/server/modules/scan/scanners';
import { SUPPORTED_SCANNERS, type ScannerId } from '@/server/modules/scan/constants';
import { checkScannerAvailability } from '@/server/modules/scan/scanner-availability';
import { AppError } from '@/server/http/errors';

/**
 * GET /api/v1/scanner-engines
 *
 * List all supported scanner engines with their configuration and availability status.
 */
export async function GET(_request: NextRequest) {
  const auth = await authenticate(_request);
  if (!auth.success) return auth.response;

  try {
    const scanners = await Promise.all(
      SUPPORTED_SCANNERS.map(async (name) => {
        const config = SCANNER_COMMANDS[name];
        const isAvailable = await checkScannerAvailability(name);

        return {
          name,
          command: config.command,
          format: config.format,
          outputStream: config.outputStream ?? 'stdout',
          isAvailable,
          status: isAvailable ? 'ready' : 'not_installed',
        };
      }),
    );

    return ApiResponse.success('Scanner engines retrieved', { scanners });
  } catch (e: unknown) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to list scanner engines', 'INTERNAL_ERROR', undefined, 500);
  }
}
