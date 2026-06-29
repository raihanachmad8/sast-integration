/**
 * Project module types.
 *
 * Input types are inferred from Zod schemas (single source of truth).
 * Response/view types are defined here.
 */
import type { ProjectFormInput as ProjectFormInputSchema } from '@/commons/schemas/project.schema';

/** Project form input for creating or updating a project. */
export type ProjectFormInput = ProjectFormInputSchema;

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
