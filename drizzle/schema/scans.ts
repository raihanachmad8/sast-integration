import { pgTable, uuid, varchar, jsonb, timestamp, boolean, integer, text, uniqueIndex, index, foreignKey } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';
import { repositories } from './source-controls';
import { projectApiTokens } from './projects';
import { personalAccessTokens } from './auth';

export const scans = pgTable('scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  repositoryId: uuid('repository_id'),
  commitSha: varchar('commit_sha', { length: 40 }),
  branch: varchar('branch', { length: 100 }),
  origin: varchar('origin', { length: 30 }).notNull().default('managed'),
  triggerSource: varchar('trigger_source', { length: 30 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  progressEvents: jsonb('progress_events').$type<ProgressEvent[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  // PR metadata (SonarQube-like PR analysis)
  prNumber: integer('pr_number'),
  baseBranch: varchar('base_branch', { length: 100 }),
  headBranch: varchar('head_branch', { length: 100 }),
  prAuthor: varchar('pr_author', { length: 255 }),
}, (t) => [
  index('scans_repository_id_idx').on(t.repositoryId),
  index('scans_status_idx').on(t.status),
  index('scans_created_at_idx').on(t.createdAt),
  index('scans_created_by_idx').on(t.createdBy),
  index('scans_branch_idx').on(t.branch),
  index('scans_head_branch_idx').on(t.headBranch),
]);

/** A single progress event stored in the scan's progress_events JSONB array. */
export interface ProgressEvent {
  /** Unique event identifier. */
  id: string;
  /** Event type matching TimelineEventType. */
  type: 'triggered' | 'queued' | 'cloning' | 'scanning' | 'parsing' | 'ai_verifying' | 'completed' | 'failed' | 'skipped';
  /** Human-readable description of the event. */
  description: string;
  /** ISO timestamp of when the event occurred. */
  timestamp: string;
  /** Optional scanner name for scanner-specific events. */
  scanner?: string;
  /** Optional duration in seconds. */
  durationSeconds?: number;
}

export const scanResults = pgTable('scan_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  scanId: uuid('scan_id').notNull().references(() => scans.id),
  scanner: varchar('scanner', { length: 50 }).notNull(),
  format: varchar('format', { length: 20 }),
  fileKey: text('file_key'),
  fileSize: integer('file_size'),
  parsedSummary: jsonb('parsed_summary'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const qualityGates = pgTable('quality_gates', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  threshold: varchar('threshold', { length: 20 }).notNull().default('high'),
  failOnCritical: boolean('fail_on_critical').default(true),
  failOnHighTp: boolean('fail_on_high_tp').default(true),
  failOnHigh: boolean('fail_on_high').default(true),
  failOnMedium: boolean('fail_on_medium').default(false),
  failOnLow: boolean('fail_on_low').default(false),
  failOnPending: boolean('fail_on_pending').default(true),
  failOnTp: boolean('fail_on_tp').default(false),
  warnOnPending: boolean('warn_on_pending').default(true),
  requireHumanAck: boolean('require_human_ack').default(false),
  pendingBehavior: varchar('pending_behavior', { length: 20 }).default('warn'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('quality_gates_workspace_id_idx').on(t.workspaceId),
]);

export const qualityGateResults = pgTable('quality_gate_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  scanId: uuid('scan_id').references(() => scans.id).unique(),
  gateId: uuid('gate_id').references(() => qualityGates.id),
  status: varchar('status', { length: 20 }).notNull(),
  blockingFindings: integer('blocking_findings').default(0),
  pendingFindings: integer('pending_findings').default(0),
  newFindings: integer('new_findings').default(0), // PR context: findings new in this PR
  fixedFindings: integer('fixed_findings').default(0), // PR context: findings fixed in this PR
  persistentFindings: integer('persistent_findings').default(0), // PR context: pre-existing findings (exist on both head and base)
  evaluatedAt: timestamp('evaluated_at').defaultNow().notNull(),
});

export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  repositoryId: uuid('repository_id'),
  branch: varchar('branch', { length: 100 }),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  cronExpression: varchar('cron_expression', { length: 100 }).notNull(),
  active: boolean('active').default(true),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  deletedAt: timestamp('deleted_at'),
});

/**
 * Tracks every time results are uploaded from CI for a repository (external flow).
 * This is the bridge between external uploads and our internal Scan model.
 */
export const scanUploads = pgTable('scan_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  repositoryId: uuid('repository_id'),
  projectId: uuid('project_id'),
  scanId: uuid('scan_id').references(() => scans.id),
  branch: varchar('branch', { length: 100 }),
  commitSha: varchar('commit_sha', { length: 40 }),
  uploadedBy: uuid('uploaded_by'),
  source: varchar('source', { length: 30 }),
  metadata: jsonb('metadata'),
  projectApiTokenId: uuid('project_api_token_id').references(() => projectApiTokens.id, { onDelete: 'set null' }),
  personalAccessTokenId: uuid('personal_access_token_id'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  foreignKey({
    columns: [t.personalAccessTokenId],
    foreignColumns: [personalAccessTokens.id],
    name: 'su_pat_fk',
  }).onDelete('set null'),
]);

export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
export type ScanResult = typeof scanResults.$inferSelect;
export type NewScanResult = typeof scanResults.$inferInsert;
export type QualityGate = typeof qualityGates.$inferSelect;
export type NewQualityGate = typeof qualityGates.$inferInsert;
export type QualityGateResult = typeof qualityGateResults.$inferSelect;
export type NewQualityGateResult = typeof qualityGateResults.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
export type ScanUpload = typeof scanUploads.$inferSelect;
export type NewScanUpload = typeof scanUploads.$inferInsert;

/**
 * Tracks commit status checks posted to SCM providers (Gitea, GitHub).
 * Used for branch protection rules and PR status checks.
 */
export const commitStatuses = pgTable('commit_statuses', {
  id: uuid('id').primaryKey().defaultRandom(),
  scanId: uuid('scan_id').notNull().references(() => scans.id),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id),
  commitSha: varchar('commit_sha', { length: 40 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'pending', 'success', 'failure', 'error'
  context: varchar('context', { length: 100 }).notNull(), // e.g. 'sast-integration/gate'
  description: text('description'),
  targetUrl: text('target_url'),
  provider: varchar('provider', { length: 20 }).notNull(), // 'gitea', 'github'
  externalId: varchar('external_id', { length: 100 }), // ID from provider API
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type CommitStatus = typeof commitStatuses.$inferSelect;
export type NewCommitStatus = typeof commitStatuses.$inferInsert;
