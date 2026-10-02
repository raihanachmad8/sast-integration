/**
 * Knowledge Base Sync Engine
 *
 * Fetches vulnerability data from external sources (CWE, NVD)
 * and inserts/updates knowledge_entries in the database.
 *
 * IMPORTANT: Sync must NEVER throw — always return entries (fallback if API fails).
 * This ensures the UI is never blocked.
 */

import { db } from '@/server/db/client';
import { knowledgeEntries, knowledgeSources } from '@drizzle/schema/integrations';
import { eq, and, sql } from 'drizzle-orm';
import { AppError } from '@/server/http/errors';

const CWE_CATALOG_URL = 'https://cwe.mitre.org/data/xml/cwec_latest.xml.zip';
const KNOWLEDGE_FETCH_TIMEOUT_MS = 30_000;
const NVD_FETCH_TIMEOUT_MS = 60_000;
const NVD_PAGE_SIZE = 250;
const NVD_PAGE_DELAY_MS = 300;
const NVD_LOOKBACK_DAYS = 90;

// ── Types ─────────────────────────────────────────────────

export interface SyncResult {
  sourceId: string;
  entriesCreated: number;
  entriesUpdated: number;
  entriesSkipped: number;
  errors: string[];
}

export interface SyncEntryData {
  externalId: string;
  title: string;
  content: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  tags: string[];
  remediation?: string;
  references?: { name: string; url: string }[];
}

// ── Sync Provider Interface ───────────────────────────────

export interface SyncProvider {
  readonly name: string;
  fetchEntries(): Promise<SyncEntryData[]>;
}

// ── CWE Sync Provider ─────────────────────────────────────

/** Severity from CWE likelihood field */
function severityFromLikelihood(value: unknown): SyncEntryData['severity'] {
  const n = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (n === 'high') return 'high';
  if (n === 'medium') return 'medium';
  if (n === 'low') return 'low';
  return null;
}

function stripText(v: unknown): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
}

function takeFirstParagraph(v: unknown): string {
  return stripText(v).split('\n')[0] ?? '';
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWeaknesses(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value as Record<string, unknown>];
  return [];
}

/** CWE fallback entries — always available even if API fails */
function getCweFallbackEntries(): SyncEntryData[] {
  return [
    { externalId: 'CWE-79', title: 'Cross-site Scripting (XSS)', content: 'Improper neutralization of input during web page generation.', severity: 'high', tags: ['cwe', 'xss', 'injection'], references: [{ name: 'CWE-79', url: 'https://cwe.mitre.org/data/definitions/79.html' }] },
    { externalId: 'CWE-89', title: 'SQL Injection', content: 'Improper neutralization of special elements used in an SQL command.', severity: 'high', tags: ['cwe', 'injection', 'database'], references: [{ name: 'CWE-89', url: 'https://cwe.mitre.org/data/definitions/89.html' }] },
    { externalId: 'CWE-22', title: 'Path Traversal', content: 'Improper limitation of a pathname to a restricted directory.', severity: 'high', tags: ['cwe', 'path-traversal'], references: [{ name: 'CWE-22', url: 'https://cwe.mitre.org/data/definitions/22.html' }] },
    { externalId: 'CWE-78', title: 'OS Command Injection', content: 'Improper neutralization of special elements used in an OS command.', severity: 'high', tags: ['cwe', 'command-injection'], references: [{ name: 'CWE-78', url: 'https://cwe.mitre.org/data/definitions/78.html' }] },
    { externalId: 'CWE-125', title: 'Out-of-bounds Read', content: 'Reading data past the end or before the beginning of the intended buffer.', severity: 'high', tags: ['cwe', 'buffer', 'memory'], references: [{ name: 'CWE-125', url: 'https://cwe.mitre.org/data/definitions/125.html' }] },
    { externalId: 'CWE-476', title: 'NULL Pointer Dereference', content: 'Dereferencing a null pointer can cause a crash or unexpected behavior.', severity: 'high', tags: ['cwe', 'null-pointer'], references: [{ name: 'CWE-476', url: 'https://cwe.mitre.org/data/definitions/476.html' }] },
    { externalId: 'CWE-416', title: 'Use After Free', content: 'Referencing memory after it has been freed.', severity: 'high', tags: ['cwe', 'memory'], references: [{ name: 'CWE-416', url: 'https://cwe.mitre.org/data/definitions/416.html' }] },
    { externalId: 'CWE-190', title: 'Integer Overflow', content: 'Arithmetic operations can produce values too large to represent.', severity: 'medium', tags: ['cwe', 'integer'], references: [{ name: 'CWE-190', url: 'https://cwe.mitre.org/data/definitions/190.html' }] },
    { externalId: 'CWE-362', title: 'Race Condition', content: 'Concurrent access to shared resources without proper synchronization.', severity: 'high', tags: ['cwe', 'concurrency'], references: [{ name: 'CWE-362', url: 'https://cwe.mitre.org/data/definitions/362.html' }] },
    { externalId: 'CWE-918', title: 'Server-Side Request Forgery', content: 'The web server fetches a remote resource without validating the URL.', severity: 'high', tags: ['cwe', 'ssrf', 'web'], references: [{ name: 'CWE-918', url: 'https://cwe.mitre.org/data/definitions/918.html' }] },
    { externalId: 'CWE-611', title: 'XML External Entity', content: 'Processing XML with external entity references can lead to information disclosure.', severity: 'high', tags: ['cwe', 'xxe', 'xml'], references: [{ name: 'CWE-611', url: 'https://cwe.mitre.org/data/definitions/611.html' }] },
    { externalId: 'CWE-502', title: 'Deserialization of Untrusted Data', content: 'Deserializing untrusted data can lead to remote code execution.', severity: 'critical', tags: ['cwe', 'deserialization'], references: [{ name: 'CWE-502', url: 'https://cwe.mitre.org/data/definitions/502.html' }] },
    { externalId: 'CWE-798', title: 'Hard-coded Credentials', content: 'Use of hard-coded credentials can lead to unauthorized access.', severity: 'high', tags: ['cwe', 'credentials', 'auth'], references: [{ name: 'CWE-798', url: 'https://cwe.mitre.org/data/definitions/798.html' }] },
    { externalId: 'CWE-200', title: 'Exposure of Sensitive Information', content: 'Information exposure to an unauthorized actor.', severity: 'medium', tags: ['cwe', 'information-disclosure'], references: [{ name: 'CWE-200', url: 'https://cwe.mitre.org/data/definitions/200.html' }] },
    { externalId: 'CWE-295', title: 'Improper Certificate Validation', content: 'Not validating or improperly validating a certificate.', severity: 'high', tags: ['cwe', 'certificate', 'tls'], references: [{ name: 'CWE-295', url: 'https://cwe.mitre.org/data/definitions/295.html' }] },
  ];
}

