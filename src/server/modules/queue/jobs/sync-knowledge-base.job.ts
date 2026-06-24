import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { knowledgeSources } from '@drizzle/schema/integrations';
import { syncEngine } from '@/server/modules/knowledge-base/sync-engine';
import { logger } from '@/server/lib/logger';

const DEFAULT_SOURCES = [
  { name: 'CWE Catalog', type: 'cwe', url: 'https://cwe.mitre.org/data/xml/cwec_v4.16.xml.zip' },
  { name: 'NVD CVE Feed', type: 'nvd', url: 'https://services.nvd.nist.gov/rest/json/cves/2.0' },
];

async function ensureGlobalSourcesExist() {
  for (const source of DEFAULT_SOURCES) {
    const [existing] = await db
      .select()
      .from(knowledgeSources)
      .where(and(eq(knowledgeSources.type, source.type), isNull(knowledgeSources.workspaceId)))
      .limit(1);

    if (!existing) {
      await db.insert(knowledgeSources).values({ ...source, status: 'disconnected' });
      logger.knowledge.info(`Auto-created ${source.type.toUpperCase()} source`);
    }
  }
}

/**
 * Background job: sync all global knowledge sources (no workspaceId).
 * Runs on a cron schedule (every 6 hours by default).
 * Auto-creates global sources if they don't exist.
 */
export async function processSyncKnowledgeBaseJob() {
  logger.knowledge.info('processSyncKnowledgeBaseJob started');

  try {
    await ensureGlobalSourcesExist();
    logger.knowledge.info('ensureGlobalSourcesExist completed');
  } catch (error) {
    logger.knowledge.error('ensureGlobalSourcesExist failed', { error: error instanceof Error ? error.message : error });
    return;
  }

  let sources;
  try {
    sources = await db
      .select()
      .from(knowledgeSources)
      .where(isNull(knowledgeSources.workspaceId));
    logger.knowledge.info('Fetched sources', { count: sources.length });
  } catch (error) {
    logger.knowledge.error('Failed to fetch sources', { error: error instanceof Error ? error.message : error });
    return;
  }

  if (sources.length === 0) {
    logger.knowledge.info('No global knowledge sources found, skipping');
    return;
  }

  let succeeded = 0;
  let failed = 0;

  for (const source of sources) {
    try {
      logger.knowledge.info('Syncing source', { sourceId: source.id, type: source.type, name: source.name });

      const result = await syncEngine.syncSource(source.id);

      logger.knowledge.info('Sync result received', {
        sourceId: source.id,
        created: result.entriesCreated,
        updated: result.entriesUpdated,
      });

      await db
        .update(knowledgeSources)
        .set({
          status: 'connected',
          lastSyncedAt: new Date(),
          entryCount: result.entriesCreated + result.entriesUpdated,
        })
        .where(eq(knowledgeSources.id, source.id));

      logger.knowledge.info('Source updated in DB', { sourceId: source.id });
      succeeded++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.knowledge.error('Source sync failed', { sourceId: source.id, type: source.type, error: msg });
      failed++;
    }
  }

  logger.knowledge.info('processSyncKnowledgeBaseJob completed', { succeeded, failed, total: sources.length });
}
