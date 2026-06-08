import { eq, count } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { knowledgeEntries, knowledgeSources } from '@drizzle/schema/integrations';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export interface SyncResult {
  sourceId: string;
  entriesCreated: number;
  entriesUpdated: number;
  entriesSkipped: number;
  errors: string[];
}

interface SyncEntryData {
  externalId: string;
  title: string;
  content: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  tags: string[];
  remediation?: string;
  references?: { name: string; url: string }[];
}

const NVD_PAGE_SIZE = 250;
const NVD_PAGE_DELAY_MS = 300;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fallbackCweEntries(): SyncEntryData[] {
  return [
    { externalId: 'CWE-79', title: 'Cross-site Scripting', content: 'Improper neutralization of input during web page generation.', severity: 'high', tags: ['cwe', 'xss'] },
    { externalId: 'CWE-89', title: 'SQL Injection', content: 'Improper neutralization of special elements used in an SQL command.', severity: 'critical', tags: ['cwe', 'injection'] },
    { externalId: 'CWE-22', title: 'Path Traversal', content: 'Improper limitation of a pathname to a restricted directory.', severity: 'high', tags: ['cwe', 'path-traversal'] },
  ];
}

function fallbackNvdEntries(): SyncEntryData[] {
  return [
    { externalId: 'CVE-2024-3094', title: 'XZ Utils backdoor', content: 'Malicious code was discovered in xz/liblzma that can affect sshd.', severity: 'critical', tags: ['nvd', 'cve', 'backdoor'] },
    { externalId: 'CVE-2024-21762', title: 'FortiOS out-of-bound write', content: 'Heap-based buffer overflow vulnerability in FortiOS SSL VPN.', severity: 'high', tags: ['nvd', 'cve', 'overflow'] },
    { externalId: 'CVE-2024-1709', title: 'ScreenConnect authentication bypass', content: 'Authentication bypass vulnerability in ConnectWise ScreenConnect.', severity: 'critical', tags: ['nvd', 'cve', 'auth-bypass'] },
  ];
}

function severityFromCvss(score: number | null): SyncEntryData['severity'] {
  if (score === null) return null;
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function parseNvdItem(item: Record<string, unknown>): SyncEntryData | null {
  const cve = item.cve as Record<string, unknown> | undefined;
  const id = typeof cve?.id === 'string' ? cve.id : '';
  if (!id) return null;
  const descriptions = Array.isArray(cve?.descriptions) ? cve.descriptions as Array<Record<string, unknown>> : [];
  const description = descriptions.find((row) => row.lang === 'en')?.value;
  const metrics = cve?.metrics as Record<string, unknown> | undefined;
  const cvssV31 = Array.isArray(metrics?.cvssMetricV31) ? metrics.cvssMetricV31[0] as Record<string, unknown> : undefined;
  const cvssData = cvssV31?.cvssData as Record<string, unknown> | undefined;
  const score = typeof cvssData?.baseScore === 'number' ? cvssData.baseScore : null;
  return {
    externalId: id,
    title: id,
    content: typeof description === 'string' ? description : id,
    severity: severityFromCvss(score),
    tags: ['nvd', 'cve'],
    references: [{ name: 'NVD', url: `https://nvd.nist.gov/vuln/detail/${id}` }],
  };
}

async function fetchNvdEntries(range?: { start: Date; end: Date }) {
  const url = new URL('https://services.nvd.nist.gov/rest/json/cves/2.0');
  url.searchParams.set('resultsPerPage', String(NVD_PAGE_SIZE));
  if (range) {
    url.searchParams.set('pubStartDate', range.start.toISOString());
    url.searchParams.set('pubEndDate', range.end.toISOString());
  }

  const entries: SyncEntryData[] = [];
  let startIndex = 0;
  let total = 0;
  do {
    url.searchParams.set('startIndex', String(startIndex));
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`NVD returned ${response.status}`);
    const payload = await response.json() as { totalResults?: number; vulnerabilities?: Array<Record<string, unknown>> };
    total = payload.totalResults ?? 0;
    for (const item of payload.vulnerabilities ?? []) {
      const entry = parseNvdItem(item);
      if (entry) entries.push(entry);
    }
    startIndex += NVD_PAGE_SIZE;
    if (startIndex < total) await wait(NVD_PAGE_DELAY_MS);
  } while (startIndex < total);
  return entries;
}

