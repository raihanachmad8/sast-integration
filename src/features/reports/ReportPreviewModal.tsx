'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Modal, Segmented, Spin, Tag, Typography, theme } from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  ReloadOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { REPORT_FORMAT } from '@/commons/constants/layout';
import { reportsApi } from '@/modules/reports/api';
import type { ReportRow } from '@/commons/types/reports';

const PdfViewer = dynamic(() => import('./PdfViewer').then((m) => m.PdfViewer), { ssr: false, loading: () => <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 420 }}><Spin description="Memuat PDF..." /></div> });

/* ── helpers ──────────────────────────────────────────── */

const S3_STATUS_MAP: Record<string, string> = {
  ready: 'completed',
  pending: 'generating',
  failed: 'failed',
  archived: 'archived',
};

const S3_STATUS_COLOR: Record<string, string> = {
  completed: 'success',
  generating: 'processing',
  failed: 'error',
  archived: 'default',
};

const FILE_ICONS: Record<string, typeof FilePdfOutlined> = {
  pdf: FilePdfOutlined,
  xlsx: FileExcelOutlined,
  csv: FileTextOutlined,
};

function getToken(): string {
  try {
    return (window as unknown as Record<string, string>).__accessToken ?? '';
  } catch {
    return '';
  }
}

/* ── Excel preview data types ───────────────────────── */

