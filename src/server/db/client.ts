import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@drizzle/schema';
import { env } from '@/server/env';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (!_db) {
    const queryClient = postgres(env.DATABASE_URL);
    _db = drizzle(queryClient, { schema });
  }
  return _db;
}

/**
 * Lazily initialized database client.
 * Connection established on first access, not at import/build time.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    const instance = getDb();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

/** Shared transaction type for all repositories */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
