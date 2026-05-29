import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../../drizzle/schema';
import { env } from '@/server/env';

let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Lazily initialized database client.
 * Connection established on first access, not at import/build time.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    if (!_db) {
      const queryClient = postgres(env.DATABASE_URL);
      _db = drizzle(queryClient, { schema });
    }
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});
