import PDFDocument from 'pdfkit';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { logger } from '@/server/lib/logger';

// ═══════════════════════════════════════════════════════════════════
// Enterprise SAST PDF Report Generator
// Professional multi-section security audit book report
// ═══════════════════════════════════════════════════════════════════

const COLORS = {
  ink: '#0f172a',
  inkSoft: '#334155',
  muted: '#64748b',
  line: '#e2e8f0',
  surface: '#f8fafc',
  surfaceAlt: '#f1f5f9',
  accent: '#0f766e',
  accentSoft: '#ccfbf1',
  cover: '#0f172a',
  coverAccent: '#14b8a6',
  white: '#ffffff',
  codeBg: '#1e293b',
  codeFg: '#e2e8f0',
};

const SEV_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#0284c7',
  info: '#64748b',
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;

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

interface Metrics {
  total: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  securityScore: number;
  scanners: string[];
  files: number;
}

function getMetrics(findings: Finding[]): Metrics {
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
  const score = Math.max(0, Math.round(100 - criticalW * 2.5 - highW * 1.8 - mediumW * 1.0));

  return {
    total: findings.length,
    bySeverity,
    byStatus,
    securityScore: score,
    scanners: Array.from(scannerSet),
    files: fileSet.size,
  };
}

function fill(doc: PDFKit.PDFDocument, color: string) {
  doc.fillColor(color);
  return doc;
}

function font(doc: PDFKit.PDFDocument, family: 'Helvetica' | 'Helvetica-Bold' | 'Courier' | 'Courier-Bold' = 'Helvetica') {
  doc.font(family);
  return doc;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > PAGE_H - MARGIN - 40) {
    doc.addPage();
    doc.y = MARGIN;
    return true;
  }
  return false;
}

function hr(doc: PDFKit.PDFDocument, y: number, color = COLORS.line) {
  doc.save();
  doc.strokeColor(color);
  doc.lineWidth(0.75);
  doc.moveTo(MARGIN, y);
  doc.lineTo(PAGE_W - MARGIN, y);
  doc.stroke();
  doc.restore();
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string, num: string) {
  doc.save();
  doc.roundedRect(MARGIN, MARGIN, 44, 28, 6).fill(COLORS.accentSoft);
  fill(doc, COLORS.accent);
  font(doc, 'Helvetica-Bold').fontSize(13);
  doc.text(num, MARGIN, MARGIN + 7, { width: 44, align: 'center' });
  doc.restore();

  fill(doc, COLORS.ink);
  font(doc, 'Helvetica-Bold').fontSize(22);
  doc.text(title, MARGIN, MARGIN + 44);

  hr(doc, MARGIN + 80);
  doc.y = MARGIN + 100;
}

