/**
 * Knowledge Base API module.
 *
 * Provides functions for managing knowledge base entries and sources.
 * All functions are workspace-scoped and require authentication.
 *
 * @example
 * ```ts
 * import { listKnowledgeBase, createKnowledgeBaseEntry } from '@/modules/knowledge-base/api';
 *
 * // List all entries in a workspace
 * const entries = await listKnowledgeBase('workspace-id-123');
 *
 * // Create a new entry
 * const newEntry = await createKnowledgeBaseEntry('workspace-id-123', {
 *   sourceId: 'source-uuid',
 *   cweId: 'CWE-89',
 *   title: 'SQL Injection',
 *   content: 'Description of the vulnerability...',
 *   severity: 'critical',
 *   tags: ['injection', 'database'],
 * });
 * ```
 */

import { apiFetch, apiPost, apiPut, apiDelete } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';

/**
 * Knowledge base entry representing a security vulnerability or pattern.
 */
export interface KnowledgeBaseEntry {
  /** Unique identifier */
  id: string;
  /** Reference to the knowledge source */
  sourceId: string;
  /** CWE identifier (e.g., CWE-89) */
  cweId: string;
  /** Entry title */
  title: string;
  /** Detailed description */
  content: string;
  /** Severity level (critical, high, medium, low, info) */
  severity: string;
  /** Category tags */
  tags: string[];
  /** Whether this entry is muted (not used by AI) */
  muted: boolean;
  /** Number of times used by AI verification */
  usedByAiCount: number;
  /** Remediation instructions */
  remediation?: string;
  /** External references */
  references?: unknown;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * List all knowledge base entries in a workspace.
 *
 * @param workspaceId - The workspace ID to list entries for
 * @returns Promise resolving to array of knowledge base entries
 * @throws {ApiRequestError} On network or server error
 *
 * @example
 * ```ts
 * const entries = await listKnowledgeBase('ws-123');
 * console.log(`Found ${entries.length} entries`);
 * ```
 */
export async function listKnowledgeBase(workspaceId: string): Promise<KnowledgeBaseEntry[]> {
  return apiFetch<KnowledgeBaseEntry[]>(ENDPOINTS.KNOWLEDGE_BASE.LIST(workspaceId));
}

/**
 * Get a single knowledge base entry by ID.
 *
 * @param workspaceId - The workspace ID
 * @param entryId - The entry ID to retrieve
 * @returns Promise resolving to the entry, or null if not found
 *
 * @example
 * ```ts
 * const entry = await getKnowledgeBaseEntry('ws-123', 'entry-456');
 * if (entry) {
 *   console.log(entry.title);
 * }
 * ```
 */
export async function getKnowledgeBaseEntry(workspaceId: string, entryId: string): Promise<KnowledgeBaseEntry | null> {
  return apiFetch<KnowledgeBaseEntry>(ENDPOINTS.KNOWLEDGE_BASE.DETAIL(workspaceId, entryId)).catch(() => null);
}

/**
 * Create a new knowledge base entry.
 *
 * @param workspaceId - The workspace ID
 * @param data - Entry data (sourceId, cweId, title, content, severity, tags required)
 * @returns Promise resolving to the created entry
 * @throws {ApiRequestError} On validation or server error
 *
 * @example
 * ```ts
 * const entry = await createKnowledgeBaseEntry('ws-123', {
 *   sourceId: 'src-789',
 *   cweId: 'CWE-79',
 *   title: 'Cross-Site Scripting (XSS)',
 *   content: 'XSS vulnerabilities allow attackers to inject malicious scripts...',
 *   severity: 'high',
 *   tags: ['xss', 'injection'],
 *   remediation: 'Sanitize all user input and encode output...',
 * });
 * ```
 */
export async function createKnowledgeBaseEntry(workspaceId: string, data: Partial<KnowledgeBaseEntry>): Promise<KnowledgeBaseEntry> {
  return apiPost<KnowledgeBaseEntry>(ENDPOINTS.KNOWLEDGE_BASE.LIST(workspaceId), data);
}

/**
 * Update an existing knowledge base entry.
 *
 * @param workspaceId - The workspace ID
 * @param entryId - The entry ID to update
 * @param data - Partial entry data to update
 * @returns Promise resolving to the updated entry
 * @throws {ApiRequestError} On validation or server error
 *
 * @example
 * ```ts
 * const updated = await updateKnowledgeBaseEntry('ws-123', 'entry-456', {
 *   severity: 'critical',
 *   muted: true,
 * });
 * ```
 */
export async function updateKnowledgeBaseEntry(workspaceId: string, entryId: string, data: Partial<KnowledgeBaseEntry>): Promise<KnowledgeBaseEntry> {
  return apiPut<KnowledgeBaseEntry>(ENDPOINTS.KNOWLEDGE_BASE.DETAIL(workspaceId, entryId), data);
}

/**
 * Delete a knowledge base entry.
 *
 * @param workspaceId - The workspace ID
 * @param entryId - The entry ID to delete
 * @throws {ApiRequestError} On server error
 *
 * @example
 * ```ts
 * await deleteKnowledgeBaseEntry('ws-123', 'entry-456');
 * console.log('Entry deleted');
 * ```
 */
export async function deleteKnowledgeBaseEntry(workspaceId: string, entryId: string): Promise<void> {
  await apiDelete(ENDPOINTS.KNOWLEDGE_BASE.DETAIL(workspaceId, entryId));
}

// ── Knowledge Sources ─────────────────────────────────────

type KnowledgeBaseSourceResponse = {
  id: string;
  workspace_id: string;
  name: string;
  type: string;
  url?: string | null;
  status: string;
  entry_count?: number | null;
  last_synced_at?: string | null;
  created_at: string;
};

/** Knowledge source representing an intelligence feed or custom rule set. */
export interface KnowledgeBaseSource {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  url?: string | null;
  status: string;
  entryCount: number;
  lastSyncedAt?: string | null;
  createdAt: string;
}

export interface KnowledgeBackfillJob {
  id: string;
  workspaceId: string | null;
  sourceId: string | null;
  sourceType: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  rangeStart: string;
  rangeEnd: string;
  cursorStart: string;
  windowDays: number;
  importedCount: number;
  progressPercent: number;
  lastError: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function mapKnowledgeSource(source: KnowledgeBaseSourceResponse): KnowledgeBaseSource {
  return {
    id: source.id,
    workspaceId: source.workspace_id,
    name: source.name,
    type: source.type,
    url: source.url,
    status: source.status,
    entryCount: source.entry_count ?? 0,
    lastSyncedAt: source.last_synced_at,
    createdAt: source.created_at,
  };
}

/**
 * List all knowledge sources in a workspace.
 *
 * @param workspaceId - The workspace ID to list sources for
 * @returns Promise resolving to array of knowledge sources
 * @throws {ApiRequestError} On network or server error
 */
export async function listKnowledgeSources(workspaceId: string): Promise<KnowledgeBaseSource[]> {
  const sources = await apiFetch<KnowledgeBaseSourceResponse[]>(ENDPOINTS.KNOWLEDGE_SOURCES.LIST(workspaceId));
  return sources.map(mapKnowledgeSource);
}

/**
 * Create a new knowledge source.
 *
 * @param workspaceId - The workspace ID
 * @param data - Source data (name, type, url optional)
 * @returns Promise resolving to the created source
 * @throws {ApiRequestError} On validation or server error
 */
export async function createKnowledgeSource(
  workspaceId: string,
  data: { name: string; type: string; url?: string },
): Promise<KnowledgeBaseSource> {
  const source = await apiPost<KnowledgeBaseSourceResponse>(ENDPOINTS.KNOWLEDGE_SOURCES.LIST(workspaceId), data);
  return mapKnowledgeSource(source);
}

/**
 * Update an existing knowledge source.
 */
export async function updateKnowledgeSource(
  workspaceId: string,
  sourceId: string,
  data: Partial<Pick<KnowledgeBaseSource, 'name' | 'type' | 'url'>>,
): Promise<KnowledgeBaseSource> {
  const source = await apiPut<KnowledgeBaseSourceResponse>(ENDPOINTS.KNOWLEDGE_SOURCES.DETAIL(workspaceId, sourceId), data);
  return mapKnowledgeSource(source);
}

/**
 * Delete a knowledge source.
 */
export async function deleteKnowledgeSource(workspaceId: string, sourceId: string): Promise<void> {
  await apiDelete(ENDPOINTS.KNOWLEDGE_SOURCES.DETAIL(workspaceId, sourceId));
}

/**
 * Trigger a sync for a knowledge source.
 */
export async function syncKnowledgeSourceById(workspaceId: string, sourceId: string): Promise<void> {
  await apiPost(ENDPOINTS.KNOWLEDGE_SOURCES.SYNC(workspaceId, sourceId));
}

/**
 * Get latest historical backfill status for a knowledge source.
 */
export async function getKnowledgeSourceBackfill(workspaceId: string, sourceId: string): Promise<KnowledgeBackfillJob | null> {
  return apiFetch<KnowledgeBackfillJob | null>(ENDPOINTS.KNOWLEDGE_SOURCES.BACKFILL(workspaceId, sourceId));
}

/**
 * Start or resume historical NVD backfill for a knowledge source.
 */
export async function startKnowledgeSourceBackfill(workspaceId: string, sourceId: string): Promise<KnowledgeBackfillJob> {
  return apiPost<KnowledgeBackfillJob>(ENDPOINTS.KNOWLEDGE_SOURCES.BACKFILL(workspaceId, sourceId));
}
