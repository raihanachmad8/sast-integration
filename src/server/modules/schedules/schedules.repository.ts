import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { schedules } from '@drizzle/schema/scans';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateScheduleInput {
  workspaceId: string;
  repositoryId?: string;
  branch?: string;
  timezone?: string;
  cronExpression: string;
  active?: boolean;
  createdBy: string;
}

export interface UpdateScheduleInput {
  repositoryId?: string;
  branch?: string;
  timezone?: string;
  cronExpression?: string;
  active?: boolean;
}

export const schedulesRepository = {
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(schedules)
      .where(and(eq(schedules.workspaceId, workspaceId), isNull(schedules.deletedAt)));
  },

  async getById(id: string, workspaceId: string) {
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.id, id), eq(schedules.workspaceId, workspaceId), isNull(schedules.deletedAt)))
      .limit(1);
    return schedule ?? null;
  },

  async create(data: CreateScheduleInput, tx?: Tx) {
    const executor = tx ?? db;
    const [schedule] = await executor
      .insert(schedules)
      .values({
        workspaceId: data.workspaceId,
        repositoryId: data.repositoryId,
        branch: data.branch,
        timezone: data.timezone ?? 'UTC',
        cronExpression: data.cronExpression,
        active: data.active ?? true,
        createdBy: data.createdBy,
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
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, id))
      .returning();
    return schedule ?? null;
  },

  async delete(id: string, tx?: Tx) {
    const executor = tx ?? db;
    await executor
      .update(schedules)
      .set({ deletedAt: new Date() })
      .where(eq(schedules.id, id));
  },

  async toggle(id: string, active: boolean, tx?: Tx) {
    const executor = tx ?? db;
    const [schedule] = await executor
      .update(schedules)
      .set({ active, updatedAt: new Date() })
      .where(eq(schedules.id, id))
      .returning();
    return schedule ?? null;
  },
};