// ─── Cover Page ────────────────────────────────────────────────────
function buildCover(doc: PDFKit.PDFDocument, metrics: Metrics, workspaceName: string) {
  doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };

  doc.save();
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(COLORS.cover);
  doc.restore();

  doc.rect(0, 0, PAGE_W, 6).fill(COLORS.coverAccent);

  doc.save();
  doc.circle(PAGE_W - 60, 110, 180).lineWidth(1).strokeColor('#1e293b').stroke();
  doc.circle(PAGE_W - 60, 110, 130).lineWidth(1).strokeColor('#1e293b').stroke();
  doc.circle(PAGE_W - 60, 110, 80).lineWidth(1).strokeColor('#1e293b').stroke();
  doc.restore();

  doc.save();
  const sx = 70, sy = 90;
  doc.fillColor(COLORS.coverAccent);
  doc.moveTo(sx, sy);
  doc.lineTo(sx + 28, sy + 10);
  doc.lineTo(sx + 28, sy + 34);
  doc.quadraticCurveTo(sx + 28, sy + 52, sx, sy + 60);
  doc.quadraticCurveTo(sx - 28, sy + 52, sx - 28, sy + 34);
  doc.lineTo(sx - 28, sy + 10);
  doc.closePath();
  doc.fill();
  doc.strokeColor(COLORS.cover);
  doc.lineWidth(3);
  doc.moveTo(sx - 10, sy + 30);
  doc.lineTo(sx - 3, sy + 38);
  doc.lineTo(sx + 12, sy + 22);
  doc.stroke();
  doc.restore();

  fill(doc, COLORS.coverAccent);
  font(doc, 'Helvetica-Bold').fontSize(11);
  doc.text('STATIC APPLICATION SECURITY TESTING', 56, 180, { characterSpacing: 2 });

  fill(doc, COLORS.white);
  font(doc, 'Helvetica-Bold').fontSize(42);
  doc.text('Security Audit', 56, 210);
  doc.text('Report', 56, 258);

  fill(doc, '#94a3b8');
  font(doc, 'Helvetica').fontSize(16);
  doc.text(workspaceName, 56, 320);

  fill(doc, '#64748b');
  font(doc, 'Helvetica').fontSize(10);
  doc.text(`Generated   ${new Date().toUTCString()}`, 56, 360);
  doc.text(`Scanners    ${metrics.scanners.join(', ') || 'N/A'}`, 56, 376);
  doc.text(`Files       ${metrics.files.toLocaleString()}`, 56, 392);

  const gaugeX = 56, gaugeY = 470, gaugeW = PAGE_W - 112, gaugeH = 130;
  doc.save();
  doc.roundedRect(gaugeX, gaugeY, gaugeW, gaugeH, 12).fill('#1e293b');

  fill(doc, COLORS.white);
  font(doc, 'Helvetica-Bold').fontSize(64);
  doc.text(String(metrics.securityScore), gaugeX + 24, gaugeY + 28);

  fill(doc, COLORS.coverAccent);
  font(doc, 'Helvetica-Bold').fontSize(20);
  const scoreW = doc.widthOfString(String(metrics.securityScore));
  doc.text('/ 100', gaugeX + 24 + scoreW + 8, gaugeY + 56);

  fill(doc, '#94a3b8');
  font(doc, 'Helvetica').fontSize(9);
  doc.text('SECURITY SCORE', gaugeX + 24, gaugeY + 100, { characterSpacing: 1.5 });

  const barX = gaugeX + 200, barY = gaugeY + 40, barW = gaugeW - 230;
  doc.roundedRect(barX, barY, barW, 14, 7).fill('#0f172a');
  const fillW = (barW * metrics.securityScore) / 100;
  doc.roundedRect(barX, barY, fillW, 14, 7).fill(COLORS.coverAccent);

  fill(doc, '#94a3b8');
  font(doc, 'Helvetica').fontSize(9);
  let lx = barX;
  const items: [string, number][] = [
    ['Critical', metrics.bySeverity.critical],
    ['High', metrics.bySeverity.high],
    ['Medium', metrics.bySeverity.medium],
    ['Low', metrics.bySeverity.low],
  ];
  items.forEach(([label, count]) => {
    const sev = label.toLowerCase();
    doc.save();
    doc.circle(lx + 4, barY + 48, 4).fill(SEV_COLORS[sev] ?? '#64748b');
    doc.restore();
    fill(doc, '#cbd5e1');
    font(doc, 'Helvetica').fontSize(9);
    doc.text(`${label}: ${count}`, lx + 12, barY + 44);
    lx += 80;
  });

  fill(doc, '#cbd5e1');
  font(doc, 'Helvetica-Bold').fontSize(11);
  doc.text(
    `Total Findings: ${metrics.total}   ·   Open: ${metrics.byStatus.open}   ·   Resolved: ${metrics.byStatus.resolved}`,
    barX,
    barY + 68,
  );
  doc.restore();

  doc.save();
  doc.rect(0, PAGE_H - 80, PAGE_W, 80).fill('#1e293b');
  fill(doc, '#64748b');
  font(doc, 'Helvetica').fontSize(9);
  doc.text('SAST Integration  ·  Confidential — Distribution Restricted', 56, PAGE_H - 50);
  fill(doc, '#475569');
  doc.text(`Generated ${new Date().toUTCString()}`, 56, PAGE_H - 34);
  doc.restore();

  doc.addPage();
}

