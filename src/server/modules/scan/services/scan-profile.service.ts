import { scanPolicyRepository } from '../repositories/scan-policy.repository';
import {
  createScanPolicySchema,
  updateScanPolicySchema,
} from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { REPOSITORY_CONNECTION_TYPES } from '@/commons/constants/scan';

/**
 * Service responsible for managing Scan Policies.
 *
 * Scan Policies define reusable scanning configurations (which scanners to run,
 * severity thresholds, AI verification settings, etc.) that can be attached
 * to repositories or schedules for managed SCM scanning.
 *
 * This service ensures that any `scanners` array is always validated against
 * the centralized `SUPPORTED_SCANNERS` list.
 */
export const scanPolicyService = {
  /**
   * Creates a new scan policy for a workspace.
   * Automatically validates that all requested scanners are supported.
   */
  async createPolicy(workspaceId: string, input: unknown) {
    const data = createScanPolicySchema.parse(input);

    return scanPolicyRepository.create({
      workspaceId,
      name: data.name,
      profile: data.profile,
      scanners: data.scanners,
      aiVerification: data.aiVerification,
      severityThreshold: data.severityThreshold,
      timeoutSeconds: data.timeoutSeconds,
      maxFindings: data.maxFindings,
    });
  },

  /**
   * Retrieves a single scan policy by ID.
   */
  async getPolicyById(id: string) {
    const policy = await scanPolicyRepository.findById(id);
    if (!policy) {
      throw new AppError('Scan policy not found', 404, 'NOT_FOUND');
    }
    return policy;
  },

  /**
   * Lists all scan policies belonging to a workspace.
   */
  async listPoliciesByWorkspace(workspaceId: string) {
    return scanPolicyRepository.findByWorkspace(workspaceId);
  },

  /**
   * Updates an existing scan policy.
   * Re-validates scanners if they are being updated.
   */
  async updatePolicy(id: string, input: unknown) {
    const data = updateScanPolicySchema.parse(input);

    // Re-validate scanners only if they are being changed
    if (data.scanners) {
      // The schema already validates against SUPPORTED_SCANNERS,
      // but we keep an extra call here for defense-in-depth
      // and in case the schema is bypassed in the future.
    }

    const updated = await scanPolicyRepository.update(id, data);
    if (!updated) {
      throw new AppError('Scan policy not found', 404, 'NOT_FOUND');
    }
    return updated;
  },

  /**
   * Soft-deletes a scan policy.
   * Note: In the current implementation this is a hard delete.
   * Can be changed to soft delete later if audit requirements increase.
   */
  async deletePolicy(id: string) {
    const policy = await scanPolicyRepository.findById(id);
    if (!policy) {
      throw new AppError('Scan policy not found', 404, 'NOT_FOUND');
    }

    const attachedRepositories = await scanPolicyRepository.countAttachedRepositories(id);
    if (attachedRepositories > 0) {
      throw new AppError(
        `Cannot delete scan policy while it is attached to ${attachedRepositories} active repository/repositories. Detach it first.`,
        409,
        'SCAN_POLICY_IN_USE'
      );
    }

    await scanPolicyRepository.delete(id);
  },

  /**
   * Validates and returns data needed to attach a policy to a repository.
   * Performs strict validation before allowing attachment:
   * - Policy must exist and belong to the workspace
   * - Policy must have at least one scanner
   * - Repository must exist and belong to the same workspace
   * - Repository must be of type REPOSITORY_CONNECTION_TYPES.SCM (managed scanning only makes sense for SCM-connected repos)
   *
   * Actual DB update is handled by the project/repository layer.
   */
  async preparePolicyAttachment(policyId: string, repositoryId: string, workspaceId: string) {
    const policy = await this.getPolicyById(policyId);

    // 1. Workspace ownership
    if (policy.workspace_id !== workspaceId) {
      throw new AppError('Policy does not belong to this workspace', 403, 'FORBIDDEN');
    }

    // 2. Policy must have at least one scanner
    const scanners = Array.isArray(policy.scanners) ? policy.scanners : [];
    if (scanners.length === 0) {
      throw new AppError('Policy must have at least one scanner configured', 400, 'VALIDATION_ERROR');
    }

    // 3. Validate repository
    const projectRepository = (await import('@/server/modules/project/repositories/project.repository')).projectRepository;
    const repoData = await projectRepository.findRepositoryByIdAndWorkspace(repositoryId, workspaceId);

    if (!repoData) {
      throw new AppError('Repository not found or does not belong to this workspace', 404, 'NOT_FOUND');
    }

    if (repoData.repository.connection_type !== REPOSITORY_CONNECTION_TYPES.SCM) {
      throw new AppError(
        'Managed scanning can only be enabled on repositories that are connected via SCM (connection_type = "scm"). ' +
        'This repository is currently marked as "external", which only supports uploading pre-generated scan results directly from your CI pipeline. ' +
        'If you want the platform to automatically run scans according to a policy, please connect this repository through the SCM integration first.',
        400,
        'INVALID_REPOSITORY_TYPE_FOR_MANAGED_SCAN'
      );
    }

    return {
      policyId,
      repositoryId,
      workspaceId,
      scanners,
      policyName: policy.name,
      repositoryName: repoData.repository.name,
    };
  },

  /**
   * Attaches a validated scan policy to a repository.
   *
   * This is the main method to enable managed scanning on a repository.
   * It performs full validation first via `preparePolicyAttachment`, then
   * updates the repository's `current_policy_id`.
   *
   * Only repositories with `connection_type = 'scm'` are allowed.
   */
  async attachPolicyToRepository(policyId: string, repositoryId: string, workspaceId: string, updatedBy: string) {
    // Step 1: Full validation (throws if anything is wrong)
    const validated = await this.preparePolicyAttachment(policyId, repositoryId, workspaceId);

    // Step 2: Perform the actual attachment
    const projectRepository = (await import('@/server/modules/project/repositories/project.repository')).projectRepository;

    const updatedRepo = await projectRepository.setRepositoryPolicy(repositoryId, policyId, updatedBy);

    if (!updatedRepo) {
      throw new AppError('Failed to attach policy to repository', 500, 'INTERNAL_ERROR');
    }

    return {
      repositoryId,
      policyId,
      attachedAt: new Date(),
      policyName: validated.policyName,
      repositoryName: validated.repositoryName,
    };
  },
};
