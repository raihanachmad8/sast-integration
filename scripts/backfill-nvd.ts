/**
 * NVD Knowledge Base Backfill Script
 *
 * Creates a global NVD source (if not exists) and enqueues a backfill job.
 * The job will be processed by the pg-boss worker (nvd-knowledge-backfill).
 *
 * Usage:
 *   pnpm backfill:nvd
 *
 * Monitor progress:
 *   psql -d sast_db -c "SELECT id, status, cursor_start, imported_count, last_error FROM knowledge_backfill_jobs ORDER BY created_at DESC LIMIT 5"
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *   NVD_API_KEY  - NVD API key for higher rate limits (optional)
 */

import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../src/server/db/client';
import { knowledgeSources } from '../drizzle/schema/integrations';
import { QUEUE_JOBS } from '../src/commons/constants/queue';

async function main() {
  const { enqueue } = await import('../src/server/modules/queue/queue.service');

  // 1. Find or create global NVD source
  let [source] = await db
    .select()
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.type, 'nvd'),
        isNull(knowledgeSources.workspaceId),
      ),
    )
    .limit(1);

  if (!source) {
    [source] = await db
      .insert(knowledgeSources)
      .values({
        name: 'NVD CVE Feed',
        type: 'nvd',
        url: 'https://services.nvd.nist.gov/rest/json/cves/2.0',
        status: 'disconnected',
      })
      .returning();
    console.log(`[backfill] Created global NVD source: ${source.id}`);
  } else {
    console.log(`[backfill] Found global NVD source: ${source.id}`);
  }

  // 2. Enqueue backfill job
  const jobId = await enqueue(
    QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL,
    { sourceId: source.id },
    { expireInSeconds: 1800 },
  );

  console.log(`[backfill] Job enqueued: ${jobId}`);
  console.log(`[backfill] Monitor progress:`);
  console.log(`  psql -d sast_db -c "SELECT status, cursor_start, imported_count, last_error FROM knowledge_backfill_jobs ORDER BY created_at DESC LIMIT 1"`);
  console.log(``);
  console.log(`  Or check pg-boss:`);
  console.log(`  psql -d sast_db -c "SELECT state, retry_count, output FROM pgboss.job WHERE name = 'nvd-knowledge-backfill' ORDER BY created_on DESC LIMIT 1"`);

  process.exit(0);
}

main().catch((e) => {
  console.error('[backfill] Failed:', e);
  process.exit(1);
});