// ─── Table of Contents ─────────────────────────────────────────────
function buildToc(doc: PDFKit.PDFDocument) {
  doc.y = MARGIN;
  sectionTitle(doc, 'Table of Contents', '01');

  const items = [
    ['Executive Summary', '03'],
    ['Severity Distribution', '04'],
    ['Findings Overview', '05'],
    ['Remediation Roadmap', '06'],
  ];

  items.forEach(([title, page], i) => {
    const y = 180 + i * 36;
    fill(doc, COLORS.muted);
    font(doc, 'Helvetica').fontSize(10);
    doc.text(String(i + 1).padStart(2, '0'), MARGIN, y);

    fill(doc, COLORS.ink);
    font(doc, 'Helvetica-Bold').fontSize(13);
    doc.text(title, MARGIN + 36, y - 2);

    const titleW = doc.widthOfString(title);
    doc.save();
    doc.strokeColor(COLORS.line);
    doc.lineWidth(0.5);
    doc.dash(2, { space: 3 });
    doc.moveTo(MARGIN + 36 + titleW + 8, y + 8);
    doc.lineTo(PAGE_W - MARGIN - 30, y + 8);
    doc.stroke();
    doc.undash();
    doc.restore();

    fill(doc, COLORS.muted);
    font(doc, 'Helvetica').fontSize(11);
    doc.text(page, PAGE_W - MARGIN - 24, y - 2, { align: 'right', width: 24 });
  });

  doc.addPage();
}

// ─── Executive Summary ─────────────────────────────────────────────
function buildExecutiveSummary(doc: PDFKit.PDFDocument, metrics: Metrics) {
  sectionTitle(doc, 'Executive Summary', '02');

  fill(doc, COLORS.inkSoft);
  font(doc, 'Helvetica').fontSize(10.5);
  doc.text(
    `This report presents the findings of a static application security test (SAST) performed against the codebase. The analysis identified ${metrics.total} security findings across ${metrics.files} files using ${metrics.scanners.join(', ') || 'multiple scanners'}.`,
    { width: PAGE_W - MARGIN * 2, lineGap: 4 },
  );
  doc.moveDown();

  doc.text(
    `A total of ${metrics.total} security findings were identified, of which ${metrics.bySeverity.critical} are rated Critical, ${metrics.bySeverity.high} High, ${metrics.bySeverity.medium} Medium, ${metrics.bySeverity.low} Low, and ${metrics.bySeverity.info} Informational. The aggregate security score for this release is ${metrics.securityScore} / 100.`,
    { width: PAGE_W - MARGIN * 2, lineGap: 4 },
  );
  doc.moveDown(0.5);

  const cardW = (PAGE_W - MARGIN * 2 - 18) / 4;
  const cardH = 76;
  const cards = [
    { label: 'TOTAL FINDINGS', value: String(metrics.total), color: COLORS.ink },
    { label: 'CRITICAL', value: String(metrics.bySeverity.critical), color: SEV_COLORS.critical },
    { label: 'HIGH', value: String(metrics.bySeverity.high), color: SEV_COLORS.high },
    { label: 'SECURITY SCORE', value: `${metrics.securityScore}`, color: COLORS.accent },
  ];
  cards.forEach((c, i) => {
    const x = MARGIN + i * (cardW + 6);
    const y = doc.y;
    doc.save();
    doc.roundedRect(x, y, cardW, cardH, 8).fill(COLORS.surface);
    doc.roundedRect(x, y, 4, cardH, 2).fill(c.color);
    fill(doc, COLORS.muted);
    font(doc, 'Helvetica-Bold').fontSize(7.5);
    doc.text(c.label, x + 14, y + 16, { characterSpacing: 1 });
    fill(doc, c.color);
    font(doc, 'Helvetica-Bold').fontSize(26);
    doc.text(c.value, x + 14, y + 32);
    doc.restore();
  });

  doc.y += cardH + 16;

  fill(doc, COLORS.ink);
  font(doc, 'Helvetica-Bold').fontSize(12);
  doc.text('Remediation Status', MARGIN, doc.y);
  doc.moveDown(0.5);

  const statusEntries = Object.entries(metrics.byStatus);
  const total = statusEntries.reduce((s, [, n]) => s + n, 0) || 1;
  const statusColors: Record<string, string> = {
    open: '#dc2626',
    resolved: '#16a34a',
    dismissed: '#0d9488',
  };
  let cursor = MARGIN;
  const barTotalW = PAGE_W - MARGIN * 2;
  statusEntries.forEach(([status, count]) => {
    const w = (barTotalW * count) / total;
    doc.save();
    doc.rect(cursor, doc.y, w, 24).fill(statusColors[status] ?? COLORS.muted);
    doc.restore();
    cursor += w;
  });
  doc.y += 32;
  cursor = MARGIN;
  statusEntries.forEach(([status, count]) => {
    fill(doc, COLORS.inkSoft);
    font(doc, 'Helvetica-Bold').fontSize(9);
    doc.text(status, cursor, doc.y, { width: 90 });
    fill(doc, COLORS.muted);
    font(doc, 'Helvetica').fontSize(9);
    doc.text(`${count} (${Math.round((count / total) * 100)}%)`, cursor, doc.y + 12, { width: 90 });
    cursor += 110;
  });

  doc.addPage();
}