interface ExcelCell {
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

interface ExcelSheet {
  name: string;
  tabColor?: string;
  rows: ExcelCell[][];
  colCount: number;
  rowCount: number;
}

interface ExcelPreviewData {
  sheets: ExcelSheet[];
  generatedAt: string;
}

/* ── props ──────────────────────────────────────────── */

export interface ReportPreviewModalProps {
  open: boolean;
  report: ReportRow | null;
  workspaceId?: string;
  onClose: () => void;
  onDownload?: (report: ReportRow) => void;
}

/* ── component ──────────────────────────────────────── */

/**
 * Modal for previewing a report with tabbed PDF viewer and metadata details.
 *
 * Loads the report PDF via API and displays it alongside report metadata (type, project, dates).
 *
 * @param props - {@link ReportPreviewModalProps}
 * @returns JSX element rendering the report preview modal with PDF viewer and details tabs.
 *
 * @example
 * <ReportPreviewModal
 *   open={true}
 *   report={reportRow}
 *   workspaceId="ws_123"
 *   onClose={() => setOpen(false)}
 *   onDownload={(r) => downloadReport(r)}
 * />
 */
const ReportPreviewModal = React.memo(function ReportPreviewModal({
  open,
  report,
  workspaceId,
  onClose,
  onDownload,
}: ReportPreviewModalProps) {
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState<'preview' | 'details'>('preview');

  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [excelData, setExcelData] = useState<ExcelPreviewData | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);

  const ext = report?.format ?? 'pdf';
  const Icon = FILE_ICONS[ext] ?? FileTextOutlined;
  const wsId = workspaceId ?? report?.workspaceId;

  const reportRange = useMemo(() => {
    if (!report?.filters || typeof report.filters !== 'object') return undefined;
    const f = report.filters as Record<string, unknown>;
    return typeof f.range === 'string' ? f.range : undefined;
  }, [report?.filters]);

  /* ── PDF preview ─────────────────────────────────── */

  const loadPdf = useCallback(async () => {
    if (!report || !wsId) return;
    setPdfLoading(true);
    setPdfError(null);

    try {
      const url = ENDPOINTS.REPORTS.PREVIEW(wsId, report.id);
      const token = getToken();

      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.arrayBuffer();
      setPdfData(data);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Gagal memuat PDF');
    } finally {
      setPdfLoading(false);
    }
  }, [report, wsId]);

  /* ── Excel preview ────────────────────────────────── */

  const loadExcel = useCallback(async () => {
    if (!report || !wsId) return;
    setExcelLoading(true);
    setExcelError(null);

    try {
      const data = await reportsApi.fetchPreviewJson<ExcelPreviewData>(wsId, report.id);
      setExcelData(data);
      setActiveSheet(0);
    } catch (err) {
      setExcelError(err instanceof Error ? err.message : 'Gagal memuat data Excel');
    } finally {
      setExcelLoading(false);
    }
  }, [report, wsId]);

  /* ── load on open ──────────────────────────────────── */

  useEffect(() => {
    if (open && report) {
      if (ext === REPORT_FORMAT.PDF) loadPdf();
      else if (ext === REPORT_FORMAT.XLSX) loadExcel();
    }

    return () => {
      setPdfData(null);
      setPdfError(null);
      setExcelData(null);
      setExcelError(null);
      setActiveTab('preview');
    };
  }, [open, report, ext, loadPdf, loadExcel]);

  /* ── column letters ─────────────────────────────────── */

  const columnLetters = useMemo(() => {
    const cols: string[] = [];
    for (let i = 0; i < 12; i++) cols.push(String.fromCharCode(65 + i));
    return cols;
  }, []);

  /* ── render ────────────────────────────────────────── */

  if (!report) return null;

  const loading = ext === REPORT_FORMAT.PDF ? pdfLoading : excelLoading;
  const error = ext === REPORT_FORMAT.PDF ? pdfError : excelError;
  const reportDate = report.createdAt
    ? format(new Date(report.createdAt), 'dd MMM yyyy, HH:mm')
    : '-';
  const sizeKb = report.fileSize ? Math.round(report.fileSize / 1024) : null;
  const currentSheet = excelData?.sheets?.[activeSheet];

  return (
    <Modal
      open={open}
      title={
        <span style={{ fontSize: token.fontSize }}>
          <Icon style={{ marginRight: token.marginXXS, color: ext === REPORT_FORMAT.PDF ? token.colorError : token.colorSuccess }} />
          {report.title}
        </span>
      }
      onCancel={onClose}
      width={900}
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: token.fontSizeSM, color: token.colorTextTertiary }}>
            {reportDate} {sizeKb !== null && ` \u00B7 ${sizeKb} KB`}
          </div>
          <div style={{ display: 'flex', gap: token.marginXXS }}>
            <Button onClick={onClose}>Tutup</Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => onDownload?.(report)}
            >
              Unduh
            </Button>
          </div>
        </div>
      }
    >
      {/* Status bar */}
      <div style={{ display: 'flex', gap: token.marginXXS, marginBottom: token.marginXS }}>
        <Tag color={S3_STATUS_COLOR[S3_STATUS_MAP[report.status ?? 'pending']] ?? 'default'}>
          {(S3_STATUS_MAP[report.status ?? 'pending'] ?? report.status ?? 'unknown').toUpperCase()}
        </Tag>
        <Tag>{ext.toUpperCase()}</Tag>
        {report.type && <Tag>{report.type}</Tag>}
      </div>

      {/* Tabs */}
      <Segmented
        size="small"
        block
        value={activeTab}
        onChange={(v) => setActiveTab(v as 'preview' | 'details')}
        options={[
          { label: 'Preview', value: 'preview', icon: <TableOutlined /> },
          { label: 'Details', value: 'details', icon: <FileTextOutlined /> },
        ]}
        style={{ marginBottom: token.marginXS }}
      />

      {/* Preview pane */}
      {activeTab === 'preview' && (
        <div
          style={{
            background: token.colorBgLayout,
            borderRadius: token.borderRadius,
            overflow: 'hidden',
            minHeight: token.sizeXXL * 8.75,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: token.sizeXXL * 8.33 }}>
              <Spin description="Memuat preview..." />
            </div>
          )}

          {error && (
            <div style={{ padding: token.paddingXL, textAlign: 'center' }}>
              <Typography.Text type="danger">{error}</Typography.Text>
              <br />
              <Button icon={<ReloadOutlined />} style={{ marginTop: token.marginXS }} onClick={ext === REPORT_FORMAT.PDF ? loadPdf : loadExcel}>
                Coba lagi
              </Button>
            </div>
          )}

          {!loading && !error && ext === REPORT_FORMAT.PDF && pdfData && (
            <PdfViewer data={pdfData} />
          )}

          {!loading && !error && ext === REPORT_FORMAT.PDF && !pdfData && (
            <div style={{ padding: token.paddingXL, textAlign: 'center', color: token.colorTextTertiary }}>Preview tidak tersedia</div>
          )}

          {!loading && !error && ext === REPORT_FORMAT.XLSX && currentSheet && (
            <div style={{ maxHeight: token.sizeXXL * 8.75, overflow: 'auto' }}>
              {excelData && excelData.sheets.length > 1 && (
                <div style={{ display: 'flex', gap: token.marginXXS, padding: `${token.paddingXS}px ${token.paddingXS}px`, borderBottom: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer, position: 'sticky', top: 0, zIndex: 1 }}>
                  {excelData.sheets.map((sheet, idx) => (
                    <Button
                      key={sheet.name}
                      size="small"
                      type={activeSheet === idx ? 'primary' : 'text'}
                      onClick={() => setActiveSheet(idx)}
                    >
                      {sheet.name}
                    </Button>
                  ))}
                </div>
              )}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: token.fontSizeSM,
                  fontFamily: 'Consolas, monospace',
                  tableLayout: 'fixed',
                }}
              >
                <thead>
                    <tr style={{ background: token.colorBgLayout, position: 'sticky', top: 0, zIndex: 1 }}>
                    {columnLetters.slice(0, currentSheet.colCount).map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: `${token.paddingXXS}px ${token.paddingXS}px`,
                          border: `1px solid ${token.colorBorderSecondary}`,
                          fontWeight: token.fontWeightStrong,
                          textAlign: 'center',
                          color: token.colorTextSecondary,
                          width: col === 'A' ? 50 : undefined,
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentSheet.rows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => {
                        if (cell.isMerged) return null;
                        return (
                          <td
                            key={cellIdx}
                            colSpan={cell.mergedSpan}
                            style={{
                              padding: `${token.paddingXXS}px ${token.paddingXS}px`,
                              border: `1px solid ${token.colorBorderSecondary}`,
                              background: cell.bg,
                              color: cell.color,
                              fontWeight: cell.bold ? token.fontWeightStrong : undefined,
                              fontStyle: cell.italic ? 'italic' : undefined,
                              fontSize: cell.fontSize ? Math.min(cell.fontSize, 14) : undefined,
                              fontFamily: cell.fontName,
                              textAlign: cell.align as 'left' | 'center' | 'right',
                              maxWidth: 120,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={cell.value}
                          >
                            {cell.value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && ext === REPORT_FORMAT.XLSX && !currentSheet && (
            <div style={{ padding: token.paddingXL, textAlign: 'center', color: token.colorTextTertiary }}>Tidak ada data</div>
          )}

          {!loading && !error && ![REPORT_FORMAT.PDF, REPORT_FORMAT.XLSX].includes(ext as typeof REPORT_FORMAT.PDF) && (
            <div style={{ padding: token.paddingXL, textAlign: 'center', color: token.colorTextTertiary }}>
              Preview tidak tersedia untuk format {ext.toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Details pane */}
      {activeTab === 'details' && (
        <div
          style={{
            background: token.colorBgLayout,
            borderRadius: token.borderRadius,
            padding: token.padding,
            minHeight: 420,
          }}
        >
          <table style={{ width: '100%', fontSize: token.fontSize }}>
            <tbody>
              <tr><td style={{ color: token.colorTextTertiary, padding: `${token.paddingXS}px 0`, width: 120 }}>Judul</td><td style={{ padding: `${token.paddingXS}px 0` }}>{report.title}</td></tr>
              <tr><td style={{ color: token.colorTextTertiary, padding: `${token.paddingXS}px 0` }}>Jenis</td><td style={{ padding: `${token.paddingXS}px 0` }}>{report.type}</td></tr>
              <tr><td style={{ color: token.colorTextTertiary, padding: `${token.paddingXS}px 0` }}>Format</td><td style={{ padding: `${token.paddingXS}px 0` }}>{report.format?.toUpperCase()}</td></tr>
              <tr><td style={{ color: token.colorTextTertiary, padding: `${token.paddingXS}px 0` }}>Status</td><td style={{ padding: `${token.paddingXS}px 0` }}>{report.status}</td></tr>
              {reportRange && <tr><td style={{ color: token.colorTextTertiary, padding: `${token.paddingXS}px 0` }}>Rentang</td><td style={{ padding: `${token.paddingXS}px 0` }}>{reportRange}</td></tr>}
              {sizeKb !== null && <tr><td style={{ color: token.colorTextTertiary, padding: `${token.paddingXS}px 0` }}>Ukuran</td><td style={{ padding: `${token.paddingXS}px 0` }}>{sizeKb} KB</td></tr>}
              <tr><td style={{ color: token.colorTextTertiary, padding: `${token.paddingXS}px 0` }}>Dibuat</td><td style={{ padding: `${token.paddingXS}px 0` }}>{reportDate}</td></tr>
              {report.id && <tr><td style={{ color: token.colorTextTertiary, padding: `${token.paddingXS}px 0` }}>Report ID</td><td style={{ padding: `${token.paddingXS}px 0`, fontFamily: 'monospace', fontSize: token.fontSizeSM }}>{report.id}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
});

export { ReportPreviewModal };
