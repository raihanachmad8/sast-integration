import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { SCANNER_COMMANDS } from '@/server/modules/scan/scanners';
import { SUPPORTED_SCANNERS, type SupportedScanner } from '@/server/modules/scan/constants';
import { checkScannerAvailability } from '@/server/modules/scan/scanner-availability';

/**
 * GET /api/v1/scanner-engines
 *
 * List all supported scanner engines with their configuration and availability status.
 * Returns scanner name, command, format, and whether the binary is installed.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

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
      })
    );

    return ApiResponse.success('Scanner engines retrieved', { scanners });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to list scanner engines';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}