export class CweSyncProvider implements SyncProvider {
  readonly name = 'cwe';

  async fetchEntries(): Promise<SyncEntryData[]> {
    try {
      const response = await fetch(CWE_CATALOG_URL, {
        signal: AbortSignal.timeout(KNOWLEDGE_FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        console.warn(`[sync] CWE API returned ${response.status}, using fallback`);
        return getCweFallbackEntries();
      }

      // Try dynamic import of jszip + fast-xml-parser
      const [JSZipMod, XMLParserMod] = await Promise.all([
        import('jszip').catch(() => null),
        import('fast-xml-parser').catch(() => null),
      ]);

      if (!JSZipMod || !XMLParserMod) {
        console.warn('[sync] jszip/fast-xml-parser not available, using fallback');
        return getCweFallbackEntries();
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const zip = await JSZipMod.default.loadAsync(buffer);
      const xmlFile = Object.keys(zip.files).find((n) => n.endsWith('.xml'));
      if (!xmlFile) return getCweFallbackEntries();

      const xml = await zip.file(xmlFile)!.async('string');
      const parser = new XMLParserMod.XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', trimValues: true });
      const doc = parser.parse(xml);
      const weaknessesRaw = doc?.Weakness_Catalog?.Weaknesses?.Weakness;
      const weaknesses = normalizeWeaknesses(weaknessesRaw);

      return weaknesses
        .filter((w: Record<string, unknown>) => {
          const status = stripText(w.Status);
          return status !== 'Deprecated' && status !== 'Obsolete';
        })
        .map((w: Record<string, unknown>) => ({
          externalId: `CWE-${stripText(w.ID)}`,
          title: stripText(w.Name),
          content: takeFirstParagraph(w.Extended_Description) || stripText(w.Description),
          severity: severityFromLikelihood(w.Likelihood_Of_Exploit),
          tags: ['cwe', 'weakness'],
          references: [{ name: 'CWE Official', url: `https://cwe.mitre.org/data/definitions/${stripText(w.ID)}.html` }],
        }));
    } catch (err) {
      console.warn(`[sync] CWE fetch failed: ${err}, using fallback`);
      return getCweFallbackEntries();
    }
  }
}

// ── NVD Sync Provider ─────────────────────────────────────

function severityFromCvss(cve: Record<string, unknown>): SyncEntryData['severity'] {
  const metrics = (cve.metrics as Record<string, unknown> | undefined) ?? {};
  for (const key of ['cvssMetricV40', 'cvssMetricV31', 'cvssMetricV30', 'cvssMetricV2'] as const) {
    const group = metrics[key];
    const first = Array.isArray(group) ? group[0] : null;
    const cvssData = (first as Record<string, unknown> | null)?.cvssData as Record<string, unknown> | undefined;
    const sev = typeof cvssData?.baseSeverity === 'string' ? cvssData.baseSeverity.toLowerCase() : '';
    if (sev === 'critical' || sev === 'high') return 'high';
    if (sev === 'medium') return 'medium';
    if (sev === 'low') return 'low';
  }
  return null;
}

function mapNvdEntry(cve: Record<string, unknown>): SyncEntryData {
  const cveId = stripText(cve.id);
  const descs = Array.isArray(cve.descriptions) ? cve.descriptions : [];
  const enDesc = descs.find((d: Record<string, unknown>) => d.lang === 'en');
  const description = stripText(enDesc?.value) || cveId;
  const weaknesses = Array.isArray(cve.weaknesses) ? cve.weaknesses : [];
  const firstW = weaknesses[0] as Record<string, unknown> | undefined;
  const wDescs = Array.isArray(firstW?.description) ? firstW.description : [];
  const wCode = stripText((wDescs[0] as Record<string, unknown>)?.value);

  return {
    externalId: cveId,
    title: description.slice(0, 200),
    content: description,
    severity: severityFromCvss(cve),
    tags: ['nvd', 'cve', ...(wCode ? [wCode.toLowerCase()] : [])],
    references: [{ name: 'NVD', url: `https://nvd.nist.gov/vuln/detail/${cveId}` }],
  };
}

/** NVD fallback entries */
function getNvdFallbackEntries(): SyncEntryData[] {
  return [
    { externalId: 'CVE-2024-3094', title: 'XZ Utils backdoor (CVE-2024-3094)', content: 'Malicious code was discovered in xz/liblzma that creates a backdoor in sshd.', severity: 'critical', tags: ['nvd', 'cve', 'backdoor'], references: [{ name: 'NVD', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-3094' }] },
    { externalId: 'CVE-2024-21762', title: 'FortiOS out-of-bound write', content: 'A heap-based buffer overflow vulnerability in FortiOS SSL VPN.', severity: 'high', tags: ['nvd', 'cve', 'overflow'], references: [{ name: 'NVD', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-21762' }] },
    { externalId: 'CVE-2024-1709', title: 'ConnectWise ScreenConnect auth bypass', content: 'Authentication bypass vulnerability in ConnectWise ScreenConnect.', severity: 'critical', tags: ['nvd', 'cve', 'auth-bypass'], references: [{ name: 'NVD', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-1709' }] },
  ];
}

export class NvdSyncProvider implements SyncProvider {
  readonly name = 'nvd';

  async fetchEntries(): Promise<SyncEntryData[]> {
    const now = new Date();
    const start = new Date(now.getTime() - NVD_LOOKBACK_DAYS * 86400000);
    return this.fetchEntriesForRange(start, now);
  }

  async fetchEntriesForRange(start: Date, end: Date): Promise<SyncEntryData[]> {
    try {
      const baseUrl = new URL('https://services.nvd.nist.gov/rest/json/cves/2.0');
      baseUrl.searchParams.set('resultsPerPage', String(NVD_PAGE_SIZE));
      baseUrl.searchParams.set('pubStartDate', start.toISOString());
      baseUrl.searchParams.set('pubEndDate', end.toISOString());

      const entries: SyncEntryData[] = [];
      let startIndex = 0;
      let totalResults = Number.POSITIVE_INFINITY;

      while (startIndex < totalResults) {
        const pageUrl = new URL(baseUrl.toString());
        pageUrl.searchParams.set('startIndex', String(startIndex));

        const response = await fetch(pageUrl.toString(), {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(NVD_FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
          console.warn(`[sync] NVD API returned ${response.status}, using fallback`);
          return getNvdFallbackEntries();
        }

        const payload = await response.json() as Record<string, unknown>;
        const vulns = (payload.vulnerabilities ?? []) as Array<{ cve?: Record<string, unknown> }>;
        const pageEntries = vulns
          .map((v) => v.cve)
          .filter((cve): cve is Record<string, unknown> => Boolean(cve))
          .map(mapNvdEntry);

        entries.push(...pageEntries);
        totalResults = typeof payload.totalResults === 'number' && Number.isFinite(payload.totalResults)
          ? payload.totalResults
          : entries.length;

        const pageSize = typeof payload.resultsPerPage === 'number' && payload.resultsPerPage > 0
          ? payload.resultsPerPage
          : pageEntries.length;

        if (pageEntries.length === 0 || pageSize <= 0) {
          break;
        }

        startIndex += pageSize;

        if (startIndex < totalResults) {
          await wait(NVD_PAGE_DELAY_MS);
        }
      }

      return entries.length > 0 ? entries : getNvdFallbackEntries();
    } catch (err) {
      console.warn(`[sync] NVD fetch failed: ${err}, using fallback`);
      return getNvdFallbackEntries();
    }
  }
}

// ── Sync Engine ───────────────────────────────────────────

export const syncEngine = {
  getProvider(sourceType: string): SyncProvider {
    switch (sourceType) {
      case 'cwe': return new CweSyncProvider();
      case 'nvd': return new NvdSyncProvider();
      default: throw new AppError(`Unsupported source type: ${sourceType}`, 400, 'VALIDATION_ERROR');
    }
  },

  async syncSource(sourceId: string): Promise<SyncResult> {
    const [source] = await db
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.id, sourceId))
      .limit(1);

    if (!source) {
      throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');
    }

    await db.update(knowledgeSources).set({ status: 'syncing' }).where(eq(knowledgeSources.id, sourceId));

    const result: SyncResult = { sourceId, entriesCreated: 0, entriesUpdated: 0, entriesSkipped: 0, errors: [] };

    try {
      const provider = this.getProvider(source.type);
      const entries = await provider.fetchEntries();

      for (const entry of entries) {
        try {
          const [existing] = await db
            .select({ id: knowledgeEntries.id })
            .from(knowledgeEntries)
            .where(and(eq(knowledgeEntries.source_id, sourceId), eq(knowledgeEntries.cwe_id, entry.externalId)))
            .limit(1);

          if (existing) {
            await db.update(knowledgeEntries).set({
              title: entry.title, content: entry.content, severity: entry.severity,
              tags: entry.tags, remediation: entry.remediation, references: entry.references,
              updated_at: new Date(),
            }).where(eq(knowledgeEntries.id, existing.id));
            result.entriesUpdated++;
          } else {
            await db.insert(knowledgeEntries).values({
              source_id: sourceId, cwe_id: entry.externalId,
              title: entry.title, content: entry.content, severity: entry.severity,
              tags: entry.tags, remediation: entry.remediation, references: entry.references,
            });
            result.entriesCreated++;
          }
        } catch (entryError) {
          result.errors.push(`${entry.externalId}: ${entryError}`);
          result.entriesSkipped++;
        }
      }

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(knowledgeEntries)
        .where(eq(knowledgeEntries.source_id, sourceId));

      await db.update(knowledgeSources).set({
        status: 'connected', entry_count: count, last_synced_at: new Date(),
      }).where(eq(knowledgeSources.id, sourceId));

      return result;
    } catch (error) {
      await db.update(knowledgeSources).set({ status: 'error' }).where(eq(knowledgeSources.id, sourceId));
      result.errors.push(String(error));
      return result;
    }
  },

  async syncNvdRange(sourceId: string, start: Date, end: Date): Promise<SyncResult> {
    const [source] = await db
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.id, sourceId))
      .limit(1);

    if (!source) {
      throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');
    }

    if (source.type !== 'nvd') {
      throw new AppError('Historical backfill is only supported for NVD sources', 400, 'VALIDATION_ERROR');
    }

    const result: SyncResult = { sourceId, entriesCreated: 0, entriesUpdated: 0, entriesSkipped: 0, errors: [] };

    try {
      const entries = await new NvdSyncProvider().fetchEntriesForRange(start, end);

      for (const entry of entries) {
        try {
          const [existing] = await db
            .select({ id: knowledgeEntries.id })
            .from(knowledgeEntries)
            .where(and(eq(knowledgeEntries.source_id, sourceId), eq(knowledgeEntries.cwe_id, entry.externalId)))
            .limit(1);

          if (existing) {
            await db.update(knowledgeEntries).set({
              title: entry.title, content: entry.content, severity: entry.severity,
              tags: entry.tags, remediation: entry.remediation, references: entry.references,
              updated_at: new Date(),
            }).where(eq(knowledgeEntries.id, existing.id));
            result.entriesUpdated++;
          } else {
            await db.insert(knowledgeEntries).values({
              source_id: sourceId, cwe_id: entry.externalId,
              title: entry.title, content: entry.content, severity: entry.severity,
              tags: entry.tags, remediation: entry.remediation, references: entry.references,
            });
            result.entriesCreated++;
          }
        } catch (entryError) {
          result.errors.push(`${entry.externalId}: ${entryError}`);
          result.entriesSkipped++;
        }
      }

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(knowledgeEntries)
        .where(eq(knowledgeEntries.source_id, sourceId));

      await db.update(knowledgeSources).set({
        status: 'connected', entry_count: count, last_synced_at: new Date(),
      }).where(eq(knowledgeSources.id, sourceId));

      return result;
    } catch (error) {
      result.errors.push(String(error));
      return result;
    }
  },
};
