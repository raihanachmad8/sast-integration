/**
 * Trigger Knowledge Base Sync Script
 *
 * Enqueues a one-shot sync job for all global knowledge sources (CWE + NVD).
 * The job will be processed by the pg-boss worker (sync-knowledge-base).
 *
 * Usage:
 *   npx tsx scripts/sync-knowledge.ts
 *
 * Monitor progress:
 *   psql -d sast_db -c "SELECT state, created_on, completed_on, failed_on, data FROM pgboss.job WHERE name = 'sync-knowledge-base' ORDER BY created_on DESC LIMIT 3"
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *   NVD_API_KEY  - NVD API key for higher rate limits (optional)
 */

import fs from 'node:fs';
import path from 'node:path';

// Load .env
const envPaths = [path.resolve('.env.local'), path.resolve('.env')];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    process.loadEnvFile(p);
    break;
  }
}

import { QUEUE_JOBS } from '../src/commons/constants/queue';

async function main() {
  const { enqueue } = await import('../src/server/modules/queue/queue.service');

  console.log('[sync] Enqueuing knowledge base sync job...');

  const jobId = await enqueue(
    QUEUE_JOBS.SYNC_KNOWLEDGE_BASE,
    {},
    { expireInSeconds: 1800 },
  );

  console.log(`[sync] Job enqueued: ${jobId}`);
  console.log(`[sync] Monitor progress:`);
  console.log(`  psql -d sast_db -c "SELECT state, created_on, completed_on, failed_on FROM pgboss.job WHERE name = 'sync-knowledge-base' ORDER BY created_on DESC LIMIT 3"`);

  process.exit(0);
}

main().catch((e) => {
  console.error('[sync] Failed:', e);
  process.exit(1);
});
