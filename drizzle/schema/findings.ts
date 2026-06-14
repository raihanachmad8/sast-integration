import { pgTable, uuid, varchar, text, timestamp, integer, numeric, jsonb, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';
import { projects } from './projects';
import { scans } from './scans';
import { models } from './integrations';
import { repositories } from './source-controls';

export const findingGroups = pgTable('finding_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id),
  repositoryId: uuid('repository_id').references(() => repositories.id),
  fingerprint: varchar('fingerprint', { length: 64 }).notNull(),
  title: varchar('title', { length: 500 }),
  firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('finding_groups_repo_fingerprint_idx').on(t.repositoryId, t.fingerprint),
]);

export const findings = pgTable('findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  scanId: uuid('scan_id').notNull().references(() => scans.id),
  groupId: uuid('group_id').references(() => findingGroups.id),
  cweId: varchar('cwe_id', { length: 20 }),
  severity: varchar('severity', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  active: boolean('active').notNull().default(true),
  filePath: varchar('file_path', { length: 500 }),
  lineNumber: integer('line_number'),
  codeSnippet: text('code_snippet'),
  description: text('description'),
  rule: varchar('rule', { length: 500 }),
  scanner: varchar('scanner', { length: 50 }),
  message: text('message'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiVerifications = pgTable('ai_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  findingId: uuid('finding_id').references(() => findings.id),
  modelId: uuid('model_id').references(() => models.id),
  verdict: varchar('verdict', { length: 20 }).notNull(),
  confidence: numeric('confidence', { precision: 3, scale: 2 }),
  explanation: text('explanation'),
  dataFlow: text('data_flow'),
  taintSource: text('taint_source'),
  matchDetail: text('match_detail'),
  likelyCwe: jsonb('likely_cwe'),
  fixSuggestion: text('fix_suggestion'),
  latencyMs: integer('latency_ms'),
  rawResponse: text('raw_response'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const findingHistory = pgTable('finding_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  findingId: uuid('finding_id').notNull().references(() => findings.id),
  field: varchar('field', { length: 50 }).notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
});

export type FindingGroup = typeof findingGroups.$inferSelect;
export type NewFindingGroup = typeof findingGroups.$inferInsert;
export type Finding = typeof findings.$inferSelect;
export type NewFinding = typeof findings.$inferInsert;
export type AiVerification = typeof aiVerifications.$inferSelect;
export type NewAiVerification = typeof aiVerifications.$inferInsert;
export type FindingHistory = typeof findingHistory.$inferSelect;
export type NewFindingHistory = typeof findingHistory.$inferInsert;

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  findingId: uuid('finding_id').notNull().references(() => findings.id),
  parentId: uuid('parent_id'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references(() => users.id),
});

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
