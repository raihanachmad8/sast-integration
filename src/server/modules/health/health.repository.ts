/**
 * Health check repository.
 *
 * Purpose: Encapsulates all database queries for health checks.
 * Repositories are the only layer that imports `db` — services and routes never query directly.
 *
 * @module server/modules/health/health.repository
 */

import { sql } from 'drizzle-orm';

import { db } from '@/server/db/client';

export const healthRepository = {
  /**
   * Check database connectivity by executing a simple SELECT query.
   *
   * @returns true if DB is reachable, false otherwise
   */
  async checkDatabase(): Promise<boolean> {
    try {
      await db.execute(sql`SELECT 1`);
      return true;
    } catch {
      return false;
    }
  },
};
