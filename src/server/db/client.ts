import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@drizzle/schema';
import { env } from '@/server/env';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

// postgres.js options type doesn't include PG server parameters.
// Cast to allow statement_timeout and idle_in_transaction_session_timeout.
type PostgresOptions = Parameters<typeof postgres>[1];

function getDb() {
  if (!_db) {
    const queryClient = postgres(env.DATABASE_URL, {
      max: 20,
      idle_timeout: 20,
      connect_timeout: 30,
      application_name: 'sast-app',
      ssl: 'require',
      max_lifetime: 60 * 60,
      idle_in_transaction_session_timeout: 60000,
    } as PostgresOptions & Record<string, unknown>);
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