// ─── Severity Distribution ─────────────────────────────────────────
function buildSeverityChart(doc: PDFKit.PDFDocument, metrics: Metrics) {
  sectionTitle(doc, 'Severity Distribution', '03');

  fill(doc, COLORS.inkSoft);
  font(doc, 'Helvetica').fontSize(10.5);
  doc.text(
    'The chart below illustrates the distribution of identified findings by severity rating. Critical and High severity items require immediate remediation before release.',
    { width: PAGE_W - MARGIN * 2, lineGap: 4 },
  );
  doc.moveDown(2);

  const chartX = MARGIN + 90;
  const chartW = PAGE_W - MARGIN - chartX - 20;
  const entries: [string, number][] = [
    ['critical', metrics.bySeverity.critical],
    ['high', metrics.bySeverity.high],
    ['medium', metrics.bySeverity.medium],
    ['low', metrics.bySeverity.low],
    ['info', metrics.bySeverity.info],
  ];
  const max = Math.max(...entries.map(([, n]) => n), 1);
  const chartStartY = doc.y;

  entries.forEach(([sev, count], i) => {
    const y = chartStartY + i * 42;
    doc.save();
    doc.roundedRect(MARGIN, y, 80, 28, 6).fill(SEV_COLORS[sev] ?? '#64748b');
    fill(doc, COLORS.white);
    font(doc, 'Helvetica-Bold').fontSize(10);
    doc.text(sev.toUpperCase(), MARGIN, y + 9, { width: 80, align: 'center' });
    doc.restore();

    const bw = (chartW * count) / max;
    doc.save();
    doc.roundedRect(chartX, y + 4, chartW, 20, 4).fill(COLORS.surface);
    doc.roundedRect(chartX, y + 4, bw, 20, 4).fill(SEV_COLORS[sev] ?? '#64748b');
    fill(doc, COLORS.ink);
    font(doc, 'Helvetica-Bold').fontSize(12);
    doc.text(String(count), chartX + bw + 8, y + 7, { lineBreak: false });
    doc.restore();
  });

  doc.y = chartStartY + entries.length * 42 + 30;
  doc.addPage();
}

