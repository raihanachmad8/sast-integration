import { pgTable, uuid, varchar, jsonb, timestamp, boolean, text, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';

export const models = pgTable('ai_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: varchar('name', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  base_url: varchar('base_url', { length: 500 }).notNull(),
  api_key_encrypted: text('api_key_encrypted'),
  role: varchar('role', { length: 20 }).notNull().default('fallback'),
  priority: integer('priority').notNull().default(1),
  prompt_preset: varchar('prompt_preset', { length: 20 }).notNull().default('strict'),
  custom_system_prompt: text('custom_system_prompt'),
  status: varchar('status', { length: 20 }).default('unreachable'),
  last_tested_at: timestamp('last_tested_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: varchar('name', { length: 255 }),
  url: varchar('url', { length: 500 }).notNull(),
  events: jsonb('events').notNull(),
  secret: varchar('secret', { length: 255 }).notNull(),
  active: boolean('active').default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  created_by: uuid('created_by').references(() => users.id),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  updated_by: uuid('updated_by').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  deleted_by: uuid('deleted_by').references(() => users.id),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  user_id: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource_type: varchar('resource_type', { length: 50 }),
  resource_id: uuid('resource_id'),
  data: jsonb('data'),
  ip_address: varchar('ip_address', { length: 45 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  user_id: uuid('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const knowledgeSources = pgTable('knowledge_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  url: varchar('url', { length: 500 }),
  status: varchar('status', { length: 20 }).default('disconnected'),
  entry_count: integer('entry_count').default(0),
  last_synced_at: timestamp('last_synced_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const knowledgeEntries = pgTable('knowledge_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  source_id: uuid('source_id').notNull().references(() => knowledgeSources.id),
  cwe_id: varchar('cwe_id', { length: 20 }),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content'),
  severity: varchar('severity', { length: 20 }),
  remediation: text('remediation'),
  tags: jsonb('tags'),
  muted: boolean('muted').default(false),
  used_by_ai_count: integer('used_by_ai_count').default(0),
  references: jsonb('references'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (t) => [
  uniqueIndex('knowledge_entries_source_cwe_idx').on(t.source_id, t.cwe_id),
]);

export const knowledgeBackfillJobs = pgTable('knowledge_backfill_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id'),
  source_id: uuid('source_id').references(() => knowledgeSources.id),
  source_type: varchar('source_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('queued'),
  range_start: timestamp('range_start').notNull(),
  range_end: timestamp('range_end').notNull(),
  cursor_start: timestamp('cursor_start').notNull(),
  window_days: integer('window_days').notNull().default(30),
  imported_count: integer('imported_count').notNull().default(0),
  last_error: text('last_error'),
  started_at: timestamp('started_at'),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('knowledge_backfill_source_status_idx').on(t.source_id, t.status),
]);

export type AiModel = typeof models.$inferSelect;
export type NewAiModel = typeof models.$inferInsert;
export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type NewKnowledgeSource = typeof knowledgeSources.$inferInsert;
export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect;
export type NewKnowledgeEntry = typeof knowledgeEntries.$inferInsert;
export type KnowledgeBackfillJob = typeof knowledgeBackfillJobs.$inferSelect;
export type NewKnowledgeBackfillJob = typeof knowledgeBackfillJobs.$inferInsert;
