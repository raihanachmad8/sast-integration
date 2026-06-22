import ExcelJS from 'exceljs';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';

// ═══════════════════════════════════════════════════════════════════
// Enterprise SAST Excel Workbook Generator
// Multi-sheet professional audit workbook with conditional formatting
// ═══════════════════════════════════════════════════════════════════

const SEV_FILL: Record<string, string> = {
  critical: 'FFDC2626',
  high: 'FFEA580C',
  medium: 'FFCA8A04',
  low: 'FF0284C7',
  info: 'FF64748B',
};

const SEV_FILL_SOFT: Record<string, string> = {
  critical: 'FFFEE2E2',
  high: 'FFFFEDD5',
  medium: 'FFFEF9C3',
  low: 'FFE0F2FE',
  info: 'FFF1F5F9',
};

const NAVY = 'FF0F172A';
const TEAL = 'FF0F766E';
const TEAL_SOFT = 'FFCCFBF1';
const SLATE_100 = 'FFF1F5F9';
const SLATE_700 = 'FF334155';
const WHITE = 'FFFFFFFF';

const FONT = 'Calibri';

interface Finding {
  id: string;
  rule: string | null;
  severity: string | null;
  filePath: string | null;
  lineNumber: number | null;
  scanner: string | null;
  status: string;
  message: string | null;
  cweId: string | null;
  confidence: string | null;
  description: string | null;
  repositoryName: string | null;
  codeSnippet: string | null;
  createdAt: Date;
}

function setBorder(cell: ExcelJS.Cell, style: Partial<ExcelJS.Borders> = {}) {
  const thin = { style: 'thin' as const, color: { argb: 'FFCBD5E1' } };
  cell.border = { top: thin, left: thin, bottom: thin, right: thin, ...style };
}

function titleStyle(cell: ExcelJS.Cell) {
  cell.font = { name: FONT, size: 18, bold: true, color: { argb: NAVY } };
  cell.alignment = { vertical: 'middle' };
}

function headerStyle(cell: ExcelJS.Cell, bg = NAVY) {
  cell.font = { name: FONT, size: 10, bold: true, color: { argb: WHITE } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  setBorder(cell);
}

function labelStyle(cell: ExcelJS.Cell) {
  cell.font = { name: FONT, size: 10, bold: true, color: { argb: 'FF64748B' } };
  cell.alignment = { vertical: 'middle' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_100 } };
  setBorder(cell);
}

function valueStyle(cell: ExcelJS.Cell) {
  cell.font = { name: FONT, size: 10, color: { argb: 'FF0F172A' } };
  cell.alignment = { vertical: 'middle' };
  setBorder(cell);
}

function getMetrics(findings: Finding[]) {
  const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const byStatus: Record<string, number> = { open: 0, resolved: 0, dismissed: 0 };
  const scannerSet = new Set<string>();
  const fileSet = new Set<string>();

  for (const f of findings) {
    const sev = (f.severity ?? 'info').toLowerCase();
    bySeverity[sev] = (bySeverity[sev] ?? 0) + 1;
    const st = (f.status ?? 'open').toLowerCase();
    byStatus[st] = (byStatus[st] ?? 0) + 1;
    if (f.scanner) scannerSet.add(f.scanner);
    if (f.filePath) fileSet.add(f.filePath);
  }

  const total = findings.length || 1;
  const criticalW = (bySeverity.critical / total) * 40;
  const highW = (bySeverity.high / total) * 30;
  const mediumW = (bySeverity.medium / total) * 20;
  const securityScore = Math.max(0, Math.round(100 - criticalW * 2.5 - highW * 1.8 - mediumW * 1.0));

  return { total, bySeverity, byStatus, securityScore, scanners: Array.from(scannerSet), files: fileSet.size };
}

