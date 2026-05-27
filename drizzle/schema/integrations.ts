import { pgTable, uuid, varchar, jsonb, timestamp, boolean, text } from 'drizzle-orm/pg-core';

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id'),
  url: varchar('url', { length: 500 }).notNull(),
  events: jsonb('events').notNull(),
  secret: varchar('secret', { length: 255 }).notNull(),
  active: boolean('active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  created_by: uuid('created_by'),
  updated_at: timestamp('updated_at').defaultNow(),
  updated_by: uuid('updated_by'),
  deleted_at: timestamp('deleted_at'),
  deleted_by: uuid('deleted_by'),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id'),
  user_id: uuid('user_id'),
  action: varchar('action', { length: 100 }).notNull(),
  resource_type: varchar('resource_type', { length: 50 }),
  resource_id: uuid('resource_id'),
  data: jsonb('data'),
  ip_address: varchar('ip_address', { length: 45 }),
  created_at: timestamp('created_at').defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id'),
  user_id: uuid('user_id'),
  type: varchar('type', { length: 50 }).notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').defaultNow(),
});

export const knowledgeEntries = pgTable('knowledge_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  cwe_id: varchar('cwe_id', { length: 20 }),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content'),
  severity: varchar('severity', { length: 20 }),
  remediation: text('remediation'),
  references: jsonb('references'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect;
export type NewKnowledgeEntry = typeof knowledgeEntries.$inferInsert;
