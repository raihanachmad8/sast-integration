import { pgTable, uuid, varchar, jsonb, timestamp, boolean, text, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { workspaces } from './workspaces';

export const models = pgTable('ai_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: varchar('name', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  baseUrl: varchar('base_url', { length: 500 }).notNull(),
  apiKeyEncrypted: text('api_key_encrypted'),
  role: varchar('role', { length: 20 }).notNull().default('fallback'),
  priority: integer('priority').notNull().default(1),
  promptPreset: varchar('prompt_preset', { length: 20 }).notNull().default('strict'),
  customSystemPrompt: text('custom_system_prompt'),
  status: varchar('status', { length: 20 }).default('unreachable'),
  lastTestedAt: timestamp('last_tested_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: varchar('name', { length: 255 }),
  url: varchar('url', { length: 500 }).notNull(),
  events: jsonb('events').notNull(),
  secret: varchar('secret', { length: 255 }).notNull(),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references(() => users.id),
});

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  webhookId: uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  event: varchar('event', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  responseStatus: integer('response_status'),
  requestBody: jsonb('request_body'),
  responseBody: text('response_body'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: uuid('resource_id'),
  data: jsonb('data'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  userId: uuid('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const knowledgeSources = pgTable('knowledge_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  url: varchar('url', { length: 500 }),
  status: varchar('status', { length: 20 }).default('disconnected'),
  entryCount: integer('entry_count').default(0),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('knowledge_sources_global_type_idx').on(t.type).where(sql`${t.workspaceId} IS NULL`),
]);

export const knowledgeEntries = pgTable('knowledge_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').notNull().references(() => knowledgeSources.id),
  cweId: varchar('cwe_id', { length: 20 }),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content'),
  severity: varchar('severity', { length: 20 }),
  remediation: text('remediation'),
  tags: jsonb('tags'),
  muted: boolean('muted').default(false),
  usedByAiCount: integer('used_by_ai_count').default(0),
  references: jsonb('references'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  uniqueIndex('knowledge_entries_source_cwe_idx').on(t.sourceId, t.cweId),
]);

export const knowledgeBackfillJobs = pgTable('knowledge_backfill_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id'),
  sourceId: uuid('source_id').references(() => knowledgeSources.id),
  sourceType: varchar('source_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('queued'),
  rangeStart: timestamp('range_start').notNull(),
  rangeEnd: timestamp('range_end').notNull(),
  cursorStart: timestamp('cursor_start').notNull(),
  windowDays: integer('window_days').notNull().default(30),
  importedCount: integer('imported_count').notNull().default(0),
  lastError: text('last_error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('knowledge_backfill_source_status_idx').on(t.sourceId, t.status),
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
