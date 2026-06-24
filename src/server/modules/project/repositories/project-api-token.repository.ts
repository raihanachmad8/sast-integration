import { eq, and, isNull, or, gt } from 'drizzle-orm';
import { db, type Tx } from '@/server/db/client';
import { projectApiTokens, type ProjectApiToken, type NewProjectApiToken } from '@drizzle/schema/projects';
import crypto from 'crypto';
const TOKEN_PREFIX = 'sast_p_';
const TOKEN_RANDOM_BYTES = 32;

function generateRawToken(): string {
  const random = crypto.randomBytes(TOKEN_RANDOM_BYTES).toString('base64url');
  return `${TOKEN_PREFIX}${random}`;
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export const projectApiTokenRepository = {
  /**
   * Generate a new project API token.
   * Returns the created record + the raw token (ONLY shown once to caller).
   */
  async create(data: {
    projectId: string;
    createdBy: string;
    name: string;
    permissions?: string[];
    expiresAt?: Date | null;
  }, tx?: Tx): Promise<{ token: ProjectApiToken; rawToken: string }> {
    const executor = tx ?? db;

    const rawToken = generateRawToken();
    const tokenSha256Val = sha256(rawToken);
    const prefix = rawToken.slice(0, 12) + '...';

    const [created] = await executor
      .insert(projectApiTokens)
      .values({
        projectId: data.projectId,
        createdBy: data.createdBy,
        name: data.name.trim(),
        tokenSha256: tokenSha256Val,
        tokenPrefix: prefix,
        permissions: data.permissions ?? ['scans:upload'],
        expiresAt: data.expiresAt ?? undefined,
      } as NewProjectApiToken)
      .returning();

    return { token: created, rawToken };
  },

  /** Find active token by exact SHA-256 hash (fast O(1) lookup) */
  async findActiveBySha256(rawToken: string): Promise<ProjectApiToken | null> {
    const tokenSha256Val = sha256(rawToken);
    const now = new Date();
    const [token] = await db
      .select()
      .from(projectApiTokens)
      .where(
        and(
          eq(projectApiTokens.tokenSha256, tokenSha256Val),
          isNull(projectApiTokens.revokedAt),
          or(isNull(projectApiTokens.expiresAt), gt(projectApiTokens.expiresAt, now))
        )
      )
      .limit(1);
    return token ?? null;
  },

  /** Find valid token for a project using SHA-256 fast lookup */
  async findValidForProject(projectId: string, rawToken: string): Promise<ProjectApiToken | null> {
    const tokenSha256Val = sha256(rawToken);
    const [token] = await db
      .select()
      .from(projectApiTokens)
      .where(
        and(
          eq(projectApiTokens.projectId, projectId),
          eq(projectApiTokens.tokenSha256, tokenSha256Val),
          isNull(projectApiTokens.revokedAt),
          or(isNull(projectApiTokens.expiresAt), gt(projectApiTokens.expiresAt, new Date()))
        )
      )
      .limit(1);
    return token ?? null;
  },

  /** List active (non-revoked) tokens for a project */
  async listByProject(projectId: string) {
    return db
      .select()
      .from(projectApiTokens)
      .where(and(eq(projectApiTokens.projectId, projectId), isNull(projectApiTokens.revokedAt)))
      .orderBy(projectApiTokens.createdAt);
  },

  /** Revoke a token (soft) */
  async revoke(tokenId: string, revokedBy: string) {
    const [updated] = await db
      .update(projectApiTokens)
      .set({
        revokedAt: new Date(),
        revokedBy,
      })
      .where(eq(projectApiTokens.id, tokenId))
      .returning();
    return updated ?? null;
  },

  /** Touch lastUsedAt (fire and forget, best effort) */
  async touchLastUsed(tokenId: string) {
    await db
      .update(projectApiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(projectApiTokens.id, tokenId));
  },

  /** Find by ID (for ownership checks before revoke etc.) */
  async findById(id: string) {
    const [token] = await db
      .select()
      .from(projectApiTokens)
      .where(eq(projectApiTokens.id, id))
      .limit(1);
    return token ?? null;
  },

  /**
   * Fast lookup for any valid project token using SHA-256 (used by generic authenticate()).
   * O(1) database lookup instead of O(n) sequential bcrypt comparisons.
   */
  async findAnyValidProjectToken(rawToken: string): Promise<ProjectApiToken | null> {
    if (!rawToken.startsWith('sast_p_')) return null;

    const tokenSha256Val = sha256(rawToken);
    const now = new Date();
    const [token] = await db
      .select()
      .from(projectApiTokens)
      .where(
        and(
          eq(projectApiTokens.tokenSha256, tokenSha256Val),
          isNull(projectApiTokens.revokedAt),
          or(isNull(projectApiTokens.expiresAt), gt(projectApiTokens.expiresAt, now))
        )
      )
      .limit(1);
    return token ?? null;
  },
};
