import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { scanProfiles } from '@drizzle/schema/scans';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateScanProfileInput {
  workspace_id: string;
  name: string;
  profile: string;
  scanners: unknown;
  ai_verification: string;
  severity_threshold: string;
  timeout_seconds: number;
  max_findings: number;
}

export interface UpdateScanProfileInput {
  name?: string;
  profile?: string;
  scanners?: unknown;
  ai_verification?: string;
  severity_threshold?: string;
  timeout_seconds?: number;
  max_findings?: number;
}

export const scanProfilesRepository = {
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(scanProfiles)
      .where(eq(scanProfiles.workspace_id, workspaceId));
  },

  async getById(id: string, workspaceId: string) {
    const [profile] = await db
      .select()
      .from(scanProfiles)
      .where(eq(scanProfiles.id, id))
      .limit(1);

    if (profile && profile.workspace_id !== workspaceId) {
      return null;
    }

    return profile ?? null;
  },

  async create(data: CreateScanProfileInput, tx?: Tx) {
    const executor = tx ?? db;

    const [profile] = await executor
      .insert(scanProfiles)
      .values({
        workspace_id: data.workspace_id,
        name: data.name,
        profile: data.profile,
        scanners: data.scanners,
        ai_verification: data.ai_verification,
        severity_threshold: data.severity_threshold,
        timeout_seconds: data.timeout_seconds,
        max_findings: data.max_findings,
      })
      .returning();

    return profile;
  },

  async update(id: string, data: UpdateScanProfileInput, tx?: Tx) {
    const executor = tx ?? db;

    const [updated] = await executor
      .update(scanProfiles)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.profile !== undefined && { profile: data.profile }),
        ...(data.scanners !== undefined && { scanners: data.scanners }),
        ...(data.ai_verification !== undefined && { ai_verification: data.ai_verification }),
        ...(data.severity_threshold !== undefined && { severity_threshold: data.severity_threshold }),
        ...(data.timeout_seconds !== undefined && { timeout_seconds: data.timeout_seconds }),
        ...(data.max_findings !== undefined && { max_findings: data.max_findings }),
        updated_at: new Date(),
      })
      .where(eq(scanProfiles.id, id))
      .returning();

    return updated ?? null;
  },

  async delete(id: string, tx?: Tx) {
    const executor = tx ?? db;

    await executor
      .delete(scanProfiles)
      .where(eq(scanProfiles.id, id));
  },
};
