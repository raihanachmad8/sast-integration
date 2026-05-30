import * as fs from 'node:fs';
import * as path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { SEED_MODULES, OWNER_DEFAULTS, type SeedContext } from './seeds';
import { WORKSPACE_MODE, NODE_ENV } from '../src/server/modules/auth/constants';

const cwd = process.cwd();
for (const filePath of [path.resolve(cwd, '.env.local'), path.resolve(cwd, '.env')]) {
  if (typeof process.loadEnvFile === 'function' && fs.existsSync(filePath)) {
    process.loadEnvFile(filePath);
    break;
  }
}

const databaseUrl =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USER ?? 'postgres'}:${process.env.DB_PASSWORD ?? 'root'}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'sast_db'}`;

/** Parse `--only=a,b` and `--all` flags from argv. */
function parseArgs(argv: string[]) {
  const all = argv.includes('--all');
  const onlyArg = argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean) : null;
  return { all, only };
}

async function main() {
  const { all, only } = parseArgs(process.argv.slice(2));

  const nodeEnv = process.env.NODE_ENV ?? NODE_ENV.DEVELOPMENT;
  const workspaceMode = process.env.WORKSPACE_MODE ?? WORKSPACE_MODE.MULTIPLE;

  // Production guard: bootstrap credentials must be explicit and non-default.
  if (nodeEnv === NODE_ENV.PRODUCTION) {
    const missing = ['OWNER_EMAIL', 'OWNER_PASSWORD'].filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`Refusing to seed in production with default credentials. Set: ${missing.join(', ')}`);
    }
    if (process.env.OWNER_PASSWORD === OWNER_DEFAULTS.PASSWORD) {
      throw new Error('Refusing to seed in production: OWNER_PASSWORD is the well-known default. Use a strong secret.');
    }
  }

  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql, { schema });
  const ctx: SeedContext = { db, workspaceMode, state: {} };

  console.log(`Seeding — workspaceMode=${workspaceMode}${all ? ', --all' : ''}${only ? `, --only=${only.join(',')}` : ''}\n`);

  for (const mod of SEED_MODULES) {
    const selected = only ? only.includes(mod.name) : all || mod.shouldRun(ctx);
    if (!selected) {
      console.log(`  ⊘ ${mod.name} — skipped`);
      continue;
    }
    const summary = await mod.run(ctx);
    console.log(`  ✓ ${mod.name} — ${summary}`);
  }

  console.log('\nSeed complete.');
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
