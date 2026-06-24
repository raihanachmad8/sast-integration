import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const envPaths = [path.resolve('.env.local'), path.resolve('.env')];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    process.loadEnvFile(p);
    break;
  }
}

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  console.log('=== Backfill Jobs (knowledge_backfill_jobs) ===');
  const jobs = await sql`SELECT id, status, cursor_start, range_end, imported_count, window_days, last_error, created_at FROM knowledge_backfill_jobs ORDER BY created_at DESC LIMIT 5`;
  if (jobs.length === 0) console.log('(empty)');
  else console.table(jobs);

  console.log('\n=== pg-boss jobs ===');
  try {
    const pgboss = await sql`SELECT name, state, data, output, created_on, completed_on FROM pgboss.job WHERE name = 'nvd-knowledge-backfill' ORDER BY created_on DESC LIMIT 5`;
    for (const job of pgboss) {
      console.log(`State: ${job.state}, Created: ${job.created_on}`);
      if (job.output) console.log(`Output: ${JSON.stringify(job.output).slice(0, 500)}`);
    }
  } catch (_e) {
    console.log('pg-boss table not found');
  }

  console.log('\n=== NVD Entries Sample ===');
  const nvdId = '6cdc2cea-0939-42f1-8913-673fa45794b6';
  const count = await sql`SELECT COUNT(*) as total FROM knowledge_entries WHERE source_id = ${nvdId}`;
  console.log(`NVD entries: ${count[0].total}`);

  const sample = await sql`SELECT cwe_id, title FROM knowledge_entries WHERE source_id = ${nvdId} ORDER BY created_at DESC LIMIT 3`;
  console.log('Latest entries:');
  console.table(sample);

  await sql.end();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
