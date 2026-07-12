/**
 * Team module types — shared between frontend and backend.
 *
 * @module commons-types-team
 */

/** Team member view — team detail, member picker */
export interface TeamMemberView {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: string;
}

/** Team with summary stats — team list page */
export interface TeamWithSummary {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  memberCount: number;
  projects: string[];
}

/** Team with full member and project detail — team detail drawer */
export interface TeamDetail {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  members: TeamMemberView[];
  projects: Array<{ id: string; name: string }>;
}
