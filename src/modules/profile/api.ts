/**
 * Profile API module.
 * Handles user profile updates and session management.
 */

import { apiFetch, apiPut, apiPost, apiUpload } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  username?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  avatarUrl?: string;
}

export interface Session {
  id: string;
  device: string;
  location: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  ip: string;
  createdAt: string;
  status: 'success' | 'failed';
}

/**
 * Fetches the current user's profile.
 * @returns The user profile object.
 * @example
 * ```ts
 * const profile = await getProfile();
 * console.log(profile.name); // 'John Doe'
 * console.log(profile.email); // 'john@example.com'
 * ```
 */
export async function getProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>(ENDPOINTS.AUTH.PROFILE);
}

/**
 * Updates the current user's profile.
 * @param data - Partial profile fields to update.
 * @returns The updated user profile.
 * @example
 * ```ts
 * const updated = await updateProfile({ name: 'Jane Doe', timezone: 'UTC-5' });
 * console.log(updated.name); // 'Jane Doe'
 * ```
 */
export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  return apiPut<UserProfile>(ENDPOINTS.AUTH.PROFILE_UPDATE, data);
}

/**
 * Fetches all active sessions for the current user.
 * @returns An array of session objects.
 * @example
 * ```ts
 * const sessions = await getSessions();
 * sessions.forEach((s) => console.log(s.device, s.location));
 * ```
 */
export async function getSessions(): Promise<Session[]> {
  return apiFetch<Session[]>(ENDPOINTS.AUTH.SESSIONS);
}

/**
 * Revokes an active session by ID.
 * @param sessionId - The unique identifier of the session to revoke.
 * @returns Nothing on success.
 * @example
 * ```ts
 * await revokeSession('sess-abc123');
 * // The session is now invalidated.
 * ```
 */
export async function revokeSession(sessionId: string): Promise<void> {
  await apiPost(ENDPOINTS.AUTH.REVOKE_SESSION(sessionId));
}

/**
 * Fetches the audit log for the current user.
 * @returns An array of audit log entries.
 * @example
 * ```ts
 * const logs = await getAuditLog();
 * const failed = logs.filter((l) => l.status === 'failed');
 * console.log(`${failed.length} failed actions`);
 * ```
 */
export async function getAuditLog(): Promise<AuditLogEntry[]> {
  return apiFetch<AuditLogEntry[]>(ENDPOINTS.AUTH.AUDIT_LOG);
}

/**
 * Changes the current user's password.
 * @param data - Object containing the current password and the new password.
 * @returns Nothing on success.
 * @example
 * ```ts
 * await changePassword({
 *   currentPassword: 'oldPass123',
 *   newPassword: 'newPass456',
 * });
 * ```
 */
export async function changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
  await apiPost(ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
}

const AVATAR_URL = '/api/v1/users/me/avatar';

/**
 * Upload a new avatar image.
 * @param file - The image file to upload.
 * @returns The uploaded avatar URL.
 */
export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<{ avatarUrl: string }>(AVATAR_URL, formData);
}

/**
 * Remove the current user's avatar.
 */
export async function removeAvatar(): Promise<{ avatarUrl: null }> {
  return apiPost<{ avatarUrl: null }>(AVATAR_URL + '?_method=DELETE');
}