// ─── Findings Table ────────────────────────────────────────────────
function buildFindingsTable(doc: PDFKit.PDFDocument, findings: Finding[]) {
  sectionTitle(doc, 'Findings Overview', '04');

  fill(doc, COLORS.inkSoft);
  font(doc, 'Helvetica').fontSize(10.5);
  doc.text(
    'Summary of all findings detected during the scan, ordered by severity.',
    { width: PAGE_W - MARGIN * 2, lineGap: 4 },
  );

  // Explicitly position header right after description
  const headerY = doc.y + 4;

  const cols = [
    { key: 'id', label: 'ID', w: 60 },
    { key: 'sev', label: 'Severity', w: 64 },
    { key: 'title', label: 'Finding', w: 168 },
    { key: 'file', label: 'Location', w: 130 },
    { key: 'cwe', label: 'CWE', w: 55 },
  ];
  const totalW = cols.reduce((s, c) => s + c.w, 0);

  doc.save();
  doc.rect(MARGIN, headerY, totalW, 24).fill(COLORS.ink);
  let cx = MARGIN;
  cols.forEach((c) => {
    fill(doc, COLORS.white);
    font(doc, 'Helvetica-Bold').fontSize(8.5);
    doc.text(c.label, cx + 6, headerY + 8, { width: c.w - 6 });
    cx += c.w;
  });
  doc.restore();
  doc.y = headerY + 24;

  const ordered = [...findings].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return (order[(a.severity ?? 'info').toLowerCase()] ?? 4) - (order[(b.severity ?? 'info').toLowerCase()] ?? 4);
  });

  ordered.slice(0, 80).forEach((f, i) => {
    if (ensureSpace(doc, 36)) {
      // Explicitly position header on new page
      const newPageHeaderY = doc.y;
      doc.save();
      doc.rect(MARGIN, newPageHeaderY, totalW, 24).fill(COLORS.ink);
      let hx = MARGIN;
      cols.forEach((c) => {
        fill(doc, COLORS.white);
        font(doc, 'Helvetica-Bold').fontSize(8.5);
        doc.text(c.label, hx + 6, newPageHeaderY + 8, { width: c.w - 6 });
        hx += c.w;
      });
      doc.restore();
      doc.y = newPageHeaderY + 24;
    }

    const rowH = 28;
    const y = doc.y;
    if (i % 2 === 0) {
      doc.save();
      doc.rect(MARGIN, y, totalW, rowH).fill(COLORS.surface);
      doc.restore();
    }

    cx = MARGIN;
    fill(doc, COLORS.ink);
    font(doc, 'Helvetica-Bold').fontSize(8);
    doc.text(f.id.slice(0, 8), cx + 6, y + 8, { width: cols[0].w - 6 });
    cx += cols[0].w;

    const sev = (f.severity ?? 'info').toLowerCase();
    doc.save();
    doc.roundedRect(cx + 4, y + 5, cols[1].w - 8, 16, 4).fill(SEV_COLORS[sev] ?? '#64748b');
    fill(doc, COLORS.white);
    font(doc, 'Helvetica-Bold').fontSize(7.5);
    doc.text(sev.toUpperCase(), cx + 4, y + 8, { width: cols[1].w - 8, align: 'center' });
    doc.restore();
    cx += cols[1].w;

    fill(doc, COLORS.ink);
    font(doc, 'Helvetica-Bold').fontSize(8);
    doc.text(f.rule ?? '—', cx + 6, y + 5, { width: cols[2].w - 8, height: 18, ellipsis: true });
    cx += cols[2].w;

    fill(doc, COLORS.muted);
    font(doc, 'Courier').fontSize(7);
    doc.text(f.filePath ?? '—', cx + 6, y + 5, { width: cols[3].w - 8, height: 18, ellipsis: true });
    cx += cols[3].w;

    fill(doc, COLORS.accent);
    font(doc, 'Helvetica-Bold').fontSize(8);
    doc.text(f.cweId ?? '—', cx + 6, y + 8, { width: cols[4].w - 6 });

    doc.y = y + rowH;
  });

  doc.addPage();
}

