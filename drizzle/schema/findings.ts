import { pgTable, uuid, varchar, text, timestamp, integer, numeric, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';
import { projects } from './projects';
import { scans } from './scans';
import { environments } from './projects';
import { models } from './integrations';

export const findingGroups = pgTable('finding_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id),
  fingerprint: varchar('fingerprint', { length: 64 }).notNull().unique(),
  title: varchar('title', { length: 500 }),
  first_seen_at: timestamp('first_seen_at').defaultNow().notNull(),
  last_seen_at: timestamp('last_seen_at').defaultNow().notNull(),
});

export const findings = pgTable('findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  scan_id: uuid('scan_id').notNull().references(() => scans.id),
  group_id: uuid('group_id').references(() => findingGroups.id),
  environment_id: uuid('environment_id').references(() => environments.id),
  cwe_id: varchar('cwe_id', { length: 20 }),
  severity: varchar('severity', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  file_path: varchar('file_path', { length: 500 }),
  line_number: integer('line_number'),
  code_snippet: text('code_snippet'),
  description: text('description'),
  rule: varchar('rule', { length: 500 }),
  scanner: varchar('scanner', { length: 50 }),
  message: text('message'),
  assigned_to: uuid('assigned_to').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const aiVerifications = pgTable('ai_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  finding_id: uuid('finding_id').references(() => findings.id),
  model_id: uuid('model_id').references(() => models.id),
  verdict: varchar('verdict', { length: 20 }).notNull(),
  confidence: numeric('confidence', { precision: 3, scale: 2 }),
  explanation: text('explanation'),
  data_flow: text('data_flow'),
  taint_source: text('taint_source'),
  match_detail: text('match_detail'),
  likely_cwe: jsonb('likely_cwe'),
  fix_suggestion: text('fix_suggestion'),
  latency_ms: integer('latency_ms'),
  raw_response: text('raw_response'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  finding_id: uuid('finding_id').notNull().references(() => findings.id),
  parent_id: uuid('parent_id'),
  content: text('content').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  created_by: uuid('created_by').references(() => users.id),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  updated_by: uuid('updated_by').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  deleted_by: uuid('deleted_by').references(() => users.id),
});

export const findingHistory = pgTable('finding_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  finding_id: uuid('finding_id').notNull().references(() => findings.id),
  field: varchar('field', { length: 50 }).notNull(),
  old_value: text('old_value'),
  new_value: text('new_value'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  created_by: uuid('created_by').references(() => users.id),
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
