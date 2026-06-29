import { eq, and, inArray, isNull, sql, count } from 'drizzle-orm';

import { db, type Tx } from '@/server/db/client';
import { findings, findingGroups, findingHistory, findingGroupScans } from '@drizzle/schema/findings';

export const findingGroupRepository = {
  async findGroupById(id: string, tx?: Tx) {
    const executor = tx ?? db;
    const [group] = await executor.select().from(findingGroups).where(eq(findingGroups.id, id)).limit(1);
    return group ?? null;
  },

  async updateGroupStatus(groupId: string, status: string, userId: string | null, tx?: Tx) {
    const executor = tx ?? db;

    const [oldGroup] = await executor.select({ status: findingGroups.status })
      .from(findingGroups).where(eq(findingGroups.id, groupId)).limit(1);

    const [group] = await executor.update(findingGroups)
      .set({ status })
      .where(eq(findingGroups.id, groupId))
      .returning();

    if (group && oldGroup) {
      const [firstFinding] = await executor.select({ id: findings.id })
        .from(findings).where(eq(findings.groupId, groupId)).limit(1);

      if (firstFinding) {
        await executor.insert(findingHistory).values({
          findingId: firstFinding.id,
          field: 'group_status',
          oldValue: oldGroup.status,
          newValue: status,
          createdBy: userId,
        });
      }
    }

    return group;
  },

  async updateGroupsStatusBulk(groupIds: string[], status: string, tx?: Tx) {
    if (groupIds.length === 0) return;
    const executor = tx ?? db;
    await executor
      .update(findingGroups)
      .set({ status })
      .where(inArray(findingGroups.id, groupIds));
  },

  async findOrCreateFindingGroup(
    projectId: string,
    fingerprint: string,
    title: string,
    tx?: Tx,
  ) {
    const executor = tx ?? db;

    const [group] = await executor
      .insert(findingGroups)
      .values({ projectId, fingerprint, title })
      .onConflictDoNothing()
      .returning();

    if (group) return group;

    const [existing] = await executor
      .select()
      .from(findingGroups)
      .where(eq(findingGroups.fingerprint, fingerprint))
      .limit(1);

    if (existing) {
      await executor
        .update(findingGroups)
        .set({ lastSeenAt: new Date() })
        .where(eq(findingGroups.id, existing.id));
    }

    return existing!;
  },

  async findOrCreateFindingGroups(
    projectId: string | null,
    repositoryId: string | null,
    entries: { fingerprint: string; title: string }[],
    scanId?: string,
    tx?: Tx,
  ): Promise<Map<string, { id: string; fingerprint: string; status: string; isNew: boolean }>> {
    if (entries.length === 0) return new Map();
    const executor = tx ?? db;

    const inserted = await executor
      .insert(findingGroups)
      .values(entries.map((e) => ({
        projectId: projectId ?? null,
        repositoryId: repositoryId ?? null,
        fingerprint: e.fingerprint,
        title: e.title,
      })))
      .onConflictDoNothing()
      .returning({ fingerprint: findingGroups.fingerprint });

    const newFingerprints = new Set(inserted.map((r) => r.fingerprint));

    const fingerprints = entries.map((e) => e.fingerprint);
    const repoCondition = repositoryId
      ? eq(findingGroups.repositoryId, repositoryId)
      : isNull(findingGroups.repositoryId);
    const groups = await executor
      .select({ id: findingGroups.id, fingerprint: findingGroups.fingerprint, status: findingGroups.status })
      .from(findingGroups)
      .where(and(repoCondition, inArray(findingGroups.fingerprint, fingerprints)));

    const groupsToReopen = groups
      .filter((g) => g.status === 'resolved')
      .map((g) => g.id);
    if (groupsToReopen.length > 0) {
      await executor
        .update(findingGroups)
        .set({ status: 'open', lastSeenAt: new Date() })
        .where(inArray(findingGroups.id, groupsToReopen));
    }

    if (groups.length > 0) {
      await executor
        .update(findingGroups)
        .set({ lastSeenAt: new Date() })
        .where(and(repoCondition, inArray(findingGroups.fingerprint, fingerprints)));
    }

    const updatedGroups = groups.map((g) => ({
      ...g,
      status: groupsToReopen.includes(g.id) ? 'open' : g.status,
      isNew: newFingerprints.has(g.fingerprint),
    }));

    if (scanId && updatedGroups.length > 0) {
      await executor
        .insert(findingGroupScans)
        .values(updatedGroups.map((g) => ({
          scanId,
          groupId: g.id,
          isNew: g.isNew,
        })))
        .onConflictDoNothing();
    }

    return new Map(updatedGroups.map((g) => [g.fingerprint, g]));
  },

  async listOpenGroupsByRepository(repositoryId: string, scanner?: string, tx?: Tx) {
    const executor = tx ?? db;
    const conditions = [
      eq(findingGroups.repositoryId, repositoryId),
      eq(findingGroups.status, 'open'),
    ];

    if (scanner) {
      conditions.push(eq(findings.scanner, scanner));
    }

    return executor
      .select({
        id: findingGroups.id,
        fingerprint: findingGroups.fingerprint,
        status: findingGroups.status,
        scanId: sql`MAX(${findings.scanId})`.as('scanId'),
      })
      .from(findingGroups)
      .innerJoin(findings, eq(findings.groupId, findingGroups.id))
      .where(and(...conditions))
      .groupBy(findingGroups.id, findingGroups.fingerprint, findingGroups.status);
  },

  async countGroupsByStatusForScan(
    scanId: string,
    tx?: Tx,
  ): Promise<{ open: number; dismissed: number; resolved: number }> {
    const executor = tx ?? db;

    const rows = await executor
      .select({
        status: findingGroups.status,
        total: count(sql`DISTINCT ${findingGroups.id}`),
      })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(eq(findings.scanId, scanId))
      .groupBy(findingGroups.status);

    const result = { open: 0, dismissed: 0, resolved: 0 };
    for (const row of rows) {
      const s = row.status as keyof typeof result;
      if (s in result) result[s] = Number(row.total) || 0;
    }
    return result;
  },

  async countGroupsByBranch(
    repositoryId: string,
    branch: string,
    tx?: Tx,
  ): Promise<number> {
    const executor = tx ?? db;

    const branchMatch = sql`(${eq(findings.scanId, sql`(SELECT id FROM scans WHERE repository_id = ${repositoryId} AND (branch = ${branch} OR head_branch = ${branch}) AND status = 'completed' ORDER BY created_at DESC LIMIT 1)`)})`;

    const [{ total }] = await executor
      .select({ total: count(sql`DISTINCT ${findingGroups.id}`) })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(
        branchMatch,
        sql`${findingGroups.status} != 'resolved'`,
      ));

    return Number(total) || 0;
  },
};