// ─── Sheet 1: Executive Summary ────────────────────────────────────
function buildSummarySheet(wb: ExcelJS.Workbook, findings: Finding[], workspaceName: string) {
  const metrics = getMetrics(findings);
  const ws = wb.addWorksheet('Executive Summary', {
    properties: { tabColor: { argb: NAVY } },
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = [
    { width: 4 }, { width: 26 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 4 },
  ];

  ws.mergeCells('B2:F2');
  const banner = ws.getCell('B2');
  banner.value = 'STATIC APPLICATION SECURITY TESTING';
  banner.font = { name: FONT, size: 9, bold: true, color: { argb: TEAL } };
  banner.alignment = { vertical: 'middle', horizontal: 'left' };

  ws.mergeCells('B3:F4');
  const title = ws.getCell('B3');
  title.value = 'Security Audit Report';
  titleStyle(title);

  ws.mergeCells('B5:F5');
  const sub = ws.getCell('B5');
  sub.value = workspaceName;
  sub.font = { name: FONT, size: 13, color: { argb: SLATE_700 } };

  ws.mergeCells('B7:C9');
  const score = ws.getCell('B7');
  score.value = metrics.securityScore;
  score.font = { name: FONT, size: 56, bold: true, color: { argb: TEAL } };
  score.alignment = { vertical: 'middle', horizontal: 'center' };
  score.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_SOFT } };
  setBorder(score, {
    top: { style: 'thin', color: { argb: TEAL } },
    left: { style: 'thin', color: { argb: TEAL } },
    bottom: { style: 'thin', color: { argb: TEAL } },
    right: { style: 'thin', color: { argb: TEAL } },
  });

  ws.mergeCells('D7:F7');
  ws.getCell('D7').value = 'Security Score';
  ws.getCell('D7').font = { name: FONT, size: 11, bold: true, color: { argb: 'FF64748B' } };

  ws.mergeCells('D8:F8');
  ws.getCell('D8').value = `${metrics.total} total findings detected across ${metrics.files} files`;
  ws.getCell('D8').font = { name: FONT, size: 10, color: { argb: SLATE_700 } };

  ws.mergeCells('D9:F9');
  ws.getCell('D9').value = `Generated ${new Date().toLocaleDateString()}`;
  ws.getCell('D9').font = { name: FONT, size: 9, color: { argb: 'FF64748B' } };

  ws.mergeCells('B11:F11');
  ws.getCell('B11').value = 'Findings by Severity';
  ws.getCell('B11').font = { name: FONT, size: 12, bold: true, color: { argb: NAVY } };

  const sevs = ['critical', 'high', 'medium', 'low', 'info'];
  const sevCols = ['B', 'C', 'D', 'E', 'F'];
  sevs.forEach((sev, i) => {
    const col = sevCols[i];
    const c1 = ws.getCell(`${col}12`);
    c1.value = metrics.bySeverity[sev] ?? 0;
    c1.font = { name: FONT, size: 22, bold: true, color: { argb: WHITE } };
    c1.alignment = { vertical: 'middle', horizontal: 'center' };
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEV_FILL[sev] } };
    setBorder(c1);

    const c2 = ws.getCell(`${col}13`);
    c2.value = sev.toUpperCase();
    c2.font = { name: FONT, size: 9, bold: true, color: { argb: 'FF64748B' } };
    c2.alignment = { vertical: 'middle', horizontal: 'center' };
    c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEV_FILL_SOFT[sev] } };
    setBorder(c2);
  });

  ws.getRow(12).height = 38;
  ws.getRow(13).height = 18;

  ws.mergeCells('B15:F15');
  ws.getCell('B15').value = 'Scan Metadata';
  ws.getCell('B15').font = { name: FONT, size: 12, bold: true, color: { argb: NAVY } };

  const meta: [string, string][] = [
    ['Project', workspaceName],
    ['Scanners', metrics.scanners.join(', ') || 'N/A'],
    ['Files Analyzed', metrics.files.toLocaleString()],
    ['Generated', new Date().toUTCString()],
  ];
  meta.forEach(([k, v], i) => {
    const r = 17 + i;
    ws.mergeCells(`B${r}:C${r}`);
    labelStyle(ws.getCell(`B${r}`));
    ws.getCell(`B${r}`).value = k;
    ws.mergeCells(`D${r}:F${r}`);
    valueStyle(ws.getCell(`D${r}`));
    ws.getCell(`D${r}`).value = v;
    ws.getRow(r).height = 20;
  });

  const statusStart = 17 + meta.length + 1;
  ws.mergeCells(`B${statusStart}:F${statusStart}`);
  ws.getCell(`B${statusStart}`).value = 'Remediation Status';
  ws.getCell(`B${statusStart}`).font = { name: FONT, size: 12, bold: true, color: { argb: NAVY } };

  const statusRows: [string, number][] = [
    ['Open', metrics.byStatus.open],
    ['Resolved', metrics.byStatus.resolved],
    ['Dismissed', metrics.byStatus.dismissed],
  ];

  ws.getCell(`B${statusStart + 1}`).value = 'Status';
  headerStyle(ws.getCell(`B${statusStart + 1}`));
  ws.mergeCells(`B${statusStart + 1}:C${statusStart + 1}`);
  ws.getCell(`D${statusStart + 1}`).value = 'Count';
  headerStyle(ws.getCell(`D${statusStart + 1}`));
  ws.getCell(`E${statusStart + 1}`).value = 'Percentage';
  headerStyle(ws.getCell(`E${statusStart + 1}`));
  ws.mergeCells(`E${statusStart + 1}:F${statusStart + 1}`);

  statusRows.forEach(([k, v], i) => {
    const r = statusStart + 2 + i;
    ws.mergeCells(`B${r}:C${r}`);
    valueStyle(ws.getCell(`B${r}`));
    ws.getCell(`B${r}`).value = k;
    valueStyle(ws.getCell(`D${r}`));
    ws.getCell(`D${r}`).value = v;
    ws.getCell(`D${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.mergeCells(`E${r}:F${r}`);
    valueStyle(ws.getCell(`E${r}`));
    ws.getCell(`E${r}`).value = {
      formula: `IFERROR(D${r}/SUM($D$${statusStart + 2}:$D$${statusStart + 1 + statusRows.length}),0)`,
    };
    ws.getCell(`E${r}`).numFmt = '0.0%';
    ws.getCell(`E${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const totalR = statusStart + 2 + statusRows.length;
  ws.mergeCells(`B${totalR}:C${totalR}`);
  const tCell = ws.getCell(`B${totalR}`);
  tCell.value = 'Total';
  tCell.font = { name: FONT, size: 10, bold: true, color: { argb: WHITE } };
  tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  tCell.alignment = { vertical: 'middle' };
  setBorder(tCell);
  const tCount = ws.getCell(`D${totalR}`);
  tCount.value = { formula: `SUM(D${statusStart + 2}:D${totalR - 1})` };
  tCount.font = { name: FONT, size: 10, bold: true, color: { argb: WHITE } };
  tCount.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  tCount.alignment = { vertical: 'middle', horizontal: 'center' };
  setBorder(tCount);
  ws.mergeCells(`E${totalR}:F${totalR}`);
  const tPct = ws.getCell(`E${totalR}`);
  tPct.value = { formula: `SUM(E${statusStart + 2}:E${totalR - 1})` };
  tPct.font = { name: FONT, size: 10, bold: true, color: { argb: WHITE } };
  tPct.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  tPct.numFmt = '0.0%';
  tPct.alignment = { vertical: 'middle', horizontal: 'center' };
  setBorder(tPct);

  ws.getRow(2).height = 16;
  ws.getRow(3).height = 24;
  ws.getRow(4).height = 24;
  ws.getRow(7).height = 30;
  ws.getRow(8).height = 24;
  ws.getRow(9).height = 24;
  ws.getRow(11).height = 22;
  ws.getRow(15).height = 22;

  ws.views = [{ state: 'frozen', ySplit: 6 }];
}

// ─── Sheet 2: Findings ─────────────────────────────────────────────
function buildFindingsSheet(wb: ExcelJS.Workbook, findings: Finding[]) {
  const ws = wb.addWorksheet('Findings', {
    properties: { tabColor: { argb: 'FFDC2626' } },
    pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = [
    { width: 14, key: 'id' },
    { width: 12, key: 'sev' },
    { width: 38, key: 'rule' },
    { width: 34, key: 'file' },
    { width: 10, key: 'line' },
    { width: 12, key: 'status' },
    { width: 12, key: 'scanner' },
    { width: 50, key: 'message' },
  ];

  ws.mergeCells('A1:H1');
  const t = ws.getCell('A1');
  t.value = 'Security Findings — Detailed Register';
  t.font = { name: FONT, size: 16, bold: true, color: { argb: NAVY } };
  t.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:H2');
  const s = ws.getCell('A2');
  s.value = `${findings.length} findings  ·  generated ${new Date().toLocaleDateString()}`;
  s.font = { name: FONT, size: 10, color: { argb: 'FF64748B' } };
  ws.getRow(2).height = 18;

  const headers = ['ID', 'Severity', 'Rule', 'Location', 'Line', 'Status', 'Scanner', 'Message'];
  headers.forEach((h, i) => {
    const cell = ws.getCell(4, i + 1);
    cell.value = h;
    headerStyle(cell);
  });
  ws.getRow(4).height = 24;

  const ordered = [...findings].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return (order[(a.severity ?? 'info').toLowerCase()] ?? 4) - (order[(b.severity ?? 'info').toLowerCase()] ?? 4);
  });

  ordered.forEach((f, idx) => {
    const r = 5 + idx;
    const row = ws.getRow(r);
    row.values = [
      f.id.slice(0, 8),
      (f.severity ?? 'info').toUpperCase(),
      f.rule ?? '—',
      f.filePath ?? '—',
      f.lineNumber ?? 0,
      f.status,
      f.scanner ?? '—',
      f.message ?? '—',
    ];
    row.height = 48;

    row.eachCell({ includeEmpty: true }, (cell) => {
      valueStyle(cell);
      cell.alignment = { vertical: 'top', wrapText: true };
    });

    const sev = (f.severity ?? 'info').toLowerCase();
    const sevCell = ws.getCell(r, 2);
    sevCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEV_FILL[sev] ?? 'FF64748B' } };
    sevCell.font = { name: FONT, size: 10, bold: true, color: { argb: WHITE } };
    sevCell.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.getCell(r, 1).font = { name: FONT, size: 10, bold: true, color: { argb: NAVY } };
    ws.getCell(r, 4).font = { name: 'Consolas', size: 9, color: { argb: SLATE_700 } };
    ws.getCell(r, 5).alignment = { vertical: 'middle', horizontal: 'center' };

    if (sev === 'critical' || sev === 'high') {
      const tint = sev === 'critical' ? 'FFFEE2E2' : 'FFFFEDD5';
      for (let c = 1; c <= headers.length; c++) {
        if (c === 2) continue;
        const cell = ws.getCell(r, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tint } };
      }
    }
  });

  ws.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4 + ordered.length, column: headers.length },
  };

  ws.views = [{ state: 'frozen', ySplit: 4, xSplit: 0 }];
}

