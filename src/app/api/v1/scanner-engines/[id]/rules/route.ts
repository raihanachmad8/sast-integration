import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { getScannerRules, getSemgrepPacks } from '@/server/modules/scan/rules';
import { SUPPORTED_SCANNERS, type ScannerId } from '@/server/modules/scan/constants';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/scanner-engines/:id/rules
 *
 * Get rules for a specific scanner with search and pagination.
 * Query params: page (default: 1), per_page (default: 50), search
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id } = await params;
  const scannerId = id as ScannerId;

  if (!SUPPORTED_SCANNERS.includes(scannerId)) {
    return ApiResponse.error('Invalid scanner ID', 'VALIDATION_ERROR', undefined, 400);
  }

  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10);
  const perPage = parseInt(request.nextUrl.searchParams.get('per_page') ?? '50', 10);
  const search = request.nextUrl.searchParams.get('search') ?? undefined;

  try {
    const rulesConfig = await getScannerRules(scannerId, { page, perPage, search });

    let packs: string[] = [];
    if (scannerId === 'semgrep') {
      packs = await getSemgrepPacks();
    }

    return ApiResponse.paginated('Scanner rules retrieved', {
      scanner: scannerId,
      rulesPath: rulesConfig.rulesPath,
      rules: rulesConfig.rules,
      packs,
    }, {
      page: rulesConfig.page,
      perPage: rulesConfig.perPage,
      total: rulesConfig.totalCount,
      totalPages: rulesConfig.totalPages,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to get scanner rules';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}
