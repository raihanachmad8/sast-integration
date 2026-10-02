import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { scanProfileService } from '@/server/modules/scan/services/scan-profile.service';
import { updateScanProfileSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';

type Params = { params: Promise<{ profileId: string }> };

/**
 * GET /api/v1/scan-profiles/:profileId
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { profileId } = await params;
  try {
    const profile = await scanProfileService.getProfileById(profileId);
    return ApiResponse.success('Scan profile retrieved', profile);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/scan-profiles/:profileId
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  const { profileId } = await params;
  const validation = await validateBody(request, updateScanProfileSchema);
  if (!validation.success) return validation.response;
  try {
    const updated = await scanProfileService.updateProfile(profileId, validation.data);
    return ApiResponse.success('Scan profile updated successfully', updated);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/scan-profiles/:profileId
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  const { profileId } = await params;
  try {
    await scanProfileService.deleteProfile(profileId);
    return ApiResponse.success('Scan profile deleted successfully', null);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
