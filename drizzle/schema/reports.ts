import { pgTable, uuid, varchar, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id'),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  filters: jsonb('filters'),
  file_path: varchar('file_path', { length: 500 }),
  file_size: integer('file_size'),
  format: varchar('format', { length: 20 }),
  created_at: timestamp('created_at').defaultNow(),
  created_by: uuid('created_by'),
  expires_at: timestamp('expires_at'),
});

export const storageFiles = pgTable('storage_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id'),
  file_name: varchar('file_name', { length: 255 }).notNull(),
  file_path: varchar('file_path', { length: 500 }).notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: varchar('mime_type', { length: 100 }),
  storage_provider: varchar('storage_provider', { length: 50 }).notNull().default('local'),
  storage_key: varchar('storage_key', { length: 500 }),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').defaultNow(),
  created_by: uuid('created_by'),
  expires_at: timestamp('expires_at'),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type StorageFile = typeof storageFiles.$inferSelect;
export type NewStorageFile = typeof storageFiles.$inferInsert;