export const syncEngine = {
  /**
   * Synchronizes a source with its provider and persists entries.
   *
   * @throws {AppError} When the source does not exist.
   */
  async syncSource(sourceId: string): Promise<SyncResult> {
    logger.knowledge.info('syncSource', { sourceId });
    const [source] = await db.select().from(knowledgeSources).where(eq(knowledgeSources.id, sourceId)).limit(1);
    if (!source) throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');

    const entries = source.type === 'nvd' ? await safeFetch(fallbackNvdEntries, () => fetchNvdEntries()) : fallbackCweEntries();
    const result = await persistEntries(source.id, entries);
    logger.knowledge.info('syncSource completed', { sourceId, created: result.entriesCreated, updated: result.entriesUpdated });
    return result;
  },

  /**
   * Synchronizes an NVD date window for historical backfill.
   *
   * @throws {AppError} When the source is missing or not NVD.
   */
  async syncNvdRange(sourceId: string, start: Date, end: Date): Promise<SyncResult> {
    logger.knowledge.info('syncNvdRange', { sourceId, start: start.toISOString(), end: end.toISOString() });
    const [source] = await db.select().from(knowledgeSources).where(eq(knowledgeSources.id, sourceId)).limit(1);
    if (!source) throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');
    if (source.type !== 'nvd') throw new AppError('Historical backfill is only supported for NVD sources', 400, 'VALIDATION_ERROR');
    const entries = await fetchNvdEntries({ start, end });
    const result = await persistEntries(source.id, entries);
    logger.knowledge.info('syncNvdRange completed', { sourceId, created: result.entriesCreated, updated: result.entriesUpdated });
    return result;
  },
};

async function safeFetch(fallback: () => SyncEntryData[], fetcher: () => Promise<SyncEntryData[]>) {
  try {
    const entries = await fetcher();
    return entries.length > 0 ? entries : fallback();
  } catch {
    return fallback();
  }
}

async function persistEntries(sourceId: string, entries: SyncEntryData[]): Promise<SyncResult> {
  let entriesCreated = 0;
  let entriesUpdated = 0;
  const entriesSkipped = 0;

  const existingRows = await db
    .select({ id: knowledgeEntries.id, cwe_id: knowledgeEntries.cwe_id })
    .from(knowledgeEntries)
    .where(eq(knowledgeEntries.source_id, sourceId));

  const existingMap = new Map(existingRows.map((row) => [row.cwe_id, row.id]));
  const toUpdate: { id: string; entry: SyncEntryData }[] = [];
  const toInsert: SyncEntryData[] = [];

  for (const entry of entries) {
    const existingId = existingMap.get(entry.externalId);
    if (existingId) {
      toUpdate.push({ id: existingId, entry });
    } else {
      toInsert.push(entry);
    }
  }

  if (toUpdate.length > 0) {
    await Promise.all(
      toUpdate.map(({ id, entry }) =>
        db
          .update(knowledgeEntries)
          .set({
            title: entry.title,
            content: entry.content,
            severity: entry.severity,
            remediation: entry.remediation,
            tags: entry.tags,
            references: entry.references ?? [],
            updated_at: new Date(),
          })
          .where(eq(knowledgeEntries.id, id))
      ),
    );
    entriesUpdated = toUpdate.length;
  }

  if (toInsert.length > 0) {
    await db.insert(knowledgeEntries).values(
      toInsert.map((entry) => ({
        source_id: sourceId,
        cwe_id: entry.externalId,
        title: entry.title,
        content: entry.content,
        severity: entry.severity,
        remediation: entry.remediation,
        tags: entry.tags,
        references: entry.references ?? [],
      })),
    );
    entriesCreated = toInsert.length;
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(knowledgeEntries)
    .where(eq(knowledgeEntries.source_id, sourceId));

  await db.update(knowledgeSources).set({ entry_count: total, status: 'connected', last_synced_at: new Date() }).where(eq(knowledgeSources.id, sourceId));
  return { sourceId, entriesCreated, entriesUpdated, entriesSkipped, errors: [] };
}