// ─── Detailed Findings ──────────────────────────────────────────────
function buildDetailedFindings(doc: PDFKit.PDFDocument, findings: Finding[]) {
  sectionTitle(doc, 'Detailed Findings', '05');

  fill(doc, COLORS.inkSoft);
  font(doc, 'Helvetica').fontSize(10.5);
  doc.text(
    'Each finding below includes the description, affected location, vulnerable code excerpt (if available), and remediation guidance. Findings are ordered by severity.',
    { width: PAGE_W - MARGIN * 2, lineGap: 4 },
  );
  doc.moveDown(1);

  const ordered = [...findings].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return (order[(a.severity ?? 'info').toLowerCase()] ?? 4) - (order[(b.severity ?? 'info').toLowerCase()] ?? 4);
  });

  ordered.slice(0, 40).forEach((f, idx) => {
    const needed = 280;
    if (ensureSpace(doc, needed)) {
      fill(doc, COLORS.muted);
      font(doc, 'Helvetica').fontSize(8);
      doc.text('Detailed Findings (continued)', MARGIN, doc.y + 4);
      hr(doc, doc.y + 18);
      doc.y += 30;
    }

    const startY = doc.y;

    // severity ribbon
    doc.save();
    doc.rect(MARGIN, startY, 4, 28).fill(SEV_COLORS[(f.severity ?? 'info').toLowerCase()] ?? '#64748b');
    doc.restore();

    // severity badge top-right
    doc.save();
    doc.roundedRect(PAGE_W - MARGIN - 80, startY, 80, 18, 4).fill(SEV_COLORS[(f.severity ?? 'info').toLowerCase()] ?? '#64748b');
    fill(doc, COLORS.white);
    font(doc, 'Helvetica-Bold').fontSize(9);
    doc.text((f.severity ?? 'info').toUpperCase(), PAGE_W - MARGIN - 80, startY + 4, {
      width: 80,
      align: 'center',
    });
    doc.restore();

    // finding ID
    fill(doc, COLORS.muted);
    font(doc, 'Helvetica-Bold').fontSize(8);
    doc.text(f.id.slice(0, 12), MARGIN + 12, startY + 2);

    // title (below ID with spacing)
    fill(doc, COLORS.ink);
    font(doc, 'Helvetica-Bold').fontSize(13);
    doc.text(f.rule ?? 'Unknown Finding', MARGIN + 12, startY + 16, {
      width: PAGE_W - MARGIN * 2 - 90,
    });

    doc.y = startY + 36;

    // meta row: CWE | Confidence | Status | Scanner
    fill(doc, COLORS.muted);
    font(doc, 'Helvetica-Bold').fontSize(8);
    const parts = [
      f.cweId ? `CWE-${f.cweId}` : null,
      f.confidence ? `Confidence: ${f.confidence}` : null,
      `Status: ${f.status}`,
      f.scanner ? `Scanner: ${f.scanner}` : null,
    ].filter(Boolean);
    doc.text(parts.join('  |  '), MARGIN, doc.y, { width: PAGE_W - MARGIN * 2 });
    doc.y += 16;

    // location
    fill(doc, COLORS.muted);
    font(doc, 'Helvetica-Bold').fontSize(8);
    doc.text('LOCATION', MARGIN, doc.y, { characterSpacing: 1 });
    doc.y += 14;
    fill(doc, COLORS.ink);
    font(doc, 'Courier').fontSize(9);
    const loc = f.filePath ?? '—';
    const lineInfo = f.lineNumber ? `  (line ${f.lineNumber})` : '';
    doc.text(`${loc}${lineInfo}`, MARGIN + 4, doc.y, {
      width: PAGE_W - MARGIN * 2 - 8,
    });
    doc.y += 18;

    // description
    fill(doc, COLORS.muted);
    font(doc, 'Helvetica-Bold').fontSize(8);
    doc.text('DESCRIPTION', MARGIN, doc.y, { characterSpacing: 1 });
    doc.y += 14;
    fill(doc, COLORS.inkSoft);
    font(doc, 'Helvetica').fontSize(9.5);
    doc.text(f.message ?? f.description ?? 'No description available.', MARGIN, doc.y, {
      width: PAGE_W - MARGIN * 2,
      lineGap: 3,
    });
    doc.y += 14;

    // code block (if available)
    if (f.codeSnippet) {
      fill(doc, COLORS.muted);
      font(doc, 'Helvetica-Bold').fontSize(8);
      doc.text('VULNERABLE CODE', MARGIN, doc.y, { characterSpacing: 1 });
      doc.y += 12;
      const codeLines = f.codeSnippet.split('\n');
      const codeH = codeLines.length * 11 + 16;
      if (ensureSpace(doc, codeH + 30)) {
        fill(doc, COLORS.muted);
        font(doc, 'Helvetica').fontSize(8);
        doc.text('Detailed Findings (continued)', MARGIN, doc.y + 4);
        hr(doc, doc.y + 18);
        doc.y += 30;
      }
      const codeTop = doc.y;
      doc.save();
      doc.roundedRect(MARGIN, codeTop, PAGE_W - MARGIN * 2, codeH, 6).fill(COLORS.codeBg);
      codeLines.forEach((line, i) => {
        const ly = codeTop + 10 + i * 11;
        fill(doc, '#64748b');
        font(doc, 'Courier').fontSize(8.5);
        doc.text(String(i + 1).padStart(2, ' '), MARGIN + 8, ly, { width: 18 });
        fill(doc, COLORS.codeFg);
        doc.text(line, MARGIN + 30, ly, {
          width: PAGE_W - MARGIN * 2 - 40,
          lineBreak: false,
        });
      });
      doc.restore();
      doc.y = codeTop + codeH + 14;
    }

    // remediation
    ensureSpace(doc, 60);
    fill(doc, COLORS.muted);
    font(doc, 'Helvetica-Bold').fontSize(8);
    doc.text('REMEDIATION', MARGIN, doc.y, { characterSpacing: 1 });
    doc.y += 14;
    fill(doc, COLORS.accent);
    font(doc, 'Helvetica').fontSize(9.5);
    doc.text(
      'Review and remediate this finding according to secure coding best practices. Refer to the CWE reference for detailed guidance.',
      MARGIN,
      doc.y,
      { width: PAGE_W - MARGIN * 2, lineGap: 3 },
    );
    doc.y += 24;

    // separator
    if (idx < ordered.length - 1) {
      hr(doc, doc.y, COLORS.line);
      doc.y += 16;
    }
  });

  doc.addPage();
}

