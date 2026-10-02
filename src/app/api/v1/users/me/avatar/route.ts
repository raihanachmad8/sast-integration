import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { db } from '@/server/db/client';
import { users } from '@drizzle/schema/users';
import { eq } from 'drizzle-orm';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { AppError } from '@/server/http/errors';

/**
 * POST /api/v1/users/me/avatar
 * Upload a new avatar image for the current user.
 * Accepts multipart/form-data with a single "file" field.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return ApiResponse.error('No file provided', 'VALIDATION_ERROR', undefined, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return ApiResponse.error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP', 'VALIDATION_ERROR', undefined, 400);
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return ApiResponse.error('File too large. Maximum size: 2MB', 'VALIDATION_ERROR', undefined, 400);
    }

    // Convert to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate storage key
    const ext = file.name.split('.').pop() || 'jpg';
    const key = `avatars/${userId}/${Date.now()}.${ext}`;

    // Upload to storage
    const storage = getStorageDriver();
    const result = await storage.upload(buffer, key, { contentType: file.type });

    // Get the URL
    const url = await storage.getUrl(result.key);

    // Update user avatarUrl
    const [updated] = await db
      .update(users)
      .set({ avatarUrl: url, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return ApiResponse.error('User not found', 'NOT_FOUND', undefined, 404);
    }

    return ApiResponse.success('Avatar uploaded', { avatarUrl: url });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    console.error('[Avatar] Upload failed', e);
    return ApiResponse.error('Failed to upload avatar', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/users/me/avatar
 * Remove the current user's avatar.
 */
export async function DELETE(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  try {
    const [updated] = await db
      .update(users)
      .set({ avatarUrl: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return ApiResponse.error('User not found', 'NOT_FOUND', undefined, 404);
    }

    return ApiResponse.success('Avatar removed', { avatarUrl: null });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to remove avatar', 'INTERNAL_ERROR', undefined, 500);
  }
}
