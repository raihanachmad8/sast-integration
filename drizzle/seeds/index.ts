import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../schema';
import { permissionsSeed } from './permissions';
import { ownerSeed } from './owner';
import { workspaceSeed } from './workspace';

export type SeedDb = PostgresJsDatabase<typeof schema>;

export { OWNER_DEFAULTS, ORG_DEFAULTS } from './constants';

/** Shared context passed to every seed module. `state` carries data between modules. */
export interface SeedContext {
  db: SeedDb;
  workspaceMode: string;
  state: { ownerUserId?: string };
}

export interface SeedModule {
  name: string;
  description: string;
  /** Whether this module runs under the current context (env-aware). */
  shouldRun: (ctx: SeedContext) => boolean;
  /** Execute the seed. Returns a one-line summary. */
  run: (ctx: SeedContext) => Promise<string>;
}

/** Ordered registry — dependencies must come before dependents. */
export const SEED_MODULES: SeedModule[] = [permissionsSeed, ownerSeed, workspaceSeed];