// ─── Remediation Roadmap ───────────────────────────────────────────
function buildRemediationRoadmap(doc: PDFKit.PDFDocument, findings: Finding[]) {
  sectionTitle(doc, 'Remediation Roadmap', '05');

  fill(doc, COLORS.inkSoft);
  font(doc, 'Helvetica').fontSize(10.5);
  doc.text(
    'The roadmap below sequences remediation activities by risk priority. Critical findings should be addressed before the next release; High severity items within 14 days; Medium within 30 days; and Low/Informational items within the next sprint cycle.',
    { width: PAGE_W - MARGIN * 2, lineGap: 4 },
  );
  doc.moveDown(1.5);

  const phases = [
    {
      phase: 'Phase 1 — Immediate (≤ 48h)',
      color: SEV_COLORS.critical,
      items: findings.filter((f) => (f.severity ?? '').toLowerCase() === 'critical'),
    },
    {
      phase: 'Phase 2 — Short-term (≤ 14d)',
      color: SEV_COLORS.high,
      items: findings.filter((f) => (f.severity ?? '').toLowerCase() === 'high'),
    },
    {
      phase: 'Phase 3 — Medium-term (≤ 30d)',
      color: SEV_COLORS.medium,
      items: findings.filter((f) => (f.severity ?? '').toLowerCase() === 'medium'),
    },
    {
      phase: 'Phase 4 — Backlog',
      color: SEV_COLORS.low,
      items: findings.filter((f) => ['low', 'info'].includes((f.severity ?? '').toLowerCase())),
    },
  ];

  phases.forEach((p) => {
    ensureSpace(doc, 80 + p.items.length * 18);
    const y = doc.y;
    doc.save();
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 28, 6).fill(p.color);
    fill(doc, COLORS.white);
    font(doc, 'Helvetica-Bold').fontSize(11);
    doc.text(p.phase, MARGIN + 12, y + 8);
    doc.restore();
    doc.y = y + 38;

    if (p.items.length === 0) {
      fill(doc, COLORS.muted);
      font(doc, 'Helvetica').fontSize(9.5);
      doc.text('No findings in this phase.', MARGIN + 12, doc.y);
      doc.y += 18;
    } else {
      p.items.forEach((f) => {
        fill(doc, COLORS.ink);
        font(doc, 'Helvetica').fontSize(9.5);
        doc.text('•', MARGIN + 12, doc.y, { width: 12 });
        doc.text(`${f.id.slice(0, 8)}: ${f.rule ?? 'Unknown'}`, MARGIN + 24, doc.y, {
          width: PAGE_W - MARGIN * 2 - 24,
        });
        doc.y += 16;
      });
    }
    doc.y += 12;
  });

  doc.y += 16;
  ensureSpace(doc, 100);

  // Calculate content height first
  const titleText = 'Continuous Security Posture';
  const descText = 'Integrate SAST scanning into your CI/CD pipeline to catch vulnerabilities before they reach production. Combine with SCA, DAST, and IaC scanning for defense-in-depth.';
  const boxX = MARGIN;
  const boxW = PAGE_W - MARGIN * 2;
  const padding = 16;
  const titleY = doc.y + padding;
  const descY = titleY + 18;
  const descHeight = doc.heightOfString(descText, { width: boxW - padding * 2, lineGap: 3 });
  const boxH = padding + 18 + descHeight + padding;

  doc.save();
  doc.roundedRect(boxX, doc.y, boxW, boxH, 8).fill(COLORS.accentSoft);
  fill(doc, COLORS.accent);
  font(doc, 'Helvetica-Bold').fontSize(11);
  doc.text(titleText, boxX + padding, titleY, { width: boxW - padding * 2 });
  fill(doc, COLORS.inkSoft);
  font(doc, 'Helvetica').fontSize(9.5);
  doc.text(descText, boxX + padding, descY, { width: boxW - padding * 2, lineGap: 3 });
  doc.restore();
  doc.y += boxH;
}

