import { pgTable, uuid, varchar, text, timestamp, integer, numeric, jsonb, uniqueIndex, primaryKey, boolean, index } from 'drizzle-orm/pg-core';
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
  status: varchar('status', { length: 20 }).notNull().default('open'),
  firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('finding_groups_repo_fingerprint_idx').on(t.repositoryId, t.fingerprint),
]);

export const findings = pgTable('findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  scanId: uuid('scan_id').notNull().references(() => scans.id),
  groupId: uuid('group_id').references(() => findingGroups.id),
  cweId: varchar('cwe_id', { length: 255 }),
  severity: varchar('severity', { length: 20 }).notNull(),
  filePath: varchar('file_path', { length: 500 }),
  lineNumber: integer('line_number'),
  codeSnippet: text('code_snippet'),
  description: text('description'),
  rule: varchar('rule', { length: 500 }),
  scanner: varchar('scanner', { length: 50 }),
  message: text('message'),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('findings_scan_id_idx').on(t.scanId),
  index('findings_group_id_idx').on(t.groupId),
  index('findings_severity_idx').on(t.severity),
  index('findings_status_idx').on(t.status),
  index('findings_assigned_to_idx').on(t.assignedTo),
]);

export const aiVerifications = pgTable('ai_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  findingId: uuid('finding_id').references(() => findings.id),
  groupId: uuid('group_id').references(() => findingGroups.id),
  modelId: uuid('model_id').references(() => models.id, { onDelete: 'cascade' }),
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

/**
 * Junction table tracking which finding groups appeared in each scan.
 * `isNew = true` means the group was first created in this scan
 * (ON CONFLICT DO NOTHING did NOT match → genuinely new).
 * `isNew = false` means the group already existed before this scan.
 */
export const findingGroupScans = pgTable('finding_group_scans', {
  scanId: uuid('scan_id').notNull().references(() => scans.id),
  groupId: uuid('group_id').notNull().references(() => findingGroups.id),
  isNew: boolean('is_new').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  primaryKey({ columns: [t.scanId, t.groupId] }),
]);

export type FindingGroupScan = typeof findingGroupScans.$inferSelect;
export type NewFindingGroupScan = typeof findingGroupScans.$inferInsert;
export type NewFindingGroup = typeof findingGroups.$inferInsert;
export type Finding = typeof findings.$inferSelect;
export type NewFinding = typeof findings.$inferInsert;
export type AiVerification = typeof aiVerifications.$inferSelect;
export type NewAiVerification = typeof aiVerifications.$inferInsert;
export type FindingHistory = typeof findingHistory.$inferSelect;
export type NewFindingHistory = typeof findingHistory.$inferInsert;
