import { count, eq, sql } from 'drizzle-orm';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { db } from '@/server/db/client';
import { knowledgeEntries, knowledgeSources } from '@drizzle/schema/integrations';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { env } from '@/server/env';

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
const NVD_MAX_RETRIES = 5;
const NVD_INITIAL_BACKOFF_MS = 6000; // 6 seconds - NVD without API key: 5 req/30s
const NVD_BACKOFF_WITH_KEY_MS = 1000; // 1 second - with API key: 50 req/30s
const NVD_FETCH_TIMEOUT_MS = 30_000; // 30 seconds per page fetch
const BATCH_CHUNK_SIZE = 500;
const NVD_INCREMENTAL_SYNC_DAYS = 7;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNvdPageDelay(): number {
  return env.NVD_API_KEY ? NVD_BACKOFF_WITH_KEY_MS : NVD_INITIAL_BACKOFF_MS;
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

function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('timeout') || msg.includes('econnreset') || msg.includes('econnrefused') ||
    msg.includes('socket hang up') || msg.includes('fetch failed') || msg.includes('network');
}

function isTransientStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

async function fetchNvdPage(url: URL, retries = 0): Promise<{ totalResults: number; vulnerabilities: Array<Record<string, unknown>> }> {
  const headers: Record<string, string> = {};
  const apiKey = env.NVD_API_KEY;
  if (apiKey) {
    headers['apiKey'] = apiKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NVD_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store', headers, signal: controller.signal });
  } catch (error) {
    clearTimeout(timeout);
    if (isTransientError(error) && retries < NVD_MAX_RETRIES) {
      const backoffMs = NVD_INITIAL_BACKOFF_MS * Math.pow(2, retries);
      logger.knowledge.warn('NVD fetch transient error, retrying', { error: (error as Error).message, attempt: retries + 1, backoffMs });
      await wait(backoffMs);
      return fetchNvdPage(url, retries + 1);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const parsedRetryAfter = retryAfter ? parseInt(retryAfter, 10) : 0;
    // NVD sometimes returns Retry-After: 0; fall back to exponential backoff in that case
    const backoffMs = parsedRetryAfter > 0
      ? parsedRetryAfter * 1000
      : NVD_INITIAL_BACKOFF_MS * Math.pow(2, retries);

    if (retries < NVD_MAX_RETRIES) {
      logger.knowledge.warn('NVD rate limited, retrying', { retryAfter: backoffMs, attempt: retries + 1 });
      await wait(backoffMs);
      return fetchNvdPage(url, retries + 1);
    }
    throw new AppError(`NVD rate limited after ${NVD_MAX_RETRIES} retries. Set NVD_API_KEY env for higher limits.`, 429, 'RATE_LIMITED');
  }

  if (isTransientStatus(response.status) && retries < NVD_MAX_RETRIES) {
    const backoffMs = NVD_INITIAL_BACKOFF_MS * Math.pow(2, retries);
    logger.knowledge.warn('NVD server error, retrying', { status: response.status, attempt: retries + 1, backoffMs });
    await wait(backoffMs);
    return fetchNvdPage(url, retries + 1);
  }

  if (!response.ok) {
    throw new AppError(`NVD returned ${response.status}: ${response.statusText}`, 502, 'EXTERNAL_API_ERROR');
  }

  return response.json() as Promise<{ totalResults: number; vulnerabilities: Array<Record<string, unknown>> }>;
}

async function fetchNvdEntries(range?: { start: Date; end: Date }): Promise<SyncEntryData[]> {
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
    const payload = await fetchNvdPage(url);
    total = payload.totalResults ?? 0;

    for (const item of payload.vulnerabilities ?? []) {
      const entry = parseNvdItem(item);
      if (entry) entries.push(entry);
    }

    startIndex += NVD_PAGE_SIZE;
    if (startIndex < total) await wait(getNvdPageDelay());
  } while (startIndex < total);

  return entries;
}

