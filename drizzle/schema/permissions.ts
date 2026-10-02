import { pgTable, uuid, varchar, text, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  resource: varchar('resource', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  description: text('description'),
});

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: varchar('role', { length: 20 }).notNull(),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id),
});

export const userPermissions = pgTable('user_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id),
  granted: boolean('granted').default(true).notNull(),
});

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
export type UserPermission = typeof userPermissions.$inferSelect;
export type NewUserPermission = typeof userPermissions.$inferInsert;