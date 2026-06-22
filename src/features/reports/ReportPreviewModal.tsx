'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Modal, Segmented, Spin, Tag, Typography } from 'antd';
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
import { reportsApi } from '@/modules/reports/api';
import type { ReportRow } from '@/commons/types/reports';

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false, loading: () => <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 420 }}><Spin description="Memuat PDF..." /></div> });

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

const ReportPreviewModal = React.memo(function ReportPreviewModal({
  open,
  report,
  workspaceId,
  onClose,
  onDownload,
}: ReportPreviewModalProps) {
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
      if (ext === 'pdf') loadPdf();
      else if (ext === 'xlsx') loadExcel();
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

  const loading = ext === 'pdf' ? pdfLoading : excelLoading;
  const error = ext === 'pdf' ? pdfError : excelError;
  const reportDate = report.createdAt
    ? format(new Date(report.createdAt), 'dd MMM yyyy, HH:mm')
    : '-';
  const sizeKb = report.fileSize ? Math.round(report.fileSize / 1024) : null;
  const currentSheet = excelData?.sheets?.[activeSheet];

  return (
    <Modal
      open={open}
      title={
        <span style={{ fontSize: 14 }}>
          <Icon style={{ marginRight: 6, color: ext === 'pdf' ? '#ff4d4f' : '#52c41a' }} />
          {report.title}
        </span>
      }
      onCancel={onClose}
      width={900}
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#999' }}>
            {reportDate} {sizeKb !== null && ` \u00B7 ${sizeKb} KB`}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
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
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
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
        style={{ marginBottom: 8 }}
      />

      {/* Preview pane */}
      {activeTab === 'preview' && (
        <div
          style={{
            background: '#fafafa',
            borderRadius: 8,
            overflow: 'hidden',
            minHeight: 420,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
              <Spin description="Memuat preview..." />
            </div>
          )}

          {error && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Typography.Text type="danger">{error}</Typography.Text>
              <br />
              <Button size="small" icon={<ReloadOutlined />} style={{ marginTop: 8 }} onClick={ext === 'pdf' ? loadPdf : loadExcel}>
                Coba lagi
              </Button>
            </div>
          )}

          {!loading && !error && ext === 'pdf' && pdfData && (
            <PdfViewer data={pdfData} />
          )}

          {!loading && !error && ext === 'pdf' && !pdfData && (
            <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>Preview tidak tersedia</div>
          )}

          {!loading && !error && ext === 'xlsx' && currentSheet && (
            <div style={{ maxHeight: 420, overflow: 'auto' }}>
              {excelData && excelData.sheets.length > 1 && (
                <div style={{ display: 'flex', gap: 4, padding: '6px 8px', borderBottom: '1px solid #f0f0f0', background: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
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
                  fontSize: 12,
                  fontFamily: 'Consolas, monospace',
                  tableLayout: 'fixed',
                }}
              >
                <thead>
                  <tr style={{ background: '#f5f5f5', position: 'sticky', top: 0, zIndex: 1 }}>
                    {columnLetters.slice(0, currentSheet.colCount).map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #e8e8e8',
                          fontWeight: 600,
                          textAlign: 'center',
                          color: '#666',
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
                              padding: '4px 8px',
                              border: '1px solid #e8e8e8',
                              background: cell.bg,
                              color: cell.color,
                              fontWeight: cell.bold ? 600 : undefined,
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

          {!loading && !error && ext === 'xlsx' && !currentSheet && (
            <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>Tidak ada data</div>
          )}

          {!loading && !error && !['pdf', 'xlsx'].includes(ext) && (
            <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>
              Preview tidak tersedia untuk format {ext.toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Details pane */}
      {activeTab === 'details' && (
        <div
          style={{
            background: '#fafafa',
            borderRadius: 8,
            padding: 16,
            minHeight: 420,
          }}
        >
          <table style={{ width: '100%', fontSize: 13 }}>
            <tbody>
              <tr><td style={{ color: '#999', padding: '6px 0', width: 120 }}>Judul</td><td style={{ padding: '6px 0' }}>{report.title}</td></tr>
              <tr><td style={{ color: '#999', padding: '6px 0' }}>Jenis</td><td style={{ padding: '6px 0' }}>{report.type}</td></tr>
              <tr><td style={{ color: '#999', padding: '6px 0' }}>Format</td><td style={{ padding: '6px 0' }}>{report.format?.toUpperCase()}</td></tr>
              <tr><td style={{ color: '#999', padding: '6px 0' }}>Status</td><td style={{ padding: '6px 0' }}>{report.status}</td></tr>
              {reportRange && <tr><td style={{ color: '#999', padding: '6px 0' }}>Rentang</td><td style={{ padding: '6px 0' }}>{reportRange}</td></tr>}
              {sizeKb !== null && <tr><td style={{ color: '#999', padding: '6px 0' }}>Ukuran</td><td style={{ padding: '6px 0' }}>{sizeKb} KB</td></tr>}
              <tr><td style={{ color: '#999', padding: '6px 0' }}>Dibuat</td><td style={{ padding: '6px 0' }}>{reportDate}</td></tr>
              {report.id && <tr><td style={{ color: '#999', padding: '6px 0' }}>Report ID</td><td style={{ padding: '6px 0', fontFamily: 'monospace', fontSize: 12 }}>{report.id}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
});

export default ReportPreviewModal;
