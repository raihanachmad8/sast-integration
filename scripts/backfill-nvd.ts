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

async function main() {
  const { db } = await import('../src/server/db/client');
  const { knowledgeBackfillService } = await import('../src/server/modules/knowledge-base/knowledge-backfill.service');

  // Find or create global NVD source
  const { knowledgeSources } = await import('../drizzle/schema/integrations');
  const { and, eq, isNull } = await import('drizzle-orm');

  let [source] = await db
    .select()
    .from(knowledgeSources)
    .where(and(eq(knowledgeSources.type, 'nvd'), isNull(knowledgeSources.workspaceId)))
    .limit(1);

  if (!source) {
    [source] = await db
      .insert(knowledgeSources)
      .values({ name: 'NVD CVE Feed', type: 'nvd', url: 'https://services.nvd.nist.gov/rest/json/cves/2.0', status: 'disconnected' })
      .returning();
    console.log(`[backfill] Created global NVD source: ${source.id}`);
  } else {
    console.log(`[backfill] Found global NVD source: ${source.id}`);
  }

  // Use the backfill service (creates DB record + enqueues properly)
  const job = await knowledgeBackfillService.start(source.id, {});

  console.log(`[backfill] Job started: ${job.id}`);
  console.log(`[backfill] Status: ${job.status}`);
  console.log(`[backfill] Range: ${job.rangeStart.toISOString()} → ${job.rangeEnd.toISOString()}`);
  console.log(`[backfill] Monitor:`);
  console.log(`  psql -d sast_db -c "SELECT status, cursor_start, imported_count, last_error FROM knowledge_backfill_jobs ORDER BY created_at DESC LIMIT 1"`);

  process.exit(0);
}

main().catch((e) => {
  console.error('[backfill] Failed:', e);
  process.exit(1);
});
