import { NextRequest } from 'next/server';
import { Readable } from 'node:stream';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { reportsService } from '@/server/modules/reports/reports.service';
import { generateReportExcel } from '@/server/modules/reports/generators/excel-generator';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { ApiResponse } from '@/server/http/response';

type RouteContext = { params: Promise<{ workspaceId: string; reportId: string }> };

function nodeToWebStream(nodeStream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        controller.enqueue(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

function argbToHex(argb?: string): string | undefined {
  if (!argb) return undefined;
  if (argb.length === 8) return '#' + argb.slice(2);
  return '#' + argb;
}

/**
 * Convert Node.js Buffer (with @types/node v22+ generic) to ArrayBuffer
 * compatible with ExcelJS load types.
 */
function toArrayBuffer(nodeBuf: Buffer): ArrayBuffer {
  const slice = nodeBuf.buffer.slice(
    nodeBuf.byteOffset,
    nodeBuf.byteOffset + nodeBuf.byteLength,
  );
  if (slice instanceof SharedArrayBuffer) {
    throw new Error('Unexpected SharedArrayBuffer');
  }
  return slice;
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if (obj.result !== undefined) return cellToString(obj.result);
    if (typeof obj.formula === 'string') return `=${obj.formula}`;
    if (typeof obj.hyperlink === 'string') return obj.hyperlink;
  }
  return '';
}

interface CellStyle {
  value: string;
  isMerged?: boolean;
  bg?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontName?: string;
  align?: string;
  mergedSpan?: number;
}

/**
 * GET /api/v1/workspaces/:workspaceId/reports/:reportId/preview
 * - PDF: serves file with Content-Disposition: inline (renders in iframe)
 * - Excel: returns JSON with sheet data for preview rendering
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const start = Date.now();
  logger.report.info('preview:start');

  const auth = await authenticate(request);
  if (!auth.success) {
    logger.report.warn('preview:authFailed');
    return auth.response;
  }

  const { workspaceId, reportId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPORT_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const report = await reportsService.getById(reportId, workspaceId);
    logger.report.info('preview:reportFound', { status: report.status, format: report.format });

    if (report.status !== 'ready' || !report.filePath) {
      return ApiResponse.error('Report not ready', 'NOT_READY', undefined, 425);
    }

    const storage = await getStorageDriver();
    const ext = report.format ?? 'pdf';

    // ── PDF: serve inline for iframe ──
    if (ext === 'pdf') {
      const nodeStream = await storage.getStream(report.filePath);
      const webStream = nodeToWebStream(nodeStream);
      const filename = `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      logger.report.info('preview:pdf:inline', { filename, ms: Date.now() - start });

      return new Response(webStream, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'private, max-age=0',
        },
      });
    }

    // ── Excel: generate → load → extract JSON ──
    if (ext === 'xlsx') {
      const ws = await workspaceRepository.findById(workspaceId);
      const buffer = await generateReportExcel(report.type, workspaceId, ws?.name ?? 'Workspace');

      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(toArrayBuffer(buffer));

      const sheets: Array<{
        name: string;
        tabColor?: string;
        rows: CellStyle[][];
        colCount: number;
        rowCount: number;
      }> = [];

      wb.eachSheet((sheet) => {
        const name = sheet.name;
        const tabColor = sheet.properties.tabColor
          ? argbToHex((sheet.properties.tabColor as unknown as { argb?: string }).argb)
          : undefined;

        const rowCount = Math.min(sheet.rowCount || 0, 80);
        const colCount = Math.min(sheet.columnCount || 0, 12);

        const model = sheet.model as unknown as { merges?: string[] };
        const merges = model.merges ?? [];
        const mergedMaster = new Map<string, string>();
        const masterSpan = new Map<string, { rowSpan: number; colSpan: number }>();

        merges.forEach((range: string) => {
          const m = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
          if (!m) return;
          const colLetterToNum = (s: string) => { let n = 0; for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64); return n; };
          const c1 = colLetterToNum(m[1]);
          const r1 = parseInt(m[2], 10);
          const c2 = colLetterToNum(m[3]);
          const r2 = parseInt(m[4], 10);
          const masterKey = `${r1}-${c1}`;
          masterSpan.set(masterKey, { rowSpan: r2 - r1 + 1, colSpan: c2 - c1 + 1 });
          for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
              if (r === r1 && c === c1) continue;
              mergedMaster.set(`${r}-${c}`, masterKey);
            }
          }
        });

        const rows: CellStyle[][] = [];
        for (let r = 1; r <= rowCount; r++) {
          const row: CellStyle[] = [];
          let hasContent = false;
          for (let c = 1; c <= colCount; c++) {
            const key = `${r}-${c}`;
            if (mergedMaster.has(key)) { row.push({ value: '', isMerged: true }); continue; }
            const cell = sheet.getCell(r, c);
            const span = masterSpan.get(key);
            const value = cellToString(cell.value);
            if (value === '' && !span) { row.push({ value: '' }); continue; }
            hasContent = true;

            const fill = cell.fill as unknown as { type: string; fgColor?: { argb?: string }; pattern?: string } | undefined;
            let bg: string | undefined;
            if (fill && fill.type === 'pattern' && fill.pattern && fill.pattern !== 'none') bg = argbToHex(fill.fgColor?.argb);

            const font = cell.font as unknown as { color?: { argb?: string }; bold?: boolean; italic?: boolean; size?: number; name?: string } | undefined;
            const color = font?.color?.argb ? argbToHex(font.color.argb) : undefined;

            row.push({
              value, bg, color,
              bold: font?.bold,
              italic: font?.italic,
              fontSize: font?.size,
              fontName: font?.name,
              align: cell.alignment?.horizontal === 'center' || cell.alignment?.horizontal === 'right' ? cell.alignment.horizontal : 'left',
              mergedSpan: span?.colSpan && span.colSpan > 1 ? span.colSpan : undefined,
            });
          }
          if (hasContent) rows.push(row);
        }

        sheets.push({ name, tabColor, rows, colCount, rowCount: rows.length });
      });

      logger.report.info('preview:excel:json', { sheets: sheets.length, ms: Date.now() - start });

      return ApiResponse.success('Preview loaded', { sheets, generatedAt: new Date().toISOString() });
    }

    // ── CSV: return raw text ──
    if (ext === 'csv') {
      const nodeStream = await storage.getStream(report.filePath);
      const webStream = nodeToWebStream(nodeStream);
      return new Response(webStream, {
        status: 200,
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'private, max-age=0' },
      });
    }

    return ApiResponse.error('Unsupported format', 'UNSUPPORTED', undefined, 400);
  } catch (error) {
    logger.report.error('preview:failed', { error: error instanceof Error ? error.message : String(error), ms: Date.now() - start });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
