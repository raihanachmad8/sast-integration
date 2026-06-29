import { eq, and, or, asc, desc, count, sql, inArray, isNull, ilike } from 'drizzle-orm';

import { getOffset } from '@/lib/pagination';
import { db, type Tx } from '@/server/db/client';
import { findings, findingGroups, aiVerifications, findingGroupScans } from '@drizzle/schema/findings';
import { models } from '@drizzle/schema/integrations';
import { projects } from '@drizzle/schema/projects';
import { scans } from '@drizzle/schema/scans';
import { repositories } from '@drizzle/schema/source-controls';

// ─── Sort helpers ──────────────────────────────────────────────────────

const SORT_COLUMNS = { createdAt: findings.createdAt, severity: findings.severity, scanner: findings.scanner } as const;
type SortKey = keyof typeof SORT_COLUMNS;

const VERDICT_ORDER: Record<string, number> = { true_positive: 0, false_positive: 1, Pending: 2 };

function normalizeVerdictFilter(v: string) { return v === 'TP' ? 'true_positive' : v === 'FP' ? 'false_positive' : v; }

function buildSortOrder(sort?: string, order?: 'ASC' | 'DESC') {
  if (!sort || !(sort in SORT_COLUMNS)) return desc(findings.createdAt);
  return order === 'ASC' ? asc(SORT_COLUMNS[sort as SortKey]) : desc(SORT_COLUMNS[sort as SortKey]);
}

function buildArrayPositionOrder(ids: string[]) {
  const arr = sql`ARRAY[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::uuid[]`;
  return sql`array_position(${arr}, ${findings.id})`;
}

function sortIdsByVerdict(ids: string[], aiVerdicts: Map<string, string>, order?: 'ASC' | 'DESC') {
  return ids
    .map((id) => ({ id, verdict: aiVerdicts.get(id) ?? 'Pending' }))
    .sort((a, b) => {
      const diff = (VERDICT_ORDER[a.verdict] ?? 3) - (VERDICT_ORDER[b.verdict] ?? 3);
      return order === 'ASC' ? diff : -diff;
    })
    .map((r) => r.id);
}

// ─── AI enrichment ─────────────────────────────────────────────────────

async function fetchLatestVerdicts(executor: { select: typeof db.select }, findingIds: string[]): Promise<Map<string, string>> {
  if (findingIds.length === 0) return new Map();
  const aiRows = await executor.select({ findingId: aiVerifications.findingId, verdict: aiVerifications.verdict, createdAt: aiVerifications.createdAt })
    .from(aiVerifications).where(inArray(aiVerifications.findingId, findingIds));
  const latestAi = new Map<string, { verdict: string; ts: Date }>();
  for (const row of aiRows) {
    if (!row.findingId) continue;
    const existing = latestAi.get(row.findingId);
    if (!existing || (row.createdAt && row.createdAt > existing.ts)) {
      latestAi.set(row.findingId, { verdict: row.verdict ?? 'Pending', ts: row.createdAt ?? new Date(0) });
    }
  }
  return new Map([...latestAi.entries()].map(([k, v]) => [k, v.verdict]));
}

export async function fetchAiEnrichmentBatch(
  rows: Array<{ id: string; groupId: string | null }>,
  executor: typeof db | Tx,
): Promise<Map<string, { verdict: string; modelName: string | undefined; confidence: string | null; explanation: string | null; fixSuggestion: string | null; dataFlow: string | null; taintSource: string | null; matchDetail: string | null; likelyCwe: unknown }>> {
  if (rows.length === 0) return new Map();
  const findingIds = rows.map(r => r.id);

  const allVerifications = await executor.select({
    findingId: aiVerifications.findingId, groupId: aiVerifications.groupId, verdict: aiVerifications.verdict,
    confidence: aiVerifications.confidence, explanation: aiVerifications.explanation,
    fixSuggestion: aiVerifications.fixSuggestion, dataFlow: aiVerifications.dataFlow,
    taintSource: aiVerifications.taintSource, matchDetail: aiVerifications.matchDetail,
    likelyCwe: aiVerifications.likelyCwe, modelId: aiVerifications.modelId, createdAt: aiVerifications.createdAt,
  }).from(aiVerifications).where(inArray(aiVerifications.findingId, findingIds));

  const latestByFinding = new Map<string, typeof allVerifications[0]>();
  for (const row of allVerifications) {
    if (!row.findingId) continue;
    const existing = latestByFinding.get(row.findingId);
    if (!existing || (row.createdAt && row.createdAt > (existing.createdAt ?? new Date(0)))) {
      latestByFinding.set(row.findingId, row);
    }
  }

  const modelIds = [...new Set([...latestByFinding.values()].map(v => v.modelId).filter(Boolean))] as string[];
  const modelNameMap = new Map<string, string>();
  if (modelIds.length > 0) {
    const modelRows = await executor.select({ id: models.id, name: models.name }).from(models).where(inArray(models.id, modelIds));
    for (const m of modelRows) modelNameMap.set(m.id, m.name);
  }

  const result = new Map<string, { verdict: string; modelName: string | undefined; confidence: string | null; explanation: string | null; fixSuggestion: string | null; dataFlow: string | null; taintSource: string | null; matchDetail: string | null; likelyCwe: unknown }>();
  for (const [findingId, v] of latestByFinding) {
    result.set(findingId, {
      verdict: v.verdict === 'true_positive' ? 'TP' : v.verdict === 'false_positive' ? 'FP' : 'Pending',
      modelName: v.modelId ? modelNameMap.get(v.modelId) : undefined,
      confidence: v.confidence ?? null, explanation: v.explanation ?? null, fixSuggestion: v.fixSuggestion ?? null,
      dataFlow: v.dataFlow ?? null, taintSource: v.taintSource ?? null, matchDetail: v.matchDetail ?? null,
      likelyCwe: v.likelyCwe ?? null,
    });
  }
  return result;
}

