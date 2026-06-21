/**
 * Project form input for creating or updating a project.
 *
 * @example
 * ```ts
 * const input: ProjectFormInput = {
 *   name: 'Payment Gateway',
 *   description: 'PCI-compliant payment processing',
 *   lead: 'Alice Tan',
 *   teamIds: ['tm_01', 'tm_03'],
 *   memberIds: ['usr_01', 'usr_02'],
 *   repositoryIds: ['repo_01', 'repo_02'],
 * };
 * ```
 */
export interface ProjectFormInput {
  /** Project display name. */
  name: string;
  /** Optional description of the project. */
  description: string;
  /** Optional lead contact name. */
  lead: string;
  /** Array of team IDs to attach to the project. */
  teamIds: string[];
  /** Array of user IDs for direct member access. */
  memberIds: string[];
  /** Array of repository IDs to attach. */
  repositoryIds: string[];
}

/**
 * A member of a project (direct or team-based).
 */
export interface ProjectMember {
  /** User ID. */
  userId: string;
  /** User display name. */
  name: string;
  /** User email. */
  email: string;
  /** Role in the project (admin, contributor, viewer). */
  role: string;
  /** Optional avatar URL. */
  avatarUrl?: string;
}
