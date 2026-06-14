/**
 * Auth & workspace types — mirror the Drizzle schema for frontend development.
 *
 * @module commons-types-auth
 */

/**
 * Mock user — mirrors the `users` table.
 *
 * @example
 * ```ts
 * const user: User = {
 *   id: 'usr_01',
 *   email: 'alice@sast.dev',
 *   name: 'Alice Tan',
 *   avatarUrl: null,
 *   emailVerifiedAt: '2026-01-10T08:00:00Z',
 *   currentWorkspaceId: 'ws_01',
 *   createdAt: '2026-01-05T08:00:00Z',
 * };
 * ```
 */
export type User = {
  /** Unique user ID. */
  id: string;
  /** User email address. */
  email: string;
  /** User display name. */
  name: string;
  /** Optional avatar URL. */
  avatarUrl: string | null;
  /** ISO 8601 email verification timestamp. */
  emailVerifiedAt: string | null;
  /** Currently active workspace ID. */
  currentWorkspaceId: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};

/**
 * Mock workspace — mirrors the `workspaces` table.
 *
 * @example
 * ```ts
 * const ws: Workspace = {
 *   id: 'ws_01',
 *   name: 'SAST Integration',
 *   slug: 'sast-integration',
 *   type: 'organization',
 *   description: 'Main workspace for SAST platform development.',
 *   createdAt: '2026-01-05T08:00:00Z',
 *   createdBy: 'usr_01',
 * };
 * ```
 */
export type Workspace = {
  /** Unique workspace ID. */
  id: string;
  /** Workspace display name. */
  name: string;
  /** URL-friendly workspace slug. */
  slug: string;
  /** Workspace type. */
  type: 'personal' | 'organization';
  /** Optional workspace description. */
  description: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** User ID who created the workspace. */
  createdBy: string;
};

/**
 * Mock workspace member — mirrors the `workspace_members` table.
 *
 * @example
 * ```ts
 * const member: WorkspaceMember = {
 *   id: 'wm_01',
 *   workspaceId: 'ws_01',
 *   userId: 'usr_01',
 *   role: 'owner',
 *   joinedAt: '2026-01-05T08:00:00Z',
 * };
 * ```
 */
export type WorkspaceMember = {
  /** Unique membership ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** User ID. */
  userId: string;
  /** Role in the workspace. */
  role: 'owner' | 'manager' | 'reviewer' | 'member';
  /** ISO 8601 join timestamp. */
  joinedAt: string;
};

/**
 * Mock workspace invitation — mirrors the `workspace_invitations` table.
 *
 * @example
 * ```ts
 * const inv: WorkspaceInvitation = {
 *   id: 'inv_01',
 *   workspaceId: 'ws_01',
 *   email: 'frank@sast.dev',
 *   role: 'member',
 *   token: 'tok_inv_01',
 *   acceptedAt: null,
 *   createdAt: '2026-05-20T08:00:00Z',
 *   expiresAt: '2026-06-03T08:00:00Z',
 * };
 * ```
 */
export type WorkspaceInvitation = {
  /** Unique invitation ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** Invitee email. */
  email: string;
  /** Role to assign on acceptance. */
  role: string;
  /** Unique invitation token. */
  token: string;
  /** ISO 8601 acceptance timestamp (null if pending). */
  acceptedAt: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 expiry timestamp. */
  expiresAt: string;
};

/**
 * Mock workspace setting — key-value configuration pair.
 *
 * @example
 * ```ts
 * const setting: WorkspaceSetting = {
 *   id: 'ws_set_01',
 *   workspaceId: 'ws_01',
 *   key: 'scan.auto_trigger_on_push',
 *   value: 'true',
 * };
 * ```
 */
export type WorkspaceSetting = {
  /** Unique setting ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** Setting key (dot-notation, e.g. 'scan.auto_trigger_on_push'). */
  key: string;
  /** Setting value. */
  value: string | null;
};

/**
 * Mock user profile — editable user settings.
 *
 * @example
 * ```ts
 * const profile: Profile = {
 *   id: 'usr_01',
 *   email: 'alice@sast.dev',
 *   name: 'Alice Tan',
 *   avatarUrl: null,
 *   username: null,
 *   bio: null,
 *   timezone: 'Asia/Jakarta',
 *   language: 'en',
 *   emailVerifiedAt: '2026-01-10T08:00:00Z',
 *   createdAt: '2026-01-05T08:00:00Z',
 * };
 * ```
 */
export type Profile = {
  /** Unique user ID. */
  id: string;
  /** User email address. */
  email: string;
  /** User display name. */
  name: string;
  /** Optional avatar URL. */
  avatarUrl: string | null;
  /** Optional username. */
  username: string | null;
  /** Optional bio/description. */
  bio: string | null;
  /** Timezone identifier. */
  timezone: string | null;
  /** Preferred language locale. */
  language: string | null;
  /** ISO 8601 email verification timestamp. */
  emailVerifiedAt: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};

/**
 * Mock deployment environment for a project.
 *
 * @example
 * ```ts
 * const env: Environment = {
 *   id: 'env_01',
 *   projectId: 'proj_01',
 *   name: 'Production',
 *   type: 'production',
 *   isDefault: true,
 * };
 * ```
 */
export type Environment = {
  /** Unique environment ID. */
  id: string;
  /** Parent project ID. */
  projectId: string;
  /** Environment display name. */
  name: string;
  /** Environment type (production, development, staging). */
  type: string;
  /** Whether this is the default environment for the project. */
  isDefault: boolean;
};
