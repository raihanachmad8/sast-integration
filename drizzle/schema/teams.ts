import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references(() => users.id),
}, (t) => [
  index('teams_workspace_id_idx').on(t.workspaceId),
]);

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 20 }).notNull().$type<'admin' | 'contributor'>(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => [
  index('team_members_team_id_idx').on(t.teamId),
  index('team_members_user_id_idx').on(t.userId),
  uniqueIndex('team_members_team_user_idx').on(t.teamId, t.userId),
]);

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;