// ─── Footer ────────────────────────────────────────────────────────
function buildFooter(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    if (i === range.start) continue;
    doc.page.margins = { top: MARGIN, bottom: 0, left: MARGIN, right: MARGIN };
    doc.save();
    doc.fillColor(COLORS.muted);
    font(doc, 'Helvetica').fontSize(8);
    doc.text('SAST Integration  ·  Confidential', MARGIN, PAGE_H - 38, {
      width: PAGE_W - MARGIN * 2,
      align: 'left',
      lineBreak: false,
    });
    const pageNum = i - range.start + 1;
    doc.text(`${pageNum} / ${range.count}`, MARGIN, PAGE_H - 38, {
      width: PAGE_W - MARGIN * 2,
      align: 'right',
      lineBreak: false,
    });
    doc.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════════

export async function generateReportPdf(
  _type: string,
  workspaceId: string,
  workspaceName: string,
): Promise<Buffer> {
  const findings = await findingRepository.listByWorkspace(workspaceId, { page: 1, perPage: 10000 });
  const mappedFindings = findings.data.map((f) => ({ ...f, status: f.groupStatus ?? 'open' }));
  const metrics = getMetrics(mappedFindings);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: `SAST Security Report — ${workspaceName}`,
        Author: 'SAST Integration',
        Subject: 'Static Application Security Testing Report',
        Creator: 'SAST Integration',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    buildCover(doc, metrics, workspaceName);
    buildToc(doc);
    buildExecutiveSummary(doc, metrics);
    buildSeverityChart(doc, metrics);
    buildFindingsTable(doc, mappedFindings);
    buildDetailedFindings(doc, mappedFindings);
    buildRemediationRoadmap(doc, mappedFindings);
    buildFooter(doc);

    doc.end();
  });
}
