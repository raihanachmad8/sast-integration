/**
 * Project module types — shared between frontend and backend.
 *
 * @module commons-types-project
 */

/** Summary object for a project member. */
export interface ProjectMemberSummary {
  id: string;
  name: string;
  email?: string;
}

/** Summary object for a project team. */
export interface ProjectTeamSummary {
  id: string;
  name: string;
}

/** Summary object for a project repository. */
export interface ProjectRepositorySummary {
  id: string;
  name: string;
}

/** Project — used by projects, repositories. */
export interface Project {
  id: string;
  name: string;
  description: string;
  lead: string;
  repositories: ProjectRepositorySummary[];
  teams: ProjectTeamSummary[];
  members: ProjectMemberSummary[];
  /** ISO 8601 timestamp of when the project was created. */
  createdAt?: string;
}

/** Repository item returned by project-scoped repository list APIs. */
export interface ProjectRepositoryListItem {
  id: string;
  name: string;
  url: string;
  branch: string;
  status: 'active';
  project: string | null;
  policyName: null;
  connectionType: string[];
  provider: null;
  findings: number;
  scans: number;
  lastScan: string | null;
}

/** Project with member, team, and repository summaries — project list/detail page. */
export interface ProjectWithSummary {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  lead: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  members: ProjectMemberSummary[];
  teams: ProjectTeamSummary[];
  repositories: ProjectRepositorySummary[];
}
