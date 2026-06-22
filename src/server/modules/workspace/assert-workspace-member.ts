import { workspaceRepository } from './repositories/workspace.repository';
import { AppError } from '@/server/http/errors';

/**
 * Assert that the user is a member of the workspace.
 *
 * @param workspaceId - Workspace UUID
 * @param userId - User UUID
 * @returns The user's role string
 * @throws {AppError} 403 - User is not a workspace member
 */
export async function assertWorkspaceMember(workspaceId: string, userId: string): Promise<string> {
  const role = await workspaceRepository.getMemberRole(workspaceId, userId);
  if (!role) {
    throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
  }
  return role;
}
