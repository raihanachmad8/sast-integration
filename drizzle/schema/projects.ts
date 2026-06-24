import { pgTable, uuid, varchar, text, timestamp, boolean, unique, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  platform: varchar('platform', { length: 50 }),
  language: varchar('language', { length: 50 }),
  avatarUrl: text('avatar_url'),
  description: text('description'),
  lead: varchar('lead', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references(() => users.id),
}, (t) => [
  unique().on(t.workspaceId, t.slug),
  index('projects_workspace_id_idx').on(t.workspaceId),
]);

export const projectMembers = pgTable('project_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 20 }).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => [
  index('project_members_project_id_idx').on(t.projectId),
  index('project_members_user_id_idx').on(t.userId),
]);

export const projectTeams = pgTable('project_teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  teamId: uuid('team_id').notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
}, (t) => [
  index('project_teams_project_id_idx').on(t.projectId),
]);

export const environments = pgTable('environments', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Project-scoped API tokens for CI/CD pipelines (e.g. GitHub Actions, GitLab CI).
 * These tokens are the primary mechanism for secure "external" scan result uploads
 * without requiring user sessions or SCM credentials.
 *
 * - Token is never stored in plaintext. Only hash + short prefix for identification.
 * - Permissions are narrow by design (default: ["scans:upload"]).
 * - Revocable per-project; supports expiry.
 */
export const projectApiTokens = pgTable('project_api_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  // Fast lookup: SHA-256 hash for O(1) token matching
  tokenSha256: varchar('token_sha256', { length: 64 }).notNull().unique(),
  // First 8-12 chars of the token shown to user after creation (e.g. "sast_p_abc123..")
  tokenPrefix: varchar('token_prefix', { length: 20 }),
  // Array of permission strings, e.g. ["scans:upload", "scans:read"]
  permissions: jsonb('permissions').$type<string[]>().notNull().default(['scans:upload']),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  revokedAt: timestamp('revoked_at'),
  revokedBy: uuid('revoked_by').references(() => users.id),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;
export type ProjectTeam = typeof projectTeams.$inferSelect;
export type NewProjectTeam = typeof projectTeams.$inferInsert;
export type Environment = typeof environments.$inferSelect;
export type NewEnvironment = typeof environments.$inferInsert;
export type ProjectApiToken = typeof projectApiTokens.$inferSelect;
export type NewProjectApiToken = typeof projectApiTokens.$inferInsert;
