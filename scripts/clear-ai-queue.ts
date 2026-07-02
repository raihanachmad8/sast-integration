/**
 * Clear pending AI verify-finding jobs from the pg-boss queue.
 *
 * Usage:
 *   pnpm db:ai-queue:clear
 *   pnpm db:ai-queue:clear --dry-run
 */

import fs from 'node:fs';
import path from 'node:path';

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';

// Load env
const envPaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    process.loadEnvFile(p);
    break;
  }
}

const DATABASE_URL =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USER ?? 'postgres'}:${process.env.DB_PASSWORD ?? 'root'}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'sast_db'}`;

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const db = drizzle(DATABASE_URL);

  console.log(dryRun ? '🔍 DRY RUN — no changes will be made' : '🗑️  Clearing AI verify-finding queue...');
  console.log('');

  try {
    // Check if pgboss schema exists
    const schemaResult = await db.execute(sql.raw(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name = 'pgboss'`
    ));
    if (schemaResult.rowCount === 0) {
      console.log('  ✅ pgboss schema does not exist — nothing to clear');
      return;
    }

    const jobsResult = await db.execute(sql.raw(
      `SELECT COUNT(*)::int as count FROM pgboss.job WHERE name = 'ai-verify-finding' AND state IN ('created', 'retry', 'active')`
    ));
    const count = (jobsResult.rows[0] as { count: number }).count;

    if (count === 0) {
      console.log('  ✅ No pending ai-verify-finding jobs');
      return;
    }

    if (dryRun) {
      console.log(`  🔍 ${count} pending ai-verify-finding job(s) would be deleted`);
    } else {
      const deleteResult = await db.execute(sql.raw(
        `DELETE FROM pgboss.job WHERE name = 'ai-verify-finding' AND state IN ('created', 'retry', 'active') RETURNING id, data->>'findingId' as finding_id, state`
      ));
      console.log(`  🗑️  Deleted ${deleteResult.rowCount} job(s):`);
      for (const row of deleteResult.rows) {
        const r = row as { finding_id: string | null; state: string };
        console.log(`    - finding: ${r.finding_id ?? '(null)'} (${r.state})`);
      }
    }
  } catch (err) {
    console.error('  ❌ Error:', (err as Error).message);
    process.exit(1);
  }

  console.log('');
  if (dryRun) {
    console.log('🔍 Dry run complete.');
  } else {
    console.log('✅ Done.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
