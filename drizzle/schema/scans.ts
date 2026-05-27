import { pgTable, uuid, varchar, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';

export const scans = pgTable('scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  repository_id: uuid('repository_id'),
  environment_id: uuid('environment_id'),
  commit_sha: varchar('commit_sha', { length: 40 }),
  branch: varchar('branch', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  started_at: timestamp('started_at'),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow(),
  created_by: uuid('created_by'),
});

export const scanResults = pgTable('scan_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  scan_id: uuid('scan_id').references(() => scans.id),
  scanner: varchar('scanner', { length: 50 }).notNull(),
  raw_output: jsonb('raw_output'),
  summary: jsonb('summary'),
  created_at: timestamp('created_at').defaultNow(),
});

export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  repository_id: uuid('repository_id'),
  cron_expression: varchar('cron_expression', { length: 100 }).notNull(),
  active: boolean('active').default(true),
  last_run_at: timestamp('last_run_at'),
  next_run_at: timestamp('next_run_at'),
  created_at: timestamp('created_at').defaultNow(),
  created_by: uuid('created_by'),
});

export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
export type ScanResult = typeof scanResults.$inferSelect;
export type NewScanResult = typeof scanResults.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
