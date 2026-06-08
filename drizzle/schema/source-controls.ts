import { pgTable, uuid, varchar, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';
import { projects } from './projects';

export const sourceControls = pgTable('source_controls', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  provider: varchar('provider', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  credentials: jsonb('credentials'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  created_by: uuid('created_by').references(() => users.id),
});

export const repositories = pgTable('repositories', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  project_id: uuid('project_id').notNull().references(() => projects.id),
  source_control_id: uuid('source_control_id').references(() => sourceControls.id),
  name: varchar('name', { length: 255 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  default_branch: varchar('default_branch', { length: 100 }).default('main'),
  connection_type: varchar('connection_type', { length: 20 }).notNull().default('scm'),
  auto_scan: boolean('auto_scan').default(false),
  webhook_id: varchar('webhook_id', { length: 255 }),
  webhook_secret: varchar('webhook_secret', { length: 255 }),
  last_synced_at: timestamp('last_synced_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  created_by: uuid('created_by').references(() => users.id),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  updated_by: uuid('updated_by').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  deleted_by: uuid('deleted_by').references(() => users.id),
});

export type SourceControl = typeof sourceControls.$inferSelect;
export type NewSourceControl = typeof sourceControls.$inferInsert;
export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