// ─── Sheet 3: Remediation Roadmap ──────────────────────────────────
function buildRoadmapSheet(wb: ExcelJS.Workbook, findings: Finding[]) {
  const ws = wb.addWorksheet('Remediation Roadmap', {
    properties: { tabColor: { argb: TEAL } },
    pageSetup: { orientation: 'landscape', fitToWidth: 1 },
  });

  ws.columns = [
    { width: 4 }, { width: 14 }, { width: 12 }, { width: 38 },
    { width: 18 }, { width: 14 }, { width: 26 }, { width: 4 },
  ];

  ws.mergeCells('B2:G2');
  const t = ws.getCell('B2');
  t.value = 'Remediation Roadmap';
  t.font = { name: FONT, size: 16, bold: true, color: { argb: NAVY } };
  ws.getRow(2).height = 26;

  ws.mergeCells('B3:G3');
  ws.getCell('B3').value = 'Sequenced remediation plan prioritized by risk.';
  ws.getCell('B3').font = { name: FONT, size: 10, color: { argb: 'FF64748B' } };

  const phases = [
    { name: 'Phase 1 — Immediate (≤ 48h)', color: SEV_FILL.critical, items: findings.filter((f) => (f.severity ?? '').toLowerCase() === 'critical') },
    { name: 'Phase 2 — Short-term (≤ 14d)', color: SEV_FILL.high, items: findings.filter((f) => (f.severity ?? '').toLowerCase() === 'high') },
    { name: 'Phase 3 — Medium-term (≤ 30d)', color: SEV_FILL.medium, items: findings.filter((f) => (f.severity ?? '').toLowerCase() === 'medium') },
    { name: 'Phase 4 — Backlog', color: SEV_FILL.low, items: findings.filter((f) => ['low', 'info'].includes((f.severity ?? '').toLowerCase())) },
  ];

  let row = 5;
  phases.forEach((p) => {
    ws.mergeCells(`B${row}:G${row}`);
    const phaseCell = ws.getCell(`B${row}`);
    phaseCell.value = p.name;
    phaseCell.font = { name: FONT, size: 11, bold: true, color: { argb: WHITE } };
    phaseCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: p.color } };
    phaseCell.alignment = { vertical: 'middle' };
    ws.getRow(row).height = 24;
    row++;

    const cols = ['ID', 'Severity', 'Finding', 'Location', 'Status', 'Owner'];
    cols.forEach((c, i) => {
      const cell = ws.getCell(row, 2 + i);
      cell.value = c;
      headerStyle(cell, SLATE_700);
    });
    ws.getRow(row).height = 20;
    row++;

    if (p.items.length === 0) {
      ws.mergeCells(`B${row}:G${row}`);
      ws.getCell(`B${row}`).value = 'No findings in this phase.';
      ws.getCell(`B${row}`).font = { name: FONT, size: 10, italic: true, color: { argb: 'FF64748B' } };
      row++;
    } else {
      p.items.forEach((f) => {
        ws.getCell(row, 2).value = f.id.slice(0, 8);
        ws.getCell(row, 3).value = (f.severity ?? 'info').toUpperCase();
        ws.getCell(row, 4).value = f.rule ?? '—';
        ws.getCell(row, 5).value = f.filePath ?? '—';
        ws.getCell(row, 6).value = f.status;
        ws.getCell(row, 7).value = '';
        for (let c = 2; c <= 7; c++) {
          valueStyle(ws.getCell(row, c));
          ws.getCell(row, c).alignment = { vertical: 'middle', wrapText: true };
        }
        const sevC = ws.getCell(row, 3);
        const sev = (f.severity ?? 'info').toLowerCase();
        sevC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEV_FILL[sev] ?? 'FF64748B' } };
        sevC.font = { name: FONT, size: 9, bold: true, color: { argb: WHITE } };
        sevC.alignment = { vertical: 'middle', horizontal: 'center' };
        ws.getCell(row, 4).font = { name: FONT, size: 10, color: { argb: NAVY } };
        ws.getCell(row, 5).font = { name: 'Consolas', size: 9, color: { argb: SLATE_700 } };
        ws.getRow(row).height = 24;
        row++;
      });
    }
    row++;
  });

  ws.views = [{ state: 'frozen', ySplit: 4 }];
}

// ═══════════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════════

export async function generateReportExcel(
  _type: string,
  workspaceId: string,
  workspaceName: string,
): Promise<Buffer> {
  const findings = await findingRepository.listByWorkspace(workspaceId, { page: 1, perPage: 10000 });
  const mappedFindings = findings.data.map((f) => ({ ...f, status: f.groupStatus ?? 'open' }));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SAST Integration';
  wb.created = new Date();
  wb.modified = new Date();
  wb.creator = 'SAST Integration';

  buildSummarySheet(wb, mappedFindings, workspaceName);
  buildFindingsSheet(wb, mappedFindings);
  buildRoadmapSheet(wb, mappedFindings);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
