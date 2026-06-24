import { pgTable, uuid, varchar, jsonb, timestamp, text, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { isNull } from 'drizzle-orm';
import { users } from './users';
import { workspaces } from './workspaces';
import { projects } from './projects';

export const sourceControls = pgTable('source_controls', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  provider: varchar('provider', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  credentials: jsonb('credentials'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  lastSyncedAt: timestamp('last_synced_at'),
}, (t) => [
  index('source_controls_workspace_id_idx').on(t.workspaceId),
]);

export const sourceControlRepositories = pgTable('source_control_repositories', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceControlId: uuid('source_control_id').notNull().references(() => sourceControls.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  externalId: varchar('external_id', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 500 }).notNull(),
  url: varchar('url', { length: 500 }),
  defaultBranch: varchar('default_branch', { length: 100 }).default('main'),
  visibility: varchar('visibility', { length: 20 }).default('private'),
  syncedAt: timestamp('synced_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (t) => [
  uniqueIndex('source_control_repositories_ctrl_name_idx').on(t.sourceControlId, t.name),
  uniqueIndex('source_control_repositories_ctrl_extid_idx').on(t.sourceControlId, t.externalId),
]);

export const sourceControlImports = pgTable('source_control_imports', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  sourceControlId: uuid('source_control_id').notNull().references(() => sourceControls.id),
  sourceControlRepositoryId: uuid('source_control_repository_id').notNull().references(() => sourceControlRepositories.id),
  repositoryId: uuid('repository_id').references(() => repositories.id),
  webhookExternalId: varchar('webhook_external_id', { length: 255 }),
  webhookSecret: varchar('webhook_secret', { length: 255 }),
  webhookStatus: varchar('webhook_status', { length: 20 }).default('pending'),
  importedBy: uuid('imported_by').references(() => users.id),
  importedAt: timestamp('imported_at'),
  uninstalledAt: timestamp('uninstalled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const repositories = pgTable('repositories', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  projectId: uuid('project_id').references(() => projects.id),
  externalId: varchar('external_id', { length: 255 }),
  provider: varchar('provider', { length: 20 }),
  name: varchar('name', { length: 255 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  defaultBranch: varchar('default_branch', { length: 100 }).default('main'),
  connectionType: text('connection_type').array().notNull().default(['scm']),
  importMode: varchar('import_mode', { length: 20 }).default('manual'),
  autoScan: boolean('auto_scan').default(false),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references(() => users.id),
}, (t) => [
  uniqueIndex('repositories_workspace_name_idx').on(t.workspaceId, t.name).where(isNull(t.deletedAt)),
  index('repositories_project_id_idx').on(t.projectId),
]);

export type SourceControl = typeof sourceControls.$inferSelect;
export type NewSourceControl = typeof sourceControls.$inferInsert;
export type SourceControlRepository = typeof sourceControlRepositories.$inferSelect;
export type NewSourceControlRepository = typeof sourceControlRepositories.$inferInsert;
export type SourceControlImport = typeof sourceControlImports.$inferSelect;
export type NewSourceControlImport = typeof sourceControlImports.$inferInsert;
export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
