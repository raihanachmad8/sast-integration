import { db } from '@/server/db/client';
import { ROLE } from '@/commons/constants/permissions';
import { workspaceRepository } from './workspace.repository';
import { WORKSPACE } from './constants';
import { AppError } from '@/server/http/errors';
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from './schemas';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const workspaceService = {
  /**
   * List all workspaces the user belongs to.
   * @param userId - Authenticated user ID
   */
  async list(userId: string) {
    return workspaceRepository.listByUser(userId);
  },

  /**
   * Get workspace details. Verifies user is a member.
   * @param workspaceId - Workspace UUID
   * @param userId - Authenticated user ID
   */
  async getById(workspaceId: string, userId: string) {
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) throw new AppError(WORKSPACE.ERRORS.NOT_MEMBER, 403, WORKSPACE.ERROR_CODE);

    const ws = await workspaceRepository.findById(workspaceId);
    if (!ws) throw new AppError(WORKSPACE.ERRORS.NOT_FOUND, 404, WORKSPACE.ERROR_CODE);

    return { ...ws, role };
  },

  /**
   * Create a new workspace. Creator becomes owner.
   * @param input - Name, optional slug/description
   * @param userId - Creator user ID
   */
  async create(input: CreateWorkspaceInput, userId: string) {
    const slug = input.slug ?? slugify(input.name);

    const existing = await workspaceRepository.findBySlug(slug);
    if (existing) throw new AppError(WORKSPACE.ERRORS.SLUG_CONFLICT, 409, WORKSPACE.ERROR_CODE);

    return db.transaction(async (tx) => {
      const ws = await workspaceRepository.create({ name: input.name, slug, description: input.description, createdBy: userId }, tx);
      await workspaceRepository.addMember(ws.id, userId, ROLE.OWNER, tx);
      return ws;
    });
  },

  /**
   * Update workspace. Only owner can update.
   * @param workspaceId - Workspace UUID
   * @param input - Fields to update
   * @param userId - Authenticated user ID
   */
  async update(workspaceId: string, input: UpdateWorkspaceInput, userId: string) {
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (role !== ROLE.OWNER) throw new AppError(WORKSPACE.ERRORS.NOT_OWNER, 403, WORKSPACE.ERROR_CODE);

    if (input.slug) {
      const existing = await workspaceRepository.findBySlug(input.slug);
      if (existing && existing.id !== workspaceId) throw new AppError(WORKSPACE.ERRORS.SLUG_CONFLICT, 409, WORKSPACE.ERROR_CODE);
    }

    return workspaceRepository.update(workspaceId, { ...input, updatedBy: userId });
  },

  /**
   * Delete workspace. Only owner can delete. Personal workspace cannot be deleted.
   * @param workspaceId - Workspace UUID
   * @param userId - Authenticated user ID
   */
  async delete(workspaceId: string, userId: string) {
    const ws = await workspaceRepository.findById(workspaceId);
    if (!ws) throw new AppError(WORKSPACE.ERRORS.NOT_FOUND, 404, WORKSPACE.ERROR_CODE);
    if (ws.type === WORKSPACE.TYPE.PERSONAL) throw new AppError(WORKSPACE.ERRORS.CANNOT_DELETE_PERSONAL, 403, WORKSPACE.ERROR_CODE);

    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (role !== ROLE.OWNER) throw new AppError(WORKSPACE.ERRORS.NOT_OWNER, 403, WORKSPACE.ERROR_CODE);

    await workspaceRepository.delete(workspaceId, userId);
  },

  /**
   * Switch user's active workspace. Verifies membership.
   * @param workspaceId - Target workspace UUID
   * @param userId - Authenticated user ID
   */
  async switchWorkspace(workspaceId: string, userId: string) {
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) throw new AppError(WORKSPACE.ERRORS.NOT_MEMBER, 403, WORKSPACE.ERROR_CODE);

    await workspaceRepository.switchWorkspace(userId, workspaceId);
  },
};
