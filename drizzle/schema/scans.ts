import { pgTable, uuid, varchar, jsonb, timestamp, boolean, integer, text } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';
import { projectApiTokens } from './projects';
import { personalAccessTokens } from './auth';

export const scanProfiles = pgTable('scan_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: varchar('name', { length: 255 }).notNull(),
  profile: varchar('profile', { length: 20 }).notNull().default('standard'),
  scanners: jsonb('scanners').notNull(),
  ai_verification: varchar('ai_verification', { length: 20 }).notNull().default('enabled'),
  severity_threshold: varchar('severity_threshold', { length: 20 }).notNull().default('medium'),
  timeout_seconds: integer('timeout_seconds').default(300),
  max_findings: integer('max_findings').default(2000),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const scans = pgTable('scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  repository_id: uuid('repository_id'),
  profile_id: uuid('profile_id').references(() => scanProfiles.id),
  environment_id: uuid('environment_id'),
  commit_sha: varchar('commit_sha', { length: 40 }),
  branch: varchar('branch', { length: 100 }),
  origin: varchar('origin', { length: 30 }).notNull().default('managed'),
  trigger_source: varchar('trigger_source', { length: 30 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  started_at: timestamp('started_at'),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  created_by: uuid('created_by').references(() => users.id),
});

export const scanResults = pgTable('scan_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  scan_id: uuid('scan_id').notNull().references(() => scans.id),
  scanner: varchar('scanner', { length: 50 }).notNull(),
  format: varchar('format', { length: 20 }),
  file_key: text('file_key'),
  file_size: integer('file_size'),
  parsed_summary: jsonb('parsed_summary'),
  created_at: timestamp('created_at').defaultNow(),
});

export const qualityGates = pgTable('quality_gates', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  threshold: varchar('threshold', { length: 20 }).notNull().default('high'),
  fail_on_critical: boolean('fail_on_critical').default(true),
  fail_on_high_tp: boolean('fail_on_high_tp').default(true),
  warn_on_pending: boolean('warn_on_pending').default(true),
  require_human_ack: boolean('require_human_ack').default(false),
  pending_behavior: varchar('pending_behavior', { length: 20 }).default('warn'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const qualityGateResults = pgTable('quality_gate_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  scan_id: uuid('scan_id').references(() => scans.id),
  gate_id: uuid('gate_id').references(() => qualityGates.id),
  status: varchar('status', { length: 20 }).notNull(),
  blocking_findings: integer('blocking_findings').default(0),
  pending_findings: integer('pending_findings').default(0),
  evaluated_at: timestamp('evaluated_at').defaultNow().notNull(),
});

export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  repository_id: uuid('repository_id'),
  profile_id: uuid('profile_id').references(() => scanProfiles.id),
  branch: varchar('branch', { length: 100 }),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  cron_expression: varchar('cron_expression', { length: 100 }).notNull(),
  active: boolean('active').default(true),
  last_run_at: timestamp('last_run_at'),
  next_run_at: timestamp('next_run_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  created_by: uuid('created_by').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
});

/**
 * Tracks every time results are uploaded from CI for a repository (external flow).
 * This is the bridge between external uploads and our internal Scan model.
 */
export const scanUploads = pgTable('scan_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  repository_id: uuid('repository_id'),
  project_id: uuid('project_id'),
  scan_id: uuid('scan_id').references(() => scans.id),
  branch: varchar('branch', { length: 100 }),
  commit_sha: varchar('commit_sha', { length: 40 }),
  uploaded_by: uuid('uploaded_by'),
  source: varchar('source', { length: 30 }),
  metadata: jsonb('metadata'),
  projectApiTokenId: uuid('project_api_token_id').references(() => projectApiTokens.id, { onDelete: 'set null' }),
  personalAccessTokenId: uuid('personal_access_token_id').references(() => personalAccessTokens.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow(),
});

export type ScanProfile = typeof scanProfiles.$inferSelect;
export type NewScanProfile = typeof scanProfiles.$inferInsert;
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
