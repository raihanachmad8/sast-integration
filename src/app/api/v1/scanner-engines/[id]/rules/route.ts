import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { getScannerRules, getSemgrepPacks } from '@/server/modules/scan/rules';
import { SUPPORTED_SCANNERS, type SupportedScanner } from '@/server/modules/scan/constants';

/**
 * GET /api/v1/scanner-engines/:id/rules
 * 
 * Get rules for a specific scanner.
 * For semgrep, returns rules from the cloned semgrep-rules repository.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id } = await params;
  const scannerId = id as SupportedScanner;

  // Validate scanner ID
  if (!SUPPORTED_SCANNERS.includes(scannerId)) {
    return ApiResponse.error('Invalid scanner ID', 'VALIDATION_ERROR', undefined, 400);
  }

  try {
    const rulesConfig = await getScannerRules(scannerId);
    
    // For semgrep, also get available packs
    let packs: string[] = [];
    if (scannerId === 'semgrep') {
      packs = await getSemgrepPacks();
    }

    return ApiResponse.success('Scanner rules retrieved', {
      scanner: scannerId,
      rulesPath: rulesConfig.rulesPath,
      totalCount: rulesConfig.totalCount,
      rules: rulesConfig.rules.slice(0, 100), // Limit to first 100 for performance
      packs,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to get scanner rules';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}
