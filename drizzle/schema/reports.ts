import { pgTable, uuid, varchar, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('generated'),
  filters: jsonb('filters'),
  filePath: varchar('file_path', { length: 500 }),
  fileSize: integer('file_size'),
  format: varchar('format', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  expiresAt: timestamp('expires_at'),
});

export const storageFiles = pgTable('storage_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  storageProvider: varchar('storage_provider', { length: 50 }).notNull().default('local'),
  storageKey: varchar('storage_key', { length: 500 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  expiresAt: timestamp('expires_at'),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type StorageFile = typeof storageFiles.$inferSelect;
export type NewStorageFile = typeof storageFiles.$inferInsert;