// ─── Types ─────────────────────────────────────────────────────────────

export interface FindingQueryParams {
  page: number; perPage: number; severity?: string; status?: string;
  scanner?: string; repositoryId?: string; verdict?: string;
  sort?: string; order?: 'ASC' | 'DESC'; search?: string; onlyNew?: boolean;
}

interface ListQueryConfig {
  workspaceId?: string; accessibleProjectIds?: string[];
  projectId?: string; scanId?: string;
}

// ─── Shared JOIN logic ─────────────────────────────────────────────────

const SELECT_SHAPE = {
  id: findings.id, scanId: findings.scanId, groupId: findings.groupId,
  projectId: findingGroups.projectId, cweId: findings.cweId, severity: findings.severity,
  groupStatus: findingGroups.status, filePath: findings.filePath, lineNumber: findings.lineNumber,
  codeSnippet: findings.codeSnippet, description: findings.description, rule: findings.rule,
  scanner: findings.scanner, message: findings.message, assignedTo: findings.assignedTo,
  createdAt: findings.createdAt, firstSeenAt: findingGroups.firstSeenAt, repositoryName: repositories.name,
};

const SELECT_SHAPE_WITH_IS_NEW = { ...SELECT_SHAPE, isNew: findingGroupScans.isNew };

/** Apply standard WHERE conditions for all query types. */
function buildConditions(config: ListQueryConfig, params: FindingQueryParams) {
  const conditions = [];
  if (config.projectId) conditions.push(eq(findingGroups.projectId, config.projectId));
  if (config.scanId) conditions.push(eq(findings.scanId, config.scanId));
  if (config.workspaceId) conditions.push(eq(projects.workspaceId, config.workspaceId));

  if (config.accessibleProjectIds && config.accessibleProjectIds.length > 0) {
    conditions.push(or(inArray(findingGroups.projectId, config.accessibleProjectIds), isNull(repositories.projectId))!);
  } else if (config.accessibleProjectIds?.length === 0) {
    conditions.push(isNull(repositories.projectId));
  }

  if (params.status) conditions.push(eq(findingGroups.status, params.status));
  if (params.severity) conditions.push(eq(findings.severity, params.severity));
  if (params.scanner) conditions.push(eq(findings.scanner, params.scanner));
  if (params.repositoryId) {
    conditions.push(config.scanId ? eq(findingGroupScans.groupId, params.repositoryId) : eq(findingGroups.repositoryId, params.repositoryId));
  }
  if (params.search) {
    conditions.push(or(
      ilike(findings.filePath, `%${params.search}%`), ilike(findings.description, `%${params.search}%`),
      ilike(findings.rule, `%${params.search}%`), ilike(findings.message, `%${params.search}%`),
    )!);
  }
  if (params.onlyNew) conditions.push(eq(findingGroupScans.isNew, true));
  return conditions;
}

function enrichWithAi<T extends Record<string, unknown>>(data: T[], map: Awaited<ReturnType<typeof fetchAiEnrichmentBatch>>) {
  return data.map((row) => {
    const ai = map.get(row.id as string);
    return { ...row, verdict: ai?.verdict ?? 'Pending', model: ai?.modelName ?? null,
      confidence: ai?.confidence ?? null, explanation: ai?.explanation ?? null,
      fixSuggestion: ai?.fixSuggestion ?? null, dataFlow: ai?.dataFlow ?? null,
      taintSource: ai?.taintSource ?? null, matchDetail: ai?.matchDetail ?? null,
      likelyCwe: ai?.likelyCwe ?? null,
    };
  });
}

// ─── Main query ────────────────────────────────────────────────────────

type FindingRow = { id: string; scanId: string; groupId: string | null; projectId: string | null; cweId: string | null; severity: string; groupStatus: string; filePath: string | null; lineNumber: number | null; codeSnippet: string | null; description: string | null; rule: string | null; scanner: string | null; message: string | null; assignedTo: string | null; createdAt: Date; firstSeenAt: Date | null; repositoryName: string | null; isNew?: boolean | null };

