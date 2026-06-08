import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { schedules } from '@drizzle/schema/scans';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateScheduleInput {
  workspace_id: string;
  repository_id?: string;
  profile_id?: string;
  branch?: string;
  timezone?: string;
  cron_expression: string;
  active?: boolean;
  created_by: string;
}

export interface UpdateScheduleInput {
  repository_id?: string;
  profile_id?: string;
  branch?: string;
  timezone?: string;
  cron_expression?: string;
  active?: boolean;
}

export const schedulesRepository = {
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(schedules)
      .where(and(eq(schedules.workspace_id, workspaceId), isNull(schedules.deleted_at)));
  },

  async getById(id: string, workspaceId: string) {
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.id, id), eq(schedules.workspace_id, workspaceId), isNull(schedules.deleted_at)))
      .limit(1);
    return schedule ?? null;
  },

  async create(data: CreateScheduleInput, tx?: Tx) {
    const executor = tx ?? db;
    const [schedule] = await executor
      .insert(schedules)
      .values({
        workspace_id: data.workspace_id,
        repository_id: data.repository_id,
        profile_id: data.profile_id,
        branch: data.branch,
        timezone: data.timezone ?? 'UTC',
        cron_expression: data.cron_expression,
        active: data.active ?? true,
        created_by: data.created_by,
      })
      .returning();
    return schedule;
  },

  async update(id: string, data: UpdateScheduleInput, tx?: Tx) {
    const executor = tx ?? db;
    const [schedule] = await executor
      .update(schedules)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(schedules.id, id))
      .returning();
    return schedule ?? null;
  },

  async delete(id: string, tx?: Tx) {
    const executor = tx ?? db;
    await executor
      .update(schedules)
      .set({ deleted_at: new Date() })
      .where(eq(schedules.id, id));
  },

  async toggle(id: string, active: boolean, tx?: Tx) {
    const executor = tx ?? db;
    const [schedule] = await executor
      .update(schedules)
      .set({ active, updated_at: new Date() })
      .where(eq(schedules.id, id))
      .returning();
    return schedule ?? null;
  },
};
