import { pgTable, uuid, varchar, text, timestamp, boolean, unique } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id'),
  name: varchar('name', { length: 255 }),
  slug: varchar('slug', { length: 255 }),
  platform: varchar('platform', { length: 50 }),
  language: varchar('language', { length: 50 }),
  avatar_url: text('avatar_url'),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow(),
  created_by: uuid('created_by'),
  updated_at: timestamp('updated_at').defaultNow(),
  updated_by: uuid('updated_by'),
  deleted_at: timestamp('deleted_at'),
  deleted_by: uuid('deleted_by'),
}, (t) => [unique().on(t.workspace_id, t.slug)]);

export const projectMembers = pgTable('project_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id),
  user_id: uuid('user_id'),
  role: varchar('role', { length: 20 }).notNull(),
  joined_at: timestamp('joined_at').defaultNow(),
});

export const projectTeams = pgTable('project_teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id),
  team_id: uuid('team_id'),
  role: varchar('role', { length: 20 }).notNull(),
  added_at: timestamp('added_at').defaultNow(),
});

export const environments = pgTable('environments', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  is_default: boolean('is_default').default(false),
  created_at: timestamp('created_at').defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;
export type ProjectTeam = typeof projectTeams.$inferSelect;
export type NewProjectTeam = typeof projectTeams.$inferInsert;
export type Environment = typeof environments.$inferSelect;
export type NewEnvironment = typeof environments.$inferInsert;