export async function listFindings(config: ListQueryConfig, params: FindingQueryParams, tx?: Tx) {
  const executor = tx ?? db;
  const offset = getOffset(params.page, params.perPage);
  const conditions = buildConditions(config, params);
  const isVerdictSort = params.sort === 'verdict';
  const hasVerdictFilter = !!params.verdict;
  const normalizedVerdictFilter = hasVerdictFilter ? normalizeVerdictFilter(params.verdict!) : undefined;

  const selectShape = config.scanId ? SELECT_SHAPE_WITH_IS_NEW : SELECT_SHAPE;
  let data: FindingRow[] = [];
  let filteredTotal = 0;

  if (isVerdictSort || hasVerdictFilter) {
    // Verdict sort/filter: fetch all matching IDs first, then sort/filter in JS
    const allMatchingIds = await executor.select({ id: findings.id })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .leftJoin(repositories, eq(scans.repositoryId, repositories.id))
      .where(and(...conditions, ...(config.workspaceId ? [eq(projects.workspaceId, config.workspaceId)] : []),
        ...(config.projectId ? [eq(findingGroups.projectId, config.projectId)] : []),
        ...(config.accessibleProjectIds && config.accessibleProjectIds.length > 0 ? [or(inArray(findingGroups.projectId, config.accessibleProjectIds), isNull(repositories.projectId))!] : []),
        ...(config.accessibleProjectIds?.length === 0 ? [isNull(repositories.projectId)] : []),
      ))
      .orderBy(desc(findings.createdAt))
      .then((rows: Array<{ id: string }>) => rows.map((r) => r.id));

    if (allMatchingIds.length > 0) {
      const verdicts = await fetchLatestVerdicts(executor, allMatchingIds);
      let filteredIds = allMatchingIds;
      if (hasVerdictFilter) {
        filteredIds = allMatchingIds.filter((id) => (verdicts.get(id) ?? 'Pending') === normalizedVerdictFilter);
      }
      filteredTotal = filteredIds.length;
      const sortedIds = isVerdictSort ? sortIdsByVerdict(filteredIds, verdicts, params.order) : filteredIds;
      const paginatedIds = sortedIds.slice(offset, offset + params.perPage);
      if (paginatedIds.length > 0) {
        data = await executor.select(selectShape).from(findings)
          .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
          .innerJoin(scans, eq(findings.scanId, scans.id))
          .leftJoin(repositories, eq(scans.repositoryId, repositories.id))
          .where(inArray(findings.id, paginatedIds))
          .orderBy(buildArrayPositionOrder(paginatedIds));
      }
    }
  } else {
    // Standard sort
    data = await executor.select(selectShape).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .leftJoin(repositories, eq(scans.repositoryId, repositories.id))
      .where(and(...conditions, ...(config.workspaceId ? [eq(projects.workspaceId, config.workspaceId)] : []),
        ...(config.projectId ? [eq(findingGroups.projectId, config.projectId)] : []),
        ...(config.accessibleProjectIds && config.accessibleProjectIds.length > 0 ? [or(inArray(findingGroups.projectId, config.accessibleProjectIds), isNull(repositories.projectId))!] : []),
        ...(config.accessibleProjectIds?.length === 0 ? [isNull(repositories.projectId)] : []),
      ))
      .orderBy(buildSortOrder(params.sort, params.order))
      .limit(params.perPage).offset(offset);
  }

  const enrichmentMap = await fetchAiEnrichmentBatch(data.map(r => ({ id: r.id, groupId: r.groupId ?? null })), executor);
  const enrichedData = enrichWithAi(data, enrichmentMap);

  // Count query — same structure
  const countConditions = [...conditions];
  if (config.workspaceId) countConditions.push(eq(projects.workspaceId, config.workspaceId));
  if (config.projectId) countConditions.push(eq(findingGroups.projectId, config.projectId));
  if (config.accessibleProjectIds && config.accessibleProjectIds.length > 0) {
    countConditions.push(or(inArray(findingGroups.projectId, config.accessibleProjectIds), isNull(repositories.projectId))!);
  } else if (config.accessibleProjectIds?.length === 0) {
    countConditions.push(isNull(repositories.projectId));
  }

  const countResult = await executor.select({ total: count(sql`DISTINCT ${findingGroups.id}`) }).from(findings)
    .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
    .innerJoin(scans, eq(findings.scanId, scans.id))
    .leftJoin(repositories, eq(scans.repositoryId, repositories.id))
    .where(and(...countConditions));

  const total = hasVerdictFilter ? filteredTotal : (countResult[0]?.total ?? 0);
  return { data: enrichedData, total };
}

// ─── Convenience wrappers ──────────────────────────────────────────────

export async function listFindingsByScan(scanId: string, params: FindingQueryParams, tx?: Tx) {
  return listFindings({ scanId }, { ...params, onlyNew: params.onlyNew }, tx);
}

export async function listFindingsByProject(projectId: string, params: FindingQueryParams, tx?: Tx) {
  return listFindings({ projectId }, params, tx);
}

export async function listFindingsByWorkspace(workspaceId: string, params: FindingQueryParams, tx?: Tx) {
  return listFindings({ workspaceId }, params, tx);
}

export async function listAccessibleFindings(workspaceId: string, accessibleProjectIds: string[], params: FindingQueryParams, tx?: Tx) {
  return listFindings({ workspaceId, accessibleProjectIds }, params, tx);
}
