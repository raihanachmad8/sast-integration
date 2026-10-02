import { eq, and, isNull, or, gt } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { projectApiTokens, type ProjectApiToken, type NewProjectApiToken } from '@drizzle/schema/projects';
import { hash, compare } from 'bcryptjs';
import crypto from 'crypto';

const TOKEN_PREFIX = 'sast_p_';
const TOKEN_RANDOM_BYTES = 32;
const BCRYPT_ROUNDS = 10; // lower than passwords because these tokens are high-entropy already

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function generateRawToken(): string {
  const random = crypto.randomBytes(TOKEN_RANDOM_BYTES).toString('base64url');
  return `${TOKEN_PREFIX}${random}`;
}

function getTokenHash(rawToken: string): Promise<string> {
  return hash(rawToken, BCRYPT_ROUNDS);
}

async function verifyTokenHash(rawToken: string, hash: string): Promise<boolean> {
  try {
    return await compare(rawToken, hash);
  } catch {
    return false;
  }
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
    const tokenHash = await getTokenHash(rawToken);
    const prefix = rawToken.slice(0, 12) + '...'; // e.g. sast_p_xxxx...

    const [created] = await executor
      .insert(projectApiTokens)
      .values({
        projectId: data.projectId,
        createdBy: data.createdBy,
        name: data.name.trim(),
        tokenHash,
        tokenPrefix: prefix,
        permissions: data.permissions ?? ['scans:upload'],
        expiresAt: data.expiresAt ?? undefined,
      } as NewProjectApiToken)
      .returning();

    return { token: created, rawToken };
  },

  /** Find active token by exact hash (used only if you already computed the hash client-side) */
  async findActiveByHash(tokenHash: string) {
    const now = new Date();
    const [token] = await db
      .select()
      .from(projectApiTokens)
      .where(
        and(
          eq(projectApiTokens.tokenHash, tokenHash),
          isNull(projectApiTokens.revokedAt),
          or(isNull(projectApiTokens.expiresAt), gt(projectApiTokens.expiresAt, now))
        )
      )
      .limit(1);
    return token ?? null;
  },

  /** Correct active lookup (used by auth) */
  async findValidForProject(projectId: string, rawToken: string): Promise<ProjectApiToken | null> {
    // We cannot query by hash directly without knowing it, so we do a scoped scan (small table per project)
    // In production with millions of tokens we'd use a different lookup strategy (prefix index + hash compare in app).
    // For SAST scale this is perfectly acceptable.
    const candidates = await db
      .select()
      .from(projectApiTokens)
      .where(
        and(
          eq(projectApiTokens.projectId, projectId),
          isNull(projectApiTokens.revokedAt)
        )
      );

    for (const candidate of candidates) {
      const isExpired = candidate.expiresAt && candidate.expiresAt < new Date();
      if (isExpired) continue;

      const matches = await verifyTokenHash(rawToken, candidate.tokenHash);
      if (matches) {
        return candidate;
      }
    }
    return null;
  },

  /** List all tokens (active + revoked) for a project - for management UI */
  async listByProject(projectId: string) {
    return db
      .select()
      .from(projectApiTokens)
      .where(eq(projectApiTokens.projectId, projectId))
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

  /** Touch last_used_at (fire and forget, best effort) */
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
   * Best-effort lookup for any valid project token (used by generic authenticate()).
   * We fetch a bounded set of active tokens and compare hashes in application code.
   * Acceptable because project API tokens are expected to be relatively few per installation.
   */
  async findAnyValidProjectToken(rawToken: string): Promise<ProjectApiToken | null> {
    if (!rawToken.startsWith('sast_p_')) return null;

    const candidates = await db
      .select()
      .from(projectApiTokens)
      .where(isNull(projectApiTokens.revokedAt))
      .limit(150);

    for (const candidate of candidates) {
      if (candidate.expiresAt && candidate.expiresAt < new Date()) continue;

      const matches = await verifyTokenHash(rawToken, candidate.tokenHash);
      if (matches) {
        return candidate;
      }
    }
    return null;
  },
};
