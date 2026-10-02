import { pgTable, uuid, varchar, text, timestamp, boolean, unique, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id'),
  name: varchar('name', { length: 255 }),
  slug: varchar('slug', { length: 255 }),
  platform: varchar('platform', { length: 50 }),
  language: varchar('language', { length: 50 }),
  avatar_url: text('avatar_url'),
  description: text('description'),
  lead: varchar('lead', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
  created_by: uuid('created_by'),
  updated_at: timestamp('updated_at').defaultNow(),
  updated_by: uuid('updated_by'),
  deleted_at: timestamp('deleted_at'),
  deleted_by: uuid('deleted_by'),
}, (t) => [unique().on(t.workspace_id, t.slug)]);

export const projectMembers = pgTable('project_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id),
  user_id: uuid('user_id'),
  role: varchar('role', { length: 20 }).notNull(),
  joined_at: timestamp('joined_at').defaultNow(),
});

export const projectTeams = pgTable('project_teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id),
  team_id: uuid('team_id'),
  role: varchar('role', { length: 20 }).notNull(),
  added_at: timestamp('added_at').defaultNow(),
});

export const environments = pgTable('environments', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  is_default: boolean('is_default').default(false),
  created_at: timestamp('created_at').defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;
export type ProjectTeam = typeof projectTeams.$inferSelect;
export type NewProjectTeam = typeof projectTeams.$inferInsert;
export type Environment = typeof environments.$inferSelect;
export type NewEnvironment = typeof environments.$inferInsert;

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
  // Security best practice: store bcrypt hash of the secret token
  tokenHash: text('token_hash').notNull().unique(),
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

export type ProjectApiToken = typeof projectApiTokens.$inferSelect;
export type NewProjectApiToken = typeof projectApiTokens.$inferInsert;
