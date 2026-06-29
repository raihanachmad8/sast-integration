import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

import { workspaceRepository } from './repositories/workspace.repository';

/**
 * Assert that the user is a member of the workspace.
 *
 * @param workspaceId - Workspace UUID
 * @param userId - User UUID
 * @returns The user's role string
 * @throws {AppError} 403 - User is not a workspace member
 */
export async function assertWorkspaceMember(workspaceId: string, userId: string): Promise<string> {
  logger.workspace.debug('assertWorkspaceMember', { workspaceId, userId });
  const role = await workspaceRepository.getMemberRole(workspaceId, userId);
  if (!role) {
    throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
  }
  return role;
}
