/**
 * Initialize Global Knowledge Sources
 *
 * Creates global CWE and NVD knowledge sources (if not exists).
 * These are used by the background sync job (SYNC_KNOWLEDGE_BASE).
 *
 * Usage:
 *   npx tsx scripts/init-knowledge.ts
 *
 * After running, the cron job will automatically sync every 6 hours.
 * Or trigger immediate sync: npx tsx scripts/sync-knowledge.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { and, eq, isNull } from 'drizzle-orm';

// Load .env
const envPaths = [path.resolve('.env.local'), path.resolve('.env')];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    process.loadEnvFile(p);
    break;
  }
}

import { db } from '../src/server/db/client';
import { knowledgeSources } from '../drizzle/schema/integrations';

const GLOBAL_SOURCES = [
  {
    name: 'CWE Catalog',
    type: 'cwe',
    url: 'https://cwe.mitre.org/data/xml/cwec_v4.16.xml.zip',
  },
  {
    name: 'NVD CVE Feed',
    type: 'nvd',
    url: 'https://services.nvd.nist.gov/rest/json/cves/2.0',
  },
];

async function main() {
  for (const source of GLOBAL_SOURCES) {
    const [existing] = await db
      .select()
      .from(knowledgeSources)
      .where(
        and(
          eq(knowledgeSources.type, source.type),
          isNull(knowledgeSources.workspaceId),
        ),
      )
      .limit(1);

    if (existing) {
      console.log(`[init] ${source.type.toUpperCase()} source already exists: ${existing.id}`);
    } else {
      const [created] = await db
        .insert(knowledgeSources)
        .values({
          name: source.name,
          type: source.type,
          url: source.url,
          status: 'disconnected',
        })
        .returning();
      console.log(`[init] Created ${source.type.toUpperCase()} source: ${created.id}`);
    }
  }

  console.log('');
  console.log('[init] Done. Background sync will pick up sources automatically.');
  console.log('[init] Or trigger immediate sync: npx tsx scripts/sync-knowledge.ts');

  process.exit(0);
}

main().catch((e) => {
  console.error('[init] Failed:', e);
  process.exit(1);
});