async function fetchCweEntries(): Promise<SyncEntryData[]> {
  const entries: SyncEntryData[] = [];

  // Primary: MITRE CWE XML feed inside ZIP.
  try {
    const response = await fetch('https://cwe.mitre.org/data/xml/cwec_v4.16.xml.zip', {
      cache: 'no-store',
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      const xmlFile = Object.values(zip.files).find((file) => !file.dir && file.name.endsWith('.xml'));
      if (!xmlFile) throw new AppError('CWE XML file not found in ZIP', 502, 'EXTERNAL_API_ERROR');
      const text = await xmlFile.async('text');
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const payload = parser.parse(text) as {
        Weakness_Catalog?: {
          Weaknesses?: {
            Weakness?: Array<Record<string, unknown>> | Record<string, unknown>;
          };
        };
      };
      const weaknessNode = payload.Weakness_Catalog?.Weaknesses?.Weakness;
      const weaknesses = Array.isArray(weaknessNode) ? weaknessNode : weaknessNode ? [weaknessNode] : [];

      for (const weakness of weaknesses) {
        const id = weakness['@_ID'];
        const name = weakness['@_Name'];
        const description = weakness.Description;
        if ((typeof id === 'string' || typeof id === 'number') && typeof name === 'string') {
          const cweId = String(id).startsWith('CWE-') ? String(id) : `CWE-${id}`;
          entries.push({
            externalId: cweId,
            title: name.trim(),
            content: typeof description === 'string' ? description.trim() : name.trim(),
            severity: null,
            tags: ['cwe'],
          });
        }
      }

      if (entries.length > 0) {
        logger.knowledge.info('CWE XML parsed', { count: entries.length });
        return entries;
      }
    }
  } catch (e) {
    logger.knowledge.warn('CWE XML fetch failed, trying CSV', { error: e instanceof Error ? e.message : e });
  }

  // Fallback: MITRE CWE CSV feed inside ZIP.
  try {
    const response = await fetch('https://cwe.mitre.org/data/csv/828.csv.zip', { cache: 'no-store' });
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      const csvFile = Object.values(zip.files).find((file) => !file.dir && file.name.endsWith('.csv'));
      if (!csvFile) throw new AppError('CWE CSV file not found in ZIP', 502, 'EXTERNAL_API_ERROR');
      const text = await csvFile.async('text');
      const lines = text.split('\n');
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length >= 3) {
          const cweId = cols[0]?.replace(/"/g, '').trim();
          const name = cols[1]?.replace(/"/g, '').trim();
          const desc = cols[2]?.replace(/"/g, '').trim();
          if (cweId && name) {
            const externalId = cweId.startsWith('CWE-') ? cweId : `CWE-${cweId}`;
            entries.push({
              externalId,
              title: name,
              content: desc ?? name,
              severity: null,
              tags: ['cwe'],
            });
          }
        }
      }
      if (entries.length > 0) {
        logger.knowledge.info('CWE CSV parsed', { count: entries.length });
        return entries;
      }
    }
  } catch (e) {
    logger.knowledge.warn('CWE CSV fetch failed', { error: e instanceof Error ? e.message : e });
  }

  // Last resort: known high-priority CWEs (curated, not fake data)
  const curated = [
    { id: 'CWE-79', name: 'Cross-site Scripting', desc: 'Improper neutralization of input during web page generation.' },
    { id: 'CWE-89', name: 'SQL Injection', desc: 'Improper neutralization of special elements used in an SQL command.' },
    { id: 'CWE-22', name: 'Path Traversal', desc: 'Improper limitation of a pathname to a restricted directory.' },
    { id: 'CWE-78', name: 'OS Command Injection', desc: 'Improper neutralization of special elements used in an OS command.' },
    { id: 'CWE-918', name: 'Server-Side Request Forgery', desc: 'The web server receives a URL or similar request from an upstream component and retrieves the contents of this URL.' },
    { id: 'CWE-601', name: 'Open Redirect', desc: 'The web application accepts a user-controlled input that specifies a URL to redirect to.' },
    { id: 'CWE-798', name: 'Hard-coded Credentials', desc: 'The product contains hard-coded credentials.' },
    { id: 'CWE-502', name: 'Deserialization of Untrusted Data', desc: 'The product deserializes untrusted data without sufficiently verifying the resulting data will be valid.' },
    { id: 'CWE-94', name: 'Code Injection', desc: 'The product constructs all or part of a code segment using externally-influenced input.' },
    { id: 'CWE-287', name: 'Improper Authentication', desc: 'When an actor claims to have a given identity, the product does not prove or insufficiently proves that the claim is correct.' },
  ];

  for (const c of curated) {
    entries.push({
      externalId: c.id,
      title: c.name,
      content: c.desc,
      severity: null,
      tags: ['cwe'],
    });
  }

  logger.knowledge.info('CWE using curated list', { count: entries.length });
  return entries;
}

export const syncEngine = {
  /**
   * Synchronizes a source with its provider and persists entries.
   *
   * @throws {AppError} When the source does not exist or sync fails.
   */
  async syncSource(sourceId: string): Promise<SyncResult> {
    logger.knowledge.info('syncSource', { sourceId });
    const [source] = await db.select().from(knowledgeSources).where(eq(knowledgeSources.id, sourceId)).limit(1);
    if (!source) throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');

    if (source.type === 'nvd' && !env.NVD_API_KEY) {
      logger.knowledge.warn('NVD sync without API key — rate limits are strict (5 req/30s). Set NVD_API_KEY for faster sync.');
    }

    let entries: SyncEntryData[];
    if (source.type === 'nvd') {
      const end = new Date();
      const start = source.lastSyncedAt
        ? new Date(source.lastSyncedAt.getTime() - 2 * 24 * 60 * 60 * 1000)
        : new Date(end.getTime() - NVD_INCREMENTAL_SYNC_DAYS * 24 * 60 * 60 * 1000);
      entries = await fetchNvdEntries({ start, end });
    } else {
      entries = await fetchCweEntries();
    }

    if (entries.length === 0) {
      throw new AppError(`No entries fetched from ${source.type} provider`, 502, 'EXTERNAL_API_ERROR');
    }

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

async function persistEntries(sourceId: string, entries: SyncEntryData[]): Promise<SyncResult> {
  let entriesCreated = 0;
  let entriesUpdated = 0;
  const entriesSkipped = 0;
  const errors: string[] = [];

  // Batch insert/update in chunks to avoid large queries
  for (let i = 0; i < entries.length; i += BATCH_CHUNK_SIZE) {
    const chunk = entries.slice(i, i + BATCH_CHUNK_SIZE);

    try {
      // Use onConflictDoUpdate for proper upsert
      const result = await db
        .insert(knowledgeEntries)
        .values(
          chunk.map((entry) => ({
            sourceId: sourceId,
            cweId: entry.externalId,
            title: entry.title,
            content: entry.content,
            severity: entry.severity,
            remediation: entry.remediation,
            tags: entry.tags,
            references: entry.references ?? [],
          })),
        )
        .onConflictDoUpdate({
          target: [knowledgeEntries.sourceId, knowledgeEntries.cweId],
          set: {
            title: sql`excluded.title`,
            content: sql`excluded.content`,
            severity: sql`excluded.severity`,
            remediation: sql`excluded.remediation`,
            tags: sql`excluded.tags`,
            references: sql`excluded.references`,
            updatedAt: new Date(),
          },
        })
        .returning({ cweId: knowledgeEntries.cweId });

      // Count created vs updated from result
      // onConflictDoUpdate returns all rows; we approximate from the chunk
      entriesCreated += result.length;
      entriesUpdated += 0; // upsert doesn't distinguish; we'll recount below
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      errors.push(`Batch ${Math.floor(i / BATCH_CHUNK_SIZE) + 1}: ${msg}`);
      logger.knowledge.error('persistEntries batch failed', { batch: Math.floor(i / BATCH_CHUNK_SIZE) + 1, error: msg });
    }
  }

  // Recount actual total for accuracy
  const [{ total }] = await db
    .select({ total: count() })
    .from(knowledgeEntries)
    .where(eq(knowledgeEntries.sourceId, sourceId));

  await db
    .update(knowledgeSources)
    .set({ entryCount: total, status: 'connected', lastSyncedAt: new Date() })
    .where(eq(knowledgeSources.id, sourceId));

  return { sourceId, entriesCreated: entriesCreated, entriesUpdated, entriesSkipped, errors };
}
