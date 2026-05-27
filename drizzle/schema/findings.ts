import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const findingGroups = pgTable('finding_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id'),
  fingerprint: varchar('fingerprint', { length: 64 }).notNull().unique(),
  title: varchar('title', { length: 500 }),
  first_seen_at: timestamp('first_seen_at').defaultNow(),
  last_seen_at: timestamp('last_seen_at').defaultNow(),
});

export const findings = pgTable('findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  scan_id: uuid('scan_id'),
  group_id: uuid('group_id').references(() => findingGroups.id),
  environment_id: uuid('environment_id'),
  cwe_id: varchar('cwe_id', { length: 20 }),
  severity: varchar('severity', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  file_path: varchar('file_path', { length: 500 }),
  line_number: integer('line_number'),
  code_snippet: text('code_snippet'),
  description: text('description'),
  assigned_to: uuid('assigned_to'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const aiVerifications = pgTable('ai_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  finding_id: uuid('finding_id').references(() => findings.id),
  is_valid: boolean('is_valid'),
  confidence: integer('confidence'),
  reasoning: text('reasoning'),
  model_version: varchar('model_version', { length: 50 }),
  created_at: timestamp('created_at').defaultNow(),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  finding_id: uuid('finding_id').references(() => findings.id),
  parent_id: uuid('parent_id'),
  content: text('content').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  created_by: uuid('created_by'),
  updated_at: timestamp('updated_at').defaultNow(),
  updated_by: uuid('updated_by'),
  deleted_at: timestamp('deleted_at'),
  deleted_by: uuid('deleted_by'),
});

export const findingHistory = pgTable('finding_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  finding_id: uuid('finding_id').references(() => findings.id),
  field: varchar('field', { length: 50 }).notNull(),
  old_value: text('old_value'),
  new_value: text('new_value'),
  created_at: timestamp('created_at').defaultNow(),
  created_by: uuid('created_by'),
});

export type FindingGroup = typeof findingGroups.$inferSelect;
export type NewFindingGroup = typeof findingGroups.$inferInsert;
export type Finding = typeof findings.$inferSelect;
export type NewFinding = typeof findings.$inferInsert;
export type AiVerification = typeof aiVerifications.$inferSelect;
export type NewAiVerification = typeof aiVerifications.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type FindingHistory = typeof findingHistory.$inferSelect;
export type NewFindingHistory = typeof findingHistory.$inferInsert;
