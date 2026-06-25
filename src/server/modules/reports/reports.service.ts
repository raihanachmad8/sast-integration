import { reportsRepository, type ReportListParams } from './reports.repository';
import { assertWorkspaceMember } from '@/server/modules/workspace/assert-workspace-member';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { ROLE_PERMISSIONS } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { generateReportPdf } from './generators/pdf-generator';
import { generateReportExcel } from './generators/excel-generator';

interface GenerateReportInput {
  type: string;
  title: string;
  format?: string;
  range?: string;
  filters?: Record<string, unknown> | null;
}

function countBy<T>(arr: T[], key: keyof T): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of arr) {
    const v = String(item[key] ?? 'N/A');
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return map;
}

function esc(v: string | null | undefined): string {
  return (v ?? '').replace(/"/g, '""');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Report Service
// ═══════════════════════════════════════════════════════════════════════════════

export const reportsService = {
  async list(workspaceId: string, params: ReportListParams) {
    logger.report.info('list', { workspaceId, page: params.page });
    const result = await reportsRepository.listByWorkspace(workspaceId, params);
    logger.report.info('list completed', { count: result.data.length, total: result.total });
    return result;
  },

  async getById(id: string, workspaceId: string) {
    logger.report.info('getById', { id, workspaceId });
    const result = await reportsRepository.getById(id, workspaceId);
    if (!result) {
      throw new AppError('Report not found', 404, 'NOT_FOUND');
    }
    return result;
  },

  async generate(data: GenerateReportInput, workspaceId: string, userId: string) {
    const start = Date.now();
    logger.report.info('generate:start', { type: data.type, format: data.format, workspaceId, userId });

    const role = await assertWorkspaceMember(workspaceId, userId);

    const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] ?? [];
    if (!permissions.includes('report:export')) {
      throw new AppError('You do not have permission to export reports', 403, 'FORBIDDEN');
    }

    const format = (data.format ?? 'pdf') as string;
    const ext = format === 'xlsx' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';

    const created = await reportsRepository.create({
      workspaceId,
      type: data.type,
      title: data.title,
      status: 'pending',
      format: ext,
      filters: { range: data.range, ...data.filters },
      createdBy: userId,
    });
    logger.report.info('generate:recordCreated', { reportId: created.id });

    try {
      // Step 1: Generate file buffer
      const genStart = Date.now();
      logger.report.info('generate:fileGen:start', { reportId: created.id, type: data.type, ext });
      const buffer = await this.generateFile(data.type, ext, workspaceId, data.range ?? 'All time');
      logger.report.info('generate:fileGen:done', { reportId: created.id, bufferSize: buffer.length, ms: Date.now() - genStart });

      // Validate buffer
      if (buffer.length === 0) {
        throw new AppError('Generated file is empty', 500, 'EMPTY_FILE');
      }
      if (ext === 'pdf' && !buffer.slice(0, 5).toString('ascii').startsWith('%PDF')) {
        logger.report.warn('generate:invalidPdf', { header: buffer.slice(0, 10).toString('ascii') });
        throw new AppError('Generated PDF is invalid', 500, 'INVALID_PDF');
      }

      // Step 2: Upload to storage
      const dateStr = new Date().toISOString().slice(0, 10);
      const storageKey = `${workspaceId}/reports/${created.id}_${dateStr}.${ext}`;
      const storageStart = Date.now();
      const storage = await getStorageDriver();
      const contentTypes: Record<string, string> = {
        pdf: 'application/pdf',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv; charset=utf-8',
      };
      const uploadResult = await storage.upload(buffer, storageKey, { contentType: contentTypes[ext] });
      logger.report.info('generate:storage:done', { reportId: created.id, storageKey: uploadResult.key, size: uploadResult.size, ms: Date.now() - storageStart });

      // Step 3: Update DB record
      const updated = await reportsRepository.updateStatus(created.id, 'ready', uploadResult.key, uploadResult.size);
      logger.report.info('generate:completed', { reportId: created.id, totalMs: Date.now() - start });

      return updated ?? created;
    } catch (error) {
      await reportsRepository.updateStatus(created.id, 'failed');
      logger.report.error('generate:failed', {
        reportId: created.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ms: Date.now() - start,
      });
      throw error;
    }
  },

  async generateFile(type: string, format: string, workspaceId: string, range: string): Promise<Buffer> {
    logger.report.info('generateFile', { type, format, workspaceId });
    const workspace = await workspaceRepository.findById(workspaceId);
    const workspaceName = workspace?.name ?? 'Workspace';
    if (format === 'xlsx') return generateReportExcel(type, workspaceId, workspaceName);
    if (format === 'csv') return this.generateCsv(type, workspaceId, range);
    return generateReportPdf(type, workspaceId, workspaceName);
  },

  async delete(id: string, workspaceId: string, userId: string) {
    logger.report.info('delete', { id, workspaceId });

    await assertWorkspaceMember(workspaceId, userId);

    const existing = await reportsRepository.getById(id, workspaceId);
    if (!existing) throw new AppError('Report not found', 404, 'NOT_FOUND');

    if (existing.filePath) {
      try {
        const storage = await getStorageDriver();
        await storage.delete(existing.filePath);
        logger.report.info('delete:storageDeleted', { filePath: existing.filePath });
      } catch (err) {
        logger.report.warn('delete:storageDeleteFailed', { filePath: existing.filePath, error: err instanceof Error ? err.message : String(err) });
      }
    }

    await reportsRepository.delete(id);
    logger.report.info('delete:completed', { id });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CSV Generation (fallback format)
  // ═══════════════════════════════════════════════════════════════════════════

  async generateCsv(type: string, wsId: string, _range: string): Promise<Buffer> {
    let csv = '';
    if (type === 'findings') {
      const data = await findingRepository.listByWorkspace(wsId, { page: 1, perPage: 10000 });
      logger.report.info('generateCsv:findings', { wsId, count: data.data.length });
      csv = 'ID,Rule,Scanner,Severity,Status,File,Line,Message,CWE,Verdict,Confidence,Repository\n';
      for (const f of data.data) csv += `"${f.id}","${esc(f.rule)}","${esc(f.scanner)}","${f.severity}","${f.groupStatus ?? 'open'}","${esc(f.filePath ?? '')}","${f.lineNumber ?? ''}","${esc(f.message ?? '')}","${esc(f.cweId ?? '')}","${f.verdict ?? ''}","${f.confidence ?? ''}","${esc(f.repositoryName ?? '')}"\n`;
    } else if (type === 'verdict') {
      const data = await findingRepository.listByWorkspace(wsId, { page: 1, perPage: 5000 });
      const verdicts = countBy(data.data, 'verdict');
      logger.report.info('generateCsv:verdict', { wsId, count: data.data.length });
      csv = 'Verdict,Count,Percentage\n';
      for (const [v, c] of verdicts) csv += `"${v}","${c}","${data.data.length > 0 ? ((c / data.data.length) * 100).toFixed(1) : 0}%"\n`;
    } else if (type === 'executive') {
      const [scans, findings] = await Promise.all([
        scanRepository.listByWorkspace(wsId, { page: 1, perPage: 10000 }),
        findingRepository.listByWorkspace(wsId, { page: 1, perPage: 10000 }),
      ]);
      logger.report.info('generateCsv:executive', { wsId, scans: scans.data.length, findings: findings.data.length });
      csv = 'Metric,Value\n';
      csv += `"Total Scans","${scans.data.length}"\n`;
      csv += `"Completed Scans","${scans.data.filter((s) => s.status === 'completed').length}"\n`;
      csv += `"Total Findings","${findings.data.length}"\n`;
      csv += `"Critical Findings","${findings.data.filter((f) => f.severity === 'critical').length}"\n`;
      csv += `"High Findings","${findings.data.filter((f) => f.severity === 'high').length}"\n`;
    } else if (type === 'compliance') {
      const data = await findingRepository.listByWorkspace(wsId, { page: 1, perPage: 5000 });
      const cweMap = new Map<string, { count: number; severity: string }>();
      for (const f of data.data) { const c = f.cweId ?? 'N/A'; const e = cweMap.get(c); if (e) e.count++; else cweMap.set(c, { count: 1, severity: f.severity }); }
      logger.report.info('generateCsv:compliance', { wsId, cwes: cweMap.size });
      csv = 'CWE,Count,Severity\n';
      for (const [cwe, info] of cweMap) csv += `"${esc(cwe)}","${info.count}","${info.severity}"\n`;
    }
    return Buffer.from(csv, 'utf-8');
  },
};
